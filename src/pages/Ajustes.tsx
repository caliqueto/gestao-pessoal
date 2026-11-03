import { useConta } from '../lib/conta'

const cores = ['#7c9cff', '#4ade80', '#f472b6', '#fb923c', '#facc15', '#a78bfa', '#38bdf8', '#ffffff']
const dias = ['Domingo', 'Sábado']

export default function Ajustes() {
  const { sessao, prefs, salvarPrefs, sair } = useConta()

  return (
    <>
      <h1>Ajustes</h1>
      <p className="sub">{sessao?.user.email}</p>

      <div className="grade">
        <section className="bloco">
          <h2>Tema</h2>
          <div className="alternar" role="group" aria-label="Tema">
            {(['escuro', 'claro'] as const).map((t) => (
              <button key={t} aria-pressed={prefs.tema === t} onClick={() => salvarPrefs({ tema: t })}>
                {t === 'escuro' ? 'Escuro' : 'Claro'}
              </button>
            ))}
          </div>
        </section>

        <section className="bloco">
          <h2>Cor de destaque</h2>
          <div className="opcoes">
            {cores.map((c) => (
              <button key={c} className="cor" style={{ background: c }} aria-label={`Usar a cor ${c}`}
                aria-pressed={prefs.cor_destaque === c} onClick={() => salvarPrefs({ cor_destaque: c })} />
            ))}
          </div>
        </section>

        <section className="bloco">
          <h2>Dia da revisão semanal</h2>
          <div className="alternar" role="group" aria-label="Dia da revisão">
            {dias.map((d) => {
              const v = d === 'Domingo' ? 0 : 6
              return (
                <button key={d} aria-pressed={prefs.dia_revisao === v} onClick={() => salvarPrefs({ dia_revisao: v })}>{d}</button>
              )
            })}
          </div>
        </section>

        <section className="bloco">
          <div className="linha-ajuste">
            <h2 style={{ margin: 0 }}>Conta</h2>
            <button className="botao sec" onClick={sair}>Sair</button>
          </div>
        </section>
      </div>
    </>
  )
}
