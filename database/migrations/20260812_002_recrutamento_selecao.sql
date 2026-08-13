-- PREMAZON RH 360
-- Recrutamento & Seleção: vagas, links públicos, candidaturas e currículos privados.
-- Não importar para este script os nomes existentes na planilha operacional.

create extension if not exists pgcrypto;

create sequence if not exists public.rs_vagas_codigo_seq start 1;

create table if not exists public.rs_vagas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique default (
    'VAG-' || to_char(current_date, 'YYYY') || '-' ||
    lpad(nextval('public.rs_vagas_codigo_seq')::text, 4, '0')
  ),
  cargo text not null,
  departamento text not null,
  solicitante text not null,
  tipo_contratacao text not null check (
    tipo_contratacao in ('aumento_quadro', 'substituicao', 'sem_substituicao', 'cota', 'temporario')
  ),
  colaborador_substituido text,
  quantidade integer not null default 1 check (quantidade between 1 and 100),
  data_abertura date not null default current_date,
  data_fechamento date,
  sla_dias integer not null default 30 check (sla_dias between 1 and 365),
  custo_colaborador numeric(12,2) check (custo_colaborador is null or custo_colaborador >= 0),
  localidade text,
  modalidade text not null default 'presencial' check (modalidade in ('presencial', 'hibrido', 'remoto')),
  descricao text not null,
  requisitos text not null,
  status text not null default 'aberta' check (status in ('rascunho', 'aberta', 'pausada', 'fechada', 'cancelada')),
  public_token uuid not null unique default gen_random_uuid(),
  link_ativo boolean not null default true,
  link_expira_em timestamptz,
  criado_por uuid not null default auth.uid() references auth.users(id) on delete restrict,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (data_fechamento is null or data_fechamento >= data_abertura)
);

create table if not exists public.rs_candidaturas (
  id uuid primary key default gen_random_uuid(),
  vaga_id uuid not null references public.rs_vagas(id) on delete restrict,
  protocolo text not null unique default (
    'CAN-' || to_char(current_date, 'YYYYMMDD') || '-' ||
    upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8))
  ),
  nome text not null,
  email text not null,
  telefone text not null,
  cidade text not null,
  estado char(2) not null,
  linkedin text,
  escolaridade text not null,
  pretensao_salarial numeric(12,2) check (pretensao_salarial is null or pretensao_salarial >= 0),
  experiencia text not null,
  curriculo_path text not null,
  curriculo_nome text not null,
  curriculo_tipo text not null,
  curriculo_tamanho bigint not null check (curriculo_tamanho between 1 and 5242880),
  fonte text not null default 'link_publico',
  etapa text not null default 'triagem' check (
    etapa in ('triagem', 'entrevista_rh', 'teste_tecnico', 'entrevista_gestor', 'proposta', 'admissao', 'encerrado')
  ),
  status text not null default 'ativa' check (status in ('ativa', 'aprovada', 'reprovada', 'desistencia', 'banco_talentos')),
  consentimento_lgpd boolean not null check (consentimento_lgpd),
  consentimento_em timestamptz not null default now(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.rs_movimentacoes (
  id uuid primary key default gen_random_uuid(),
  candidatura_id uuid not null references public.rs_candidaturas(id) on delete cascade,
  etapa_anterior text,
  etapa_nova text not null,
  observacao text,
  criado_por uuid default auth.uid() references auth.users(id) on delete set null,
  criado_em timestamptz not null default now()
);

create index if not exists idx_rs_vagas_status_abertura on public.rs_vagas(status, data_abertura desc);
create index if not exists idx_rs_vagas_departamento on public.rs_vagas(departamento);
create index if not exists idx_rs_candidaturas_vaga_criado on public.rs_candidaturas(vaga_id, criado_em desc);
create index if not exists idx_rs_candidaturas_etapa on public.rs_candidaturas(etapa, status);
create unique index if not exists idx_rs_candidatura_email_vaga
  on public.rs_candidaturas(vaga_id, lower(email));

create or replace function public.rs_atualizar_timestamp()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create or replace function public.rs_registrar_movimentacao()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.etapa is distinct from new.etapa then
    insert into public.rs_movimentacoes(candidatura_id, etapa_anterior, etapa_nova)
    values (new.id, old.etapa, new.etapa);
  end if;
  return new;
end;
$$;

create or replace function public.rs_auditar_sem_dados_pessoais()
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
    case when tg_op in ('UPDATE', 'DELETE') then
      jsonb_build_object('vaga_id', old.vaga_id, 'etapa', old.etapa, 'status', old.status)
    end,
    case when tg_op in ('INSERT', 'UPDATE') then
      jsonb_build_object('vaga_id', new.vaga_id, 'etapa', new.etapa, 'status', new.status)
    end
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists trg_rs_vagas_timestamp on public.rs_vagas;
create trigger trg_rs_vagas_timestamp
before update on public.rs_vagas
for each row execute function public.rs_atualizar_timestamp();

drop trigger if exists trg_rs_candidaturas_timestamp on public.rs_candidaturas;
create trigger trg_rs_candidaturas_timestamp
before update on public.rs_candidaturas
for each row execute function public.rs_atualizar_timestamp();

drop trigger if exists trg_rs_movimentacao on public.rs_candidaturas;
create trigger trg_rs_movimentacao
after update of etapa on public.rs_candidaturas
for each row execute function public.rs_registrar_movimentacao();

drop trigger if exists trg_rs_vagas_auditoria on public.rs_vagas;
create trigger trg_rs_vagas_auditoria
after insert or update or delete on public.rs_vagas
for each row execute function public.registrar_auditoria_rumo_topo();

drop trigger if exists trg_rs_candidaturas_auditoria on public.rs_candidaturas;
create trigger trg_rs_candidaturas_auditoria
after insert or update or delete on public.rs_candidaturas
for each row execute function public.rs_auditar_sem_dados_pessoais();

alter table public.rs_vagas enable row level security;
alter table public.rs_candidaturas enable row level security;
alter table public.rs_movimentacoes enable row level security;

drop policy if exists "gestao le vagas rs" on public.rs_vagas;
create policy "gestao le vagas rs" on public.rs_vagas for select to authenticated
using (public.tem_perfil(array['administrador','diretoria','rh','gestor']::public.perfil_acesso[]));

drop policy if exists "rh gerencia vagas rs" on public.rs_vagas;
create policy "rh gerencia vagas rs" on public.rs_vagas for all to authenticated
using (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]))
with check (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));

drop policy if exists "gestao le candidaturas rs" on public.rs_candidaturas;
create policy "gestao le candidaturas rs" on public.rs_candidaturas for select to authenticated
using (public.tem_perfil(array['administrador','diretoria','rh','gestor']::public.perfil_acesso[]));

drop policy if exists "rh gerencia candidaturas rs" on public.rs_candidaturas;
create policy "rh gerencia candidaturas rs" on public.rs_candidaturas for all to authenticated
using (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]))
with check (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));

drop policy if exists "gestao le movimentacoes rs" on public.rs_movimentacoes;
create policy "gestao le movimentacoes rs" on public.rs_movimentacoes for select to authenticated
using (public.tem_perfil(array['administrador','diretoria','rh','gestor']::public.perfil_acesso[]));

drop policy if exists "rh gerencia movimentacoes rs" on public.rs_movimentacoes;
create policy "rh gerencia movimentacoes rs" on public.rs_movimentacoes for all to authenticated
using (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]))
with check (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));

revoke all on public.rs_vagas, public.rs_candidaturas, public.rs_movimentacoes from anon;
grant select, insert, update, delete on public.rs_vagas, public.rs_candidaturas, public.rs_movimentacoes to authenticated;
grant usage, select on sequence public.rs_vagas_codigo_seq to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'curriculos-candidatos',
  'curriculos-candidatos',
  false,
  5242880,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "gestao le curriculos privados" on storage.objects;
create policy "gestao le curriculos privados" on storage.objects for select to authenticated
using (
  bucket_id = 'curriculos-candidatos'
  and public.tem_perfil(array['administrador','diretoria','rh','gestor']::public.perfil_acesso[])
);

drop policy if exists "rh remove curriculos privados" on storage.objects;
create policy "rh remove curriculos privados" on storage.objects for delete to authenticated
using (
  bucket_id = 'curriculos-candidatos'
  and public.tem_perfil(array['administrador','rh']::public.perfil_acesso[])
);

comment on table public.rs_vagas is 'Vagas do Recrutamento & Seleção. O token expõe somente a ficha pública da vaga.';
comment on table public.rs_candidaturas is 'Dados pessoais de candidatos, disponíveis somente à gestão autorizada.';
comment on column public.rs_candidaturas.curriculo_path is 'Caminho no bucket privado; nunca persistir URL pública.';
