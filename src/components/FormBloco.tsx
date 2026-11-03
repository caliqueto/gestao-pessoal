import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { diaDaSemana, duracao, nomeDia } from '../lib/datas'
import { DIAS, NOMES_DIAS } from '../lib/habitos'
import { conflitosCom, minutosDe, ORDEM_TIPOS, TIPOS, type Bloco, type TipoBloco } from '../lib/agenda'
import { useAviso } from './Aviso'

type Props = { bloco?: Bloco; data: string; blocos: Bloco[]; fechar: () => void; mudou: () => void }

/** Criar ou editar um bloco da agenda (fixo toda semana ou só num dia). */
export default function FormBloco({ bloco, data, blocos, fechar, mudou }: Props) {
  const [titulo, setTitulo] = useState(bloco?.titulo ?? '')
  const [tipo, setTipo] = useState<TipoBloco>(bloco?.tipo ?? 'estudo')
  const [fixo, setFixo] = useState(bloco ? !bloco.data : true)
  const [dias, setDias] = useState<number[]>(bloco?.dias_semana ?? [diaDaSemana(data)])
  const [dia, setDia] = useState(bloco?.data ?? data)
  const [inicio, setInicio] = useState(bloco?.inicio.slice(0, 5) ?? '')
  const [fim, setFim] = useState(bloco?.fim.slice(0, 5) ?? '')
  const [salvando, setSalvando] = useState(false)
  const avisar = useAviso()

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && fechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [fechar])

  const valido = inicio && fim && minutosDe(fim) > minutosDe(inicio)
  const choques = conflitosCom({ id: bloco?.id, inicio, fim, dias_semana: fixo ? dias : null, data: fixo ? null : dia }, blocos)

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!valido) return avisar('O fim precisa ser depois do início.')
    if (fixo && !dias.length) return avisar('Escolha pelo menos um dia.')
    setSalvando(true)
    const dados = { titulo: titulo.trim(), tipo, inicio, fim, dias_semana: fixo ? [...dias].sort() : null, data: fixo ? null : dia }
    const { error } = bloco
      ? await supabase.from('compromissos').update(dados).eq('id', bloco.id)
      : await supabase.from('compromissos').insert(dados)
    setSalvando(false)
    if (error) return avisar('Não foi possível salvar o bloco. Tente de novo.')
    avisar(bloco ? 'Bloco atualizado.' : `${dados.titulo} adicionado à agenda.`)
    mudou(); fechar()
  }
  async function remover() {
    if (!bloco) return
    const msg = bloco.data ? `Remover "${bloco.titulo}" da agenda?` : `Remover "${bloco.titulo}" de todas as semanas?`
    if (!confirm(msg)) return
    await supabase.from('compromissos').delete().eq('id', bloco.id)
    avisar('Bloco removido.'); mudou(); fechar()
  }
  const alternarDia = (d: number) => setDias(dias.includes(d) ? dias.filter((x) => x !== d) : [...dias, d])

  return (
    <div className="cortina" onClick={fechar}>
      <form className="folha" role="dialog" aria-modal="true" aria-labelledby="fb-titulo" onClick={(e) => e.stopPropagation()} onSubmit={salvar}>
        <div className="folha-topo">
          <h2 id="fb-titulo">{bloco ? 'Editar bloco' : 'Novo bloco'}</h2>
          <button type="button" className="link" onClick={fechar}>Fechar</button>
        </div>

        <div className="campo"><label htmlFor="fb-nome">O que é</label>
          <input id="fb-nome" required autoFocus={!bloco} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Estudar design" /></div>

        <div className="campo">
          <span className="rotulo-campo">Tipo</span>
          <div className="tipos" role="group" aria-label="Tipo do bloco">
            {ORDEM_TIPOS.map((t) => (
              <button type="button" key={t} aria-pressed={tipo === t} style={{ ['--cor' as string]: TIPOS[t].cor }} onClick={() => setTipo(t)}>
                <span className="bolinha" style={{ background: TIPOS[t].cor }} />
                <span>{TIPOS[t].nome}<small>{TIPOS[t].desc}</small></span>
              </button>
            ))}
          </div>
        </div>

        <div className="duas">
          <div className="campo"><label htmlFor="fb-ini">Começa</label>
            <input id="fb-ini" type="time" required value={inicio} onChange={(e) => setInicio(e.target.value)} /></div>
          <div className="campo"><label htmlFor="fb-fim">Termina</label>
            <input id="fb-fim" type="time" required value={fim} onChange={(e) => setFim(e.target.value)} /></div>
        </div>
        {inicio && fim && !valido && <p className="aviso erro">O fim precisa ser depois do início. Blocos que passam da meia-noite: divida em dois.</p>}
        {valido && <p className="miudo" style={{ margin: '-6px 0 12px' }}>{duracao(minutosDe(fim) - minutosDe(inicio))}</p>}

        <div className="campo">
          <div className="alternar largo" role="group" aria-label="Repetição">
            <button type="button" aria-pressed={fixo} onClick={() => setFixo(true)}>Toda semana</button>
            <button type="button" aria-pressed={!fixo} onClick={() => setFixo(false)}>Só uma vez</button>
          </div>
        </div>
        {fixo ? (
          <div className="campo">
            <div className="dias-escolha" role="group" aria-label="Dias da semana">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                <button type="button" key={d} aria-pressed={dias.includes(d)} aria-label={NOMES_DIAS[d]} onClick={() => alternarDia(d)}>{DIAS[d]}</button>
              ))}
            </div>
            <div className="atalhos">
              <button type="button" className="link" onClick={() => setDias([1, 2, 3, 4, 5])}>Dias úteis</button>
              <button type="button" className="link" onClick={() => setDias([0, 1, 2, 3, 4, 5, 6])}>Todo dia</button>
              <button type="button" className="link" onClick={() => setDias([0, 6])}>Fim de semana</button>
            </div>
          </div>
        ) : (
          <div className="campo"><label htmlFor="fb-dia">Dia</label>
            <input id="fb-dia" type="date" required value={dia} onChange={(e) => setDia(e.target.value || data)} />
            <span className="miudo" style={{ margin: 0 }}>{nomeDia(dia)}</span></div>
        )}

        {choques.length > 0 && (
          <p className="aviso" style={{ color: 'var(--atencao)' }}>Choca com: {choques.join(', ')}. Pode salvar assim mesmo.</p>
        )}

        <div className="acoes">
          <button className="botao" disabled={salvando}>{bloco ? 'Salvar' : 'Adicionar'}</button>
          <button type="button" className="botao sec" onClick={fechar}>Cancelar</button>
          {bloco && <button type="button" className="link perigo" onClick={remover}>Remover</button>}
        </div>
      </form>
    </div>
  )
}
