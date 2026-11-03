# Gestão Pessoal — Fase 0 (base)

App pessoal de finanças, estudos, hábitos e metas. Esta fase entrega a base: login, menu de 5 abas,
tema escuro com cor de destaque trocável, instalação no celular e o banco de dados completo de todas
as fases. As abas mostram o que vai chegar em cada fase.

Tudo usa planos gratuitos: **Supabase** (banco de dados e login), **GitHub** (guarda o código) e
**Vercel** (coloca o site no ar).

---

## 1. Criar o banco no Supabase (uns 5 minutos)

1. Entre em https://supabase.com e crie uma conta (pode ser com o GitHub).
2. Clique em **New project**. Dê um nome (ex.: `gestao-pessoal`), crie uma senha forte para o banco
   (guarde num lugar seguro) e escolha a região **South America (São Paulo)**.
3. Quando o projeto terminar de criar, vá em **SQL Editor → New query**.
4. Abra o arquivo `supabase/schema.sql` deste projeto, copie tudo, cole lá e clique em **Run**.
   Deve aparecer "Success". Pode rodar de novo no futuro sem estragar nada.
5. Vá em **Project Settings → API** e anote dois valores:
   - **Project URL** (algo como `https://abcd.supabase.co`)
   - **anon public** key (uma chave longa)

## 2. Testar no computador (opcional)

Precisa do Node.js instalado (https://nodejs.org, versão LTS).

```bash
cd gestao-pessoal
cp .env.example .env      # no Windows: copy .env.example .env
# abra o .env e cole a Project URL e a anon key
npm install
npm run dev
```

Abra o endereço que aparecer (normalmente http://localhost:5173), clique em **Criar conta** e confirme
pelo e-mail que o Supabase enviar.

## 3. Colocar no ar com GitHub + Vercel

1. Crie uma conta em https://github.com e um repositório **privado** chamado `gestao-pessoal`.
2. Envie a pasta do projeto para ele. O jeito mais simples sem terminal: na página do repositório,
   **Add file → Upload files** e arraste todo o conteúdo da pasta, **menos** `node_modules`, `dist` e `.env`.
3. Entre em https://vercel.com com a conta do GitHub → **Add New → Project** → escolha `gestao-pessoal`.
4. Antes de clicar em Deploy, abra **Environment Variables** e adicione:
   - `VITE_SUPABASE_URL` = sua Project URL
   - `VITE_SUPABASE_ANON_KEY` = sua anon key
5. Clique em **Deploy**. Em um minuto sai um endereço tipo `https://gestao-pessoal-xxxx.vercel.app`.
6. Volte no Supabase em **Authentication → URL Configuration** e coloque esse endereço em **Site URL**.
   Assim o link de confirmação do e-mail abre o seu app e não o localhost.

## 4. Instalar no celular

- **Android (Chrome):** abra o endereço, toque nos três pontinhos → **Instalar app** (ou "Adicionar à tela inicial").
- **iPhone (Safari):** abra o endereço, toque em **Compartilhar → Adicionar à Tela de Início**.

Ele abre em tela cheia, com ícone próprio, e usa a mesma conta do computador.

---

## Sobre segurança

- A **anon key** pode ficar no site: quem protege os dados é a regra de segurança do banco (RLS),
  que só deixa cada conta ver o que é dela. Nunca coloque a chave **service_role** no app.
- O arquivo `.env` não vai para o GitHub (está no `.gitignore`).
- Se quiser que só você consiga criar conta: depois de criar a sua, vá em
  **Authentication → Sign In / Providers** e desligue **Allow new users to sign up**.

## Estrutura

```
supabase/schema.sql      banco completo de todas as fases + dados iniciais
src/main.tsx             rotas
src/lib/conta.tsx        login e preferências (tema, cor, dia da revisão)
src/components/Layout    menu de baixo (celular) / lateral (PC)
src/pages/               Hoje, Ajustes, Login e as abas das próximas fases
src/styles.css           cores e tipografia (troque a cor padrão em --destaque)
```

## Próxima fase

**Fase 1 — Hoje + Finanças:** lançar gastos em dois toques, limites por categoria com aviso em 80%,
termômetro do mês, pizza de gastos e gastos fixos automáticos. O banco já está pronto para ela.
