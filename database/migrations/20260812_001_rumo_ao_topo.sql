-- PREMAZON RH 360
-- Fundação organizacional + módulo Rumo ao Topo
-- O banco atual está vazio; esta migração pode remodelar as tabelas sem perda de registros.

create extension if not exists pgcrypto;

do $$ begin
  create type public.perfil_acesso as enum ('administrador', 'diretoria', 'rh', 'gestor', 'instrutor', 'colaborador');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.status_importacao as enum ('processando', 'concluida', 'concluida_com_avisos', 'falhou', 'cancelada');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.status_ciclo_premiacao as enum ('rascunho', 'em_revisao', 'aprovado', 'pago', 'cancelado');
exception when duplicate_object then null;
end $$;

create table if not exists public.filiais (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  codigo text unique,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.setores (
  id uuid primary key default gen_random_uuid(),
  filial_id uuid references public.filiais(id) on delete restrict,
  nome text not null,
  codigo text,
  descricao text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (filial_id, nome)
);

-- Compatibilidade com o schema inicial já criado, porém ainda vazio.
alter table public.setores add column if not exists filial_id uuid references public.filiais(id) on delete restrict;
alter table public.setores add column if not exists codigo text;
alter table public.setores add column if not exists ativo boolean not null default true;
alter table public.setores add column if not exists atualizado_em timestamptz not null default now();
create unique index if not exists idx_setores_filial_nome on public.setores(filial_id, nome);

create table if not exists public.equipes (
  id uuid primary key default gen_random_uuid(),
  setor_id uuid not null references public.setores(id) on delete restrict,
  nome text not null,
  codigo text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (setor_id, nome)
);

-- O colaborador existe independentemente de possuir uma conta no sistema.
create table if not exists public.colaboradores_v2 (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  matricula text unique,
  nome text not null,
  cpf text unique,
  email text,
  telefone text,
  cargo_id uuid references public.cargos(id) on delete set null,
  setor_id uuid references public.setores(id) on delete set null,
  equipe_id uuid references public.equipes(id) on delete set null,
  gestor_id uuid references public.colaboradores_v2(id) on delete set null,
  data_admissao date,
  data_desligamento date,
  status text not null default 'ativo' check (status in ('ativo', 'afastado', 'ferias', 'desligado')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.perfis_usuario (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  colaborador_id uuid unique references public.colaboradores_v2(id) on delete set null,
  perfil public.perfil_acesso not null default 'colaborador',
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.rumo_topo_programas (
  id uuid primary key default gen_random_uuid(),
  nome text not null default 'Rumo ao Topo',
  descricao text,
  valor_padrao numeric(12,2) not null default 100 check (valor_padrao >= 0),
  regras jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.rumo_topo_ciclos (
  id uuid primary key default gen_random_uuid(),
  programa_id uuid not null references public.rumo_topo_programas(id) on delete restrict,
  referencia date not null,
  data_inicio date,
  data_fim date,
  valor_premiacao numeric(12,2) not null check (valor_premiacao >= 0),
  status public.status_ciclo_premiacao not null default 'rascunho',
  observacoes text,
  aprovado_por uuid references auth.users(id) on delete set null,
  aprovado_em timestamptz,
  criado_por uuid not null default auth.uid() references auth.users(id) on delete restrict,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (programa_id, referencia)
);

create table if not exists public.rumo_topo_importacoes (
  id uuid primary key default gen_random_uuid(),
  ciclo_id uuid not null references public.rumo_topo_ciclos(id) on delete cascade,
  nome_arquivo text not null,
  tamanho_arquivo bigint,
  hash_arquivo text,
  status public.status_importacao not null default 'processando',
  total_linhas integer not null default 0,
  linhas_validas integer not null default 0,
  linhas_rejeitadas integer not null default 0,
  avisos jsonb not null default '[]'::jsonb,
  metadados jsonb not null default '{}'::jsonb,
  importado_por uuid not null default auth.uid() references auth.users(id) on delete restrict,
  importado_em timestamptz not null default now(),
  finalizado_em timestamptz
);

create table if not exists public.rumo_topo_resultados (
  id uuid primary key default gen_random_uuid(),
  ciclo_id uuid not null references public.rumo_topo_ciclos(id) on delete cascade,
  importacao_id uuid not null references public.rumo_topo_importacoes(id) on delete cascade,
  colaborador_id uuid references public.colaboradores_v2(id) on delete set null,
  colaborador_nome_importado text not null,
  matricula_importada text,
  setor_importado text,
  equipe_importada text,
  funcao_importada text,
  bonus_original text,
  elegivel boolean not null default false,
  motivo_ineligibilidade text,
  valor_bonus numeric(12,2) not null default 0 check (valor_bonus >= 0),
  faltas integer not null default 0 check (faltas >= 0),
  atrasos integer not null default 0 check (atrasos >= 0),
  atestados integer not null default 0 check (atestados >= 0),
  ferias boolean not null default false,
  dds text,
  observacoes text,
  linha_original integer,
  dados_origem jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create table if not exists public.auditoria_eventos (
  id bigint generated always as identity primary key,
  entidade text not null,
  entidade_id uuid,
  acao text not null,
  dados_anteriores jsonb,
  dados_novos jsonb,
  usuario_id uuid default auth.uid() references auth.users(id) on delete set null,
  criado_em timestamptz not null default now()
);

create index if not exists idx_rumo_topo_ciclos_referencia on public.rumo_topo_ciclos(referencia desc);
create index if not exists idx_rumo_topo_resultados_ciclo on public.rumo_topo_resultados(ciclo_id);
create index if not exists idx_rumo_topo_resultados_colaborador on public.rumo_topo_resultados(colaborador_id);
create index if not exists idx_rumo_topo_resultados_setor on public.rumo_topo_resultados(setor_importado);
create index if not exists idx_rumo_topo_importacoes_ciclo on public.rumo_topo_importacoes(ciclo_id, importado_em desc);
create unique index if not exists idx_rumo_topo_resultados_importacao_linha
  on public.rumo_topo_resultados(importacao_id, linha_original)
  where linha_original is not null;

create or replace function public.tem_perfil(perfis public.perfil_acesso[])
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.perfis_usuario p
    where p.auth_user_id = auth.uid()
      and p.ativo
      and p.perfil = any(perfis)
  );
$$;

create or replace function public.registrar_auditoria_rumo_topo()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.auditoria_eventos(entidade, entidade_id, acao, dados_anteriores, dados_novos)
  values (
    tg_table_name,
    case when tg_op = 'DELETE' then old.id else new.id end,
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function public.vincular_resultado_colaborador()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.colaborador_id is null and nullif(trim(new.matricula_importada), '') is not null then
    select c.id into new.colaborador_id
    from public.colaboradores_v2 c
    where c.matricula = trim(new.matricula_importada)
    limit 1;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_auditoria_rumo_topo_ciclos on public.rumo_topo_ciclos;
create trigger trg_auditoria_rumo_topo_ciclos
after insert or update or delete on public.rumo_topo_ciclos
for each row execute function public.registrar_auditoria_rumo_topo();

drop trigger if exists trg_auditoria_rumo_topo_resultados on public.rumo_topo_resultados;
create trigger trg_auditoria_rumo_topo_resultados
after insert or update or delete on public.rumo_topo_resultados
for each row execute function public.registrar_auditoria_rumo_topo();

drop trigger if exists trg_auditoria_rumo_topo_importacoes on public.rumo_topo_importacoes;
create trigger trg_auditoria_rumo_topo_importacoes
after insert or update or delete on public.rumo_topo_importacoes
for each row execute function public.registrar_auditoria_rumo_topo();

drop trigger if exists trg_vincular_resultado_colaborador on public.rumo_topo_resultados;
create trigger trg_vincular_resultado_colaborador
before insert or update of matricula_importada on public.rumo_topo_resultados
for each row execute function public.vincular_resultado_colaborador();

alter table public.filiais enable row level security;
alter table public.setores enable row level security;
alter table public.equipes enable row level security;
alter table public.colaboradores_v2 enable row level security;
alter table public.perfis_usuario enable row level security;
alter table public.rumo_topo_programas enable row level security;
alter table public.rumo_topo_ciclos enable row level security;
alter table public.rumo_topo_importacoes enable row level security;
alter table public.rumo_topo_resultados enable row level security;
alter table public.auditoria_eventos enable row level security;

drop policy if exists "estrutura leitura autenticada" on public.filiais;
create policy "estrutura leitura autenticada" on public.filiais for select to authenticated using (true);
drop policy if exists "setores leitura autenticada" on public.setores;
create policy "setores leitura autenticada" on public.setores for select to authenticated using (true);
drop policy if exists "equipes leitura autenticada" on public.equipes;
create policy "equipes leitura autenticada" on public.equipes for select to authenticated using (true);

drop policy if exists "administracao estrutura" on public.filiais;
create policy "administracao estrutura" on public.filiais for all to authenticated
using (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]))
with check (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));
drop policy if exists "administracao setores" on public.setores;
create policy "administracao setores" on public.setores for all to authenticated
using (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]))
with check (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));
drop policy if exists "administracao equipes" on public.equipes;
create policy "administracao equipes" on public.equipes for all to authenticated
using (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]))
with check (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));

drop policy if exists "colaborador le proprio cadastro" on public.colaboradores_v2;
create policy "colaborador le proprio cadastro" on public.colaboradores_v2 for select to authenticated
using (auth_user_id = auth.uid() or public.tem_perfil(array['administrador','diretoria','rh','gestor']::public.perfil_acesso[]));
drop policy if exists "rh gerencia colaboradores" on public.colaboradores_v2;
create policy "rh gerencia colaboradores" on public.colaboradores_v2 for all to authenticated
using (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]))
with check (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));

drop policy if exists "usuario le proprio perfil" on public.perfis_usuario;
create policy "usuario le proprio perfil" on public.perfis_usuario for select to authenticated
using (auth_user_id = auth.uid() or public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));
drop policy if exists "administrador gerencia perfis" on public.perfis_usuario;
create policy "administrador gerencia perfis" on public.perfis_usuario for all to authenticated
using (public.tem_perfil(array['administrador']::public.perfil_acesso[]))
with check (public.tem_perfil(array['administrador']::public.perfil_acesso[]));

drop policy if exists "gestao le rumo topo" on public.rumo_topo_programas;
create policy "gestao le rumo topo" on public.rumo_topo_programas for select to authenticated
using (public.tem_perfil(array['administrador','diretoria','rh','gestor']::public.perfil_acesso[]));
drop policy if exists "rh gerencia rumo topo" on public.rumo_topo_programas;
create policy "rh gerencia rumo topo" on public.rumo_topo_programas for all to authenticated
using (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]))
with check (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));

drop policy if exists "gestao le ciclos" on public.rumo_topo_ciclos;
create policy "gestao le ciclos" on public.rumo_topo_ciclos for select to authenticated
using (public.tem_perfil(array['administrador','diretoria','rh','gestor']::public.perfil_acesso[]));
drop policy if exists "rh gerencia ciclos" on public.rumo_topo_ciclos;
create policy "rh gerencia ciclos" on public.rumo_topo_ciclos for all to authenticated
using (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]))
with check (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));

drop policy if exists "rh gerencia importacoes" on public.rumo_topo_importacoes;
create policy "rh gerencia importacoes" on public.rumo_topo_importacoes for all to authenticated
using (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]))
with check (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));
drop policy if exists "gestao le importacoes" on public.rumo_topo_importacoes;
create policy "gestao le importacoes" on public.rumo_topo_importacoes for select to authenticated
using (public.tem_perfil(array['administrador','diretoria','rh','gestor']::public.perfil_acesso[]));

drop policy if exists "gestao le resultados" on public.rumo_topo_resultados;
create policy "gestao le resultados" on public.rumo_topo_resultados for select to authenticated
using (public.tem_perfil(array['administrador','diretoria','rh','gestor']::public.perfil_acesso[]));
drop policy if exists "rh gerencia resultados" on public.rumo_topo_resultados;
create policy "rh gerencia resultados" on public.rumo_topo_resultados for all to authenticated
using (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]))
with check (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));

drop policy if exists "administracao le auditoria" on public.auditoria_eventos;
create policy "administracao le auditoria" on public.auditoria_eventos for select to authenticated
using (public.tem_perfil(array['administrador','diretoria','rh']::public.perfil_acesso[]));

insert into public.rumo_topo_programas(nome, descricao, valor_padrao, regras)
select 'Rumo ao Topo', 'Programa de reconhecimento por assiduidade e critérios definidos pelo RH.', 100,
       '{"versao":"1.0","regra_inicial":"Elegibilidade importada da planilha; férias não recebem premiação."}'::jsonb
where not exists (select 1 from public.rumo_topo_programas where nome = 'Rumo ao Topo');

comment on table public.rumo_topo_resultados is 'Resultado auditável por colaborador e ciclo. A planilha é entrada; o banco mantém o histórico.';
comment on column public.rumo_topo_resultados.dados_origem is 'Linha original normalizada para rastreabilidade da importação.';
