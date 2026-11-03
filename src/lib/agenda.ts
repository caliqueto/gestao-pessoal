import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { diaDaSemana, hojeISO, somarDias } from './datas'

export type TipoBloco = 'trabalho' | 'estudo' | 'pessoal' | 'protegido'
export type Bloco = {
  id: string; titulo: string; tipo: TipoBloco
  dias_semana: number[] | null; data: string | null
  inicio: string; fim: string; ativo: boolean
}
export type Tarefa = { id: string; titulo: string; data: string | null; feita: boolean; criado_em: string }

export const TIPOS: Record<TipoBloco, { nome: string; cor: string; desc: string }> = {
  trabalho: { nome: 'Trabalho', cor: '#94a3b8', desc: 'Horário de trabalho' },
  estudo: { nome: 'Estudo', cor: '#7c9cff', desc: 'Mentoria, cursos, leitura' },
  pessoal: { nome: 'Pessoal', cor: '#4ade80', desc: 'Academia, compromissos, casa' },
  protegido: { nome: 'Protegido', cor: '#f472b6', desc: 'Tempo só seu, sem trabalho' },
}
export const ORDEM_TIPOS: TipoBloco[] = ['trabalho', 'estudo', 'pessoal', 'protegido']

/** '09:30:00' → 570 */
export const minutosDe = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
export const duracaoBloco = (b: Pick<Bloco, 'inicio' | 'fim'>) => minutosDe(b.fim) - minutosDe(b.inicio)
/** '09:00:00' → '9h', '21:30' → '21h30' */
export function fmtHora(t: string) {
  const [h, m] = t.split(':')
  return m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`
}
export const agoraMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes() }

export function useAgenda() {
  const [blocos, setBlocos] = useState<Bloco[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const recarregar = useCallback(async () => {
    const { data, error } = await supabase.from('compromissos')
      .select('id,titulo,tipo,dias_semana,data,inicio,fim,ativo')
      .eq('ativo', true).or(`data.is.null,data.gte.${somarDias(hojeISO(), -60)}`)
      .order('inicio')
    setErro(error ? 'Não foi possível carregar a agenda. Confira a internet.' : '')
    setBlocos((data ?? []) as Bloco[])
    setCarregando(false)
  }, [])

  useEffect(() => { recarregar() }, [recarregar])
  return { blocos, carregando, erro, recarregar }
}

/** Blocos que acontecem numa data: os fixos daquele dia da semana e os avulsos daquela data. */
export function blocosDoDia(blocos: Bloco[], data: string) {
  const dia = diaDaSemana(data)
  return blocos
    .filter((b) => (b.data ? b.data === data : b.dias_semana?.includes(dia)))
    .sort((a, b) => a.inicio.localeCompare(b.inicio) || a.fim.localeCompare(b.fim))
}

const choca = (a: Pick<Bloco, 'inicio' | 'fim'>, b: Pick<Bloco, 'inicio' | 'fim'>) =>
  minutosDe(a.inicio) < minutosDe(b.fim) && minutosDe(b.inicio) < minutosDe(a.fim)

/** Ids dos blocos de um mesmo dia que se sobrepõem. */
export function conflitos(doDia: Bloco[]) {
  const ids = new Set<string>()
  for (let i = 0; i < doDia.length; i++)
    for (let j = i + 1; j < doDia.length; j++)
      if (choca(doDia[i], doDia[j])) { ids.add(doDia[i].id); ids.add(doDia[j].id) }
  return ids
}

/** Nomes dos blocos com que um bloco novo (ou editado) choca, em qualquer um dos seus dias. */
export function conflitosCom(
  novo: { id?: string; inicio: string; fim: string; dias_semana: number[] | null; data: string | null },
  blocos: Bloco[],
) {
  if (!novo.inicio || !novo.fim || minutosDe(novo.fim) <= minutosDe(novo.inicio)) return []
  const outros = blocos.filter((b) => b.id !== novo.id)
  const nomes = new Set<string>()
  if (novo.data) {
    for (const b of blocosDoDia(outros, novo.data)) if (choca(novo, b)) nomes.add(b.titulo)
  } else {
    for (const b of outros) {
      const mesmoDia = b.data
        ? b.data >= hojeISO() && novo.dias_semana!.includes(diaDaSemana(b.data))
        : b.dias_semana?.some((d) => novo.dias_semana!.includes(d))
      if (mesmoDia && choca(novo, b)) nomes.add(b.titulo)
    }
  }
  return [...nomes]
}

/** Minutos planejados de cada tipo na semana que começa na segunda `semana`. */
export function horasSemana(blocos: Bloco[], semana: string) {
  const total: Record<TipoBloco, number> = { trabalho: 0, estudo: 0, pessoal: 0, protegido: 0 }
  for (let i = 0; i < 7; i++)
    for (const b of blocosDoDia(blocos, somarDias(semana, i))) total[b.tipo] += Math.max(duracaoBloco(b), 0)
  return total
}

/* ---------------- Tarefas ---------------- */

export function useTarefas() {
  const [pendentes, setPendentes] = useState<Tarefa[]>([])
  const [feitas, setFeitas] = useState<Tarefa[]>([])
  const [carregando, setCarregando] = useState(true)

  const recarregar = useCallback(async () => {
    const [p, f] = await Promise.all([
      supabase.from('tarefas').select('id,titulo,data,feita,criado_em').eq('feita', false),
      supabase.from('tarefas').select('id,titulo,data,feita,criado_em').eq('feita', true).order('criado_em', { ascending: false }).limit(15),
    ])
    setPendentes(ordenarTarefas((p.data ?? []) as Tarefa[]))
    setFeitas((f.data ?? []) as Tarefa[])
    setCarregando(false)
  }, [])

  useEffect(() => { recarregar() }, [recarregar])

  async function criar(titulo: string, data: string | null) {
    const { error } = await supabase.from('tarefas').insert({ titulo: titulo.trim(), data })
    if (!error) recarregar()
    return !error
  }
  async function alternar(t: Tarefa) {
    const nova = { ...t, feita: !t.feita }
    // muda na tela na hora
    if (nova.feita) { setPendentes((l) => l.filter((x) => x.id !== t.id)); setFeitas((l) => [nova, ...l]) }
    else { setFeitas((l) => l.filter((x) => x.id !== t.id)); setPendentes((l) => ordenarTarefas([...l, nova])) }
    const { error } = await supabase.from('tarefas').update({ feita: nova.feita }).eq('id', t.id)
    if (error) recarregar()
    return !error
  }
  async function apagar(t: Tarefa) {
    setPendentes((l) => l.filter((x) => x.id !== t.id)); setFeitas((l) => l.filter((x) => x.id !== t.id))
    await supabase.from('tarefas').delete().eq('id', t.id)
  }

  return { pendentes, feitas, carregando, criar, alternar, apagar, recarregar }
}

/** Atrasadas e de hoje primeiro (por data), depois as futuras, por último as sem data. */
export function ordenarTarefas(lista: Tarefa[]) {
  return [...lista].sort((a, b) => {
    if (a.data && b.data) return a.data.localeCompare(b.data) || a.criado_em.localeCompare(b.criado_em)
    if (a.data) return -1
    if (b.data) return 1
    return a.criado_em.localeCompare(b.criado_em)
  })
}

export function rotuloData(data: string | null, hoje = hojeISO()) {
  if (!data) return ''
  if (data < hoje) return 'Atrasada'
  if (data === hoje) return 'Hoje'
  if (data === somarDias(hoje, 1)) return 'Amanhã'
  const [, m, d] = data.split('-')
  return `${Number(d)}/${m}`
}
