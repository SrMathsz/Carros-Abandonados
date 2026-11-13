-- =====================================================================
-- Migração: o campo "Carro" (descrição) passa a ser opcional
-- Para quem JÁ rodou o schema.sql antes. Cole no SQL Editor e clique em Run.
-- Pode ser rodada mais de uma vez sem problema.
-- =====================================================================

alter table public.registros alter column descricao drop not null;

alter table public.registros drop constraint if exists registros_descricao_check;
alter table public.registros
  add constraint registros_descricao_check
  check (descricao is null or char_length(descricao) between 1 and 120);
