-- PREMAZON RH 360 · Onboarding 360° Configurável v0.9.0
-- Conteúdos versionados, regras por contexto, jornada e evidências de ciência.
-- Execute depois da migração 008.

create extension if not exists pgcrypto;

insert into public.rh360_migracoes(versao,nome)
values ('009','Onboarding 360° Configurável')
on conflict(versao) do update set nome=excluded.nome;

alter table public.adm_processos add column if not exists filial_id uuid references public.filiais(id) on delete set null;
alter table public.adm_processos add column if not exists setor_id uuid references public.setores(id) on delete set null;
alter table public.adm_processos add column if not exists cargo_id uuid references public.cargos(id) on delete set null;
alter table public.adm_processos add column if not exists onboarding_iniciado_em timestamptz;
alter table public.adm_processos add column if not exists onboarding_concluido_em timestamptz;

create table if not exists public.adm_responsaveis_area (
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  area text not null check(area in ('rh','dp','qualidade','sesmt','gestor','ti')),
  ativo boolean not null default true,
  criado_por uuid default auth.uid() references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  primary key(auth_user_id,area)
);

create or replace function public.adm_tem_area(p_area text)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from public.adm_responsaveis_area r where r.auth_user_id=auth.uid() and r.area=p_area and r.ativo);
$$;

create table if not exists public.adm_conteudos_onboarding (
  id uuid primary key default gen_random_uuid(),
  area text not null check(area in ('rh','dp','qualidade','sesmt','gestor','ti')),
  titulo text not null,
  slug text not null unique,
  categoria text,
  descricao text,
  tipo text not null default 'texto' check(tipo in ('texto','documento','link','curso')),
  nivel_acesso text not null default 'autenticado' check(nivel_acesso in ('publico_link','autenticado','interno')),
  curso_id uuid references public.td_cursos(id) on delete set null,
  exige_ciencia boolean not null default true,
  ativo boolean not null default true,
  criado_por uuid default auth.uid() references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint adm_conteudos_curso_nao_publico check(tipo <> 'curso' or nivel_acesso <> 'publico_link')
);

create table if not exists public.adm_conteudo_versoes (
  id uuid primary key default gen_random_uuid(),
  conteudo_id uuid not null references public.adm_conteudos_onboarding(id) on delete cascade,
  versao text not null,
  vigencia_inicio date not null,
  vigencia_fim date,
  status text not null default 'rascunho' check(status in ('rascunho','publicado','arquivado')),
  conteudo_texto text,
  documento_path text,
  link_url text,
  hash_sha256 text,
  publicado_por uuid references auth.users(id) on delete set null,
  publicado_em timestamptz,
  criado_por uuid default auth.uid() references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique(conteudo_id,versao),
  check(vigencia_fim is null or vigencia_fim >= vigencia_inicio),
  check(status <> 'publicado' or publicado_em is not null)
);

create index if not exists idx_adm_versoes_vigentes
  on public.adm_conteudo_versoes(conteudo_id,status,vigencia_inicio desc);

create table if not exists public.adm_regras_onboarding (
  id uuid primary key default gen_random_uuid(),
  conteudo_id uuid references public.adm_conteudos_onboarding(id) on delete cascade,
  modelo_tarefa_id uuid references public.adm_modelos_tarefas(id) on delete cascade,
  escopo text not null default 'global' check(escopo in ('global','filial','setor','cargo')),
  filial_id uuid references public.filiais(id) on delete cascade,
  setor_id uuid references public.setores(id) on delete cascade,
  cargo_id uuid references public.cargos(id) on delete cascade,
  cargo_nome text,
  incluir boolean not null default true,
  obrigatoria boolean not null default true,
  dias_relativos integer not null default 0 check(dias_relativos between -60 and 365),
  ordem integer not null default 0 check(ordem >= 0),
  ativo boolean not null default true,
  aprovado_por uuid references auth.users(id) on delete set null,
  aprovado_em timestamptz,
  criado_por uuid default auth.uid() references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check((conteudo_id is not null)::integer + (modelo_tarefa_id is not null)::integer = 1),
  check(
    (escopo='global' and filial_id is null and setor_id is null and cargo_id is null and cargo_nome is null)
    or (escopo='filial' and filial_id is not null and setor_id is null and cargo_id is null and cargo_nome is null)
    or (escopo='setor' and setor_id is not null and filial_id is null and cargo_id is null and cargo_nome is null)
    or (escopo='cargo' and filial_id is null and setor_id is null and (cargo_id is not null or nullif(trim(cargo_nome),'') is not null))
  )
);

create unique index if not exists idx_adm_regra_contexto_unica on public.adm_regras_onboarding(
  coalesce(conteudo_id,'00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(modelo_tarefa_id,'00000000-0000-0000-0000-000000000000'::uuid),
  escopo,
  coalesce(filial_id,'00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(setor_id,'00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(cargo_id,'00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(lower(trim(cargo_nome)),'')
);

create table if not exists public.adm_atribuicoes_conteudo (
  id uuid primary key default gen_random_uuid(),
  processo_id uuid not null references public.adm_processos(id) on delete cascade,
  conteudo_id uuid not null references public.adm_conteudos_onboarding(id) on delete restrict,
  versao_id uuid not null references public.adm_conteudo_versoes(id) on delete restrict,
  area text not null check(area in ('rh','dp','qualidade','sesmt','gestor','ti')),
  obrigatoria boolean not null default true,
  ordem integer not null default 0,
  prazo date,
  status text not null default 'pendente' check(status in ('pendente','em_andamento','concluida','dispensada','bloqueada')),
  progresso_percentual numeric(5,2) not null default 0 check(progresso_percentual between 0 and 100),
  iniciado_em timestamptz,
  concluido_em timestamptz,
  atualizado_em timestamptz not null default now(),
  unique(processo_id,conteudo_id)
);

create index if not exists idx_adm_atribuicoes_processo_area
  on public.adm_atribuicoes_conteudo(processo_id,area,status);

create table if not exists public.adm_ciencias_conteudo (
  id uuid primary key default gen_random_uuid(),
  atribuicao_id uuid not null unique references public.adm_atribuicoes_conteudo(id) on delete restrict,
  processo_id uuid not null references public.adm_processos(id) on delete restrict,
  versao_id uuid not null references public.adm_conteudo_versoes(id) on delete restrict,
  auth_user_id uuid references auth.users(id) on delete set null,
  metodo text not null check(metodo in ('link_individual','usuario_autenticado','registro_rh')),
  texto_confirmacao text not null,
  confirmado_em timestamptz not null default now(),
  metadados jsonb not null default '{"tipo":"ciencia_simples","assinatura_eletronica":false}'::jsonb
);

create or replace function public.adm_onboarding_timestamp()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin new.atualizado_em=now(); return new; end;
$$;

create or replace function public.adm_proteger_versao_publicada()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if old.status='publicado' then raise exception 'Versão publicada é imutável; crie uma nova revisão.' using errcode='23514'; end if;
  if tg_op='DELETE' then return old; end if; return new;
end;
$$;

drop trigger if exists trg_adm_conteudos_timestamp on public.adm_conteudos_onboarding;
create trigger trg_adm_conteudos_timestamp before update on public.adm_conteudos_onboarding for each row execute function public.adm_onboarding_timestamp();
drop trigger if exists trg_adm_versoes_timestamp on public.adm_conteudo_versoes;
create trigger trg_adm_versoes_timestamp before update on public.adm_conteudo_versoes for each row execute function public.adm_onboarding_timestamp();
drop trigger if exists trg_adm_versoes_protecao on public.adm_conteudo_versoes;
create trigger trg_adm_versoes_protecao before update or delete on public.adm_conteudo_versoes for each row execute function public.adm_proteger_versao_publicada();
drop trigger if exists trg_adm_regras_timestamp on public.adm_regras_onboarding;
create trigger trg_adm_regras_timestamp before update on public.adm_regras_onboarding for each row execute function public.adm_onboarding_timestamp();
drop trigger if exists trg_adm_atribuicoes_timestamp on public.adm_atribuicoes_conteudo;
create trigger trg_adm_atribuicoes_timestamp before update on public.adm_atribuicoes_conteudo for each row execute function public.adm_onboarding_timestamp();

insert into public.adm_conteudos_onboarding(area,titulo,slug,categoria,descricao,tipo,nivel_acesso,exige_ciencia)
values
  ('rh','Boas-vindas à PREMAZON','boas-vindas','Institucional','Apresentação inicial da empresa e da jornada de integração.','texto','publico_link',true),
  ('rh','Vídeo institucional','video-institucional','Institucional','Conteúdo audiovisual mantido na Universidade Corporativa.','curso','autenticado',true),
  ('rh','Cultura e valores','cultura-valores','Institucional','Cultura, valores e condutas esperadas.','texto','publico_link',true),
  ('rh','Regulamento interno','regulamento-interno','Governança','Versão vigente e controlada do regulamento interno.','documento','autenticado',true),
  ('rh','Proteção de dados e LGPD','lgpd','Governança','Responsabilidades de proteção, confidencialidade e uso seguro de sistemas.','texto','autenticado',true),
  ('rh','Canal de denúncias','canal-denuncias','Integridade','Apresentação do canal, confidencialidade e proibição de retaliação.','link','publico_link',true),
  ('dp','Benefícios, jornada e ponto','vida-funcional','Vida funcional','Orientações do DP sobre jornada, ponto, benefícios e rotinas trabalhistas.','texto','autenticado',true),
  ('qualidade','Política da Qualidade','politica-qualidade','SGQ','Versão vigente e controlada da Política da Qualidade.','documento','autenticado',true),
  ('qualidade','Sistema de Gestão da Qualidade','sistema-gestao-qualidade','SGQ','Responsabilidades, controle de documentos, não conformidades e melhoria contínua.','curso','autenticado',true),
  ('sesmt','Integração de Segurança','integracao-seguranca','SST','Segurança, riscos, emergências e recusa segura.','curso','autenticado',true),
  ('sesmt','EPIs e responsabilidades','epis-responsabilidades','SST','Uso, conservação, substituição e responsabilidades sobre EPIs.','texto','autenticado',true),
  ('sesmt','Riscos e NRs aplicáveis','riscos-nrs','SST','Conteúdo aprovado pelo SESMT conforme função e ambiente.','curso','autenticado',true)
on conflict(slug) do update set titulo=excluded.titulo,descricao=excluded.descricao,categoria=excluded.categoria;

insert into public.adm_regras_onboarding(modelo_tarefa_id,escopo,incluir,obrigatoria,dias_relativos,ordem,aprovado_em)
select m.id,'global',true,m.obrigatoria,m.dias_relativos,m.ordem,now()
from public.adm_modelos_tarefas m
on conflict do nothing;

insert into public.adm_regras_onboarding(conteudo_id,escopo,incluir,obrigatoria,dias_relativos,ordem,ativo)
select c.id,'global',true,true,0,row_number() over(partition by c.area order by c.criado_em)::integer*10,false
from public.adm_conteudos_onboarding c
on conflict do nothing;

create or replace function public.adm_sincronizar_jornada(p_processo_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.adm_processos%rowtype;
begin
  select * into p from public.adm_processos where id=p_processo_id;
  if not found then raise exception 'Processo não encontrado.' using errcode='P0002'; end if;

  with candidatas as (
    select r.*,case r.escopo when 'cargo' then 4 when 'setor' then 3 when 'filial' then 2 else 1 end prioridade
    from public.adm_regras_onboarding r
    where r.ativo and r.modelo_tarefa_id is not null and (
      r.escopo='global'
      or (r.escopo='filial' and r.filial_id=p.filial_id)
      or (r.escopo='setor' and r.setor_id=p.setor_id)
      or (r.escopo='cargo' and (r.cargo_id=p.cargo_id or lower(trim(r.cargo_nome))=lower(trim(p.cargo))))
    )
  ), escolhidas as (
    select distinct on(modelo_tarefa_id) * from candidatas order by modelo_tarefa_id,prioridade desc,criado_em desc
  )
  insert into public.adm_tarefas(processo_id,modelo_id,area,titulo,descricao,prazo,obrigatoria)
  select p.id,m.id,m.area,m.titulo,m.descricao,p.data_admissao_prevista+e.dias_relativos,e.obrigatoria
  from escolhidas e join public.adm_modelos_tarefas m on m.id=e.modelo_tarefa_id
  where e.incluir and m.ativo
  on conflict(processo_id,modelo_id) do nothing;

  with candidatas as (
    select r.*,case r.escopo when 'cargo' then 4 when 'setor' then 3 when 'filial' then 2 else 1 end prioridade
    from public.adm_regras_onboarding r
    where r.ativo and r.conteudo_id is not null and (
      r.escopo='global'
      or (r.escopo='filial' and r.filial_id=p.filial_id)
      or (r.escopo='setor' and r.setor_id=p.setor_id)
      or (r.escopo='cargo' and (r.cargo_id=p.cargo_id or lower(trim(r.cargo_nome))=lower(trim(p.cargo))))
    )
  ), escolhidas as (
    select distinct on(conteudo_id) * from candidatas order by conteudo_id,prioridade desc,criado_em desc
  )
  insert into public.adm_atribuicoes_conteudo(processo_id,conteudo_id,versao_id,area,obrigatoria,ordem,prazo)
  select p.id,c.id,v.id,c.area,e.obrigatoria,e.ordem,p.data_admissao_prevista+e.dias_relativos
  from escolhidas e
  join public.adm_conteudos_onboarding c on c.id=e.conteudo_id and c.ativo
  join lateral (
    select cv.id from public.adm_conteudo_versoes cv
    where cv.conteudo_id=c.id and cv.status='publicado'
      and cv.vigencia_inicio<=coalesce(p.data_admissao_real,p.data_admissao_prevista,current_date)
      and (cv.vigencia_fim is null or cv.vigencia_fim>=coalesce(p.data_admissao_real,p.data_admissao_prevista,current_date))
    order by cv.vigencia_inicio desc,cv.criado_em desc limit 1
  ) v on true
  where e.incluir
  on conflict(processo_id,conteudo_id) do nothing;

  update public.adm_processos set onboarding_iniciado_em=coalesce(onboarding_iniciado_em,now()) where id=p.id;
end;
$$;

create or replace function public.adm_criar_checklist()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin perform public.adm_sincronizar_jornada(new.id); return new; end;
$$;

create or replace function public.adm_sincronizar_onboardings_ativos()
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare item record; total integer:=0;
begin
  if not public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]) then raise exception 'Acesso restrito.' using errcode='42501'; end if;
  for item in select id from public.adm_processos where status not in ('concluido','cancelado') loop
    perform public.adm_sincronizar_jornada(item.id); total:=total+1;
  end loop;
  return total;
end;
$$;

create or replace function public.adm_registrar_conclusao_conteudo(p_atribuicao_id uuid,p_status text default 'concluida')
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.adm_atribuicoes_conteudo%rowtype; autorizado boolean:=false;
begin
  if p_status not in ('concluida','dispensada') then raise exception 'Situação inválida.' using errcode='22023'; end if;
  select * into a from public.adm_atribuicoes_conteudo where id=p_atribuicao_id for update;
  if not found then raise exception 'Conteúdo atribuído não encontrado.' using errcode='P0002'; end if;
  autorizado:=public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]) or public.adm_tem_area(a.area) or exists(
    select 1 from public.adm_processos p join public.colaboradores_v2 c on c.id=p.gestor_id
    where p.id=a.processo_id and a.area='gestor' and c.auth_user_id=auth.uid()
  );
  if not autorizado then raise exception 'Acesso restrito à área responsável.' using errcode='42501'; end if;
  if p_status='concluida' then
    insert into public.adm_ciencias_conteudo(atribuicao_id,processo_id,versao_id,auth_user_id,metodo,texto_confirmacao,metadados)
    values(a.id,a.processo_id,a.versao_id,auth.uid(),'registro_rh','Conclusão do conteúdo conferida pela área responsável.',jsonb_build_object('tipo','registro_operacional','assinatura_eletronica',false))
    on conflict(atribuicao_id) do nothing;
  end if;
  update public.adm_atribuicoes_conteudo set status=p_status,progresso_percentual=case when p_status='concluida' then 100 else progresso_percentual end,
    iniciado_em=coalesce(iniciado_em,now()),concluido_em=now() where id=a.id;
end;
$$;

create or replace function public.adm_concluir_processo(p_processo_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.adm_processos%rowtype; colaborador uuid;
begin
  if not public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]) then raise exception 'Apenas administrador ou RH pode concluir a admissão.' using errcode='42501'; end if;
  select * into p from public.adm_processos where id=p_processo_id for update;
  if not found then raise exception 'Processo não encontrado.' using errcode='P0002'; end if;
  if exists(select 1 from public.adm_tarefas where processo_id=p.id and obrigatoria and status not in ('concluida','dispensada')) then raise exception 'Existem tarefas obrigatórias pendentes.' using errcode='23514'; end if;
  if exists(select 1 from public.adm_atribuicoes_conteudo where processo_id=p.id and obrigatoria and status not in ('concluida','dispensada')) then raise exception 'Existem conteúdos obrigatórios pendentes.' using errcode='23514'; end if;
  colaborador:=p.colaborador_id;
  if colaborador is null then
    insert into public.colaboradores_v2(nome,email,telefone,data_admissao,tipo_contrato,status,filial_id,setor_id,cargo_id,data_experiencia_fim)
    values(p.nome_candidato,p.email_candidato,p.telefone_candidato,coalesce(p.data_admissao_real,p.data_admissao_prevista),p.tipo_contrato,'ativo',p.filial_id,p.setor_id,p.cargo_id,coalesce(p.data_admissao_real,p.data_admissao_prevista)+90)
    returning id into colaborador;
  end if;
  update public.adm_processos set colaborador_id=colaborador,etapa='concluido',status='concluido',link_ativo=false,concluido_em=now(),onboarding_concluido_em=now() where id=p.id;
  if p.candidatura_id is not null then update public.rs_candidaturas set etapa='encerrado',status='aprovada' where id=p.candidatura_id; end if;
  return colaborador;
end;
$$;

create or replace function public.adm_auditar_configuracao()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  insert into public.auditoria_eventos(entidade,entidade_id,acao,dados_anteriores,dados_novos)
  values(tg_table_name,case when tg_op='DELETE' then old.id else new.id end,tg_op,
    case when tg_op in ('UPDATE','DELETE') then jsonb_build_object('alterado',true) end,
    case when tg_op in ('INSERT','UPDATE') then jsonb_build_object('alterado',true) end);
  if tg_op='DELETE' then return old; end if; return new;
end;
$$;

drop trigger if exists trg_adm_conteudos_auditoria on public.adm_conteudos_onboarding;
create trigger trg_adm_conteudos_auditoria after insert or update or delete on public.adm_conteudos_onboarding for each row execute function public.adm_auditar_configuracao();
drop trigger if exists trg_adm_versoes_auditoria on public.adm_conteudo_versoes;
create trigger trg_adm_versoes_auditoria after insert or update or delete on public.adm_conteudo_versoes for each row execute function public.adm_auditar_configuracao();
drop trigger if exists trg_adm_regras_auditoria on public.adm_regras_onboarding;
create trigger trg_adm_regras_auditoria after insert or update or delete on public.adm_regras_onboarding for each row execute function public.adm_auditar_configuracao();

alter table public.adm_responsaveis_area enable row level security;
alter table public.adm_conteudos_onboarding enable row level security;
alter table public.adm_conteudo_versoes enable row level security;
alter table public.adm_regras_onboarding enable row level security;
alter table public.adm_atribuicoes_conteudo enable row level security;
alter table public.adm_ciencias_conteudo enable row level security;

create or replace function public.adm_pode_ver_processo(p_processo_id uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select public.tem_perfil(array['administrador','diretoria','rh']::public.perfil_acesso[])
    or exists(select 1 from public.adm_processos p join public.colaboradores_v2 c on c.id=p.gestor_id where p.id=p_processo_id and c.auth_user_id=auth.uid())
    or exists(select 1 from public.adm_tarefas t join public.adm_responsaveis_area r on r.area=t.area and r.auth_user_id=auth.uid() and r.ativo where t.processo_id=p_processo_id)
    or exists(select 1 from public.adm_atribuicoes_conteudo a join public.adm_responsaveis_area r on r.area=a.area and r.auth_user_id=auth.uid() and r.ativo where a.processo_id=p_processo_id);
$$;

drop policy if exists "responsavel area le processos adm" on public.adm_processos;
create policy "responsavel area le processos adm" on public.adm_processos for select to authenticated using(public.adm_pode_ver_processo(id));
drop policy if exists "responsavel area le tarefas adm" on public.adm_tarefas;
create policy "responsavel area le tarefas adm" on public.adm_tarefas for select to authenticated using(public.adm_tem_area(area));
drop policy if exists "responsavel area atualiza tarefas adm" on public.adm_tarefas;
create policy "responsavel area atualiza tarefas adm" on public.adm_tarefas for update to authenticated using(public.adm_tem_area(area)) with check(public.adm_tem_area(area));

drop policy if exists "usuario le propria area adm" on public.adm_responsaveis_area;
create policy "usuario le propria area adm" on public.adm_responsaveis_area for select to authenticated using(auth_user_id=auth.uid() or public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));
drop policy if exists "rh gerencia responsaveis adm" on public.adm_responsaveis_area;
create policy "rh gerencia responsaveis adm" on public.adm_responsaveis_area for all to authenticated using(public.tem_perfil(array['administrador','rh']::public.perfil_acesso[])) with check(public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));
drop policy if exists "gestao le conteudos adm" on public.adm_conteudos_onboarding;
create policy "gestao le conteudos adm" on public.adm_conteudos_onboarding for select to authenticated using(public.tem_perfil(array['administrador','diretoria','rh']::public.perfil_acesso[]) or public.adm_tem_area(area));
drop policy if exists "rh gerencia conteudos adm" on public.adm_conteudos_onboarding;
create policy "rh gerencia conteudos adm" on public.adm_conteudos_onboarding for all to authenticated using(public.tem_perfil(array['administrador','rh']::public.perfil_acesso[])) with check(public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));
drop policy if exists "gestao le versoes adm" on public.adm_conteudo_versoes;
create policy "gestao le versoes adm" on public.adm_conteudo_versoes for select to authenticated using(public.tem_perfil(array['administrador','diretoria','rh']::public.perfil_acesso[]) or exists(select 1 from public.adm_conteudos_onboarding c where c.id=conteudo_id and public.adm_tem_area(c.area)));
drop policy if exists "rh gerencia versoes adm" on public.adm_conteudo_versoes;
create policy "rh gerencia versoes adm" on public.adm_conteudo_versoes for all to authenticated using(public.tem_perfil(array['administrador','rh']::public.perfil_acesso[])) with check(public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));
drop policy if exists "gestao le regras adm" on public.adm_regras_onboarding;
create policy "gestao le regras adm" on public.adm_regras_onboarding for select to authenticated using(public.tem_perfil(array['administrador','diretoria','rh']::public.perfil_acesso[]));
drop policy if exists "rh gerencia regras adm" on public.adm_regras_onboarding;
create policy "rh gerencia regras adm" on public.adm_regras_onboarding for all to authenticated using(public.tem_perfil(array['administrador','rh']::public.perfil_acesso[])) with check(public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));
drop policy if exists "gestao le atribuicoes adm" on public.adm_atribuicoes_conteudo;
create policy "gestao le atribuicoes adm" on public.adm_atribuicoes_conteudo for select to authenticated using(public.tem_perfil(array['administrador','diretoria','rh']::public.perfil_acesso[]) or public.adm_tem_area(area) or exists(select 1 from public.adm_processos p join public.colaboradores_v2 c on c.id=p.gestor_id where p.id=processo_id and c.auth_user_id=auth.uid()));
drop policy if exists "rh gerencia atribuicoes adm" on public.adm_atribuicoes_conteudo;
create policy "rh gerencia atribuicoes adm" on public.adm_atribuicoes_conteudo for all to authenticated using(public.tem_perfil(array['administrador','rh']::public.perfil_acesso[])) with check(public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));
drop policy if exists "area atualiza atribuicoes adm" on public.adm_atribuicoes_conteudo;
create policy "area atualiza atribuicoes adm" on public.adm_atribuicoes_conteudo for update to authenticated using(public.adm_tem_area(area)) with check(public.adm_tem_area(area));
drop policy if exists "gestor atualiza conteudos da equipe adm" on public.adm_atribuicoes_conteudo;
create policy "gestor atualiza conteudos da equipe adm" on public.adm_atribuicoes_conteudo for update to authenticated
using(area='gestor' and exists(
  select 1 from public.adm_processos p
  join public.colaboradores_v2 c on c.id=p.gestor_id
  where p.id=processo_id and c.auth_user_id=auth.uid()
))
with check(area='gestor' and exists(
  select 1 from public.adm_processos p
  join public.colaboradores_v2 c on c.id=p.gestor_id
  where p.id=processo_id and c.auth_user_id=auth.uid()
));
drop policy if exists "rh le ciencias adm" on public.adm_ciencias_conteudo;
create policy "rh le ciencias adm" on public.adm_ciencias_conteudo for select to authenticated using(public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));

revoke all on public.adm_responsaveis_area,public.adm_conteudos_onboarding,public.adm_conteudo_versoes,public.adm_regras_onboarding,public.adm_atribuicoes_conteudo,public.adm_ciencias_conteudo from anon;
grant select,insert,update,delete on public.adm_responsaveis_area,public.adm_conteudos_onboarding,public.adm_conteudo_versoes,public.adm_regras_onboarding to authenticated;
grant select on public.adm_atribuicoes_conteudo,public.adm_ciencias_conteudo to authenticated;
revoke update on public.adm_atribuicoes_conteudo from authenticated;
revoke all on function public.adm_sincronizar_jornada(uuid),public.adm_sincronizar_onboardings_ativos(),public.adm_registrar_conclusao_conteudo(uuid,text) from public,anon;
grant execute on function public.adm_sincronizar_onboardings_ativos() to authenticated;
grant execute on function public.adm_registrar_conclusao_conteudo(uuid,text) to authenticated;
revoke all on function public.adm_pode_ver_processo(uuid) from public,anon;
grant execute on function public.adm_pode_ver_processo(uuid) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('onboarding-conteudos','onboarding-conteudos',false,20971520,array['application/pdf','image/jpeg','image/png'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "gestao le conteudos onboarding privados" on storage.objects;
create policy "gestao le conteudos onboarding privados" on storage.objects for select to authenticated using(bucket_id='onboarding-conteudos' and (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]) or exists(select 1 from public.adm_responsaveis_area r where r.auth_user_id=auth.uid() and r.ativo)));
drop policy if exists "rh gerencia arquivos onboarding" on storage.objects;
create policy "rh gerencia arquivos onboarding" on storage.objects for all to authenticated using(bucket_id='onboarding-conteudos' and public.tem_perfil(array['administrador','rh']::public.perfil_acesso[])) with check(bucket_id='onboarding-conteudos' and public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));

create or replace function public.rh360_diagnostico_onboarding_360()
returns table(chave text,titulo text,categoria text,status text,detalhe text,acao text,criticidade text,ordem integer)
language plpgsql security definer set search_path=public,storage,pg_temp as $$
begin
  if not public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]) then raise exception 'Acesso restrito.' using errcode='42501'; end if;
  return query select * from(values
    ('migracao_009'::text,'Migração 009 · Onboarding 360°'::text,'Banco'::text,case when to_regclass('public.adm_conteudos_onboarding') is not null and to_regclass('public.adm_atribuicoes_conteudo') is not null then 'ok' else 'erro' end::text,'Conteúdos versionados e regras configuráveis.'::text,'Execute a migração 009.'::text,'critica'::text,67),
    ('bucket_onboarding'::text,'Bucket de conteúdos do onboarding'::text,'Armazenamento'::text,case when exists(select 1 from storage.buckets where id='onboarding-conteudos' and not public) then 'ok' else 'erro' end::text,'Políticas e documentos controlados permanecem privados.'::text,'Revise a migração 009.'::text,'critica'::text,96),
    ('regras_onboarding'::text,'Regras por cargo, setor e filial'::text,'Aplicação'::text,case when exists(select 1 from public.adm_regras_onboarding where ativo) then 'ok' else 'aviso' end::text,'A jornada é montada por regras aprovadas, sem inferência jurídica automática.'::text,'Cadastre e aprove as regras aplicáveis.'::text,'media'::text,130)
  ) d(chave,titulo,categoria,status,detalhe,acao,criticidade,ordem) order by d.ordem;
end; $$;

revoke all on function public.rh360_diagnostico_onboarding_360() from public,anon;
grant execute on function public.rh360_diagnostico_onboarding_360() to authenticated;

comment on table public.adm_conteudo_versoes is 'Versões imutáveis apresentadas no onboarding; nova revisão deve gerar nova linha.';
comment on table public.adm_ciencias_conteudo is 'Evidência de ciência simples; não representa assinatura eletrônica qualificada ou avançada.';
comment on table public.adm_regras_onboarding is 'Regras aprovadas para inclusão ou exclusão por contexto; automação não substitui validação de RH, Qualidade ou SESMT.';
