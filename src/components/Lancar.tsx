import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { hojeISO, lerValor, reais } from '../lib/datas'
import type { Categoria, Tipo } from '../lib/financas'

type Props = { categorias: Categoria[]; fechar: () => void; salvo: (msg: string) => void }

/** Lançamento rápido: digita o valor e toca na categoria — o toque já salva. */
export default function Lancar({ categorias, fechar, salvo }: Props) {
  const [tipo, setTipo] = useState<Tipo>('saida')
  const [valor, setValor] = useState('')
  const [descricao, setDescricao] = useState('')
  const [data, setData] = useState(hojeISO())
  const [mais, setMais] = useState(false)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const campo = useRef<HTMLInputElement>(null)

  useEffect(() => {
    campo.current?.focus()
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && fechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [fechar])

  const lista = categorias.filter((c) => c.tipo === tipo && c.ativo)

  async function salvar(cat: Categoria) {
    const v = lerValor(valor)
    if (!(v > 0)) { setErro('Digite o valor antes de escolher a categoria.'); campo.current?.focus(); return }
    setSalvando(true); setErro('')
    const { error } = await supabase.from('lancamentos').insert({
      tipo, valor: Math.round(v * 100) / 100, categoria_id: cat.id, data, descricao: descricao.trim() || null,
    })
    setSalvando(false)
    if (error) { setErro('Não salvou. Confira a internet e toque de novo na categoria.'); return }
    salvo(`${tipo === 'saida' ? 'Gasto' : 'Entrada'} de ${reais(v)} em ${cat.nome} lançado.`)
    fechar()
  }

  return (
    <div className="cortina" onClick={fechar}>
      <div className="folha" role="dialog" aria-modal="true" aria-labelledby="lancar-titulo" onClick={(e) => e.stopPropagation()}>
        <div className="folha-topo">
          <h2 id="lancar-titulo">Lançar</h2>
          <button className="link" onClick={fechar}>Fechar</button>
        </div>

        <div className="alternar largo" role="group" aria-label="Tipo">
          <button aria-pressed={tipo === 'saida'} onClick={() => setTipo('saida')}>Gasto</button>
          <button aria-pressed={tipo === 'entrada'} onClick={() => setTipo('entrada')}>Entrada</button>
        </div>

        <label className="valor-grande">
          <span>R$</span>
          <input ref={campo} inputMode="decimal" placeholder="0,00" value={valor} aria-label="Valor"
            onChange={(e) => { setValor(e.target.value); setErro('') }} />
        </label>

        {erro && <p className="aviso erro" role="alert">{erro}</p>}

        <p className="dica">Toque na categoria para salvar</p>
        <div className="fichas">
          {lista.map((c) => (
            <button key={c.id} className="ficha" disabled={salvando} onClick={() => salvar(c)}>
              <span className="bolinha" style={{ background: c.cor }} />{c.nome}
            </button>
          ))}
        </div>

        {mais ? (
          <div className="extras">
            <div className="campo">
              <label htmlFor="l-desc">Descrição</label>
              <input id="l-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: mercado do mês" />
            </div>
            <div className="campo">
              <label htmlFor="l-data">Data</label>
              <input id="l-data" type="date" value={data} onChange={(e) => setData(e.target.value || hojeISO())} />
            </div>
          </div>
        ) : (
          <button className="link" onClick={() => setMais(true)}>Adicionar descrição ou outra data</button>
        )}
      </div>
    </div>
  )
}
