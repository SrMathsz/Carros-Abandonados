-- =====================================================================
-- Carros Abandonados: estrutura do banco no Supabase
-- Cole este arquivo inteiro no SQL Editor do Supabase e clique em Run.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------
create table if not exists public.registros (
  id            uuid primary key default gen_random_uuid(),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  endereco      text not null check (char_length(endereco) between 3 and 200),
  descricao     text not null check (char_length(descricao) between 2 and 120),
  placa         text check (placa is null or placa ~ '^[A-Z]{3}-?[0-9][A-Z0-9][0-9]{2}$'),
  lat           double precision not null check (lat between -90 and 90),
  lng           double precision not null check (lng between -180 and 180),
  foto_path     text,
  status        text not null default 'pendente'
                check (status in ('pendente', 'vistoriado', 'recolhido'))
);

create index if not exists registros_status_idx on public.registros (status);
create index if not exists registros_criado_idx on public.registros (criado_em desc);

-- Funcionários da prefeitura autorizados a ver e atualizar os registros
create table if not exists public.agentes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nome    text
);

-- Atualiza "atualizado_em" a cada mudança
create or replace function public.tocar_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists registros_atualizado on public.registros;
create trigger registros_atualizado
  before update on public.registros
  for each row execute function public.tocar_atualizado_em();

-- Retorna true quando quem está logado consta na tabela de agentes
create or replace function public.eh_agente()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.agentes where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------
-- Segurança (RLS): quem pode fazer o quê
-- ---------------------------------------------------------------------
alter table public.registros enable row level security;
alter table public.agentes   enable row level security;

drop policy if exists "cidadao envia registro" on public.registros;
create policy "cidadao envia registro" on public.registros
  for insert to anon, authenticated
  with check (status = 'pendente');

drop policy if exists "agente le registros" on public.registros;
create policy "agente le registros" on public.registros
  for select to authenticated
  using (public.eh_agente());

drop policy if exists "agente atualiza registros" on public.registros;
create policy "agente atualiza registros" on public.registros
  for update to authenticated
  using (public.eh_agente())
  with check (public.eh_agente());

drop policy if exists "agente ve a si mesmo" on public.agentes;
create policy "agente ve a si mesmo" on public.agentes
  for select to authenticated
  using (user_id = auth.uid());

-- Permissões por coluna: o cidadão só pode enviar os campos do formulário
-- e a prefeitura só pode alterar a situação.
revoke all on public.registros from anon, authenticated;
grant insert (id, endereco, descricao, placa, lat, lng, foto_path)
  on public.registros to anon, authenticated;
grant select on public.registros to authenticated;
grant update (status) on public.registros to authenticated;

revoke all on public.agentes from anon, authenticated;
grant select on public.agentes to authenticated;

-- ---------------------------------------------------------------------
-- Visão pública: só posição e situação, sem foto, placa nem endereço.
-- Serve para o cidadão ver o que já foi registrado e evitar duplicados.
-- ---------------------------------------------------------------------
create or replace view public.registros_publicos as
  select id, lat, lng, status
  from public.registros
  where status <> 'recolhido';

grant select on public.registros_publicos to anon, authenticated;

-- ---------------------------------------------------------------------
-- Fotos (Storage): bucket privado
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

drop policy if exists "cidadao envia foto" on storage.objects;
create policy "cidadao envia foto" on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'fotos'
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'
  );

drop policy if exists "agente le foto" on storage.objects;
create policy "agente le foto" on storage.objects
  for select to authenticated
  using (bucket_id = 'fotos' and public.eh_agente());

-- ---------------------------------------------------------------------
-- Atualização em tempo real da lista da prefeitura
-- ---------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.registros;
exception when duplicate_object then
  null;
end;
$$;
