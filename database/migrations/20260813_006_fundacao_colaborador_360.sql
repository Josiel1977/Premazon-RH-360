-- PREMAZON RH 360 · Fundação v0.6.0
-- Saúde do sistema, cadastro mestre do colaborador e central de pendências.
-- Execute depois das migrações 001 a 005.

create extension if not exists pgcrypto;

alter table public.colaboradores_v2 add column if not exists filial_id uuid references public.filiais(id) on delete set null;
alter table public.colaboradores_v2 add column if not exists nome_social text;
alter table public.colaboradores_v2 add column if not exists centro_custo text;
alter table public.colaboradores_v2 add column if not exists tipo_contrato text;
alter table public.colaboradores_v2 add column if not exists jornada text;
alter table public.colaboradores_v2 add column if not exists data_experiencia_fim date;
alter table public.colaboradores_v2 add column if not exists foto_path text;
alter table public.colaboradores_v2 add column if not exists observacoes_profissionais text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'colaboradores_v2_tipo_contrato_check') then
    alter table public.colaboradores_v2 add constraint colaboradores_v2_tipo_contrato_check
      check (tipo_contrato is null or tipo_contrato in ('clt','temporario','aprendiz','estagio','pj','terceirizado','outro'));
  end if;
end $$;

create index if not exists idx_colaboradores_v2_filial_status on public.colaboradores_v2(filial_id, status);
create index if not exists idx_colaboradores_v2_gestor_status on public.colaboradores_v2(gestor_id, status);

create table if not exists public.rh360_migracoes (
  versao text primary key,
  nome text not null,
  aplicada_em timestamptz not null default now(),
  metadados jsonb not null default '{}'::jsonb
);

insert into public.rh360_migracoes(versao, nome)
select '001', 'Fundação e Rumo ao Topo'
where to_regclass('public.colaboradores_v2') is not null and to_regclass('public.rumo_topo_resultados') is not null
on conflict (versao) do nothing;
insert into public.rh360_migracoes(versao, nome)
select '002', 'Recrutamento e Seleção'
where to_regclass('public.rs_vagas') is not null and to_regclass('public.rs_candidaturas') is not null
on conflict (versao) do nothing;
insert into public.rh360_migracoes(versao, nome)
select '003', 'Treinamento e Desenvolvimento'
where to_regclass('public.td_importacoes') is not null and to_regclass('public.td_treinamentos') is not null
on conflict (versao) do nothing;
insert into public.rh360_migracoes(versao, nome)
select '004', 'Universidade Corporativa'
where to_regclass('public.td_curso_modulos') is not null and to_regclass('public.td_curso_aulas') is not null
on conflict (versao) do nothing;
insert into public.rh360_migracoes(versao, nome)
select '005', 'Programas Estratégicos'
where to_regclass('public.td_pdis') is not null and to_regclass('public.rs_historico_processos') is not null
on conflict (versao) do nothing;
insert into public.rh360_migracoes(versao, nome)
values ('006', 'Saúde do Sistema, Colaborador 360 e Pendências')
on conflict (versao) do update set nome = excluded.nome;

create table if not exists public.rh360_pendencias (
  id uuid primary key default gen_random_uuid(),
  chave_origem text not null unique,
  origem text not null check (origem in ('recrutamento','treinamento','pdi','universidade','rumo_topo','cadastro','sistema','manual')),
  tipo text not null,
  entidade text,
  entidade_id uuid,
  titulo text not null,
  descricao text,
  prioridade text not null default 'media' check (prioridade in ('baixa','media','alta','critica')),
  status text not null default 'aberta' check (status in ('aberta','em_andamento','aguardando','concluida','cancelada')),
  responsavel_auth_user_id uuid references auth.users(id) on delete set null,
  responsavel_colaborador_id uuid references public.colaboradores_v2(id) on delete set null,
  responsavel_perfil public.perfil_acesso,
  prazo date,
  automatica boolean not null default false,
  link_acao text,
  metadados jsonb not null default '{}'::jsonb,
  resolucao text,
  resolvida_em timestamptz,
  criado_por uuid default auth.uid() references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_rh360_pendencias_status_prazo on public.rh360_pendencias(status, prazo);
create index if not exists idx_rh360_pendencias_origem_prioridade on public.rh360_pendencias(origem, prioridade);
create index if not exists idx_rh360_pendencias_responsavel on public.rh360_pendencias(responsavel_auth_user_id, status);

drop trigger if exists trg_rh360_pendencias_timestamp on public.rh360_pendencias;
create trigger trg_rh360_pendencias_timestamp before update on public.rh360_pendencias
for each row execute function public.td_atualizar_timestamp();

create or replace function public.rh360_auditar_pendencia()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.auditoria_eventos(entidade, entidade_id, acao, dados_anteriores, dados_novos)
  values (
    'rh360_pendencias',
    case when tg_op = 'DELETE' then old.id else new.id end,
    tg_op,
    case when tg_op in ('UPDATE','DELETE') then
      jsonb_build_object('origem', old.origem, 'tipo', old.tipo, 'prioridade', old.prioridade, 'status', old.status, 'prazo', old.prazo)
    end,
    case when tg_op in ('INSERT','UPDATE') then
      jsonb_build_object('origem', new.origem, 'tipo', new.tipo, 'prioridade', new.prioridade, 'status', new.status, 'prazo', new.prazo)
    end
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists trg_rh360_pendencias_auditoria on public.rh360_pendencias;
create trigger trg_rh360_pendencias_auditoria after insert or update or delete on public.rh360_pendencias
for each row execute function public.rh360_auditar_pendencia();

create or replace function public.rh360_sincronizar_pendencias()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  total_atual integer;
begin
  if not public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]) then
    raise exception 'Apenas administrador ou RH pode sincronizar pendências.' using errcode = '42501';
  end if;

  create temporary table if not exists tmp_rh360_pendencias (
    chave_origem text, origem text, tipo text, entidade text, entidade_id uuid,
    titulo text, descricao text, prioridade text, prazo date, link_acao text, metadados jsonb
  ) on commit drop;
  truncate tmp_rh360_pendencias;

  insert into tmp_rh360_pendencias
  select
    'rs_vaga_sla:' || v.id, 'recrutamento', 'vaga_fora_sla', 'rs_vagas', v.id,
    'Vaga fora do SLA: ' || v.cargo,
    v.codigo || ' · ' || v.departamento || ' · solicitante: ' || v.solicitante,
    case when current_date - (v.data_abertura + v.sla_dias) >= 10 then 'critica' else 'alta' end,
    v.data_abertura + v.sla_dias, '/dashboard/recrutamento',
    jsonb_build_object('codigo', v.codigo, 'departamento', v.departamento)
  from public.rs_vagas v
  where v.status = 'aberta' and current_date > v.data_abertura + v.sla_dias;

  insert into tmp_rh360_pendencias
  select
    'td_pdi_prazo:' || p.id, 'pdi', 'pdi_atrasado', 'td_pdis', p.id,
    'PDI atrasado: ' || p.colaborador_nome_importado,
    p.objetivo,
    case when current_date - p.data_limite >= 15 then 'critica' else 'alta' end,
    p.data_limite, '/dashboard/treinamentos',
    jsonb_build_object('colaborador_id', p.colaborador_id, 'status', p.status)
  from public.td_pdis p
  where p.status = 'ativo' and p.data_limite is not null and p.data_limite < current_date;

  insert into tmp_rh360_pendencias
  select
    'td_lnt_prioritaria:' || n.id, 'treinamento', 'lnt_prioritaria', 'td_lnt_necessidades', n.id,
    'LNT ' || upper(n.prioridade) || ': ' || n.colaborador_nome_importado,
    n.setor_importado || ' · ' || coalesce(n.treinamento_sugerido, array_to_string(n.necessidades_tecnicas, ', '), 'Necessidade sem curso definido'),
    n.prioridade,
    (n.criado_em::date + case when n.prioridade = 'critica' then 7 else 15 end),
    '/dashboard/treinamentos',
    jsonb_build_object('setor', n.setor_importado, 'colaborador_id', n.colaborador_id)
  from public.td_lnt_necessidades n
  where n.prioridade in ('alta','critica') and n.status in ('identificada','priorizada');

  insert into tmp_rh360_pendencias
  select
    'td_eficacia:' || t.id, 'treinamento', 'avaliacao_eficacia', 'td_treinamentos', t.id,
    'Avaliar eficácia: ' || t.titulo,
    'Treinamento concluído com participantes e sem avaliação de eficácia registrada.',
    case when current_date > coalesce(t.eficacia_prevista_em, t.data_fim, t.data_inicio + 30) then 'alta' else 'media' end,
    coalesce(t.eficacia_prevista_em, t.data_fim, t.data_inicio + 30),
    '/dashboard/treinamentos', jsonb_build_object('categoria', t.categoria)
  from public.td_treinamentos t
  where t.status = 'concluido'
    and exists (select 1 from public.td_participacoes p where p.treinamento_id = t.id)
    and not exists (
      select 1 from public.td_participacoes p
      join public.td_avaliacoes_eficacia e on e.participacao_id = p.id
      where p.treinamento_id = t.id
    );

  insert into tmp_rh360_pendencias
  select
    'td_certificado_vencimento:' || p.id, 'treinamento', 'certificado_vencendo', 'td_participacoes', p.id,
    'Certificado próximo do vencimento: ' || coalesce(p.colaborador_nome_importado, 'Colaborador'),
    t.titulo || ' · válido até ' || to_char(p.certificado_valido_ate, 'DD/MM/YYYY'),
    case when p.certificado_valido_ate < current_date then 'critica' else 'alta' end,
    p.certificado_valido_ate, '/dashboard/certificados',
    jsonb_build_object('treinamento_id', t.id, 'colaborador_id', p.colaborador_id)
  from public.td_participacoes p
  join public.td_treinamentos t on t.id = p.treinamento_id
  where p.certificado_valido_ate is not null and p.certificado_valido_ate <= current_date + 30;

  insert into public.rh360_pendencias(
    chave_origem, origem, tipo, entidade, entidade_id, titulo, descricao,
    prioridade, status, prazo, automatica, link_acao, metadados, resolvida_em, resolucao
  )
  select chave_origem, origem, tipo, entidade, entidade_id, titulo, descricao,
    prioridade, 'aberta', prazo, true, link_acao, metadados, null, null
  from tmp_rh360_pendencias
  on conflict (chave_origem) do update set
    titulo = excluded.titulo,
    descricao = excluded.descricao,
    prioridade = excluded.prioridade,
    prazo = excluded.prazo,
    link_acao = excluded.link_acao,
    metadados = excluded.metadados,
    status = case when public.rh360_pendencias.status in ('concluida','cancelada') then 'aberta' else public.rh360_pendencias.status end,
    resolvida_em = null,
    resolucao = null;

  update public.rh360_pendencias p
  set status = 'concluida', resolvida_em = now(), resolucao = 'Condição resolvida automaticamente.'
  where p.automatica and p.status not in ('concluida','cancelada')
    and not exists (select 1 from tmp_rh360_pendencias atual where atual.chave_origem = p.chave_origem);

  select count(*) into total_atual from tmp_rh360_pendencias;
  return total_atual;
end;
$$;

create or replace function public.rh360_diagnostico_sistema()
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
    ('perfil_usuario', 'Perfil administrativo', 'Acesso',
      case when public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]) then 'ok' else 'erro' end,
      'Usuário autenticado com perfil autorizado.', 'Revise perfis_usuario.', 'critica', 1),
    ('migracao_001', 'Migração 001 · Fundação', 'Banco',
      case when to_regclass('public.colaboradores_v2') is not null and to_regclass('public.rumo_topo_resultados') is not null then 'ok' else 'erro' end,
      'Cadastro mestre, perfis e Rumo ao Topo.', 'Execute a migração 001.', 'critica', 10),
    ('migracao_002', 'Migração 002 · Recrutamento', 'Banco',
      case when to_regclass('public.rs_vagas') is not null and to_regclass('public.rs_candidaturas') is not null then 'ok' else 'erro' end,
      'Vagas, candidaturas e currículos.', 'Execute a migração 002.', 'critica', 20),
    ('migracao_003', 'Migração 003 · T&D', 'Banco',
      case when to_regclass('public.td_treinamentos') is not null and to_regclass('public.td_lnt_necessidades') is not null then 'ok' else 'erro' end,
      'LNT, avaliações, cursos e treinamentos.', 'Execute a migração 003.', 'critica', 30),
    ('migracao_004', 'Migração 004 · Universidade', 'Banco',
      case when to_regclass('public.td_curso_modulos') is not null and to_regclass('public.td_curso_aulas') is not null
        and exists (select 1 from information_schema.columns c where c.table_schema = 'public' and c.table_name = 'td_cursos' and c.column_name = 'status_publicacao') then 'ok' else 'erro' end,
      'Módulos, videoaulas, matrículas e progresso.', 'Execute a migração 004.', 'critica', 40),
    ('migracao_005', 'Migração 005 · Programas Estratégicos', 'Banco',
      case when to_regclass('public.td_pdis') is not null and to_regclass('public.rs_historico_processos') is not null then 'ok' else 'erro' end,
      'PDI e histórico analítico de R&S.', 'Execute a migração 005.', 'critica', 50),
    ('migracao_006', 'Migração 006 · Fundação 360', 'Banco', 'ok',
      'Saúde do sistema, Colaborador 360 e pendências.', 'Nenhuma ação necessária.', 'alta', 60),
    ('bucket_curriculos', 'Bucket de currículos', 'Armazenamento',
      case when exists (select 1 from storage.buckets b where b.id = 'curriculos-candidatos' and not b.public) then 'ok' else 'erro' end,
      'Currículos devem permanecer privados.', 'Revise a migração 002.', 'critica', 70),
    ('bucket_documentos', 'Bucket de documentos T&D', 'Armazenamento',
      case when exists (select 1 from storage.buckets b where b.id = 'td-documentos' and not b.public) then 'ok' else 'aviso' end,
      'Certificados e evidências privadas.', 'Revise a migração 003.', 'alta', 80),
    ('bucket_videos', 'Bucket de videoaulas', 'Armazenamento',
      case when exists (select 1 from storage.buckets b where b.id = 'td-videos' and not b.public) then 'ok' else 'erro' end,
      'Videoaulas privadas com acesso controlado.', 'Revise a migração 004.', 'critica', 90),
    ('rls_colaboradores', 'RLS do cadastro mestre', 'Segurança',
      case when exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'colaboradores_v2' and c.relrowsecurity) then 'ok' else 'erro' end,
      'Proteção por linha no cadastro de colaboradores.', 'Ative RLS e revise as políticas.', 'critica', 100),
    ('rls_pendencias', 'RLS da central de pendências', 'Segurança',
      case when exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'rh360_pendencias' and c.relrowsecurity) then 'ok' else 'erro' end,
      'Pendências protegidas por perfil e responsável.', 'Ative RLS e revise as políticas.', 'critica', 110)
  ) as diagnostico(chave, titulo, categoria, status, detalhe, acao, criticidade, ordem)
  order by diagnostico.ordem;
end;
$$;

alter table public.rh360_migracoes enable row level security;
alter table public.rh360_pendencias enable row level security;

drop policy if exists "administracao le migracoes rh360" on public.rh360_migracoes;
create policy "administracao le migracoes rh360" on public.rh360_migracoes for select to authenticated
using (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));

drop policy if exists "gestao le pendencias rh360" on public.rh360_pendencias;
create policy "gestao le pendencias rh360" on public.rh360_pendencias for select to authenticated
using (
  public.tem_perfil(array['administrador','diretoria','rh','gestor']::public.perfil_acesso[])
  or responsavel_auth_user_id = auth.uid()
);
drop policy if exists "rh gerencia pendencias rh360" on public.rh360_pendencias;
create policy "rh gerencia pendencias rh360" on public.rh360_pendencias for all to authenticated
using (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]))
with check (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));

revoke all on public.rh360_migracoes, public.rh360_pendencias from anon;
grant select on public.rh360_migracoes to authenticated;
grant select, insert, update, delete on public.rh360_pendencias to authenticated;
revoke all on function public.rh360_sincronizar_pendencias() from public, anon;
revoke all on function public.rh360_diagnostico_sistema() from public, anon;
grant execute on function public.rh360_sincronizar_pendencias() to authenticated;
grant execute on function public.rh360_diagnostico_sistema() to authenticated;

comment on table public.rh360_migracoes is 'Registro verificável das etapas instaladas da plataforma.';
comment on table public.rh360_pendencias is 'Caixa de trabalho do RH com tarefas manuais e condições automáticas auditáveis.';
comment on function public.rh360_diagnostico_sistema() is 'Diagnóstico sem exposição de segredos, restrito a administrador e RH.';
