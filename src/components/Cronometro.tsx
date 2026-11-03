import { useEffect, useState } from 'react'
import { duracao } from '../lib/datas'
import { gravarCronometro, lerCronometro, salvarSessao, type Rodando } from '../lib/estudos'
import { useAviso } from './Aviso'

function relogio(ms: number) {
  const s = Math.max(Math.floor(ms / 1000), 0)
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60
  const dd = (n: number) => String(n).padStart(2, '0')
  return h ? `${h}:${dd(m)}:${dd(r)}` : `${dd(m)}:${dd(r)}`
}

/** Iniciar → estudar → Parar → confere os minutos → Salvar. Continua contando se o app fechar. */
export default function Cronometro({ salvo, compacto = false }: { salvo: () => void; compacto?: boolean }) {
  const [rodando, setRodando] = useState<Rodando | null>(lerCronometro)
  const [agora, setAgora] = useState(Date.now())
  const [assunto, setAssunto] = useState('')
  const [parado, setParado] = useState<{ inicio: number; minutos: string; assunto: string } | null>(null)
  const [salvando, setSalvando] = useState(false)
  const avisar = useAviso()

  useEffect(() => {
    const sync = () => setRodando(lerCronometro())
    window.addEventListener('cronometro', sync)
    window.addEventListener('storage', sync)
    return () => { window.removeEventListener('cronometro', sync); window.removeEventListener('storage', sync) }
  }, [])

  useEffect(() => {
    if (!rodando) return
    setAgora(Date.now())
    const t = window.setInterval(() => setAgora(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [rodando])

  function iniciar() {
    gravarCronometro({ inicio: Date.now(), assunto: assunto.trim() })
    setAssunto('')
  }
  function parar() {
    if (!rodando) return
    const min = Math.round((Date.now() - rodando.inicio) / 60000)
    setParado({ inicio: rodando.inicio, minutos: String(min), assunto: rodando.assunto })
  }
  async function salvar() {
    if (!parado) return
    const min = Number(parado.minutos)
    if (!(min >= 1)) { avisar('Coloque pelo menos 1 minuto ou descarte.'); return }
    setSalvando(true)
    const { error } = await salvarSessao(new Date(parado.inicio), min, parado.assunto)
    setSalvando(false)
    if (error) { avisar('Não salvou. Confira a internet e toque em Salvar de novo.'); return }
    gravarCronometro(null); setParado(null)
    avisar(`${duracao(min)} de estudo salvos.`)
    salvo()
  }
  function descartar() {
    if (!confirm('Descartar este tempo de estudo?')) return
    gravarCronometro(null); setParado(null)
  }

  if (parado) {
    return (
      <div className="cronometro parado">
        <label className="campo">
          <span>Minutos estudados (corrija se esqueceu o cronômetro ligado)</span>
          <input type="number" min={1} inputMode="numeric" value={parado.minutos}
            onChange={(e) => setParado({ ...parado, minutos: e.target.value })} />
        </label>
        <div className="acoes">
          <button className="botao" disabled={salvando} onClick={salvar}>Salvar {Number(parado.minutos) >= 1 ? duracao(Number(parado.minutos)) : ''}</button>
          <button className="botao sec" onClick={() => setParado(null)}>Continuar</button>
          <button className="link perigo" onClick={descartar}>Descartar</button>
        </div>
      </div>
    )
  }

  if (rodando) {
    return (
      <div className={`cronometro ligado ${compacto ? 'compacto' : ''}`}>
        <div>
          <div className="tempo num" aria-live="off">{relogio(agora - rodando.inicio)}</div>
          <div className="miudo" style={{ margin: 0 }}>Estudando{rodando.assunto ? `: ${rodando.assunto}` : ''}</div>
        </div>
        <button className="botao" onClick={parar}>Parar</button>
      </div>
    )
  }

  return (
    <div className={`cronometro ${compacto ? 'compacto' : ''}`}>
      {!compacto && (
        <input className="assunto" placeholder="O que vai estudar? (opcional)" aria-label="Assunto do estudo"
          value={assunto} onChange={(e) => setAssunto(e.target.value)} />
      )}
      <button className="botao" onClick={iniciar}>Começar a estudar</button>
    </div>
  )
}
