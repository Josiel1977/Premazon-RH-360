-- PREMAZON RH 360
-- Universidade Corporativa: cursos online, módulos, aulas em vídeo, matrículas,
-- progresso, certificados e armazenamento privado com upload retomável.
-- Execute depois de 20260813_003_treinamento_desenvolvimento.sql.

alter table public.td_cursos add column if not exists slug text;
alter table public.td_cursos add column if not exists resumo text;
alter table public.td_cursos add column if not exists imagem_capa_path text;
alter table public.td_cursos add column if not exists nivel text not null default 'todos';
alter table public.td_cursos add column if not exists status_publicacao text not null default 'rascunho';
alter table public.td_cursos add column if not exists publicado_em timestamptz;
alter table public.td_cursos add column if not exists autor_nome text;
alter table public.td_cursos add column if not exists destaque boolean not null default false;
alter table public.td_cursos add column if not exists permite_autoinscricao boolean not null default true;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'td_cursos_nivel_check') then
    alter table public.td_cursos add constraint td_cursos_nivel_check
      check (nivel in ('iniciante', 'intermediario', 'avancado', 'todos'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'td_cursos_publicacao_check') then
    alter table public.td_cursos add constraint td_cursos_publicacao_check
      check (status_publicacao in ('rascunho', 'publicado', 'arquivado'));
  end if;
end;
$$;

create unique index if not exists idx_td_cursos_slug
  on public.td_cursos(lower(slug)) where slug is not null;
create index if not exists idx_td_cursos_publicacao
  on public.td_cursos(status_publicacao, destaque, nome);

create table if not exists public.td_curso_modulos (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references public.td_cursos(id) on delete cascade,
  titulo text not null,
  descricao text,
  ordem integer not null default 0 check (ordem >= 0),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (curso_id, ordem)
);

create index if not exists idx_td_curso_modulos_curso
  on public.td_curso_modulos(curso_id, ordem);

create table if not exists public.td_curso_aulas (
  id uuid primary key default gen_random_uuid(),
  modulo_id uuid not null references public.td_curso_modulos(id) on delete cascade,
  titulo text not null,
  descricao text,
  ordem integer not null default 0 check (ordem >= 0),
  tipo text not null default 'video' check (tipo in ('video', 'texto', 'material')),
  duracao_segundos integer check (duracao_segundos is null or duracao_segundos >= 0),
  video_provider text check (video_provider is null or video_provider in ('supabase', 'youtube', 'vimeo', 'mux', 'externo')),
  video_path text,
  video_url text,
  arquivo_path text,
  conteudo_texto text,
  transcricao text,
  previa_liberada boolean not null default false,
  publicada boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (modulo_id, ordem),
  check (
    tipo <> 'video'
    or coalesce(nullif(video_path, ''), nullif(video_url, '')) is not null
    or publicada = false
  )
);

create index if not exists idx_td_curso_aulas_modulo
  on public.td_curso_aulas(modulo_id, ordem);

create table if not exists public.td_matriculas_cursos (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references public.td_cursos(id) on delete cascade,
  colaborador_id uuid references public.colaboradores_v2(id) on delete set null,
  auth_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  status text not null default 'ativa' check (status in ('ativa', 'concluida', 'cancelada')),
  progresso_percentual numeric(5,2) not null default 0 check (progresso_percentual between 0 and 100),
  matriculado_em timestamptz not null default now(),
  iniciado_em timestamptz,
  concluido_em timestamptz,
  atualizado_em timestamptz not null default now(),
  unique (curso_id, auth_user_id)
);

create index if not exists idx_td_matriculas_usuario
  on public.td_matriculas_cursos(auth_user_id, status);
create index if not exists idx_td_matriculas_curso
  on public.td_matriculas_cursos(curso_id, status);

create table if not exists public.td_progresso_aulas (
  id uuid primary key default gen_random_uuid(),
  matricula_id uuid not null references public.td_matriculas_cursos(id) on delete cascade,
  aula_id uuid not null references public.td_curso_aulas(id) on delete cascade,
  progresso_segundos integer not null default 0 check (progresso_segundos >= 0),
  duracao_segundos integer check (duracao_segundos is null or duracao_segundos >= 0),
  concluida boolean not null default false,
  primeiro_acesso_em timestamptz not null default now(),
  ultimo_acesso_em timestamptz not null default now(),
  concluida_em timestamptz,
  unique (matricula_id, aula_id)
);

create index if not exists idx_td_progresso_matricula
  on public.td_progresso_aulas(matricula_id, concluida);

create table if not exists public.td_certificados_cursos (
  id uuid primary key default gen_random_uuid(),
  matricula_id uuid not null unique references public.td_matriculas_cursos(id) on delete cascade,
  codigo_validacao text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)),
  arquivo_path text,
  emitido_em timestamptz not null default now(),
  valido_ate date,
  criado_em timestamptz not null default now()
);

drop trigger if exists trg_td_curso_modulos_timestamp on public.td_curso_modulos;
create trigger trg_td_curso_modulos_timestamp before update on public.td_curso_modulos
for each row execute function public.td_atualizar_timestamp();
drop trigger if exists trg_td_curso_aulas_timestamp on public.td_curso_aulas;
create trigger trg_td_curso_aulas_timestamp before update on public.td_curso_aulas
for each row execute function public.td_atualizar_timestamp();
drop trigger if exists trg_td_matriculas_timestamp on public.td_matriculas_cursos;
create trigger trg_td_matriculas_timestamp before update on public.td_matriculas_cursos
for each row execute function public.td_atualizar_timestamp();

create or replace function public.td_recalcular_progresso_matricula()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  matricula_alvo uuid;
  total_aulas integer;
  aulas_concluidas integer;
  novo_percentual numeric(5,2);
begin
  matricula_alvo := case when tg_op = 'DELETE' then old.matricula_id else new.matricula_id end;

  select count(*) filter (where a.publicada),
         count(*) filter (where a.publicada and coalesce(p.concluida, false))
    into total_aulas, aulas_concluidas
  from public.td_matriculas_cursos m
  join public.td_curso_modulos cm on cm.curso_id = m.curso_id and cm.ativo
  join public.td_curso_aulas a on a.modulo_id = cm.id
  left join public.td_progresso_aulas p on p.aula_id = a.id and p.matricula_id = m.id
  where m.id = matricula_alvo;

  novo_percentual := case when total_aulas > 0 then round((aulas_concluidas::numeric / total_aulas) * 100, 2) else 0 end;

  update public.td_matriculas_cursos
  set progresso_percentual = novo_percentual,
      iniciado_em = coalesce(iniciado_em, now()),
      status = case when novo_percentual = 100 then 'concluida' else 'ativa' end,
      concluido_em = case when novo_percentual = 100 then coalesce(concluido_em, now()) else null end
  where id = matricula_alvo and status <> 'cancelada';

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists trg_td_recalcular_progresso on public.td_progresso_aulas;
create trigger trg_td_recalcular_progresso
after insert or update or delete on public.td_progresso_aulas
for each row execute function public.td_recalcular_progresso_matricula();

alter table public.td_curso_modulos enable row level security;
alter table public.td_curso_aulas enable row level security;
alter table public.td_matriculas_cursos enable row level security;
alter table public.td_progresso_aulas enable row level security;
alter table public.td_certificados_cursos enable row level security;

drop policy if exists "autenticados leem modulos publicados" on public.td_curso_modulos;
create policy "autenticados leem modulos publicados" on public.td_curso_modulos for select to authenticated
using (
  public.tem_perfil(array['administrador','rh']::public.perfil_acesso[])
  or exists (
    select 1 from public.td_cursos c
    where c.id = curso_id and c.ativo and c.status_publicacao = 'publicado'
  )
);
drop policy if exists "rh gerencia modulos de curso" on public.td_curso_modulos;
create policy "rh gerencia modulos de curso" on public.td_curso_modulos for all to authenticated
using (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]))
with check (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));

drop policy if exists "autenticados leem aulas publicadas" on public.td_curso_aulas;
create policy "autenticados leem aulas publicadas" on public.td_curso_aulas for select to authenticated
using (
  public.tem_perfil(array['administrador','rh']::public.perfil_acesso[])
  or (
    publicada and exists (
      select 1
      from public.td_curso_modulos cm
      join public.td_cursos c on c.id = cm.curso_id
      where cm.id = modulo_id and cm.ativo and c.ativo and c.status_publicacao = 'publicado'
    )
  )
);
drop policy if exists "rh gerencia aulas de curso" on public.td_curso_aulas;
create policy "rh gerencia aulas de curso" on public.td_curso_aulas for all to authenticated
using (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]))
with check (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));

drop policy if exists "usuario le propria matricula" on public.td_matriculas_cursos;
create policy "usuario le propria matricula" on public.td_matriculas_cursos for select to authenticated
using (
  auth_user_id = auth.uid()
  or public.tem_perfil(array['administrador','diretoria','rh','gestor']::public.perfil_acesso[])
);
drop policy if exists "usuario realiza autoinscricao" on public.td_matriculas_cursos;
create policy "usuario realiza autoinscricao" on public.td_matriculas_cursos for insert to authenticated
with check (
  (auth_user_id = auth.uid() and exists (
    select 1 from public.td_cursos c
    where c.id = curso_id and c.ativo and c.status_publicacao = 'publicado' and c.permite_autoinscricao
  ))
  or public.tem_perfil(array['administrador','rh']::public.perfil_acesso[])
);
drop policy if exists "usuario atualiza propria matricula" on public.td_matriculas_cursos;
drop policy if exists "rh atualiza matriculas" on public.td_matriculas_cursos;
create policy "rh atualiza matriculas" on public.td_matriculas_cursos for update to authenticated
using (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]))
with check (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));
drop policy if exists "rh exclui matriculas" on public.td_matriculas_cursos;
create policy "rh exclui matriculas" on public.td_matriculas_cursos for delete to authenticated
using (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));

drop policy if exists "usuario le proprio progresso" on public.td_progresso_aulas;
create policy "usuario le proprio progresso" on public.td_progresso_aulas for select to authenticated
using (
  exists (select 1 from public.td_matriculas_cursos m where m.id = matricula_id and m.auth_user_id = auth.uid())
  or public.tem_perfil(array['administrador','diretoria','rh','gestor']::public.perfil_acesso[])
);
drop policy if exists "usuario registra proprio progresso" on public.td_progresso_aulas;
create policy "usuario registra proprio progresso" on public.td_progresso_aulas for all to authenticated
using (
  exists (select 1 from public.td_matriculas_cursos m where m.id = matricula_id and m.auth_user_id = auth.uid())
  or public.tem_perfil(array['administrador','rh']::public.perfil_acesso[])
)
with check (
  exists (select 1 from public.td_matriculas_cursos m where m.id = matricula_id and m.auth_user_id = auth.uid())
  or public.tem_perfil(array['administrador','rh']::public.perfil_acesso[])
);

drop policy if exists "usuario le proprio certificado online" on public.td_certificados_cursos;
create policy "usuario le proprio certificado online" on public.td_certificados_cursos for select to authenticated
using (
  exists (
    select 1 from public.td_matriculas_cursos m
    where m.id = matricula_id and m.auth_user_id = auth.uid()
  )
  or public.tem_perfil(array['administrador','diretoria','rh','gestor']::public.perfil_acesso[])
);
drop policy if exists "rh gerencia certificados online" on public.td_certificados_cursos;
create policy "rh gerencia certificados online" on public.td_certificados_cursos for all to authenticated
using (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]))
with check (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));

drop trigger if exists trg_td_curso_modulos_auditoria on public.td_curso_modulos;
create trigger trg_td_curso_modulos_auditoria after insert or update or delete on public.td_curso_modulos
for each row execute function public.td_auditar_sem_dados_pessoais();
drop trigger if exists trg_td_curso_aulas_auditoria on public.td_curso_aulas;
create trigger trg_td_curso_aulas_auditoria after insert or update or delete on public.td_curso_aulas
for each row execute function public.td_auditar_sem_dados_pessoais();
drop trigger if exists trg_td_matriculas_auditoria on public.td_matriculas_cursos;
create trigger trg_td_matriculas_auditoria after insert or update or delete on public.td_matriculas_cursos
for each row execute function public.td_auditar_sem_dados_pessoais();
drop trigger if exists trg_td_certificados_cursos_auditoria on public.td_certificados_cursos;
create trigger trg_td_certificados_cursos_auditoria after insert or update or delete on public.td_certificados_cursos
for each row execute function public.td_auditar_sem_dados_pessoais();

revoke all on public.td_curso_modulos, public.td_curso_aulas, public.td_matriculas_cursos,
  public.td_progresso_aulas, public.td_certificados_cursos from anon;
grant select, insert, update, delete on public.td_curso_modulos, public.td_curso_aulas,
  public.td_matriculas_cursos, public.td_progresso_aulas, public.td_certificados_cursos to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'td-videos', 'td-videos', false, 524288000,
  array['video/mp4','video/webm','video/quicktime']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "matriculado assiste videos td" on storage.objects;
create policy "matriculado assiste videos td" on storage.objects for select to authenticated
using (
  bucket_id = 'td-videos'
  and (
    public.tem_perfil(array['administrador','rh']::public.perfil_acesso[])
    or exists (
      select 1 from public.td_matriculas_cursos m
      where m.auth_user_id = auth.uid()
        and m.status in ('ativa', 'concluida')
        and m.curso_id::text = (storage.foldername(name))[1]
    )
  )
);

drop policy if exists "rh gerencia videos td" on storage.objects;
create policy "rh gerencia videos td" on storage.objects for all to authenticated
using (
  bucket_id = 'td-videos'
  and public.tem_perfil(array['administrador','rh']::public.perfil_acesso[])
)
with check (
  bucket_id = 'td-videos'
  and public.tem_perfil(array['administrador','rh']::public.perfil_acesso[])
);
