import { useState, type FormEvent } from 'react'
import { supabase, configurado } from '../lib/supabase'

export default function Login() {
  const [modo, setModo] = useState<'entrar' | 'criar'>('entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro(''); setAviso(''); setEnviando(true)
    if (modo === 'entrar') {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
      if (error) setErro(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message)
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password: senha, options: { data: { nome } } })
      if (error) setErro(error.message)
      else if (!data.session) setAviso('Conta criada. Confirme pelo link que chegou no seu e-mail e depois entre.')
    }
    setEnviando(false)
  }

  return (
    <div className="tela-login">
      <form className="caixa" onSubmit={enviar}>
        <h1>Gestão Pessoal</h1>
        <p className="sub">Finanças, estudos e hábitos num lugar só.</p>

        {!configurado && (
          <p className="aviso erro">Falta ligar o app ao Supabase: preencha o arquivo .env (veja o LEIA-ME).</p>
        )}
        {erro && <p className="aviso erro" role="alert">{erro}</p>}
        {aviso && <p className="aviso" role="status">{aviso}</p>}

        {modo === 'criar' && (
          <div className="campo">
            <label htmlFor="nome">Como quer ser chamado</label>
            <input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="given-name" />
          </div>
        )}
        <div className="campo">
          <label htmlFor="email">E-mail</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <div className="campo">
          <label htmlFor="senha">Senha</label>
          <input id="senha" type="password" required minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)}
            autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} />
        </div>

        <button className="botao cheio" disabled={enviando || !configurado}>
          {enviando ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
        </button>
        <button type="button" className="link" onClick={() => { setModo(modo === 'entrar' ? 'criar' : 'entrar'); setErro(''); setAviso('') }}>
          {modo === 'entrar' ? 'Primeira vez? Criar conta' : 'Já tenho conta. Entrar'}
        </button>
      </form>
    </div>
  )
}
