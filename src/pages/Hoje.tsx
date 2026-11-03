import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useConta } from '../lib/conta'
import { IconeAjustes } from '../components/Icones'
import { calcularMes, textoCor, useFinancas } from '../lib/financas'
import { hojeISO, mesAtual, reais } from '../lib/datas'
import Lancar from '../components/Lancar'
import { useAviso } from '../components/Aviso'
import { useHabitos } from '../lib/habitos'
import { useEstudos } from '../lib/estudos'
import HabitosHoje from '../components/HabitosHoje'
import Cronometro from '../components/Cronometro'
import { duracao } from '../lib/datas'

function HabitosDoDia() {
  const { habitos, feitas, alternar, carregando } = useHabitos()
  return (
    <section className="bloco">
      <h2>Hábitos de hoje</h2>
      {!carregando && <HabitosHoje habitos={habitos} feitas={feitas} alternar={alternar} />}
    </section>
  )
}

function EstudoDaSemana() {
  const { totalMin, recarregar, carregando } = useEstudos()
  const { prefs } = useConta()
  const metaMin = (prefs.meta_horas_estudo ?? 0) * 60
  return (
    <section className="bloco">
      <h2>Estudo da semana</h2>
      <div className="meta-estudo" style={{ marginTop: 0 }}>
        <div className="total">
          <span className="num grande">{carregando ? '…' : duracao(totalMin)}</span>
          {metaMin > 0 && <span className="de"> de {duracao(metaMin)}</span>}
        </div>
        {metaMin > 0
          ? <div className="barra meta" style={{ marginBottom: 14 }}><div style={{ width: `${Math.min(totalMin / metaMin, 1) * 100}%` }} /></div>
          : <p className="miudo" style={{ margin: '4px 0 14px' }}>Defina sua meta semanal na aba <Link to="/rotina">Rotina</Link>.</p>}
      </div>
      <Cronometro salvo={recarregar} compacto />
    </section>
  )
}

function DinheiroDoMes() {
  const mes = mesAtual()
  const { categorias, lancamentos, recorrentes, carregando, recarregar } = useFinancas(mes)
  const [lancando, setLancando] = useState(false)
  const avisar = useAviso()
  const r = useMemo(() => calcularMes(mes, lancamentos, categorias, recorrentes), [mes, lancamentos, categorias, recorrentes])
  const atencao = r.porCategoria.filter((c) => c.estado === 'perto' || c.estado === 'estourou').sort((a, b) => (b.uso ?? 0) - (a.uso ?? 0)).slice(0, 3)
  const hoje = lancamentos.filter((l) => l.data === hojeISO() && l.tipo === 'saida').reduce((s, l) => s + l.valor, 0)

  return (
    <section className={`bloco largo termometro ${r.cor}`}>
      <div className="saldo-linha">
        <div>
          <div className="rotulo">Saldo do mês</div>
          <div className="saldo num">{carregando ? '…' : reais(r.saldo)}</div>
        </div>
        <button className="botao" onClick={() => setLancando(true)}>+ Lançar</button>
      </div>
      {!carregando && (
        <>
          <p className="frase">{textoCor[r.cor]}</p>
          <dl className="numeros">
            <div><dt>{r.estimativa ? 'Previsão (estimativa)' : 'Previsão do fim do mês'}</dt><dd className="num">{reais(r.previsao)}</dd></div>
            <div><dt>Gasto hoje</dt><dd className="num">{reais(hoje)}</dd></div>
          </dl>
          {atencao.length > 0 && (
            <ul className="limites compacto">
              {atencao.map((c) => (
                <li key={c.id} className={c.estado}>
                  <div className="lim-topo"><span>{c.nome}</span><span className="num">{Math.round((c.uso ?? 0) * 100)}% do limite</span></div>
                  <div className="barra"><div style={{ width: `${Math.min((c.uso ?? 0) * 100, 100)}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
          <Link to="/financas" className="link" style={{ display: 'inline-block', marginTop: 12 }}>Ver finanças</Link>
        </>
      )}
      {lancando && <Lancar categorias={categorias} fechar={() => setLancando(false)} salvo={(m) => { avisar(m); recarregar() }} />}
    </section>
  )
}

export default function Hoje() {
  const { sessao, prefs } = useConta()
  const agora = new Date()
  const diaSemana = agora.toLocaleDateString('pt-BR', { weekday: 'long' })
  const data = agora.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
  const ehRevisao = agora.getDay() === prefs.dia_revisao || agora.getDay() === 6
  const hora = agora.getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const nome = (sessao?.user.user_metadata?.nome as string | undefined) || ''

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Link to="/ajustes" className="botao sec so-celular" aria-label="Ajustes" style={{ minHeight: 40, padding: '0 12px' }}>
          <IconeAjustes />
        </Link>
      </div>
      <header className="capa-dia">
        <div className="semana">{diaSemana}</div>
        <div className="data">{data}</div>
        <p className="ola">{saudacao}{nome ? `, ${nome}` : ''}.</p>
      </header>

      <div className="grade">
        <DinheiroDoMes />
        <HabitosDoDia />
        <EstudoDaSemana />
        {ehRevisao && (
          <section className="bloco largo">
            <h2>Revisão do fim de semana</h2>
            <p className="vazio">Notas dos pilares, check-in e planejamento dos estudos da semana que vem.</p>
            <span className="fase">Fases 4 e 5</span>
          </section>
        )}
      </div>
    </>
  )
}
