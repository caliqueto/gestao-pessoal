type Props = { titulo: string; resumo: string; fase: string; itens: string[] }

export default function EmBreve({ titulo, resumo, fase, itens }: Props) {
  return (
    <>
      <h1>{titulo}</h1>
      <p className="sub">{resumo}</p>
      <section className="bloco">
        <h2>O que vai ter aqui</h2>
        <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--texto-2)' }}>
          {itens.map((i) => <li key={i}>{i}</li>)}
        </ul>
        <span className="fase">{fase}</span>
      </section>
    </>
  )
}

export const Pilares = () => (
  <EmBreve titulo="Pilares" fase="Fase 4"
    resumo="Como cada área da vida está, semana a semana."
    itens={['Nota de 1 a 10 por pilar no fim de semana', 'Gráfico de teia comparando com a semana anterior', 'Aviso quando um pilar fica esquecido', 'Uma meta pequena por pilar']} />
)
export const Metas = () => (
  <EmBreve titulo="Metas" fase="Fase 5"
    resumo="Objetivos maiores, quebrados em passos."
    itens={['Metas com passos e progresso', 'Check-in de domingo em três perguntas', 'Diário e gratidão']} />
)
