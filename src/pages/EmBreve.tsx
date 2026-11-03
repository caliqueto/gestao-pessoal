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

export const Financas = () => (
  <EmBreve titulo="Finanças" fase="Fase 1"
    resumo="Para saber para onde o dinheiro vai, sem planilha."
    itens={['Lançar gasto ou entrada em dois toques', 'Limite por categoria, com aviso em 80%', 'Termômetro do mês com previsão', 'Pizza dos gastos por categoria', 'Gastos fixos lançados sozinhos', 'Metas de economia']} />
)
export const Rotina = () => (
  <EmBreve titulo="Rotina" fase="Fases 2 e 3"
    resumo="Hábitos, estudos e os blocos da semana."
    itens={['Hábitos com sequência de dias', 'Cronômetro de estudo da mentoria', 'Meta de horas por semana', 'Blocos de estudo e blocos protegidos', 'Tarefas pessoais com data']} />
)
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
