import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { hojeISO, somarDias } from './datas'

export type StatusMeta = 'ativa' | 'pausada' | 'concluida'
export type MetaVida = { id: string; titulo: string; pilar_id: string | null; prazo: string | null; status: StatusMeta; criado_em: string }
export type Passo = { id: string; meta_id: string; titulo: string; prazo: string | null; feito: boolean; ordem: number }
export type Checkin = { id?: string; semana: string; foi_bom: string | null; pesou: string | null; quero_diferente: string | null }
export type TipoDiario = 'diario' | 'gratidao' | 'intencao'
export type Entrada = { id: string; data: string; tipo: TipoDiario; texto: string; criado_em: string }

/* ---------------- Metas com passos ---------------- */
export function useMetas() {
  const [metas, setMetas] = useState<MetaVida[]>([])
  const [passos, setPassos] = useState<Passo[]>([])
  const [carregando, setCarregando] = useState(true)

  const recarregar = useCallback(async () => {
    const [m, p] = await Promise.all([
      supabase.from('metas_vida').select('id,titulo,pilar_id,prazo,status,criado_em').order('criado_em'),
      supabase.from('passos_meta').select('id,meta_id,titulo,prazo,feito,ordem').order('ordem'),
    ])
    setMetas((m.data ?? []) as MetaVida[])
    setPassos((p.data ?? []) as Passo[])
    setCarregando(false)
  }, [])
  useEffect(() => { recarregar() }, [recarregar])

  async function alternarPasso(passo: Passo) {
    setPassos((l) => l.map((x) => (x.id === passo.id ? { ...x, feito: !x.feito } : x)))
    const { error } = await supabase.from('passos_meta').update({ feito: !passo.feito }).eq('id', passo.id)
    if (error) recarregar()
    return !error
  }

  return { metas, passos, carregando, recarregar, alternarPasso }
}

export function progresso(meta: MetaVida, passos: Passo[]) {
  const dela = passos.filter((p) => p.meta_id === meta.id)
  const feitos = dela.filter((p) => p.feito).length
  return { total: dela.length, feitos, pct: dela.length ? feitos / dela.length : meta.status === 'concluida' ? 1 : 0 }
}

/** Ativas primeiro (com prazo mais perto antes), depois pausadas, depois concluídas. */
export function ordenarMetas(metas: MetaVida[]) {
  const peso: Record<StatusMeta, number> = { ativa: 0, pausada: 1, concluida: 2 }
  return [...metas].sort((a, b) =>
    peso[a.status] - peso[b.status]
    || (a.prazo && b.prazo ? a.prazo.localeCompare(b.prazo) : a.prazo ? -1 : b.prazo ? 1 : 0)
    || a.criado_em.localeCompare(b.criado_em))
}

/** Próximo passo não feito (o de prazo mais próximo, senão o primeiro da lista). */
export function proximoPasso(meta: MetaVida, passos: Passo[]) {
  const abertos = passos.filter((p) => p.meta_id === meta.id && !p.feito)
  return abertos.sort((a, b) => (a.prazo && b.prazo ? a.prazo.localeCompare(b.prazo) : a.prazo ? -1 : b.prazo ? 1 : a.ordem - b.ordem))[0]
}

/* ---------------- Check-in semanal ---------------- */
export function useCheckins() {
  const [lista, setLista] = useState<Checkin[]>([])
  const [carregando, setCarregando] = useState(true)
  const recarregar = useCallback(async () => {
    const { data } = await supabase.from('checkins').select('id,semana,foi_bom,pesou,quero_diferente').order('semana', { ascending: false }).limit(12)
    setLista((data ?? []) as Checkin[])
    setCarregando(false)
  }, [])
  useEffect(() => { recarregar() }, [recarregar])

  async function salvar(c: Checkin) {
    const limpo = { semana: c.semana, foi_bom: c.foi_bom?.trim() || null, pesou: c.pesou?.trim() || null, quero_diferente: c.quero_diferente?.trim() || null }
    const { error } = await supabase.from('checkins').upsert(limpo, { onConflict: 'user_id,semana' })
    if (!error) recarregar()
    return !error
  }
  return { lista, carregando, salvar, doDia: (semana: string) => lista.find((c) => c.semana === semana) }
}

export const checkinFeito = (c?: Checkin) => !!(c && (c.foi_bom || c.pesou || c.quero_diferente))

/* ---------------- Diário, gratidão e intenção ---------------- */
export function useDiario(dias = 30) {
  const [entradas, setEntradas] = useState<Entrada[]>([])
  const [carregando, setCarregando] = useState(true)
  const recarregar = useCallback(async () => {
    const { data } = await supabase.from('diario').select('id,data,tipo,texto,criado_em')
      .gte('data', somarDias(hojeISO(), -dias)).order('data', { ascending: false }).order('criado_em')
    setEntradas((data ?? []) as Entrada[])
    setCarregando(false)
  }, [dias])
  useEffect(() => { recarregar() }, [recarregar])

  /** Diário e intenção: um por dia (substitui). Gratidão: pode ter várias. */
  async function salvar(data: string, tipo: TipoDiario, texto: string) {
    const existente = tipo !== 'gratidao' ? entradas.find((e) => e.data === data && e.tipo === tipo) : undefined
    const t = texto.trim()
    let error
    if (existente && !t) ({ error } = await supabase.from('diario').delete().eq('id', existente.id))
    else if (existente) ({ error } = await supabase.from('diario').update({ texto: t }).eq('id', existente.id))
    else if (t) ({ error } = await supabase.from('diario').insert({ data, tipo, texto: t }))
    if (!error) recarregar()
    return !error
  }
  async function apagar(id: string) {
    setEntradas((l) => l.filter((e) => e.id !== id))
    await supabase.from('diario').delete().eq('id', id)
  }
  return { entradas, carregando, salvar, apagar, recarregar }
}
