-- PREMAZON RH 360 · Movimentações de Pessoal e RQs controlados
-- Execute somente depois da migração 015 ter sido concluída com sucesso.
-- A plataforma registra e conduz o fluxo; os RQs continuam sendo os documentos oficiais da Qualidade.

create extension if not exists pgcrypto;

insert into public.rh360_migracoes(versao, nome, metadados)
values (
  '016',
  'Movimentações de Pessoal e RQs controlados',
  jsonb_build_object('fluxo', array['gestor','rh','dp','diretoria','conclusao'])
)
on conflict (versao) do update set
  nome = excluded.nome,
  metadados = excluded.metadados;

create table if not exists public.rh_documentos_controlados (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  titulo text not null,
  revisao text not null,
  aprovado_em date,
  status text not null default 'vigente' check (status in ('vigente','substituido','cancelado')),
  arquivo_path text,
  arquivo_hash text,
  observacoes text,
  metadados jsonb not null default '{}'::jsonb,
  criado_por uuid default auth.uid() references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (codigo, revisao)
);

insert into public.rh_documentos_controlados(codigo, titulo, revisao, aprovado_em, observacoes, metadados)
values
  (
    'RQ.04.09',
    'Solicitação de Desligamento',
    '03',
    null,
    'Referência e revisão informadas pelo RH. O arquivo oficial ainda deve ser vinculado pela Qualidade.',
    jsonb_build_object('origem', 'referencia_fornecida_pelo_rh', 'arquivo_conferido', false)
  ),
  (
    'RQ.04.10',
    'Recrutamento para Funções',
    '00',
    '2021-05-05',
    'Identidade conferida no documento oficial encaminhado pelo RH. O arquivo deve permanecer no repositório privado da Qualidade.',
    jsonb_build_object('origem', 'documento_oficial_conferido', 'arquivo_conferido', true, 'paginas', 2, 'titulo_impresso', 'RECRUTAMENTO PARA FUNÇÕES ADMINISTRATIVA')
  )
on conflict (codigo, revisao) do update set
  titulo = excluded.titulo,
  aprovado_em = coalesce(public.rh_documentos_controlados.aprovado_em, excluded.aprovado_em),
  observacoes = excluded.observacoes,
  metadados = public.rh_documentos_controlados.metadados || excluded.metadados;

create table if not exists public.rh_movimentacoes_pessoal (
  id uuid primary key default gen_random_uuid(),
  protocolo text not null unique,
  tipo text not null check (tipo in ('desligamento','aumento_quadro','substituicao')),
  solicitante_auth_user_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  solicitante_colaborador_id uuid references public.colaboradores_v2(id) on delete set null,
  colaborador_id uuid references public.colaboradores_v2(id) on delete restrict,
  setor_id uuid references public.setores(id) on delete restrict,
  cargo_id uuid references public.cargos(id) on delete restrict,
  cargo_nome_solicitado text,
  quantidade integer not null default 1 check (quantidade between 1 and 999),
  justificativa text not null check (char_length(trim(justificativa)) between 10 and 4000),
  data_desejada date,
  prioridade text not null default 'media' check (prioridade in ('baixa','media','alta','critica')),
  documento_controlado_id uuid not null references public.rh_documentos_controlados(id) on delete restrict,
  documento_codigo text not null,
  documento_revisao text not null,
  etapa_atual text not null default 'rh' check (etapa_atual in ('gestor','rh','dp','diretoria','conclusao')),
  status text not null default 'em_fluxo' check (status in ('em_fluxo','rejeitada','concluida','cancelada')),
  concluida_em timestamptz,
  rejeitada_em timestamptz,
  versao integer not null default 1 check (versao > 0),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (tipo not in ('desligamento','substituicao') or colaborador_id is not null),
  check (tipo <> 'aumento_quadro' or setor_id is not null),
  check (tipo <> 'aumento_quadro' or cargo_id is not null or nullif(trim(cargo_nome_solicitado), '') is not null)
);

create table if not exists public.rh_movimentacoes_historico (
  id bigint generated always as identity primary key,
  movimentacao_id uuid not null references public.rh_movimentacoes_pessoal(id) on delete cascade,
  etapa text not null check (etapa in ('gestor','rh','dp','diretoria','conclusao')),
  acao text not null check (acao in ('solicitada','aprovada','rejeitada','cancelada','concluida')),
  ator_auth_user_id uuid references auth.users(id) on delete set null,
  ator_perfil public.perfil_acesso,
  observacao text,
  metadados jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create index if not exists idx_rh_movimentacoes_status_etapa on public.rh_movimentacoes_pessoal(status, etapa_atual, criado_em desc);
create index if not exists idx_rh_movimentacoes_solicitante on public.rh_movimentacoes_pessoal(solicitante_auth_user_id, criado_em desc);
create index if not exists idx_rh_movimentacoes_colaborador on public.rh_movimentacoes_pessoal(colaborador_id, criado_em desc);
create index if not exists idx_rh_movimentacoes_setor on public.rh_movimentacoes_pessoal(setor_id, criado_em desc);
create index if not exists idx_rh_movimentacoes_historico on public.rh_movimentacoes_historico(movimentacao_id, criado_em);

create sequence if not exists public.rh_movimentacoes_protocolo_seq;

create or replace function public.rh_movimentacao_proximo_protocolo()
returns text
language sql
volatile
security definer
set search_path = public, pg_temp
as $$
  select 'MOV-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('public.rh_movimentacoes_protocolo_seq')::text, 6, '0');
$$;

create or replace function public.rh_criar_movimentacao(
  p_tipo text,
  p_colaborador_id uuid,
  p_setor_id uuid,
  p_cargo_id uuid,
  p_cargo_nome_solicitado text,
  p_quantidade integer,
  p_justificativa text,
  p_data_desejada date,
  p_prioridade text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_perfil public.perfil_acesso;
  v_solicitante_colaborador_id uuid;
  v_documento public.rh_documentos_controlados%rowtype;
begin
  select p.perfil, p.colaborador_id
    into v_perfil, v_solicitante_colaborador_id
  from public.perfis_usuario p
  where p.auth_user_id = auth.uid() and p.ativo;

  if v_perfil is null or v_perfil not in ('administrador','rh','gestor') then
    raise exception 'Seu perfil não pode abrir movimentações de pessoal.' using errcode = '42501';
  end if;
  if p_tipo not in ('desligamento','aumento_quadro','substituicao') then
    raise exception 'Tipo de movimentação inválido.' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_justificativa, ''))) < 10 then
    raise exception 'Informe uma justificativa com pelo menos 10 caracteres.' using errcode = '22023';
  end if;
  if p_prioridade not in ('baixa','media','alta','critica') then
    raise exception 'Prioridade inválida.' using errcode = '22023';
  end if;
  if p_tipo in ('desligamento','substituicao') and p_colaborador_id is null then
    raise exception 'Selecione o colaborador envolvido.' using errcode = '22023';
  end if;
  if p_tipo = 'aumento_quadro' and (p_setor_id is null or (p_cargo_id is null and nullif(trim(coalesce(p_cargo_nome_solicitado, '')), '') is null)) then
    raise exception 'Informe o setor e a função solicitada.' using errcode = '22023';
  end if;
  if coalesce(p_quantidade, 0) not between 1 and 999 then
    raise exception 'A quantidade deve estar entre 1 e 999.' using errcode = '22023';
  end if;
  if p_colaborador_id is not null and not exists (
    select 1 from public.colaboradores_v2 c where c.id = p_colaborador_id and c.status <> 'desligado'
  ) then
    raise exception 'O colaborador informado não está disponível no cadastro ativo.' using errcode = '22023';
  end if;

  select d.* into v_documento
  from public.rh_documentos_controlados d
  where d.codigo = case when p_tipo = 'desligamento' then 'RQ.04.09' else 'RQ.04.10' end
    and d.status = 'vigente'
  order by d.criado_em desc
  limit 1;

  if v_documento.id is null then
    raise exception 'Documento controlado vigente não configurado para esta solicitação.' using errcode = 'P0001';
  end if;

  insert into public.rh_movimentacoes_pessoal(
    protocolo, tipo, solicitante_auth_user_id, solicitante_colaborador_id,
    colaborador_id, setor_id, cargo_id, cargo_nome_solicitado, quantidade,
    justificativa, data_desejada, prioridade, documento_controlado_id,
    documento_codigo, documento_revisao, etapa_atual, status
  ) values (
    public.rh_movimentacao_proximo_protocolo(), p_tipo, auth.uid(), v_solicitante_colaborador_id,
    p_colaborador_id, p_setor_id, p_cargo_id, nullif(trim(p_cargo_nome_solicitado), ''), coalesce(p_quantidade, 1),
    trim(p_justificativa), p_data_desejada, p_prioridade, v_documento.id,
    v_documento.codigo, v_documento.revisao, 'rh', 'em_fluxo'
  ) returning id into v_id;

  insert into public.rh_movimentacoes_historico(movimentacao_id, etapa, acao, ator_auth_user_id, ator_perfil, observacao)
  values (v_id, 'gestor', 'solicitada', auth.uid(), v_perfil, 'Solicitação registrada e encaminhada ao RH.');

  return v_id;
end;
$$;

create or replace function public.rh_decidir_movimentacao(
  p_movimentacao_id uuid,
  p_decisao text,
  p_observacao text default null
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_mov public.rh_movimentacoes_pessoal%rowtype;
  v_perfil public.perfil_acesso;
  v_proxima_etapa text;
begin
  select p.perfil into v_perfil
  from public.perfis_usuario p
  where p.auth_user_id = auth.uid() and p.ativo;

  select * into v_mov
  from public.rh_movimentacoes_pessoal
  where id = p_movimentacao_id
  for update;

  if v_mov.id is null then
    raise exception 'Solicitação não encontrada.' using errcode = 'P0002';
  end if;
  if v_mov.status <> 'em_fluxo' or v_mov.etapa_atual not in ('rh','dp','diretoria') then
    raise exception 'Esta solicitação não está disponível para decisão.' using errcode = '22023';
  end if;
  if v_perfil is null or not (
    v_perfil = 'administrador'
    or (v_mov.etapa_atual = 'rh' and v_perfil = 'rh')
    or (v_mov.etapa_atual = 'dp' and v_perfil = 'dp')
    or (v_mov.etapa_atual = 'diretoria' and v_perfil = 'diretoria')
  ) then
    raise exception 'Seu perfil não pode decidir esta etapa.' using errcode = '42501';
  end if;
  if p_decisao not in ('aprovar','rejeitar') then
    raise exception 'Decisão inválida.' using errcode = '22023';
  end if;
  if p_decisao = 'rejeitar' and char_length(trim(coalesce(p_observacao, ''))) < 5 then
    raise exception 'Informe o motivo da rejeição.' using errcode = '22023';
  end if;

  if p_decisao = 'rejeitar' then
    update public.rh_movimentacoes_pessoal
    set status = 'rejeitada', rejeitada_em = now(), atualizado_em = now(), versao = versao + 1
    where id = v_mov.id;
    insert into public.rh_movimentacoes_historico(movimentacao_id, etapa, acao, ator_auth_user_id, ator_perfil, observacao)
    values (v_mov.id, v_mov.etapa_atual, 'rejeitada', auth.uid(), v_perfil, trim(p_observacao));
    return 'rejeitada';
  end if;

  v_proxima_etapa := case v_mov.etapa_atual when 'rh' then 'dp' when 'dp' then 'diretoria' else 'conclusao' end;
  update public.rh_movimentacoes_pessoal
  set etapa_atual = v_proxima_etapa,
      status = case when v_proxima_etapa = 'conclusao' then 'concluida' else 'em_fluxo' end,
      concluida_em = case when v_proxima_etapa = 'conclusao' then now() else concluida_em end,
      atualizado_em = now(),
      versao = versao + 1
  where id = v_mov.id;

  insert into public.rh_movimentacoes_historico(movimentacao_id, etapa, acao, ator_auth_user_id, ator_perfil, observacao)
  values (
    v_mov.id,
    v_mov.etapa_atual,
    case when v_proxima_etapa = 'conclusao' then 'concluida' else 'aprovada' end,
    auth.uid(),
    v_perfil,
    nullif(trim(coalesce(p_observacao, '')), '')
  );
  return case when v_proxima_etapa = 'conclusao' then 'concluida' else v_proxima_etapa end;
end;
$$;

create or replace function public.rh_auditar_movimentacao()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.auditoria_eventos(entidade, entidade_id, acao, dados_anteriores, dados_novos)
  values (
    'rh_movimentacoes_pessoal',
    case when tg_op = 'DELETE' then old.id else new.id end,
    tg_op,
    case when tg_op = 'UPDATE' then jsonb_build_object('status', old.status, 'etapa', old.etapa_atual, 'versao', old.versao) end,
    case when tg_op in ('INSERT','UPDATE') then jsonb_build_object('tipo', new.tipo, 'status', new.status, 'etapa', new.etapa_atual, 'versao', new.versao, 'documento', new.documento_codigo, 'revisao', new.documento_revisao) end
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists trg_rh_documentos_controlados_timestamp on public.rh_documentos_controlados;
create trigger trg_rh_documentos_controlados_timestamp before update on public.rh_documentos_controlados
for each row execute function public.td_atualizar_timestamp();

drop trigger if exists trg_rh_movimentacoes_auditoria on public.rh_movimentacoes_pessoal;
create trigger trg_rh_movimentacoes_auditoria after insert or update on public.rh_movimentacoes_pessoal
for each row execute function public.rh_auditar_movimentacao();

do $$
declare
  v_constraint text;
begin
  select c.conname into v_constraint
  from pg_constraint c
  where c.conrelid = 'public.rh360_pendencias'::regclass
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) like '%origem%';
  if v_constraint is not null then
    execute format('alter table public.rh360_pendencias drop constraint %I', v_constraint);
  end if;
  alter table public.rh360_pendencias add constraint rh360_pendencias_origem_check
    check (origem in ('recrutamento','treinamento','pdi','universidade','rumo_topo','cadastro','sistema','manual','movimentacao'));
exception when duplicate_object then null;
end $$;

create or replace function public.rh_sincronizar_pendencia_movimentacao()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_perfil public.perfil_acesso;
begin
  v_perfil := case new.etapa_atual when 'rh' then 'rh'::public.perfil_acesso when 'dp' then 'dp'::public.perfil_acesso when 'diretoria' then 'diretoria'::public.perfil_acesso else null end;
  insert into public.rh360_pendencias(
    chave_origem, origem, tipo, entidade, entidade_id, titulo, descricao,
    prioridade, status, responsavel_perfil, automatica, link_acao, metadados,
    resolvida_em, resolucao
  ) values (
    'movimentacao:' || new.id, 'movimentacao', new.tipo, 'rh_movimentacoes_pessoal', new.id,
    new.protocolo || ' · ' || case new.tipo when 'desligamento' then 'Solicitação de desligamento' when 'aumento_quadro' then 'Aumento de quadro' else 'Substituição' end,
    'Etapa atual: ' || upper(new.etapa_atual) || ' · Documento ' || new.documento_codigo || ' Rev. ' || new.documento_revisao,
    new.prioridade,
    case when new.status = 'em_fluxo' then 'aberta' when new.status = 'cancelada' then 'cancelada' else 'concluida' end,
    v_perfil,
    false,
    '/dashboard/movimentacoes?view=aprovacoes',
    jsonb_build_object('protocolo', new.protocolo, 'etapa', new.etapa_atual, 'status', new.status),
    case when new.status = 'em_fluxo' then null else now() end,
    case when new.status = 'concluida' then 'Fluxo aprovado e concluído.' when new.status = 'rejeitada' then 'Solicitação rejeitada.' when new.status = 'cancelada' then 'Solicitação cancelada.' else null end
  )
  on conflict (chave_origem) do update set
    titulo = excluded.titulo,
    descricao = excluded.descricao,
    prioridade = excluded.prioridade,
    status = excluded.status,
    responsavel_perfil = excluded.responsavel_perfil,
    metadados = excluded.metadados,
    resolvida_em = excluded.resolvida_em,
    resolucao = excluded.resolucao;
  return new;
end;
$$;

drop trigger if exists trg_rh_movimentacoes_pendencia on public.rh_movimentacoes_pessoal;
create trigger trg_rh_movimentacoes_pendencia after insert or update of status, etapa_atual, prioridade on public.rh_movimentacoes_pessoal
for each row execute function public.rh_sincronizar_pendencia_movimentacao();

insert into public.rh360_pendencias(
  chave_origem, origem, tipo, entidade, entidade_id, titulo, descricao,
  prioridade, status, responsavel_perfil, automatica, link_acao, metadados,
  resolvida_em, resolucao
)
select
  'movimentacao:' || m.id, 'movimentacao', m.tipo, 'rh_movimentacoes_pessoal', m.id,
  m.protocolo || ' · ' || case m.tipo when 'desligamento' then 'Solicitação de desligamento' when 'aumento_quadro' then 'Aumento de quadro' else 'Substituição' end,
  'Etapa atual: ' || upper(m.etapa_atual) || ' · Documento ' || m.documento_codigo || ' Rev. ' || m.documento_revisao,
  m.prioridade,
  case when m.status = 'em_fluxo' then 'aberta' when m.status = 'cancelada' then 'cancelada' else 'concluida' end,
  case m.etapa_atual when 'rh' then 'rh'::public.perfil_acesso when 'dp' then 'dp'::public.perfil_acesso when 'diretoria' then 'diretoria'::public.perfil_acesso else null end,
  false, '/dashboard/movimentacoes?view=aprovacoes',
  jsonb_build_object('protocolo', m.protocolo, 'etapa', m.etapa_atual, 'status', m.status),
  case when m.status = 'em_fluxo' then null else now() end,
  case when m.status = 'concluida' then 'Fluxo aprovado e concluído.' when m.status = 'rejeitada' then 'Solicitação rejeitada.' when m.status = 'cancelada' then 'Solicitação cancelada.' else null end
from public.rh_movimentacoes_pessoal m
on conflict (chave_origem) do nothing;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'qualidade-rqs',
  'qualidade-rqs',
  false,
  10485760,
  array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.rh_documentos_controlados enable row level security;
alter table public.rh_movimentacoes_pessoal enable row level security;
alter table public.rh_movimentacoes_historico enable row level security;

drop policy if exists "gestao le documentos controlados rh" on public.rh_documentos_controlados;
create policy "gestao le documentos controlados rh" on public.rh_documentos_controlados for select to authenticated
using (public.tem_perfil(array['administrador','diretoria','rh','dp','gestor']::public.perfil_acesso[]));
drop policy if exists "rh gerencia documentos controlados" on public.rh_documentos_controlados;
create policy "rh gerencia documentos controlados" on public.rh_documentos_controlados for all to authenticated
using (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]))
with check (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));

drop policy if exists "solicitante e aprovadores leem movimentacoes" on public.rh_movimentacoes_pessoal;
create policy "solicitante e aprovadores leem movimentacoes" on public.rh_movimentacoes_pessoal for select to authenticated
using (
  solicitante_auth_user_id = auth.uid()
  or public.tem_perfil(array['administrador','diretoria','rh','dp']::public.perfil_acesso[])
);

drop policy if exists "solicitante e aprovadores leem historico" on public.rh_movimentacoes_historico;
create policy "solicitante e aprovadores leem historico" on public.rh_movimentacoes_historico for select to authenticated
using (
  exists (
    select 1 from public.rh_movimentacoes_pessoal m
    where m.id = movimentacao_id
      and (m.solicitante_auth_user_id = auth.uid() or public.tem_perfil(array['administrador','diretoria','rh','dp']::public.perfil_acesso[]))
  )
);

drop policy if exists "gestao le pendencias rh360" on public.rh360_pendencias;
create policy "gestao le pendencias rh360" on public.rh360_pendencias for select to authenticated
using (
  public.tem_perfil(array['administrador','diretoria','rh','dp','gestor']::public.perfil_acesso[])
  or responsavel_auth_user_id = auth.uid()
);

drop policy if exists "gestao baixa rq privado" on storage.objects;
create policy "gestao baixa rq privado" on storage.objects for select to authenticated
using (bucket_id = 'qualidade-rqs' and public.tem_perfil(array['administrador','diretoria','rh','dp','gestor']::public.perfil_acesso[]));
drop policy if exists "rh envia rq privado" on storage.objects;
create policy "rh envia rq privado" on storage.objects for insert to authenticated
with check (bucket_id = 'qualidade-rqs' and public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));
drop policy if exists "rh atualiza rq privado" on storage.objects;
create policy "rh atualiza rq privado" on storage.objects for update to authenticated
using (bucket_id = 'qualidade-rqs' and public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]))
with check (bucket_id = 'qualidade-rqs' and public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));
drop policy if exists "rh remove rq privado" on storage.objects;
create policy "rh remove rq privado" on storage.objects for delete to authenticated
using (bucket_id = 'qualidade-rqs' and public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));

create or replace function public.rh360_diagnostico_movimentacoes()
returns table (
  chave text, titulo text, categoria text, status text,
  detalhe text, acao text, criticidade text, ordem integer
)
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $$
begin
  if not public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]) then
    raise exception 'Apenas administrador ou RH pode acessar o diagnóstico.' using errcode = '42501';
  end if;
  return query
  select * from (values
    ('migracao_015', 'Migração 015 · Perfil DP', 'Banco',
      case when exists(select 1 from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typnamespace='public'::regnamespace and t.typname='perfil_acesso' and e.enumlabel='dp') then 'ok' else 'erro' end,
      'Departamento Pessoal possui perfil próprio para segregação das aprovações.', 'Execute a migração 015.', 'critica', 73),
    ('migracao_016', 'Migração 016 · Movimentações de Pessoal', 'Banco',
      case when to_regclass('public.rh_movimentacoes_pessoal') is not null and to_regclass('public.rh_movimentacoes_historico') is not null and to_regclass('public.rh_documentos_controlados') is not null then 'ok' else 'erro' end,
      'Solicitações, fluxo de aprovação, RQs controlados e histórico.', 'Execute a migração 016.', 'critica', 74),
    ('bucket_rqs', 'Bucket de RQs oficiais', 'Armazenamento',
      case when exists(select 1 from storage.buckets where id='qualidade-rqs' and not public) then 'ok' else 'erro' end,
      'Documentos oficiais da Qualidade permanecem privados.', 'Revise a migração 016.', 'critica', 96),
    ('rls_movimentacoes', 'RLS das movimentações de pessoal', 'Segurança',
      case when exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='rh_movimentacoes_pessoal' and c.relrowsecurity) then 'ok' else 'erro' end,
      'Solicitantes e aprovadores enxergam somente o escopo autorizado.', 'Ative RLS e revise as políticas da migração 016.', 'critica', 114)
  ) as diagnostico(chave, titulo, categoria, status, detalhe, acao, criticidade, ordem)
  order by diagnostico.ordem;
end;
$$;

revoke all on public.rh_documentos_controlados, public.rh_movimentacoes_pessoal, public.rh_movimentacoes_historico from anon;
revoke all on public.rh_movimentacoes_pessoal, public.rh_movimentacoes_historico from authenticated;
grant select on public.rh_documentos_controlados, public.rh_movimentacoes_pessoal, public.rh_movimentacoes_historico to authenticated;
revoke all on function public.rh_movimentacao_proximo_protocolo() from public, anon, authenticated;
revoke all on function public.rh_criar_movimentacao(text,uuid,uuid,uuid,text,integer,text,date,text) from public, anon;
revoke all on function public.rh_decidir_movimentacao(uuid,text,text) from public, anon;
revoke all on function public.rh360_diagnostico_movimentacoes() from public, anon;
grant execute on function public.rh_criar_movimentacao(text,uuid,uuid,uuid,text,integer,text,date,text) to authenticated;
grant execute on function public.rh_decidir_movimentacao(uuid,text,text) to authenticated;
grant execute on function public.rh360_diagnostico_movimentacoes() to authenticated;

comment on table public.rh_documentos_controlados is 'Catálogo versionado dos RQs oficiais; a plataforma não substitui o registro da Qualidade.';
comment on table public.rh_movimentacoes_pessoal is 'Solicitações de desligamento, aumento de quadro e substituição com fluxo segregado.';
comment on table public.rh_movimentacoes_historico is 'Histórico imutável das decisões das movimentações de pessoal.';
comment on function public.rh_criar_movimentacao(text,uuid,uuid,uuid,text,integer,text,date,text) is 'Abre uma solicitação e registra a etapa do gestor sem expor gravação direta nas tabelas.';
comment on function public.rh_decidir_movimentacao(uuid,text,text) is 'Aprova ou rejeita atomicamente a etapa atual conforme o perfil do usuário.';
