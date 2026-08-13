-- PREMAZON RH 360 · Admissão e Onboarding v0.8.0
-- Processos admissionais, pré-admissão, documentos privados e checklists por área.
-- Execute depois das migrações 001 a 007.

create extension if not exists pgcrypto;

insert into public.rh360_migracoes(versao, nome)
values ('008', 'Admissão e Onboarding')
on conflict (versao) do update set nome = excluded.nome;

create table if not exists public.adm_modelos_tarefas (
  id uuid primary key default gen_random_uuid(),
  area text not null check (area in ('rh','dp','qualidade','sesmt','gestor','ti')),
  titulo text not null,
  descricao text,
  dias_relativos integer not null default 0 check (dias_relativos between -60 and 180),
  obrigatoria boolean not null default true,
  ordem integer not null default 0 check (ordem >= 0),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (area, titulo)
);

create table if not exists public.adm_processos (
  id uuid primary key default gen_random_uuid(),
  candidatura_id uuid references public.rs_candidaturas(id) on delete set null,
  colaborador_id uuid references public.colaboradores_v2(id) on delete set null,
  nome_candidato text not null,
  email_candidato text,
  telefone_candidato text,
  cargo text not null,
  departamento text not null,
  gestor_nome text,
  gestor_id uuid references public.colaboradores_v2(id) on delete set null,
  tipo_contrato text not null default 'clt' check (tipo_contrato in ('clt','temporario','aprendiz','estagio','pj','terceirizado','outro')),
  data_admissao_prevista date not null,
  data_admissao_real date,
  etapa text not null default 'pre_admissao' check (etapa in ('pre_admissao','documentos','exames','contrato','integracao','experiencia','concluido','cancelado')),
  status text not null default 'aberto' check (status in ('aberto','em_andamento','aguardando_candidato','bloqueado','concluido','cancelado')),
  public_token uuid not null unique default gen_random_uuid(),
  link_ativo boolean not null default true,
  link_expira_em timestamptz,
  responsavel_id uuid default auth.uid() references auth.users(id) on delete set null,
  observacoes text,
  concluido_em timestamptz,
  criado_por uuid not null default auth.uid() references auth.users(id) on delete restrict,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (data_admissao_real is null or data_admissao_real >= data_admissao_prevista - 90),
  check (link_expira_em is null or link_expira_em > criado_em)
);

create unique index if not exists idx_adm_processo_candidatura_ativa
  on public.adm_processos(candidatura_id)
  where candidatura_id is not null and status not in ('cancelado');
create index if not exists idx_adm_processos_etapa_data
  on public.adm_processos(status, etapa, data_admissao_prevista);

create table if not exists public.adm_dados_preadmissao (
  id uuid primary key default gen_random_uuid(),
  processo_id uuid not null unique references public.adm_processos(id) on delete cascade,
  nome_social text,
  data_nascimento date not null,
  cpf_hash text not null,
  cpf_final char(4) not null,
  email text not null,
  telefone text not null,
  endereco jsonb not null,
  contato_emergencia_nome text not null,
  contato_emergencia_telefone text not null,
  tamanho_camisa text,
  tamanho_calca text,
  tamanho_calcado text,
  consentimento_lgpd boolean not null check (consentimento_lgpd),
  consentimento_em timestamptz not null default now(),
  enviado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (data_nascimento between date '1920-01-01' and date '2100-01-01')
);

create unique index if not exists idx_adm_preadmissao_cpf_processo
  on public.adm_dados_preadmissao(cpf_hash, processo_id);

create table if not exists public.adm_documentos (
  id uuid primary key default gen_random_uuid(),
  processo_id uuid not null references public.adm_processos(id) on delete cascade,
  tipo_documento text not null check (tipo_documento in ('identidade','cpf','residencia','ctps','banco','escolaridade','titulo_eleitor','reservista','dependentes','aso','outro')),
  arquivo_path text not null,
  arquivo_nome text not null,
  arquivo_tipo text not null,
  arquivo_tamanho bigint not null check (arquivo_tamanho between 1 and 3145728),
  status text not null default 'recebido' check (status in ('recebido','em_analise','aprovado','rejeitado','substituido')),
  observacao_revisao text,
  revisado_por uuid references auth.users(id) on delete set null,
  revisado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (processo_id, tipo_documento)
);

create index if not exists idx_adm_documentos_processo_status
  on public.adm_documentos(processo_id, status);

create table if not exists public.adm_tarefas (
  id uuid primary key default gen_random_uuid(),
  processo_id uuid not null references public.adm_processos(id) on delete cascade,
  modelo_id uuid references public.adm_modelos_tarefas(id) on delete set null,
  area text not null check (area in ('rh','dp','qualidade','sesmt','gestor','ti')),
  titulo text not null,
  descricao text,
  responsavel_id uuid references auth.users(id) on delete set null,
  prazo date,
  obrigatoria boolean not null default true,
  status text not null default 'pendente' check (status in ('pendente','em_andamento','aguardando','concluida','dispensada','bloqueada')),
  evidencia text,
  concluida_por uuid references auth.users(id) on delete set null,
  concluida_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (processo_id, modelo_id)
);

create index if not exists idx_adm_tarefas_area_status_prazo
  on public.adm_tarefas(area, status, prazo);
create index if not exists idx_adm_tarefas_processo
  on public.adm_tarefas(processo_id, status);

insert into public.adm_modelos_tarefas(area,titulo,descricao,dias_relativos,obrigatoria,ordem) values
  ('rh','Conferir dados da pré-admissão','Validar informações fornecidas e pendências do candidato.',-7,true,10),
  ('rh','Preparar boas-vindas','Definir agenda, padrinho e comunicação de chegada.',-2,true,20),
  ('rh','Apresentar cultura e políticas','Realizar integração institucional e registrar presença.',0,true,30),
  ('dp','Validar documentos admissionais','Conferir documentos obrigatórios e solicitar correções.',-7,true,10),
  ('dp','Cadastrar contrato e eSocial','Concluir registro trabalhista dentro do prazo legal.',-1,true,20),
  ('dp','Coletar assinatura do contrato','Guardar evidência do contrato assinado.',0,true,30),
  ('qualidade','Realizar integração da Qualidade','Apresentar procedimentos, registros e responsabilidades.',1,true,10),
  ('sesmt','Validar ASO admissional','Confirmar aptidão antes do início das atividades.',-1,true,10),
  ('sesmt','Realizar integração de segurança','Orientar riscos, regras, emergência e recusa segura.',0,true,20),
  ('sesmt','Entregar EPIs aplicáveis','Registrar entrega, CA e orientação de uso.',0,false,30),
  ('gestor','Preparar posto e plano inicial','Definir recursos, atividades e expectativas dos primeiros dias.',-1,true,10),
  ('gestor','Realizar alinhamento de 7 dias','Registrar adaptação inicial e necessidades de suporte.',7,true,20),
  ('gestor','Realizar acompanhamento de 30 dias','Avaliar integração, entregas e desenvolvimento.',30,true,30),
  ('gestor','Realizar acompanhamento de 60 dias','Revisar evolução e plano de experiência.',60,true,40),
  ('gestor','Realizar acompanhamento de 90 dias','Concluir ciclo inicial e registrar decisão.',90,true,50),
  ('ti','Preparar acessos e equipamentos','Criar acessos mínimos e disponibilizar recursos aprovados.',-1,false,10)
on conflict (area,titulo) do update set
  descricao=excluded.descricao,dias_relativos=excluded.dias_relativos,obrigatoria=excluded.obrigatoria,ordem=excluded.ordem,ativo=true;

create or replace function public.adm_atualizar_timestamp()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin new.atualizado_em = now(); return new; end;
$$;

create or replace function public.adm_criar_checklist()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.adm_tarefas(processo_id,modelo_id,area,titulo,descricao,prazo,obrigatoria)
  select new.id,m.id,m.area,m.titulo,m.descricao,new.data_admissao_prevista + m.dias_relativos,m.obrigatoria
  from public.adm_modelos_tarefas m where m.ativo
  on conflict (processo_id,modelo_id) do nothing;
  return new;
end;
$$;

create or replace function public.adm_concluir_processo(p_processo_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_processo public.adm_processos%rowtype; v_colaborador uuid;
begin
  if not public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]) then
    raise exception 'Apenas administrador ou RH pode concluir a admissão.' using errcode='42501';
  end if;
  select * into v_processo from public.adm_processos where id=p_processo_id for update;
  if not found then raise exception 'Processo não encontrado.' using errcode='P0002'; end if;
  if exists(select 1 from public.adm_tarefas where processo_id=p_processo_id and obrigatoria and status not in ('concluida','dispensada')) then
    raise exception 'Existem tarefas obrigatórias pendentes.' using errcode='23514';
  end if;
  v_colaborador := v_processo.colaborador_id;
  if v_colaborador is null then
    insert into public.colaboradores_v2(nome,email,telefone,data_admissao,tipo_contrato,status)
    values(v_processo.nome_candidato,v_processo.email_candidato,v_processo.telefone_candidato,coalesce(v_processo.data_admissao_real,v_processo.data_admissao_prevista),v_processo.tipo_contrato,'ativo')
    returning id into v_colaborador;
  end if;
  update public.adm_processos set colaborador_id=v_colaborador,etapa='concluido',status='concluido',link_ativo=false,concluido_em=now() where id=p_processo_id;
  if v_processo.candidatura_id is not null then
    update public.rs_candidaturas set etapa='encerrado',status='aprovada' where id=v_processo.candidatura_id;
  end if;
  return v_colaborador;
end;
$$;

drop trigger if exists trg_adm_processos_timestamp on public.adm_processos;
create trigger trg_adm_processos_timestamp before update on public.adm_processos for each row execute function public.adm_atualizar_timestamp();
drop trigger if exists trg_adm_preadmissao_timestamp on public.adm_dados_preadmissao;
create trigger trg_adm_preadmissao_timestamp before update on public.adm_dados_preadmissao for each row execute function public.adm_atualizar_timestamp();
drop trigger if exists trg_adm_documentos_timestamp on public.adm_documentos;
create trigger trg_adm_documentos_timestamp before update on public.adm_documentos for each row execute function public.adm_atualizar_timestamp();
drop trigger if exists trg_adm_tarefas_timestamp on public.adm_tarefas;
create trigger trg_adm_tarefas_timestamp before update on public.adm_tarefas for each row execute function public.adm_atualizar_timestamp();
drop trigger if exists trg_adm_processos_checklist on public.adm_processos;
create trigger trg_adm_processos_checklist after insert on public.adm_processos for each row execute function public.adm_criar_checklist();

create or replace function public.adm_auditar_sem_dados_pessoais()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.auditoria_eventos(entidade,entidade_id,acao,dados_anteriores,dados_novos)
  values(tg_table_name,case when tg_op='DELETE' then old.id else new.id end,tg_op,
    case when tg_op in ('UPDATE','DELETE') then jsonb_build_object('status',old.status) end,
    case when tg_op in ('INSERT','UPDATE') then jsonb_build_object('status',new.status) end);
  if tg_op='DELETE' then return old; end if; return new;
end;
$$;

drop trigger if exists trg_adm_processos_auditoria on public.adm_processos;
create trigger trg_adm_processos_auditoria after insert or update or delete on public.adm_processos for each row execute function public.adm_auditar_sem_dados_pessoais();
drop trigger if exists trg_adm_documentos_auditoria on public.adm_documentos;
create trigger trg_adm_documentos_auditoria after insert or update or delete on public.adm_documentos for each row execute function public.adm_auditar_sem_dados_pessoais();
drop trigger if exists trg_adm_tarefas_auditoria on public.adm_tarefas;
create trigger trg_adm_tarefas_auditoria after insert or update or delete on public.adm_tarefas for each row execute function public.adm_auditar_sem_dados_pessoais();

alter table public.adm_modelos_tarefas enable row level security;
alter table public.adm_processos enable row level security;
alter table public.adm_dados_preadmissao enable row level security;
alter table public.adm_documentos enable row level security;
alter table public.adm_tarefas enable row level security;

drop policy if exists "gestao le modelos adm" on public.adm_modelos_tarefas;
create policy "gestao le modelos adm" on public.adm_modelos_tarefas for select to authenticated using (public.tem_perfil(array['administrador','diretoria','rh','gestor']::public.perfil_acesso[]));
drop policy if exists "rh gerencia modelos adm" on public.adm_modelos_tarefas;
create policy "rh gerencia modelos adm" on public.adm_modelos_tarefas for all to authenticated using (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[])) with check (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));
drop policy if exists "gestao le processos adm" on public.adm_processos;
create policy "gestao le processos adm" on public.adm_processos for select to authenticated using (public.tem_perfil(array['administrador','diretoria','rh']::public.perfil_acesso[]));
drop policy if exists "gestor le processos da equipe adm" on public.adm_processos;
create policy "gestor le processos da equipe adm" on public.adm_processos for select to authenticated
using (public.tem_perfil(array['gestor']::public.perfil_acesso[]) and exists(select 1 from public.colaboradores_v2 c where c.id=adm_processos.gestor_id and c.auth_user_id=auth.uid()));
drop policy if exists "rh gerencia processos adm" on public.adm_processos;
create policy "rh gerencia processos adm" on public.adm_processos for all to authenticated using (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[])) with check (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));
drop policy if exists "rh le preadmissao" on public.adm_dados_preadmissao;
create policy "rh le preadmissao" on public.adm_dados_preadmissao for select to authenticated using (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));
drop policy if exists "rh gerencia preadmissao" on public.adm_dados_preadmissao;
create policy "rh gerencia preadmissao" on public.adm_dados_preadmissao for all to authenticated using (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[])) with check (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));
drop policy if exists "rh le documentos adm" on public.adm_documentos;
create policy "rh le documentos adm" on public.adm_documentos for select to authenticated using (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));
drop policy if exists "rh gerencia documentos adm" on public.adm_documentos;
create policy "rh gerencia documentos adm" on public.adm_documentos for all to authenticated using (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[])) with check (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));
drop policy if exists "gestao le tarefas adm" on public.adm_tarefas;
create policy "gestao le tarefas adm" on public.adm_tarefas for select to authenticated using (public.tem_perfil(array['administrador','diretoria','rh']::public.perfil_acesso[]));
drop policy if exists "gestor le tarefas da equipe adm" on public.adm_tarefas;
create policy "gestor le tarefas da equipe adm" on public.adm_tarefas for select to authenticated
using (public.tem_perfil(array['gestor']::public.perfil_acesso[]) and exists(select 1 from public.adm_processos p join public.colaboradores_v2 c on c.id=p.gestor_id where p.id=adm_tarefas.processo_id and c.auth_user_id=auth.uid()));
drop policy if exists "rh gerencia tarefas adm" on public.adm_tarefas;
create policy "rh gerencia tarefas adm" on public.adm_tarefas for all to authenticated using (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[])) with check (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));
drop policy if exists "gestor atualiza tarefas adm" on public.adm_tarefas;
create policy "gestor atualiza tarefas adm" on public.adm_tarefas for update to authenticated
using (area='gestor' and public.tem_perfil(array['gestor']::public.perfil_acesso[]) and exists(select 1 from public.adm_processos p join public.colaboradores_v2 c on c.id=p.gestor_id where p.id=adm_tarefas.processo_id and c.auth_user_id=auth.uid()))
with check (area='gestor' and public.tem_perfil(array['gestor']::public.perfil_acesso[]) and exists(select 1 from public.adm_processos p join public.colaboradores_v2 c on c.id=p.gestor_id where p.id=adm_tarefas.processo_id and c.auth_user_id=auth.uid()));

revoke all on public.adm_modelos_tarefas,public.adm_processos,public.adm_dados_preadmissao,public.adm_documentos,public.adm_tarefas from anon;
grant select,insert,update,delete on public.adm_modelos_tarefas,public.adm_processos,public.adm_dados_preadmissao,public.adm_documentos,public.adm_tarefas to authenticated;
revoke all on function public.adm_concluir_processo(uuid) from public,anon;
grant execute on function public.adm_concluir_processo(uuid) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('admissao-documentos','admissao-documentos',false,3145728,array['application/pdf','image/jpeg','image/png'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "rh le documentos admissionais privados" on storage.objects;
create policy "rh le documentos admissionais privados" on storage.objects for select to authenticated
using(bucket_id='admissao-documentos' and public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));
drop policy if exists "rh remove documentos admissionais privados" on storage.objects;
create policy "rh remove documentos admissionais privados" on storage.objects for delete to authenticated
using(bucket_id='admissao-documentos' and public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));

create or replace function public.rh360_diagnostico_admissao()
returns table(chave text,titulo text,categoria text,status text,detalhe text,acao text,criticidade text,ordem integer)
language plpgsql security definer set search_path=public,storage,pg_temp as $$
begin
  if not public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]) then raise exception 'Acesso restrito.' using errcode='42501'; end if;
  return query select * from (values
    ('migracao_008'::text,'Migração 008 · Admissão e Onboarding'::text,'Banco'::text,case when to_regclass('public.adm_processos') is not null and to_regclass('public.adm_tarefas') is not null then 'ok' else 'erro' end::text,'Processos, documentos e checklists admissionais.'::text,'Execute a migração 008.'::text,'critica'::text,66),
    ('bucket_admissao'::text,'Bucket de documentos admissionais'::text,'Armazenamento'::text,case when exists(select 1 from storage.buckets where id='admissao-documentos' and not public) then 'ok' else 'erro' end::text,'Documentos admissionais em armazenamento privado.'::text,'Revise a migração 008.'::text,'critica'::text,95),
    ('rls_admissao'::text,'RLS da admissão'::text,'Segurança'::text,case when exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='adm_processos' and c.relrowsecurity) then 'ok' else 'erro' end::text,'Processos protegidos por perfil.'::text,'Ative RLS e revise as políticas.'::text,'critica'::text,125)
  ) d(chave,titulo,categoria,status,detalhe,acao,criticidade,ordem) order by d.ordem;
end; $$;

revoke all on function public.rh360_diagnostico_admissao() from public,anon;
grant execute on function public.rh360_diagnostico_admissao() to authenticated;

comment on table public.adm_processos is 'Jornada operacional da aprovação do candidato até a conclusão da experiência inicial.';
comment on table public.adm_dados_preadmissao is 'Dados de pré-admissão protegidos; CPF persistido apenas como hash e quatro últimos dígitos.';
comment on table public.adm_documentos is 'Metadados de documentos armazenados em bucket privado.';
