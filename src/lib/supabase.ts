import { createClient } from '@supabase/supabase-js'

// usa só o começo do endereço (https://xxxx.supabase.co), mesmo que tenha sido colado com /rest/v1/ ou barra no fim
function limparUrl(bruta?: string) {
  try { return bruta ? new URL(bruta.trim()).origin : undefined } catch { return undefined }
}

const url = limparUrl(import.meta.env.VITE_SUPABASE_URL as string | undefined)
const chave = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()

export const configurado = Boolean(url && chave)

export const supabase = createClient(
  url || 'https://exemplo.supabase.co',
  chave || 'chave-ausente'
)
