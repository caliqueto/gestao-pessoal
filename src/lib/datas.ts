// Datas sempre como texto 'AAAA-MM-DD' no fuso do aparelho, para nunca virar o dia errado por causa de UTC.

const dois = (n: number) => String(n).padStart(2, '0')

export function iso(d: Date) {
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`
}
export const hojeISO = () => iso(new Date())

export function deISO(s: string) {
  const [a, m, d] = s.split('-').map(Number)
  return new Date(a, m - 1, d)
}

/** Mês no formato 'AAAA-MM' */
export const mesDe = (s: string) => s.slice(0, 7)
export const mesAtual = () => mesDe(hojeISO())

export function somarMeses(mes: string, n: number) {
  const [a, m] = mes.split('-').map(Number)
  const d = new Date(a, m - 1 + n, 1)
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}`
}
export function diasNoMes(mes: string) {
  const [a, m] = mes.split('-').map(Number)
  return new Date(a, m, 0).getDate()
}
export const primeiroDia = (mes: string) => `${mes}-01`
export const ultimoDia = (mes: string) => `${mes}-${dois(diasNoMes(mes))}`

export function nomeMes(mes: string, curto = false) {
  const t = deISO(primeiroDia(mes)).toLocaleDateString('pt-BR', { month: curto ? 'short' : 'long', year: curto ? undefined : 'numeric' })
  return (t.charAt(0).toUpperCase() + t.slice(1)).replace('.', '').replace(' de ', ' ')
}
export function nomeDia(s: string) {
  const hoje = hojeISO()
  if (s === hoje) return 'Hoje'
  if (s === iso(new Date(Date.now() - 864e5))) return 'Ontem'
  return deISO(s).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '')
}

const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const reais = (v: number) => fmt.format(v)

/** Lê '12,50', '1.234,5' ou '12.5' e devolve número (ou NaN) */
export function lerValor(t: string) {
  let s = t.replace(/[^\d.,]/g, '')
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  return s ? Number(s) : NaN
}
