-- PREMAZON RH 360
-- Complementos dos programas estratégicos:
-- 1. histórico analítico de Recrutamento & Seleção;
-- 2. planos de desenvolvimento individual de Treinamento & Desenvolvimento.
--
-- Esta migração não insere nomes, avaliações ou custos das planilhas no código-fonte.

create extension if not exists pgcrypto;

create table if not exists public.rs_importacoes_historico (
  id uuid primary key default gen_random_uuid(),
  nome_arquivo text not null,
  tamanho_arquivo bigint not null check (tamanho_arquivo > 0),
  hash_arquivo text not null,
  status text not null default 'processando' check (
    status in ('processando', 'concluida', 'concluida_com_avisos', 'falhou', 'cancelada')
  ),
  total_linhas integer not null default 0 check (total_linhas >= 0),
  linhas_validas integer not null default 0 check (linhas_validas >= 0),
  linhas_rejeitadas integer not null default 0 check (linhas_rejeitadas >= 0),
  avisos jsonb not null default '[]'::jsonb,
  importado_por uuid not null default auth.uid() references auth.users(id) on delete restrict,
  importado_em timestamptz not null default now(),
  finalizado_em timestamptz
);

create unique index if not exists idx_rs_historico_hash_concluido
  on public.rs_importacoes_historico(hash_arquivo)
  where status in ('concluida', 'concluida_com_avisos');
create index if not exists idx_rs_historico_importacoes_data
  on public.rs_importacoes_historico(importado_em desc);

create table if not exists public.rs_historico_processos (
  id uuid primary key default gen_random_uuid(),
  importacao_id uuid not null references public.rs_importacoes_historico(id) on delete cascade,
  linha_original integer,
  cargo text not null,
  departamento text not null,
  gestor text not null,
  data_abertura date,
  tipo_contratacao text not null default 'Não informado',
  colaborador_substituido text,
  colaborador_contratado text,
  data_admissao date,
  data_demissao date,
  tipo_desligamento text,
  motivo_desligamento text,
  data_fechamento date,
  sla_dias integer check (sla_dias is null or sla_dias >= 0),
  custo_colaborador numeric(12,2) check (custo_colaborador is null or custo_colaborador >= 0),
  custo_epi numeric(12,2) check (custo_epi is null or custo_epi >= 0),
  custo_uniforme numeric(12,2) check (custo_uniforme is null or custo_uniforme >= 0),
  tamanho_calca text,
  tamanho_camisa text,
  tamanho_bota text,
  criado_em timestamptz not null default now(),
  check (data_fechamento is null or data_abertura is null or data_fechamento >= data_abertura)
);

create index if not exists idx_rs_historico_importacao
  on public.rs_historico_processos(importacao_id);
create index if not exists idx_rs_historico_departamento
  on public.rs_historico_processos(departamento);
create index if not exists idx_rs_historico_gestor
  on public.rs_historico_processos(gestor);
create index if not exists idx_rs_historico_admissao
  on public.rs_historico_processos(data_admissao desc);

create table if not exists public.td_pdis (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid references public.colaboradores_v2(id) on delete set null,
  avaliacao_sinal_id uuid references public.td_avaliacoes_sinais(id) on delete set null,
  colaborador_nome_importado text not null,
  gestor_importado text,
  setor_importado text,
  cargo_importado text,
  objetivo text not null,
  status text not null default 'rascunho' check (
    status in ('rascunho', 'ativo', 'concluido', 'cancelado')
  ),
  data_inicio date not null default current_date,
  data_limite date,
  criado_por uuid not null default auth.uid() references auth.users(id) on delete restrict,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (data_limite is null or data_limite >= data_inicio)
);

create index if not exists idx_td_pdis_colaborador
  on public.td_pdis(colaborador_id);
create index if not exists idx_td_pdis_status_limite
  on public.td_pdis(status, data_limite);
create index if not exists idx_td_pdis_nome_importado
  on public.td_pdis(lower(colaborador_nome_importado));

create table if not exists public.td_pdi_acoes (
  id uuid primary key default gen_random_uuid(),
  pdi_id uuid not null references public.td_pdis(id) on delete cascade,
  competencia_chave text,
  tipo_acao text not null check (
    tipo_acao in ('curso', 'mentoria', 'pratica_supervisionada', 'leitura', 'projeto', 'feedback', 'outro')
  ),
  descricao text not null,
  curso_id uuid references public.td_cursos(id) on delete set null,
  resultado_esperado text,
  data_limite date,
  status text not null default 'planejada' check (
    status in ('planejada', 'em_andamento', 'concluida', 'cancelada')
  ),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_td_pdi_acoes_pdi
  on public.td_pdi_acoes(pdi_id);
create index if not exists idx_td_pdi_acoes_status
  on public.td_pdi_acoes(status, data_limite);

drop trigger if exists trg_td_pdis_timestamp on public.td_pdis;
create trigger trg_td_pdis_timestamp before update on public.td_pdis
for each row execute function public.td_atualizar_timestamp();
drop trigger if exists trg_td_pdi_acoes_timestamp on public.td_pdi_acoes;
create trigger trg_td_pdi_acoes_timestamp before update on public.td_pdi_acoes
for each row execute function public.td_atualizar_timestamp();

create or replace function public.programas_estrategicos_auditar()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  registro_id uuid;
  anterior jsonb;
  novo jsonb;
begin
  registro_id := case when tg_op = 'DELETE' then old.id else new.id end;
  if tg_op in ('UPDATE', 'DELETE') then
    anterior := to_jsonb(old) - array[
      'colaborador_nome_importado','gestor_importado','setor_importado','cargo_importado',
      'colaborador_substituido','colaborador_contratado','descricao','resultado_esperado'
    ];
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    novo := to_jsonb(new) - array[
      'colaborador_nome_importado','gestor_importado','setor_importado','cargo_importado',
      'colaborador_substituido','colaborador_contratado','descricao','resultado_esperado'
    ];
  end if;
  insert into public.auditoria_eventos(entidade, entidade_id, acao, dados_anteriores, dados_novos)
  values (tg_table_name, registro_id, tg_op, anterior, novo);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists trg_rs_historico_auditoria on public.rs_historico_processos;
create trigger trg_rs_historico_auditoria after insert or update or delete on public.rs_historico_processos
for each row execute function public.programas_estrategicos_auditar();
drop trigger if exists trg_td_pdis_auditoria on public.td_pdis;
create trigger trg_td_pdis_auditoria after insert or update or delete on public.td_pdis
for each row execute function public.programas_estrategicos_auditar();
drop trigger if exists trg_td_pdi_acoes_auditoria on public.td_pdi_acoes;
create trigger trg_td_pdi_acoes_auditoria after insert or update or delete on public.td_pdi_acoes
for each row execute function public.programas_estrategicos_auditar();

alter table public.rs_importacoes_historico enable row level security;
alter table public.rs_historico_processos enable row level security;
alter table public.td_pdis enable row level security;
alter table public.td_pdi_acoes enable row level security;

drop policy if exists "gestao le importacoes historicas rs" on public.rs_importacoes_historico;
create policy "gestao le importacoes historicas rs" on public.rs_importacoes_historico for select to authenticated
using (public.tem_perfil(array['administrador','diretoria','rh','gestor']::public.perfil_acesso[]));
drop policy if exists "rh gerencia importacoes historicas rs" on public.rs_importacoes_historico;
create policy "rh gerencia importacoes historicas rs" on public.rs_importacoes_historico for all to authenticated
using (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]))
with check (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));

drop policy if exists "gestao le historico rs" on public.rs_historico_processos;
create policy "gestao le historico rs" on public.rs_historico_processos for select to authenticated
using (public.tem_perfil(array['administrador','diretoria','rh','gestor']::public.perfil_acesso[]));
drop policy if exists "rh gerencia historico rs" on public.rs_historico_processos;
create policy "rh gerencia historico rs" on public.rs_historico_processos for all to authenticated
using (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]))
with check (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));

drop policy if exists "gestao le pdis td" on public.td_pdis;
create policy "gestao le pdis td" on public.td_pdis for select to authenticated
using (public.tem_perfil(array['administrador','diretoria','rh','gestor']::public.perfil_acesso[]));
drop policy if exists "rh gerencia pdis td" on public.td_pdis;
create policy "rh gerencia pdis td" on public.td_pdis for all to authenticated
using (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]))
with check (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));

drop policy if exists "gestao le acoes pdi td" on public.td_pdi_acoes;
create policy "gestao le acoes pdi td" on public.td_pdi_acoes for select to authenticated
using (public.tem_perfil(array['administrador','diretoria','rh','gestor']::public.perfil_acesso[]));
drop policy if exists "rh gerencia acoes pdi td" on public.td_pdi_acoes;
create policy "rh gerencia acoes pdi td" on public.td_pdi_acoes for all to authenticated
using (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]))
with check (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));

revoke all on public.rs_importacoes_historico, public.rs_historico_processos,
  public.td_pdis, public.td_pdi_acoes from anon;
grant select, insert, update, delete on public.rs_importacoes_historico,
  public.rs_historico_processos, public.td_pdis, public.td_pdi_acoes to authenticated;

comment on table public.rs_historico_processos is
  'Histórico real importado da planilha de R&S. Custos de EPI e uniforme permanecem nulos quando não informados.';
comment on table public.td_pdis is
  'PDI gerado a partir de avaliação real, com objetivo e acompanhamento próprios.';
comment on table public.td_pdi_acoes is
  'Ações mensuráveis do PDI; recomendações não substituem validação do RH e do gestor.';
