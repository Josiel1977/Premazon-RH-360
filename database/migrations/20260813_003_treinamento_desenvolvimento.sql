-- PREMAZON RH 360
-- Treinamento & Desenvolvimento: LNT, sinais de desempenho, catálogo, plano anual,
-- participações, certificados e avaliação de eficácia.
-- Os registros das planilhas não pertencem ao código-fonte e devem ser importados pela aplicação.

create extension if not exists pgcrypto;

create table if not exists public.td_importacoes (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('lnt', 'avaliacao_desempenho')),
  nome_arquivo text not null,
  tamanho_arquivo bigint not null check (tamanho_arquivo > 0),
  hash_arquivo text not null,
  status text not null default 'processando' check (
    status in ('processando', 'concluida', 'concluida_com_avisos', 'falhou', 'cancelada')
  ),
  ano_referencia integer check (ano_referencia between 2000 and 2200),
  total_linhas integer not null default 0 check (total_linhas >= 0),
  linhas_validas integer not null default 0 check (linhas_validas >= 0),
  linhas_rejeitadas integer not null default 0 check (linhas_rejeitadas >= 0),
  avisos jsonb not null default '[]'::jsonb,
  metadados jsonb not null default '{}'::jsonb,
  importado_por uuid not null default auth.uid() references auth.users(id) on delete restrict,
  importado_em timestamptz not null default now(),
  finalizado_em timestamptz
);

create unique index if not exists idx_td_importacao_hash_concluida
  on public.td_importacoes(tipo, hash_arquivo)
  where status in ('concluida', 'concluida_com_avisos');
create index if not exists idx_td_importacoes_tipo_data
  on public.td_importacoes(tipo, importado_em desc);

create table if not exists public.td_lnt_necessidades (
  id uuid primary key default gen_random_uuid(),
  importacao_id uuid not null references public.td_importacoes(id) on delete cascade,
  colaborador_id uuid references public.colaboradores_v2(id) on delete set null,
  colaborador_nome_importado text not null,
  gestor_importado text not null,
  setor_importado text not null,
  cargo_importado text not null,
  resposta_em timestamptz,
  necessidades_tecnicas text[] not null default '{}',
  temas_comportamentais text[] not null default '{}',
  outro_detalhe text,
  treinamento_sugerido text,
  prioridade text not null default 'media' check (prioridade in ('baixa', 'media', 'alta', 'critica')),
  status text not null default 'identificada' check (
    status in ('identificada', 'priorizada', 'planejada', 'atendida', 'cancelada')
  ),
  vinculo_status text not null default 'pendente' check (
    vinculo_status in ('pendente', 'vinculado', 'ambiguo', 'nao_encontrado')
  ),
  linha_original integer,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_td_lnt_importacao on public.td_lnt_necessidades(importacao_id);
create index if not exists idx_td_lnt_setor_status on public.td_lnt_necessidades(setor_importado, status);
create index if not exists idx_td_lnt_colaborador on public.td_lnt_necessidades(colaborador_id);

create table if not exists public.td_avaliacoes_sinais (
  id uuid primary key default gen_random_uuid(),
  importacao_id uuid not null references public.td_importacoes(id) on delete cascade,
  colaborador_id uuid references public.colaboradores_v2(id) on delete set null,
  colaborador_nome_importado text not null,
  gestor_importado text not null,
  setor_importado text not null,
  cargo_importado text not null,
  avaliacao_em timestamptz,
  competencias jsonb not null default '{}'::jsonb,
  media_geral numeric(4,2) not null check (media_geral between 0 and 10),
  competencias_avaliadas integer not null check (competencias_avaliadas between 1 and 15),
  pontos_fortes text,
  pontos_desenvolver text,
  vinculo_status text not null default 'pendente' check (
    vinculo_status in ('pendente', 'vinculado', 'ambiguo', 'nao_encontrado')
  ),
  linha_original integer,
  criado_em timestamptz not null default now()
);

create index if not exists idx_td_avaliacoes_importacao on public.td_avaliacoes_sinais(importacao_id);
create index if not exists idx_td_avaliacoes_setor on public.td_avaliacoes_sinais(setor_importado);
create index if not exists idx_td_avaliacoes_colaborador on public.td_avaliacoes_sinais(colaborador_id);

create table if not exists public.td_cursos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text not null check (categoria in ('tecnico', 'comportamental', 'nr_legal', 'integracao', 'qualidade', 'gestao', 'outro')),
  competencia_chave text,
  descricao text,
  modalidade text not null default 'presencial' check (modalidade in ('presencial', 'ead', 'hibrido')),
  carga_horaria numeric(6,2) not null check (carga_horaria > 0 and carga_horaria <= 1000),
  validade_meses integer check (validade_meses is null or validade_meses between 1 and 120),
  obrigatorio boolean not null default false,
  norma_referencia text,
  custo_estimado_pessoa numeric(12,2) check (custo_estimado_pessoa is null or custo_estimado_pessoa >= 0),
  ativo boolean not null default true,
  criado_por uuid default auth.uid() references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create unique index if not exists idx_td_cursos_nome_ativo
  on public.td_cursos(lower(nome)) where ativo;

create table if not exists public.td_treinamentos (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid references public.td_cursos(id) on delete set null,
  titulo text not null,
  categoria text not null check (categoria in ('tecnico', 'comportamental', 'nr_legal', 'integracao', 'qualidade', 'gestao', 'outro')),
  modalidade text not null default 'presencial' check (modalidade in ('presencial', 'ead', 'hibrido')),
  carga_horaria numeric(6,2) not null check (carga_horaria > 0 and carga_horaria <= 1000),
  data_inicio date not null,
  data_fim date,
  eficacia_prevista_em date,
  fornecedor text,
  instrutor text,
  local text,
  publico_alvo text,
  vagas_planejadas integer check (vagas_planejadas is null or vagas_planejadas between 1 and 10000),
  custo_planejado numeric(12,2) check (custo_planejado is null or custo_planejado >= 0),
  custo_real numeric(12,2) check (custo_real is null or custo_real >= 0),
  status text not null default 'planejado' check (
    status in ('planejado', 'inscricoes', 'em_andamento', 'concluido', 'cancelado')
  ),
  observacoes text,
  criado_por uuid not null default auth.uid() references auth.users(id) on delete restrict,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (data_fim is null or data_fim >= data_inicio)
);

create index if not exists idx_td_treinamentos_data_status on public.td_treinamentos(data_inicio, status);
create index if not exists idx_td_treinamentos_curso on public.td_treinamentos(curso_id);

create table if not exists public.td_participacoes (
  id uuid primary key default gen_random_uuid(),
  treinamento_id uuid not null references public.td_treinamentos(id) on delete cascade,
  colaborador_id uuid references public.colaboradores_v2(id) on delete set null,
  colaborador_nome_importado text,
  necessidade_id uuid references public.td_lnt_necessidades(id) on delete set null,
  status text not null default 'inscrito' check (
    status in ('inscrito', 'presente', 'ausente', 'aprovado', 'reprovado', 'cancelado')
  ),
  frequencia_percentual numeric(5,2) check (frequencia_percentual is null or frequencia_percentual between 0 and 100),
  nota numeric(6,2),
  certificado_path text,
  certificado_emitido_em date,
  certificado_valido_ate date,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (colaborador_id is not null or nullif(trim(colaborador_nome_importado), '') is not null)
);

create unique index if not exists idx_td_participacao_treinamento_colaborador
  on public.td_participacoes(treinamento_id, colaborador_id)
  where colaborador_id is not null;
create index if not exists idx_td_participacoes_treinamento on public.td_participacoes(treinamento_id);

create table if not exists public.td_avaliacoes_eficacia (
  id uuid primary key default gen_random_uuid(),
  participacao_id uuid not null references public.td_participacoes(id) on delete cascade,
  avaliado_por uuid default auth.uid() references auth.users(id) on delete set null,
  avaliado_em date not null default current_date,
  metodo text not null check (metodo in ('observacao_gestor', 'prova', 'indicador', 'entrevista', 'autoavaliacao', 'outro')),
  nota_antes numeric(6,2),
  nota_depois numeric(6,2),
  resultado text not null check (resultado in ('eficaz', 'parcialmente_eficaz', 'ineficaz', 'inconclusivo')),
  observacoes text,
  criado_em timestamptz not null default now()
);

create index if not exists idx_td_eficacia_participacao on public.td_avaliacoes_eficacia(participacao_id);

create or replace function public.td_atualizar_timestamp()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create or replace function public.td_auditar_sem_dados_pessoais()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  anterior jsonb;
  novo jsonb;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    anterior := to_jsonb(old) - array[
      'colaborador_nome_importado','gestor_importado','setor_importado','cargo_importado',
      'necessidades_tecnicas','temas_comportamentais','outro_detalhe','treinamento_sugerido',
      'competencias','pontos_fortes','pontos_desenvolver','instrutor','observacoes'
    ];
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    novo := to_jsonb(new) - array[
      'colaborador_nome_importado','gestor_importado','setor_importado','cargo_importado',
      'necessidades_tecnicas','temas_comportamentais','outro_detalhe','treinamento_sugerido',
      'competencias','pontos_fortes','pontos_desenvolver','instrutor','observacoes'
    ];
  end if;
  insert into public.auditoria_eventos(entidade, entidade_id, acao, dados_anteriores, dados_novos)
  values (
    tg_table_name,
    case when tg_op = 'DELETE' then old.id else new.id end,
    tg_op,
    anterior,
    novo
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists trg_td_lnt_timestamp on public.td_lnt_necessidades;
create trigger trg_td_lnt_timestamp before update on public.td_lnt_necessidades
for each row execute function public.td_atualizar_timestamp();
drop trigger if exists trg_td_cursos_timestamp on public.td_cursos;
create trigger trg_td_cursos_timestamp before update on public.td_cursos
for each row execute function public.td_atualizar_timestamp();
drop trigger if exists trg_td_treinamentos_timestamp on public.td_treinamentos;
create trigger trg_td_treinamentos_timestamp before update on public.td_treinamentos
for each row execute function public.td_atualizar_timestamp();
drop trigger if exists trg_td_participacoes_timestamp on public.td_participacoes;
create trigger trg_td_participacoes_timestamp before update on public.td_participacoes
for each row execute function public.td_atualizar_timestamp();

drop trigger if exists trg_td_cursos_auditoria on public.td_cursos;
create trigger trg_td_cursos_auditoria after insert or update or delete on public.td_cursos
for each row execute function public.td_auditar_sem_dados_pessoais();
drop trigger if exists trg_td_treinamentos_auditoria on public.td_treinamentos;
create trigger trg_td_treinamentos_auditoria after insert or update or delete on public.td_treinamentos
for each row execute function public.td_auditar_sem_dados_pessoais();
drop trigger if exists trg_td_participacoes_auditoria on public.td_participacoes;
create trigger trg_td_participacoes_auditoria after insert or update or delete on public.td_participacoes
for each row execute function public.td_auditar_sem_dados_pessoais();
drop trigger if exists trg_td_eficacia_auditoria on public.td_avaliacoes_eficacia;
create trigger trg_td_eficacia_auditoria after insert or update or delete on public.td_avaliacoes_eficacia
for each row execute function public.td_auditar_sem_dados_pessoais();

alter table public.td_importacoes enable row level security;
alter table public.td_lnt_necessidades enable row level security;
alter table public.td_avaliacoes_sinais enable row level security;
alter table public.td_cursos enable row level security;
alter table public.td_treinamentos enable row level security;
alter table public.td_participacoes enable row level security;
alter table public.td_avaliacoes_eficacia enable row level security;

drop policy if exists "gestao le importacoes td" on public.td_importacoes;
create policy "gestao le importacoes td" on public.td_importacoes for select to authenticated
using (public.tem_perfil(array['administrador','diretoria','rh','gestor']::public.perfil_acesso[]));
drop policy if exists "rh gerencia importacoes td" on public.td_importacoes;
create policy "rh gerencia importacoes td" on public.td_importacoes for all to authenticated
using (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]))
with check (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));

drop policy if exists "gestao le lnt td" on public.td_lnt_necessidades;
create policy "gestao le lnt td" on public.td_lnt_necessidades for select to authenticated
using (public.tem_perfil(array['administrador','diretoria','rh','gestor']::public.perfil_acesso[]));
drop policy if exists "rh gerencia lnt td" on public.td_lnt_necessidades;
create policy "rh gerencia lnt td" on public.td_lnt_necessidades for all to authenticated
using (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]))
with check (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));

drop policy if exists "gestao le avaliacoes td" on public.td_avaliacoes_sinais;
create policy "gestao le avaliacoes td" on public.td_avaliacoes_sinais for select to authenticated
using (public.tem_perfil(array['administrador','diretoria','rh','gestor']::public.perfil_acesso[]));
drop policy if exists "rh gerencia avaliacoes td" on public.td_avaliacoes_sinais;
create policy "rh gerencia avaliacoes td" on public.td_avaliacoes_sinais for all to authenticated
using (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]))
with check (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));

drop policy if exists "autenticados leem catalogo td" on public.td_cursos;
create policy "autenticados leem catalogo td" on public.td_cursos for select to authenticated using (ativo);
drop policy if exists "rh gerencia catalogo td" on public.td_cursos;
create policy "rh gerencia catalogo td" on public.td_cursos for all to authenticated
using (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]))
with check (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));

drop policy if exists "gestao e instrutor leem treinamentos td" on public.td_treinamentos;
create policy "gestao e instrutor leem treinamentos td" on public.td_treinamentos for select to authenticated
using (public.tem_perfil(array['administrador','diretoria','rh','gestor','instrutor']::public.perfil_acesso[]));
drop policy if exists "rh gerencia treinamentos td" on public.td_treinamentos;
create policy "rh gerencia treinamentos td" on public.td_treinamentos for all to authenticated
using (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]))
with check (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));

drop policy if exists "gestao e instrutor leem participacoes td" on public.td_participacoes;
create policy "gestao e instrutor leem participacoes td" on public.td_participacoes for select to authenticated
using (public.tem_perfil(array['administrador','diretoria','rh','gestor','instrutor']::public.perfil_acesso[]));
drop policy if exists "rh gerencia participacoes td" on public.td_participacoes;
create policy "rh gerencia participacoes td" on public.td_participacoes for all to authenticated
using (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]))
with check (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));

drop policy if exists "gestao le eficacia td" on public.td_avaliacoes_eficacia;
create policy "gestao le eficacia td" on public.td_avaliacoes_eficacia for select to authenticated
using (public.tem_perfil(array['administrador','diretoria','rh','gestor']::public.perfil_acesso[]));
drop policy if exists "rh e gestor avaliam eficacia td" on public.td_avaliacoes_eficacia;
create policy "rh e gestor avaliam eficacia td" on public.td_avaliacoes_eficacia for all to authenticated
using (public.tem_perfil(array['administrador','rh','gestor']::public.perfil_acesso[]))
with check (public.tem_perfil(array['administrador','rh','gestor']::public.perfil_acesso[]));

revoke all on public.td_importacoes, public.td_lnt_necessidades, public.td_avaliacoes_sinais,
  public.td_cursos, public.td_treinamentos, public.td_participacoes, public.td_avaliacoes_eficacia from anon;
grant select, insert, update, delete on public.td_importacoes, public.td_lnt_necessidades,
  public.td_avaliacoes_sinais, public.td_cursos, public.td_treinamentos,
  public.td_participacoes, public.td_avaliacoes_eficacia to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'td-documentos', 'td-documentos', false, 10485760,
  array['application/pdf','image/png','image/jpeg','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "gestao le documentos td" on storage.objects;
create policy "gestao le documentos td" on storage.objects for select to authenticated
using (
  bucket_id = 'td-documentos'
  and public.tem_perfil(array['administrador','diretoria','rh','gestor','instrutor']::public.perfil_acesso[])
);
drop policy if exists "rh gerencia documentos td" on storage.objects;
create policy "rh gerencia documentos td" on storage.objects for all to authenticated
using (
  bucket_id = 'td-documentos'
  and public.tem_perfil(array['administrador','rh']::public.perfil_acesso[])
)
with check (
  bucket_id = 'td-documentos'
  and public.tem_perfil(array['administrador','rh']::public.perfil_acesso[])
);

insert into public.td_cursos(nome, categoria, competencia_chave, modalidade, carga_horaria, obrigatorio)
select seed.nome, seed.categoria, seed.competencia_chave, seed.modalidade, seed.carga_horaria, false
from (values
  ('Comunicação Assertiva e Feedback Eficaz', 'comportamental', 'comunicacao', 'hibrido', 16::numeric),
  ('Segurança Operacional e Normas Regulamentadoras', 'nr_legal', 'assertividade_seguranca', 'presencial', 20::numeric),
  ('Liderança e Gestão de Pessoas', 'gestao', 'lideranca', 'hibrido', 24::numeric),
  ('Planejamento Estratégico e Tático', 'gestao', 'organizacao', 'ead', 12::numeric),
  ('Gestão do Tempo e Produtividade', 'comportamental', 'pontualidade', 'ead', 8::numeric),
  ('Accountability e Atitude de Dono', 'comportamental', 'responsabilidade', 'presencial', 10::numeric),
  ('Ferramentas da Qualidade e Melhoria Contínua', 'qualidade', 'agilidade_qualidade', 'hibrido', 16::numeric),
  ('Trabalho em Equipe e Inteligência Emocional', 'comportamental', 'trabalho_equipe', 'presencial', 12::numeric),
  ('Cultura Organizacional e Foco em Resultados', 'comportamental', 'disciplina', 'hibrido', 8::numeric)
) as seed(nome, categoria, competencia_chave, modalidade, carga_horaria)
where not exists (select 1 from public.td_cursos curso where lower(curso.nome) = lower(seed.nome) and curso.ativo);

comment on table public.td_lnt_necessidades is 'LNT importada e revisável. Nomes não geram vínculo automático sem conferência.';
comment on table public.td_avaliacoes_sinais is 'Sinais de desempenho usados para priorização de T&D; respostas vazias não recebem nota artificial.';
comment on table public.td_avaliacoes_eficacia is 'Resultado pós-treinamento para fechar o ciclo necessidade, ação e eficácia.';
