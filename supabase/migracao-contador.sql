-- =====================================================================
-- Migração: contador de registros por placa
-- Para quem JÁ rodou o schema.sql antes. Cole no SQL Editor e clique em Run.
-- Pode ser rodada mais de uma vez sem problema.
-- =====================================================================

-- Placa sem hífen (ABC-1234 e ABC1234 viram a mesma chave)
alter table public.registros
  add column if not exists placa_chave text generated always as (replace(placa, '-', '')) stored;

create index if not exists registros_placa_chave_idx on public.registros (placa_chave);

-- Visão pública: um ponto por carro (o registro mais recente), com o total de
-- registros da mesma placa. Continua sem foto, placa nem endereço.
create or replace view public.registros_publicos as
  select distinct on (chave) id, lat, lng, status, (count(*) over (partition by chave))::int as total
  from (
    select id, lat, lng, status, criado_em, coalesce(placa_chave, id::text) as chave
    from public.registros
    where status <> 'recolhido'
  ) r
  order by chave, criado_em desc;

grant select on public.registros_publicos to anon, authenticated;
