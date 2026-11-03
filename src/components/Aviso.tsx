import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

const Ctx = createContext<(msg: string) => void>(() => {})

/** Mensagem curta que aparece por alguns segundos depois de salvar algo. */
export function AvisoProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState('')
  const timer = useRef<number>(undefined)
  const avisar = useCallback((m: string) => {
    setMsg(m)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMsg(''), 3200)
  }, [])
  return (
    <Ctx.Provider value={avisar}>
      {children}
      <div className="toast" role="status" aria-live="polite" data-visivel={msg ? 'sim' : 'nao'}>{msg}</div>
    </Ctx.Provider>
  )
}
export const useAviso = () => useContext(Ctx)
