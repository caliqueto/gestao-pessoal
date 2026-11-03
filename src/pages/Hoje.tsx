import { Link } from 'react-router-dom'
import { useConta } from '../lib/conta'
import { IconeAjustes } from '../components/Icones'

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
        <section className="bloco largo">
          <h2>Dinheiro do mês</h2>
          <p className="vazio">Saldo, termômetro e quanto ainda cabe em cada categoria vão aparecer aqui.</p>
          <span className="fase">Fase 1</span>
        </section>
        <section className="bloco">
          <h2>Hábitos de hoje</h2>
          <p className="vazio">Estudar design e lançar os gastos do dia, marcados com um toque.</p>
          <span className="fase">Fase 2</span>
        </section>
        <section className="bloco">
          <h2>Estudo da semana</h2>
          <p className="vazio">Horas estudadas na mentoria contra a sua meta semanal.</p>
          <span className="fase">Fase 2</span>
        </section>
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
