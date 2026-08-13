-- PREMAZON RH 360 · Central de Dados e Relatórios v0.7.0
-- Histórico unificado das importações, snapshots executivos e links públicos revogáveis.
-- Execute depois das migrações 001 a 006.

create extension if not exists pgcrypto;

insert into public.rh360_migracoes(versao, nome)
values ('007', 'Central de Dados e Relatórios')
on conflict (versao) do update set nome = excluded.nome;

create or replace view public.rh360_historico_importacoes
with (security_invoker = true)
as
select
  i.id,
  'rumo_topo'::text as origem,
  'ciclo_mensal'::text as tipo,
  i.nome_arquivo,
  i.tamanho_arquivo,
  i.hash_arquivo,
  i.status::text as status,
  i.total_linhas,
  i.linhas_validas,
  i.linhas_rejeitadas,
  i.avisos,
  i.importado_por,
  i.importado_em,
  i.finalizado_em,
  c.referencia::text as referencia
from public.rumo_topo_importacoes i
join public.rumo_topo_ciclos c on c.id = i.ciclo_id
union all
select
  i.id,
  'treinamento'::text,
  i.tipo,
  i.nome_arquivo,
  i.tamanho_arquivo,
  i.hash_arquivo,
  i.status,
  i.total_linhas,
  i.linhas_validas,
  i.linhas_rejeitadas,
  i.avisos,
  i.importado_por,
  i.importado_em,
  i.finalizado_em,
  i.ano_referencia::text
from public.td_importacoes i
union all
select
  i.id,
  'recrutamento'::text,
  'historico_processos'::text,
  i.nome_arquivo,
  i.tamanho_arquivo,
  i.hash_arquivo,
  i.status,
  i.total_linhas,
  i.linhas_validas,
  i.linhas_rejeitadas,
  i.avisos,
  i.importado_por,
  i.importado_em,
  i.finalizado_em,
  null::text
from public.rs_importacoes_historico i;

revoke all on public.rh360_historico_importacoes from anon;
grant select on public.rh360_historico_importacoes to authenticated;
comment on view public.rh360_historico_importacoes is
  'Histórico unificado e protegido das cargas de planilhas dos módulos RH.';

create table if not exists public.rh360_compartilhamentos (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  tipo text not null default 'dashboard_executivo' check (tipo in ('dashboard_executivo')),
  titulo text not null,
  snapshot jsonb not null,
  expira_em timestamptz not null,
  ativo boolean not null default true,
  total_acessos integer not null default 0 check (total_acessos >= 0),
  ultimo_acesso_em timestamptz,
  revogado_em timestamptz,
  criado_por uuid not null default auth.uid() references auth.users(id) on delete restrict,
  criado_em timestamptz not null default now(),
  metadados jsonb not null default '{"dados_pessoais":false,"somente_agregados":true}'::jsonb,
  check (expira_em > criado_em)
);

create index if not exists idx_rh360_compartilhamentos_validade
  on public.rh360_compartilhamentos(ativo, expira_em desc);
create index if not exists idx_rh360_compartilhamentos_criador
  on public.rh360_compartilhamentos(criado_por, criado_em desc);

create or replace function public.rh360_criar_compartilhamento_dashboard(
  p_titulo text default 'Dashboard Executivo RH',
  p_validade_dias integer default 30
)
returns table (token uuid, expira_em timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_snapshot jsonb;
  v_setores jsonb;
  v_treinamentos jsonb;
  v_pdis jsonb;
  v_candidaturas jsonb;
  v_pendencias jsonb;
begin
  if not public.tem_perfil(array['administrador','diretoria','rh']::public.perfil_acesso[]) then
    raise exception 'Apenas administrador, diretoria ou RH pode compartilhar o dashboard.' using errcode = '42501';
  end if;
  if p_validade_dias < 1 or p_validade_dias > 90 then
    raise exception 'A validade deve ficar entre 1 e 90 dias.' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_titulo, ''))) < 3 or length(trim(p_titulo)) > 120 then
    raise exception 'Informe um título entre 3 e 120 caracteres.' using errcode = '22023';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('name', nome, 'value', quantidade) order by quantidade desc, nome), '[]'::jsonb)
  into v_setores
  from (
    select coalesce(s.nome, 'Sem setor') as nome, count(*)::integer as quantidade
    from public.colaboradores_v2 c
    left join public.setores s on s.id = c.setor_id
    where c.status = 'ativo'
    group by coalesce(s.nome, 'Sem setor')
  ) dados;

  select coalesce(jsonb_agg(jsonb_build_object('name', nome, 'value', quantidade) order by quantidade desc, nome), '[]'::jsonb)
  into v_treinamentos
  from (
    select case status
      when 'planejado' then 'Planejado' when 'inscricoes' then 'Inscrições'
      when 'em_andamento' then 'Em andamento' when 'concluido' then 'Concluído'
      when 'cancelado' then 'Cancelado' else status end as nome,
      count(*)::integer as quantidade
    from public.td_treinamentos group by status
  ) dados;

  select coalesce(jsonb_agg(jsonb_build_object('name', nome, 'value', quantidade) order by quantidade desc, nome), '[]'::jsonb)
  into v_pdis
  from (
    select case status when 'rascunho' then 'Rascunho' when 'ativo' then 'Ativo'
      when 'concluido' then 'Concluído' when 'cancelado' then 'Cancelado' else status end as nome,
      count(*)::integer as quantidade
    from public.td_pdis group by status
  ) dados;

  select coalesce(jsonb_agg(jsonb_build_object('name', nome, 'value', quantidade) order by quantidade desc, nome), '[]'::jsonb)
  into v_candidaturas
  from (
    select case etapa when 'triagem' then 'Triagem' when 'entrevista_rh' then 'Entrevista RH'
      when 'teste_tecnico' then 'Teste técnico' when 'entrevista_gestor' then 'Entrevista gestor'
      when 'proposta' then 'Proposta' when 'admissao' then 'Admissão'
      when 'encerrado' then 'Encerrado' else etapa end as nome,
      count(*)::integer as quantidade
    from public.rs_candidaturas where status = 'ativa' group by etapa
  ) dados;

  select coalesce(jsonb_agg(jsonb_build_object('name', nome, 'value', quantidade) order by quantidade desc, nome), '[]'::jsonb)
  into v_pendencias
  from (
    select case prioridade when 'critica' then 'Crítica' when 'alta' then 'Alta'
      when 'media' then 'Média' when 'baixa' then 'Baixa' else prioridade end as nome,
      count(*)::integer as quantidade
    from public.rh360_pendencias
    where status not in ('concluida','cancelada')
    group by prioridade
  ) dados;

  v_snapshot := jsonb_build_object(
    'versao', 1,
    'gerado_em', now(),
    'privacidade', jsonb_build_object('dados_pessoais', false, 'somente_agregados', true),
    'indicadores', jsonb_build_object(
      'colaboradores_ativos', (select count(*) from public.colaboradores_v2 where status = 'ativo'),
      'vagas_abertas', (select count(*) from public.rs_vagas where status = 'aberta'),
      'candidaturas_ativas', (select count(*) from public.rs_candidaturas where status = 'ativa'),
      'carga_horaria_plano', (select coalesce(sum(carga_horaria), 0) from public.td_treinamentos where status <> 'cancelado'),
      'pdis_ativos', (select count(*) from public.td_pdis where status = 'ativo'),
      'pendencias_ativas', (select count(*) from public.rh360_pendencias where status not in ('concluida','cancelada')),
      'pendencias_vencidas', (select count(*) from public.rh360_pendencias where status not in ('concluida','cancelada') and prazo < current_date)
    ),
    'colaboradores_por_setor', v_setores,
    'treinamentos_por_status', v_treinamentos,
    'pdis_por_status', v_pdis,
    'candidaturas_por_etapa', v_candidaturas,
    'pendencias_por_prioridade', v_pendencias
  );

  return query
  insert into public.rh360_compartilhamentos(titulo, snapshot, expira_em)
  values (trim(p_titulo), v_snapshot, now() + make_interval(days => p_validade_dias))
  returning rh360_compartilhamentos.token, rh360_compartilhamentos.expira_em;
end;
$$;

create or replace function public.rh360_registrar_acesso_compartilhamento(p_id uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.rh360_compartilhamentos
  set total_acessos = total_acessos + 1, ultimo_acesso_em = now()
  where id = p_id and ativo and expira_em > now();
$$;

create or replace function public.rh360_auditar_compartilhamento()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and old.ativo is not distinct from new.ativo and old.expira_em is not distinct from new.expira_em then
    return new;
  end if;
  insert into public.auditoria_eventos(entidade, entidade_id, acao, dados_anteriores, dados_novos)
  values (
    'rh360_compartilhamentos',
    case when tg_op = 'DELETE' then old.id else new.id end,
    tg_op,
    case when tg_op in ('UPDATE','DELETE') then jsonb_build_object('ativo', old.ativo, 'expira_em', old.expira_em) end,
    case when tg_op in ('INSERT','UPDATE') then jsonb_build_object('ativo', new.ativo, 'expira_em', new.expira_em, 'tipo', new.tipo) end
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists trg_rh360_compartilhamentos_auditoria on public.rh360_compartilhamentos;
create trigger trg_rh360_compartilhamentos_auditoria
after insert or update or delete on public.rh360_compartilhamentos
for each row execute function public.rh360_auditar_compartilhamento();

alter table public.rh360_compartilhamentos enable row level security;

drop policy if exists "gestao le compartilhamentos rh360" on public.rh360_compartilhamentos;
create policy "gestao le compartilhamentos rh360" on public.rh360_compartilhamentos for select to authenticated
using (public.tem_perfil(array['administrador','diretoria','rh']::public.perfil_acesso[]));

drop policy if exists "gestao revoga compartilhamentos rh360" on public.rh360_compartilhamentos;
create policy "gestao revoga compartilhamentos rh360" on public.rh360_compartilhamentos for update to authenticated
using (public.tem_perfil(array['administrador','diretoria','rh']::public.perfil_acesso[]))
with check (public.tem_perfil(array['administrador','diretoria','rh']::public.perfil_acesso[]));

revoke all on public.rh360_compartilhamentos from anon, authenticated;
grant select on public.rh360_compartilhamentos to authenticated;
grant update (ativo, revogado_em) on public.rh360_compartilhamentos to authenticated;
revoke all on function public.rh360_criar_compartilhamento_dashboard(text, integer) from public, anon;
grant execute on function public.rh360_criar_compartilhamento_dashboard(text, integer) to authenticated;
revoke all on function public.rh360_registrar_acesso_compartilhamento(uuid) from public, anon, authenticated;
grant execute on function public.rh360_registrar_acesso_compartilhamento(uuid) to service_role;

comment on table public.rh360_compartilhamentos is
  'Snapshots agregados e revogáveis para compartilhamento temporário, sem dados pessoais.';
comment on function public.rh360_criar_compartilhamento_dashboard(text, integer) is
  'Cria retrato imutável do dashboard com indicadores agregados e validade máxima de 90 dias.';

create or replace function public.rh360_diagnostico_central_dados()
returns table (
  chave text, titulo text, categoria text, status text,
  detalhe text, acao text, criticidade text, ordem integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]) then
    raise exception 'Apenas administrador ou RH pode acessar o diagnóstico.' using errcode = '42501';
  end if;
  return query
  select * from (values
    ('migracao_007'::text, 'Migração 007 · Central de Dados'::text, 'Banco'::text,
      case when to_regclass('public.rh360_compartilhamentos') is not null
        and to_regclass('public.rh360_historico_importacoes') is not null then 'ok' else 'erro' end::text,
      'Histórico unificado, exportação e links executivos.'::text,
      'Execute a migração 007.'::text, 'critica'::text, 65),
    ('rls_compartilhamentos'::text, 'RLS dos relatórios compartilháveis'::text, 'Segurança'::text,
      case when exists (
        select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relname = 'rh360_compartilhamentos' and c.relrowsecurity
      ) then 'ok' else 'erro' end::text,
      'Snapshots protegidos; acesso público somente pela API validada.'::text,
      'Ative RLS e revise as políticas da migração 007.'::text, 'critica'::text, 120)
  ) as diagnostico(chave, titulo, categoria, status, detalhe, acao, criticidade, ordem)
  order by diagnostico.ordem;
end;
$$;

revoke all on function public.rh360_diagnostico_central_dados() from public, anon;
grant execute on function public.rh360_diagnostico_central_dados() to authenticated;
