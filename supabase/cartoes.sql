-- =============================================================
-- Cartões de crédito: cartões, parcelas, faturas e pagamentos
-- Cole no Supabase > SQL Editor > New query > Run.
-- Pode rodar mais de uma vez sem problema.
-- =============================================================

create table if not exists cartoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  nome text not null,
  cor text not null default '#a78bfa',
  dia_fechamento smallint not null check (dia_fechamento between 1 and 31),
  dia_vencimento smallint not null check (dia_vencimento between 1 and 31),
  limite numeric(12,2),
  meta_fatura numeric(12,2),      -- teto que eu quero gastar por fatura (opcional)
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Cada lançamento no cartão sabe em qual fatura cai e, se for parcelado, qual parcela é
alter table lancamentos add column if not exists cartao_id uuid references cartoes on delete set null;
alter table lancamentos add column if not exists fatura date;      -- 1º dia do mês em que a fatura fecha
alter table lancamentos add column if not exists parcela smallint;
alter table lancamentos add column if not exists parcelas smallint;
alter table lancamentos add column if not exists compra_id uuid;   -- junta as parcelas da mesma compra
create index if not exists lancamentos_cartao_fatura on lancamentos (user_id, cartao_id, fatura);

-- Fixos também podem ser no cartão (assinaturas, por exemplo)
alter table recorrentes add column if not exists cartao_id uuid references cartoes on delete set null;

-- Faturas marcadas como pagas (pagar não lança gasto: as compras já foram contadas)
create table if not exists faturas_pagas (
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  cartao_id uuid not null references cartoes on delete cascade,
  fatura date not null,
  paga_em timestamptz not null default now(),
  primary key (cartao_id, fatura)
);

do $$
declare t text;
begin
  foreach t in array array['cartoes','faturas_pagas'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "dono" on %I', t);
    execute format('create policy "dono" on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- Mês da fatura de uma compra: até a véspera do fechamento cai na fatura do mês;
-- do dia do fechamento em diante, na do mês seguinte.
create or replace function public.mes_fatura(d date, fechamento integer)
returns date language sql immutable as $$
  select case
    when extract(day from d) < least(fechamento, extract(day from (date_trunc('month', d) + interval '1 month - 1 day'))::int)
      then date_trunc('month', d)::date
    else (date_trunc('month', d) + interval '1 month')::date
  end
$$;

-- Lança os fixos do mês que já venceram, agora sabendo do cartão
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
  insert into lancamentos (user_id, data, tipo, valor, categoria_id, descricao, recorrente_id, cartao_id, fatura)
  select r.user_id,
         inicio + (least(r.dia_mes, ultimo) - 1),
         r.tipo, r.valor, r.categoria_id, r.descricao, r.id, r.cartao_id,
         case when c.id is null then null else mes_fatura(inicio + (least(r.dia_mes, ultimo) - 1), c.dia_fechamento) end
  from recorrentes r
  left join cartoes c on c.id = r.cartao_id
  where r.user_id = auth.uid()
    and r.ativo
    and inicio + (least(r.dia_mes, ultimo) - 1) <= ate
  on conflict do nothing;
  get diagnostics criados = row_count;
  return criados;
end $$;

grant execute on function public.gerar_recorrentes(date) to authenticated;
