-- =============================================================
-- Fase 1 — gastos fixos automáticos
-- Cole no Supabase > SQL Editor > New query > Run.
-- Pode rodar mais de uma vez sem problema.
-- =============================================================

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
