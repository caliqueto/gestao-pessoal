import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { deISO, hojeISO, inicioSemana, iso, somarDias } from './datas'

export type Sessao = { id: string; inicio: string; minutos: number; assunto: string | null }

/** Sessões de estudo da semana (segunda a domingo) que contém a data. */
export function useEstudos(semana = inicioSemana(hojeISO())) {
  const [sessoes, setSessoes] = useState<Sessao[]>([])
  const [carregando, setCarregando] = useState(true)

  const recarregar = useCallback(async () => {
    const de = deISO(semana).toISOString()
    const ate = deISO(somarDias(semana, 7)).toISOString()
    const { data } = await supabase.from('sessoes_estudo').select('id,inicio,minutos,assunto')
      .gte('inicio', de).lt('inicio', ate).order('inicio', { ascending: false })
    setSessoes((data ?? []) as Sessao[])
    setCarregando(false)
  }, [semana])

  useEffect(() => { recarregar() }, [recarregar])

  return { sessoes, carregando, recarregar, ...resumoSemana(semana, sessoes) }
}

/** Minutos por dia (segunda primeiro) e total da semana. */
export function resumoSemana(semana: string, sessoes: Sessao[]) {
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(semana, i))
  const porDia = dias.map((d) => ({
    data: d,
    minutos: sessoes.filter((s) => iso(new Date(s.inicio)) === d).reduce((t, s) => t + s.minutos, 0),
  }))
  return { porDia, totalMin: porDia.reduce((t, d) => t + d.minutos, 0) }
}

export async function salvarSessao(inicio: Date, minutos: number, assunto: string) {
  return supabase.from('sessoes_estudo').insert({
    inicio: inicio.toISOString(), minutos: Math.round(minutos), assunto: assunto.trim() || null,
  })
}

/* ---------- Cronômetro: guardado no aparelho, continua contando com o app fechado ---------- */

const CHAVE = 'cronometro-estudo'
export type Rodando = { inicio: number; assunto: string }

export function lerCronometro(): Rodando | null {
  try { return JSON.parse(localStorage.getItem(CHAVE) || 'null') } catch { return null }
}
export function gravarCronometro(r: Rodando | null) {
  try {
    if (r) localStorage.setItem(CHAVE, JSON.stringify(r)); else localStorage.removeItem(CHAVE)
  } catch { /* sem armazenamento: o cronômetro só dura enquanto a tela estiver aberta */ }
  window.dispatchEvent(new Event('cronometro'))
}
