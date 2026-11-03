-- =============================================================
-- Gestão Pessoal — banco de dados completo (todas as fases)
-- Cole tudo no Supabase > SQL Editor > New query > Run.
-- Pode rodar de novo sem problema: só cria o que ainda não existe.
-- =============================================================

-- Cada tabela tem user_id ligado ao login, e a segurança (RLS)
-- garante que cada conta só enxerga os próprios dados.

-- Preferências da conta (tema, cor de destaque, dia da revisão)
create table if not exists preferencias (
  user_id uuid primary key references auth.users on delete cascade default auth.uid(),
  tema text not null default 'escuro' check (tema in ('escuro','claro')),
  cor_destaque text not null default '#7c9cff',
  dia_revisao smallint not null default 0 check (dia_revisao between 0 and 6), -- 0 = domingo
  meta_horas_estudo numeric(4,1),
  criado_em timestamptz not null default now()
);

-- ---------- Pilares da vida ----------
create table if not exists pilares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  nome text not null,
  cor text not null default '#7c9cff',
  ordem smallint not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists notas_semanais (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  pilar_id uuid not null references pilares on delete cascade,
  semana date not null, -- segunda-feira da semana
  nota smallint not null check (nota between 1 and 10),
  meta_semana text,
  unique (pilar_id, semana)
);

-- ---------- Rotina ----------
create table if not exists compromissos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  titulo text not null,
  tipo text not null default 'pessoal' check (tipo in ('trabalho','estudo','pessoal','protegido')),
  dias_semana smallint[],          -- preenchido quando se repete (0=dom ... 6=sáb)
  data date,                       -- preenchido quando é avulso
  inicio time not null,
  fim time not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  check (dias_semana is not null or data is not null)
);

create table if not exists tarefas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  titulo text not null,
  data date,
  feita boolean not null default false,
  criado_em timestamptz not null default now()
);

create table if not exists sessoes_estudo (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  inicio timestamptz not null,
  minutos integer not null check (minutos > 0),
  assunto text,
  criado_em timestamptz not null default now()
);

-- ---------- Hábitos ----------
create table if not exists habitos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  nome text not null,
  dias_semana smallint[] not null default '{0,1,2,3,4,5,6}',
  cor text not null default '#7c9cff',
  pilar_id uuid references pilares on delete set null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists marcacoes_habito (
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  habito_id uuid not null references habitos on delete cascade,
  data date not null,
  primary key (habito_id, data)
);

-- ---------- Finanças ----------
create table if not exists categorias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  nome text not null,
  tipo text not null default 'saida' check (tipo in ('entrada','saida')),
  cor text not null default '#7c9cff',
  limite_mensal numeric(12,2),
  autocuidado boolean not null default false,
  ativo boolean not null default true
);

create table if not exists lancamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  data date not null default current_date,
  tipo text not null check (tipo in ('entrada','saida')),
  valor numeric(12,2) not null check (valor > 0),
  categoria_id uuid references categorias on delete set null,
  descricao text,
  recorrente_id uuid, -- aponta para o gasto fixo que o gerou
  criado_em timestamptz not null default now()
);

create table if not exists recorrentes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  descricao text not null,
  tipo text not null default 'saida' check (tipo in ('entrada','saida')),
  valor numeric(12,2) not null check (valor > 0),
  categoria_id uuid references categorias on delete set null,
  dia_mes smallint not null check (dia_mes between 1 and 31),
  ativo boolean not null default true
);

create table if not exists metas_economia (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  nome text not null,
  valor_alvo numeric(12,2) not null check (valor_alvo > 0),
  valor_guardado numeric(12,2) not null default 0,
  prazo date,
  concluida boolean not null default false
);

-- ---------- Metas e diário ----------
create table if not exists metas_vida (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  titulo text not null,
  pilar_id uuid references pilares on delete set null,
  prazo date,
  status text not null default 'ativa' check (status in ('ativa','pausada','concluida')),
  criado_em timestamptz not null default now()
);

create table if not exists passos_meta (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  meta_id uuid not null references metas_vida on delete cascade,
  titulo text not null,
  prazo date,
  feito boolean not null default false,
  ordem smallint not null default 0
);

create table if not exists checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  semana date not null,
  foi_bom text,
  pesou text,
  quero_diferente text,
  criado_em timestamptz not null default now(),
  unique (user_id, semana)
);

create table if not exists diario (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  data date not null default current_date,
  tipo text not null default 'diario' check (tipo in ('diario','gratidao','intencao')),
  texto text not null,
  criado_em timestamptz not null default now()
);

-- ---------- Índices ----------
create index if not exists lancamentos_user_data on lancamentos (user_id, data);
create index if not exists marcacoes_user_data on marcacoes_habito (user_id, data);
create index if not exists sessoes_user_inicio on sessoes_estudo (user_id, inicio);
create index if not exists diario_user_data on diario (user_id, data);

-- ---------- Segurança: cada um só vê o que é seu ----------
do $$
declare t text;
begin
  foreach t in array array[
    'preferencias','pilares','notas_semanais','compromissos','tarefas','sessoes_estudo',
    'habitos','marcacoes_habito','categorias','lancamentos','recorrentes','metas_economia',
    'metas_vida','passos_meta','checkins','diario'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "dono" on %I', t);
    execute format(
      'create policy "dono" on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- ---------- Dados iniciais para cada conta nova ----------
create or replace function public.iniciar_conta()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into preferencias (user_id) values (new.id) on conflict do nothing;

  insert into pilares (user_id, nome, cor, ordem) values
    (new.id, 'Financeiro',          '#4ade80', 1),
    (new.id, 'Estudos',             '#7c9cff', 2),
    (new.id, 'Saúde e corpo',       '#f472b6', 3),
    (new.id, 'Sono e descanso',     '#a78bfa', 4),
    (new.id, 'Relacionamentos',     '#fb923c', 5),
    (new.id, 'Lazer e hobbies',     '#facc15', 6);

  insert into categorias (user_id, nome, tipo, cor, autocuidado) values
    (new.id, 'Salário',        'entrada', '#4ade80', false),
    (new.id, 'Extra',          'entrada', '#86efac', false),
    (new.id, 'Moradia',        'saida',   '#7c9cff', false),
    (new.id, 'Alimentação',    'saida',   '#fb923c', false),
    (new.id, 'Delivery',       'saida',   '#f87171', false),
    (new.id, 'Transporte',     'saida',   '#facc15', false),
    (new.id, 'Contas e assinaturas', 'saida', '#a78bfa', false),
    (new.id, 'Estudos',        'saida',   '#38bdf8', false),
    (new.id, 'Lazer',          'saida',   '#f472b6', false),
    (new.id, 'Autocuidado',    'saida',   '#e879f9', true),
    (new.id, 'Outros',         'saida',   '#9ca3af', false);

  insert into habitos (user_id, nome, cor) values
    (new.id, 'Estudar design',        '#7c9cff'),
    (new.id, 'Lançar gastos do dia',  '#4ade80');

  return new;
end $$;

drop trigger if exists ao_criar_conta on auth.users;
create trigger ao_criar_conta after insert on auth.users
  for each row execute function public.iniciar_conta();

-- Garante que um gasto fixo só é lançado uma vez por mês
create unique index if not exists lancamentos_recorrente_mes
  on lancamentos (recorrente_id, (date_trunc('month', data::timestamp)))
  where recorrente_id is not null;

-- Lança os gastos/entradas fixos do mês que já venceram (até a data "ate")
create or replace function public.gerar_recorrentes(ate date default current_date)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  inicio date := date_trunc('month', ate)::date;
  ultimo smallint := extract(day from (date_trunc('month', ate) + interval '1 month - 1 day'))::smallint;
  criados integer;
begin
  insert into lancamentos (user_id, data, tipo, valor, categoria_id, descricao, recorrente_id)
  select r.user_id,
         inicio + (least(r.dia_mes, ultimo) - 1),
         r.tipo, r.valor, r.categoria_id, r.descricao, r.id
  from recorrentes r
  where r.user_id = auth.uid()
    and r.ativo
    and inicio + (least(r.dia_mes, ultimo) - 1) <= ate
  on conflict do nothing;
  get diagnostics criados = row_count;
  return criados;
end $$;

grant execute on function public.gerar_recorrentes(date) to authenticated;
