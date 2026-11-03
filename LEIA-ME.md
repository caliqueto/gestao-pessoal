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

## Atualizar para uma fase nova

Cada fase nova vem com o projeto completo e, quando precisa, um arquivo `supabase/faseN.sql`.

1. **Banco:** no Supabase, abra **SQL Editor → New query**, cole o conteúdo do `faseN.sql` e clique em **Run**.
2. **Código:** no GitHub, abra o repositório → **Add file → Upload files** → arraste de novo todo o
   conteúdo da pasta (menos `node_modules`, `dist` e `.env`) → **Commit changes**. Arquivos com o
   mesmo nome são substituídos.
3. A Vercel percebe a mudança e publica sozinha em um ou dois minutos. No celular, feche e abra o app
   (se ainda aparecer a versão antiga, abra uma vez pelo navegador).

## Fase 1 — Finanças (entregue)

- **Lançar em dois toques:** botão **+** → digite o valor → toque na categoria, que já salva.
  "Adicionar descrição ou outra data" para lançar algo de outro dia.
- **Termômetro:** saldo do mês, cor (verde, amarelo, vermelho) e previsão de como o mês fecha.
  - Verde: deve sobrar 10% ou mais do que entrou. Amarelo: sobra menos que isso. Vermelho: falta.
  - A previsão soma os fixos que ainda vão cair e projeta os gastos do dia a dia pelo ritmo do mês.
    Até o dia 10, usa também o ritmo dos meses anteriores, para uma compra grande no começo não distorcer.
- **Limites por categoria:** em "Categorias e limites", digite o limite mensal. Passou de 80%, fica amarelo
  e avisa quanto resta; passou de 100%, fica vermelho. As mais apertadas aparecem também no Hoje.
- **Gastos e entradas fixos:** cadastre uma vez (aluguel, internet, mentoria, salário) e eles são
  lançados sozinhos no dia do vencimento, quando você abre o app. Dia 31 vira o último dia do mês.
- **Pizza dos gastos, dia a dia (Data, Entrada, Saída, Diário, Saldo) e últimos 6 meses lado a lado.**
- **Metas de economia** com barra de progresso, e **autocuidado**: marque quais categorias contam.

## Fase 2 — Hábitos e estudos (entregue)

Não precisa rodar SQL nesta fase: as tabelas já existiam desde a Fase 0. Só subir o código.

- **Hábitos de hoje** (no Hoje e na Rotina): um toque marca, outro desmarca. Mostra a sequência de dias.
  - A sequência conta só os dias escolhidos: um hábito de dias úteis não quebra no fim de semana.
  - Hoje ainda não marcado não quebra a sequência; ela só zera se um dia previsto passar em branco.
- **Calendário do mês** por hábito: toque num dia que passou para marcar o que esqueceu.
  Verde/colorido = feito, avermelhado = previsto e não feito, apagado = folga.
- **Criar, editar e arquivar hábitos**, com dias da semana e cor. Arquivar guarda o histórico.
- **Cronômetro de estudo:** "Começar a estudar" → "Parar" → confira os minutos → "Salvar".
  Continua contando com o app fechado, mas só no aparelho em que você começou.
  Se esqueceu ligado, corrija os minutos antes de salvar.
- **Registrar sem cronômetro** para estudos que você fez longe do app (escolhe o dia e os minutos).
- **Meta semanal de horas**, barra de progresso, barras de segunda a domingo com a linha do ritmo da meta
  e a lista de sessões da semana. As setas mostram semanas anteriores.

## Fase 3 — Rotina e agenda (entregue)

Não precisa rodar SQL nesta fase. Só subir o código.

- **A aba Rotina agora tem três partes:** Agenda, Estudos e Hábitos. Ela lembra a última que você abriu.
- **Blocos na agenda**, de quatro tipos: Trabalho, Estudo, Pessoal e **Protegido** (tempo só seu, sem trabalho).
  - "Toda semana" repete nos dias escolhidos; "Só uma vez" vale para uma data (ex.: dentista).
  - Se um bloco bater no horário de outro, o app avisa, mas deixa salvar.
  - Blocos que passam da meia-noite: divida em dois (ex.: 23h–0h e 0h–1h).
  - Toque num bloco para editar ou remover.
- **Visão Dia e Semana**, com setas para navegar. Na semana, o **+** de cada dia adiciona um bloco nele.
- **Horas planejadas na semana:** quanto vai para trabalho, estudo e para você, e o estudo planejado
  comparado com o que você realmente estudou no cronômetro.
- **Tarefas** com data (hoje, amanhã, outro dia) ou sem data. As atrasadas aparecem em vermelho.
- **No Hoje:** o que está acontecendo agora, o próximo bloco, a linha do dia e as tarefas de hoje.
- **Revisão de domingo:** no fim de semana, o Hoje mostra o botão "Planejar a semana que vem",
  que abre a agenda já na semana seguinte.

## Fases 4 e 5 — Pilares, metas, check-in e diário (entregues)

Não precisa rodar SQL. Só subir o código.

**Pilares**
- Nota de 1 a 10 por pilar, uma vez por semana, e uma meta pequena opcional para cada um.
- Gráfico de teia: esta semana (linha cheia) comparada com a anterior (tracejada), com a média.
- Mapa das últimas 8 semanas: verde de 7 a 10, amarelo 5 e 6, vermelho abaixo de 5.
- Aviso quando um pilar fica abaixo de 5 por três semanas seguidas.
- "Editar pilares": renomear, mudar a ordem, desligar (guarda o histórico) e criar novos.

**Metas**
- Metas com pilar, prazo e passos. A barra mostra os passos feitos; o cartão mostra o próximo passo.
- Concluir, pausar, reabrir ou apagar uma meta.
- **Check-in da semana** com três perguntas. Mostra o que você quis mudar na semana anterior.
- **Diário:** "Como foi o dia" (salva ao sair do campo) e uma lista de gratidão por dia.

**Hoje**
- **Intenção do dia** embaixo da saudação. Toque para escrever ou mudar.
- No fim de semana, o cartão **Revisão da semana** aparece no topo com os três passos:
  notas dos pilares, check-in e planejar a semana que vem. Cada um leva para a tela certa.

## Cartões de crédito (entregue)

**Precisa rodar SQL:** no Supabase, SQL Editor → New query → cole o conteúdo de `supabase/cartoes.sql` → Run.
Sem isso o resto do app funciona, mas a parte de cartões mostra um aviso pedindo para rodar o arquivo.

- **Cadastrar o cartão** (Finanças → Cartões de crédito): nome, dia que fecha, dia que vence, limite e um
  teto opcional de quanto você quer gastar por fatura. Os dias aparecem no app do banco.
- **Lançar no cartão:** no lançamento rápido, escolha "Pix ou débito" ou o cartão. No cartão dá para
  parcelar (1x a 12x); o app mostra o valor da parcela e em qual fatura cai. Ele lembra a última forma
  de pagamento usada naquele aparelho.
- **Regra de fatura:** compra até a véspera do fechamento cai na fatura do mês; no dia do fechamento ou
  depois, na do mês seguinte.
- **Sem contar duas vezes:** a compra (ou cada parcela, no mês dela) já conta como gasto. Ao pagar a fatura,
  **não lance o pagamento**: só toque em "Marcar como paga".
- **Painel de cada cartão:** fatura aberta e quantos dias faltam para fechar, avanço do teto (avisa em 80%),
  última fatura fechada com o vencimento, o que já está comprometido nas próximas 3 faturas e o limite usado.
- **No Hoje:** quanto já está nas faturas abertas, aviso de teto passando de 80% e de fatura vencida não marcada.
- **Fixos no cartão:** assinaturas podem ser cadastradas como fixo "no cartão" e caem na fatura certa.
- Apagar uma compra parcelada apaga todas as parcelas dela.

## Próxima fase

**Fase 6 — Acabamentos** (depois de uma ou duas semanas de uso): cartão de crédito e fatura,
notificações, exportar em planilha, backup e os ajustes que o uso mostrar.
