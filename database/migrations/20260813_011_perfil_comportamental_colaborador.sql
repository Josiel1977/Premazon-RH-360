-- PREMAZON RH 360 · Questionário de Autopercepção Comportamental v0.12.0
-- Convites individuais, respostas versionadas, resultado auditável e acesso restrito.
-- Execute depois da migração 010.

insert into public.rh360_migracoes(versao, nome)
values ('011', 'Questionário de Autopercepção Comportamental')
on conflict (versao) do update set nome = excluded.nome;

create table if not exists public.td_perfil_convites (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores_v2(id) on delete restrict,
  public_token uuid not null unique default gen_random_uuid(),
  instrumento_versao text not null default 'rh-disc-24-v1.0',
  finalidade text not null default 'Autoconhecimento e desenvolvimento profissional',
  status text not null default 'pendente' check (status in ('pendente','concluido','revogado')),
  expira_em timestamptz not null default (now() + interval '7 days'),
  criado_por uuid references auth.users(id) on delete set null default auth.uid(),
  criado_em timestamptz not null default now(),
  concluido_em timestamptz,
  revogado_em timestamptz,
  check (expira_em > criado_em)
);

create table if not exists public.td_perfil_resultados (
  id uuid primary key default gen_random_uuid(),
  convite_id uuid not null unique references public.td_perfil_convites(id) on delete restrict,
  colaborador_id uuid not null references public.colaboradores_v2(id) on delete restrict,
  instrumento_versao text not null,
  algoritmo_versao text not null,
  respostas jsonb not null check (jsonb_typeof(respostas) = 'object'),
  pontuacoes jsonb not null check (jsonb_typeof(pontuacoes) = 'object'),
  percentuais jsonb not null check (jsonb_typeof(percentuais) = 'object'),
  dimensoes_predominantes text[] not null check (cardinality(dimensoes_predominantes) between 1 and 4),
  dimensao_secundaria text check (dimensao_secundaria is null or dimensao_secundaria in ('D','I','S','C')),
  perfil_combinado boolean not null default false,
  ciencia_privacidade boolean not null check (ciencia_privacidade),
  aviso_privacidade_versao text not null,
  iniciado_em timestamptz,
  concluido_em timestamptz not null default now(),
  duracao_segundos integer check (duracao_segundos is null or duracao_segundos between 0 and 86400),
  criado_em timestamptz not null default now(),
  check (dimensoes_predominantes <@ array['D','I','S','C']::text[])
);

create index if not exists idx_td_perfil_convites_colaborador on public.td_perfil_convites(colaborador_id, criado_em desc);
create index if not exists idx_td_perfil_convites_status_expira on public.td_perfil_convites(status, expira_em);
create index if not exists idx_td_perfil_resultados_colaborador on public.td_perfil_resultados(colaborador_id, concluido_em desc);

alter table public.td_perfil_convites enable row level security;
alter table public.td_perfil_resultados enable row level security;

drop policy if exists "rh gerencia convites perfil" on public.td_perfil_convites;
create policy "rh gerencia convites perfil"
on public.td_perfil_convites for all to authenticated
using (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]))
with check (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));

drop policy if exists "colaborador le proprio convite perfil" on public.td_perfil_convites;
create policy "colaborador le proprio convite perfil"
on public.td_perfil_convites for select to authenticated
using (
  exists (
    select 1 from public.perfis_usuario p
    where p.auth_user_id = auth.uid() and p.ativo and p.colaborador_id = td_perfil_convites.colaborador_id
  )
);

drop policy if exists "rh gerencia resultados perfil" on public.td_perfil_resultados;
create policy "rh gerencia resultados perfil"
on public.td_perfil_resultados for all to authenticated
using (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]))
with check (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));

drop policy if exists "colaborador le proprio resultado perfil" on public.td_perfil_resultados;
create policy "colaborador le proprio resultado perfil"
on public.td_perfil_resultados for select to authenticated
using (
  exists (
    select 1 from public.perfis_usuario p
    where p.auth_user_id = auth.uid() and p.ativo and p.colaborador_id = td_perfil_resultados.colaborador_id
  )
);

revoke all on public.td_perfil_convites, public.td_perfil_resultados from anon;
grant select,insert,update,delete on public.td_perfil_convites, public.td_perfil_resultados to authenticated;

create or replace function public.rh360_diagnostico_perfil_comportamental()
returns table(chave text,titulo text,categoria text,status text,detalhe text,acao text,criticidade text,ordem integer)
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if not public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]) then
    raise exception 'Acesso restrito.' using errcode='42501';
  end if;

  return query select * from(values
    (
      'migracao_011'::text,
      'Migração 011 · Perfil comportamental'::text,
      'Banco'::text,
      case when to_regclass('public.td_perfil_convites') is not null and to_regclass('public.td_perfil_resultados') is not null then 'ok' else 'erro' end::text,
      'Convites individuais e resultados versionados do questionário de autopercepção.'::text,
      'Execute a migração 011.'::text,
      'critica'::text,
      69
    ),
    (
      'rls_perfil_comportamental'::text,
      'RLS do perfil comportamental'::text,
      'Segurança'::text,
      case when (
        select count(*) = 2 from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='public' and c.relname in ('td_perfil_convites','td_perfil_resultados') and c.relrowsecurity
      ) then 'ok' else 'erro' end::text,
      'Convites e resultados individuais protegidos por perfil e titularidade.'::text,
      'Revise as políticas da migração 011.'::text,
      'critica'::text,
      114
    ),
    (
      'perfil_comportamental_versionado'::text,
      'Instrumento e algoritmo versionados'::text,
      'Aplicação'::text,
      case when exists(
        select 1 from information_schema.columns
        where table_schema='public' and table_name='td_perfil_resultados' and column_name='algoritmo_versao'
      ) then 'ok' else 'erro' end::text,
      'Cada resultado preserva a versão do questionário, do cálculo e do aviso apresentado.'::text,
      'Execute novamente a migração 011.'::text,
      'media'::text,
      115
    )
  ) d(chave,titulo,categoria,status,detalhe,acao,criticidade,ordem)
  order by d.ordem;
end;
$$;

revoke all on function public.rh360_diagnostico_perfil_comportamental() from public,anon;
grant execute on function public.rh360_diagnostico_perfil_comportamental() to authenticated;

comment on table public.td_perfil_convites is 'Links individuais e temporários para o questionário de autopercepção comportamental.';
comment on table public.td_perfil_resultados is 'Respostas e distribuição D/I/S/C versionadas; não constitui diagnóstico psicológico.';
comment on column public.td_perfil_resultados.respostas is 'Identificadores das alternativas escolhidas; interpretação restrita à finalidade de desenvolvimento.';
