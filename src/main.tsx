import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import './styles.css'
import { ContaProvider, useConta } from './lib/conta'
import Layout from './components/Layout'
import Login from './pages/Login'
import Hoje from './pages/Hoje'
import Ajustes from './pages/Ajustes'
import { Financas, Metas, Pilares, Rotina } from './pages/EmBreve'

registerSW({ immediate: true })

function Rotas() {
  const { sessao, carregando } = useConta()
  if (carregando) return null
  if (!sessao) return <Login />
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Hoje />} />
        <Route path="financas" element={<Financas />} />
        <Route path="rotina" element={<Rotina />} />
        <Route path="pilares" element={<Pilares />} />
        <Route path="metas" element={<Metas />} />
        <Route path="ajustes" element={<Ajustes />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ContaProvider>
        <Rotas />
      </ContaProvider>
    </BrowserRouter>
  </StrictMode>
)
