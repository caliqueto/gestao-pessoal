import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { hojeISO, inicioSemana, somarDias } from './datas'

export type Pilar = { id: string; nome: string; cor: string; ordem: number; ativo: boolean }
export type Nota = { pilar_id: string; semana: string; nota: number; meta_semana: string | null }

export const SEMANAS_HISTORICO = 8

export function usePilares() {
  const [pilares, setPilares] = useState<Pilar[]>([])
  const [notas, setNotas] = useState<Nota[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const recarregar = useCallback(async () => {
    const desde = somarDias(inicioSemana(hojeISO()), -7 * 26)
    const [p, n] = await Promise.all([
      supabase.from('pilares').select('id,nome,cor,ordem,ativo').order('ordem').order('nome'),
      supabase.from('notas_semanais').select('pilar_id,semana,nota,meta_semana').gte('semana', desde),
    ])
    setErro(p.error || n.error ? 'Não foi possível carregar os pilares. Confira a internet.' : '')
    setPilares((p.data ?? []) as Pilar[])
    setNotas((n.data ?? []) as Nota[])
    setCarregando(false)
  }, [])

  useEffect(() => { recarregar() }, [recarregar])

  /** Salva a nota (e/ou a meta) da semana. Muda na tela na hora. */
  async function salvarNota(pilarId: string, semana: string, mudanca: { nota?: number; meta_semana?: string | null }) {
    const atual = notas.find((x) => x.pilar_id === pilarId && x.semana === semana)
    const nova: Nota = { pilar_id: pilarId, semana, nota: mudanca.nota ?? atual?.nota ?? 0, meta_semana: mudanca.meta_semana !== undefined ? mudanca.meta_semana : atual?.meta_semana ?? null }
    if (!nova.nota) return { ok: false, motivo: 'nota' as const } // meta sem nota: espera a nota
    setNotas((l) => [...l.filter((x) => !(x.pilar_id === pilarId && x.semana === semana)), nova])
    const { error } = await supabase.from('notas_semanais').upsert(nova, { onConflict: 'pilar_id,semana' })
    if (error) { recarregar(); return { ok: false, motivo: 'rede' as const } }
    return { ok: true }
  }

  const ativos = pilares.filter((p) => p.ativo)
  return { pilares, ativos, notas, carregando, erro, recarregar, salvarNota }
}

export const notaDe = (notas: Nota[], pilarId: string, semana: string) =>
  notas.find((n) => n.pilar_id === pilarId && n.semana === semana)

/** Pilares cujas 3 últimas notas são de semanas seguidas e todas abaixo de 5. */
export function esquecidos(pilares: Pilar[], notas: Nota[], ate = inicioSemana(hojeISO())) {
  return pilares.filter((p) => {
    const ult = notas.filter((n) => n.pilar_id === p.id && n.semana <= ate).sort((a, b) => b.semana.localeCompare(a.semana)).slice(0, 3)
    if (ult.length < 3) return false
    const seguidas = ult[1].semana === somarDias(ult[0].semana, -7) && ult[2].semana === somarDias(ult[0].semana, -14)
    return seguidas && ult.every((n) => n.nota < 5)
  })
}

/** Média das notas dos pilares numa semana (null se nenhuma). */
export function mediaSemana(pilares: Pilar[], notas: Nota[], semana: string) {
  const v = pilares.map((p) => notaDe(notas, p.id, semana)?.nota).filter((x): x is number => !!x)
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}

export const corNota = (n: number) => (n >= 7 ? 'var(--bom)' : n >= 5 ? 'var(--atencao)' : 'var(--ruim)')
