import { NavLink, Outlet } from 'react-router-dom'
import { IconeAjustes, IconeFinancas, IconeHoje, IconeMetas, IconePilares, IconeRotina } from './Icones'

const abas = [
  { para: '/', nome: 'Hoje', Icone: IconeHoje },
  { para: '/financas', nome: 'Finanças', Icone: IconeFinancas },
  { para: '/rotina', nome: 'Rotina', Icone: IconeRotina },
  { para: '/pilares', nome: 'Pilares', Icone: IconePilares },
  { para: '/metas', nome: 'Metas', Icone: IconeMetas },
]

export default function Layout() {
  const classe = ({ isActive }: { isActive: boolean }) => (isActive ? 'ativo' : undefined)
  return (
    <div className="app">
      <nav className="nav" aria-label="Seções">
        <span className="marca">Gestão Pessoal</span>
        {abas.map(({ para, nome, Icone }) => (
          <NavLink key={para} to={para} end={para === '/'} className={classe}>
            <Icone />
            {nome}
          </NavLink>
        ))}
        <NavLink to="/ajustes" className={(a) => ['rodape', classe(a)].filter(Boolean).join(' ')}>
          <IconeAjustes />
          Ajustes
        </NavLink>
      </nav>
      <main className="conteudo">
        <Outlet />
      </main>
    </div>
  )
}
