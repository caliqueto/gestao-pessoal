import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

export type Preferencias = {
  tema: 'escuro' | 'claro'
  cor_destaque: string
  dia_revisao: number
  meta_horas_estudo: number | null
}

const padrao: Preferencias = { tema: 'escuro', cor_destaque: '#7c9cff', dia_revisao: 0, meta_horas_estudo: null }

type Conta = {
  sessao: Session | null
  carregando: boolean
  prefs: Preferencias
  salvarPrefs: (p: Partial<Preferencias>) => Promise<void>
  sair: () => Promise<void>
}

const Ctx = createContext<Conta | null>(null)

function aplicarVisual(p: Preferencias) {
  const raiz = document.documentElement
  raiz.dataset.tema = p.tema
  raiz.style.setProperty('--destaque', p.cor_destaque)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', p.tema === 'claro' ? '#f6f6f8' : '#000000')
  try { localStorage.setItem('visual', JSON.stringify({ tema: p.tema, cor_destaque: p.cor_destaque })) } catch { /* sem armazenamento */ }
}

// aplica o último visual usado antes mesmo do login responder, para não piscar
try {
  const v = JSON.parse(localStorage.getItem('visual') || 'null')
  if (v) aplicarVisual({ ...padrao, ...v })
} catch { /* ignora */ }

export function ContaProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [prefs, setPrefs] = useState<Preferencias>(padrao)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session)
      setCarregando(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSessao(s))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!sessao) return
    supabase.from('preferencias').select('tema, cor_destaque, dia_revisao, meta_horas_estudo').maybeSingle()
      .then(({ data }) => {
        if (data) {
          const p = { ...padrao, ...data } as Preferencias
          setPrefs(p)
          aplicarVisual(p)
        }
      })
  }, [sessao])

  async function salvarPrefs(mudanca: Partial<Preferencias>) {
    const nova = { ...prefs, ...mudanca }
    setPrefs(nova)
    aplicarVisual(nova)
    await supabase.from('preferencias').upsert({ user_id: sessao!.user.id, ...nova })
  }

  async function sair() {
    await supabase.auth.signOut()
  }

  return <Ctx.Provider value={{ sessao, carregando, prefs, salvarPrefs, sair }}>{children}</Ctx.Provider>
}

export function useConta() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useConta fora do ContaProvider')
  return c
}
