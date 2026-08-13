-- PREMAZON RH 360 · Identificação protegida de candidatos v0.10.0
-- Acrescenta CPF protegido, filiação materna e nascimento ao cadastro público.
-- Execute depois da migração 009.

insert into public.rh360_migracoes(versao, nome)
values ('010', 'Identificação protegida de candidatos')
on conflict (versao) do update set nome = excluded.nome;

create table if not exists public.rs_candidatos_identificacao (
  candidatura_id uuid primary key references public.rs_candidaturas(id) on delete cascade,
  vaga_id uuid not null references public.rs_vagas(id) on delete restrict,
  cpf_hash text not null,
  cpf_final char(4) not null check (cpf_final ~ '^[0-9]{4}$'),
  nome_mae text not null check (char_length(nome_mae) between 3 and 180),
  data_nascimento date not null check (data_nascimento between date '1920-01-01' and date '2100-01-01'),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (vaga_id, cpf_hash)
);

drop trigger if exists trg_rs_identificacao_timestamp on public.rs_candidatos_identificacao;
create trigger trg_rs_identificacao_timestamp
before update on public.rs_candidatos_identificacao
for each row execute function public.rs_atualizar_timestamp();

alter table public.rs_candidatos_identificacao enable row level security;

drop policy if exists "rh le identificacao candidatos" on public.rs_candidatos_identificacao;
create policy "rh le identificacao candidatos"
on public.rs_candidatos_identificacao for select to authenticated
using (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));

drop policy if exists "rh gerencia identificacao candidatos" on public.rs_candidatos_identificacao;
create policy "rh gerencia identificacao candidatos"
on public.rs_candidatos_identificacao for all to authenticated
using (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]))
with check (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));

revoke all on public.rs_candidatos_identificacao from anon;
grant select,insert,update,delete on public.rs_candidatos_identificacao to authenticated;

create or replace function public.rh360_diagnostico_identificacao_candidatos()
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
      'migracao_010'::text,
      'Migração 010 · Identificação de candidatos'::text,
      'Banco'::text,
      case when to_regclass('public.rs_candidatos_identificacao') is not null then 'ok' else 'erro' end::text,
      'CPF protegido, filiação materna e nascimento separados da candidatura operacional.'::text,
      'Execute a migração 010.'::text,
      'critica'::text,
      68
    ),
    (
      'rls_identificacao_candidatos'::text,
      'RLS da identificação dos candidatos'::text,
      'Segurança'::text,
      case when exists(
        select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='public' and c.relname='rs_candidatos_identificacao' and c.relrowsecurity
      ) then 'ok' else 'erro' end::text,
      'Filiação e nascimento ficam disponíveis somente para administrador e RH.'::text,
      'Revise as políticas da migração 010.'::text,
      'critica'::text,
      112
    ),
    (
      'cpf_candidato_protegido'::text,
      'CPF protegido nas candidaturas'::text,
      'Segurança'::text,
      case when not exists(
        select 1 from information_schema.columns
        where table_schema='public' and table_name in ('rs_candidaturas','rs_candidatos_identificacao') and column_name='cpf'
      ) then 'ok' else 'erro' end::text,
      'O CPF completo não é mantido em coluna de texto aberto.'::text,
      'Revise a migração 010 e a API pública de candidatura.'::text,
      'critica'::text,
      113
    )
  ) d(chave,titulo,categoria,status,detalhe,acao,criticidade,ordem)
  order by d.ordem;
end;
$$;

revoke all on function public.rh360_diagnostico_identificacao_candidatos() from public,anon;
grant execute on function public.rh360_diagnostico_identificacao_candidatos() to authenticated;

comment on table public.rs_candidatos_identificacao is 'Identificação adicional de candidatura com RLS exclusiva para administrador e RH.';
comment on column public.rs_candidatos_identificacao.cpf_hash is 'Hash do CPF usado para identificação e prevenção de duplicidade; o CPF completo não é persistido.';
comment on column public.rs_candidatos_identificacao.cpf_final is 'Quatro últimos dígitos do CPF para conferência mascarada pelo RH.';
comment on column public.rs_candidatos_identificacao.nome_mae is 'Filiação materna informada pelo candidato; acesso exclusivo de administrador e RH.';
comment on column public.rs_candidatos_identificacao.data_nascimento is 'Nascimento informado pelo candidato; acesso exclusivo de administrador e RH.';
