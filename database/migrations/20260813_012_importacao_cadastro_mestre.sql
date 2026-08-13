-- PREMAZON RH 360 · Importação controlada do cadastro mestre v0.12.0
-- Prévia no navegador, gravação transacional, deduplicação e trilha de auditoria.
-- Execute depois da migração 011.

insert into public.rh360_migracoes(versao, nome)
values ('012', 'Importação controlada do cadastro mestre')
on conflict (versao) do update set nome = excluded.nome;

create table if not exists public.rh360_importacoes_colaboradores (
  id uuid primary key default gen_random_uuid(),
  arquivo_nome text not null check (char_length(arquivo_nome) between 1 and 255),
  arquivo_hash text not null unique check (arquivo_hash ~ '^[a-f0-9]{64}$'),
  total_recebidos integer not null default 0 check (total_recebidos >= 0),
  criados integer not null default 0 check (criados >= 0),
  atualizados integer not null default 0 check (atualizados >= 0),
  ignorados integer not null default 0 check (ignorados >= 0),
  criado_por uuid not null default auth.uid() references auth.users(id) on delete restrict,
  criado_em timestamptz not null default now()
);

create index if not exists idx_rh360_importacoes_colaboradores_criado
on public.rh360_importacoes_colaboradores(criado_em desc);

alter table public.rh360_importacoes_colaboradores enable row level security;

drop policy if exists "rh le importacoes de colaboradores" on public.rh360_importacoes_colaboradores;
create policy "rh le importacoes de colaboradores"
on public.rh360_importacoes_colaboradores for select to authenticated
using (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));

-- A tabela cargos pertence ao schema inicial e precisa de políticas compatíveis
-- com o cadastro mestre atual.
alter table public.cargos enable row level security;
drop policy if exists "cargos leitura autenticada" on public.cargos;
create policy "cargos leitura autenticada" on public.cargos for select to authenticated using (true);
drop policy if exists "rh gerencia cargos" on public.cargos;
create policy "rh gerencia cargos" on public.cargos for all to authenticated
using (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]))
with check (public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]));

grant select on public.rh360_importacoes_colaboradores to authenticated;
grant select,insert,update on public.cargos to authenticated;

create or replace function public.rh360_importar_colaboradores(
  p_arquivo_nome text,
  p_arquivo_hash text,
  p_registros jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_importacao_id uuid;
  v_item jsonb;
  v_nome text;
  v_setor text;
  v_equipe text;
  v_funcao text;
  v_setor_id uuid;
  v_equipe_id uuid;
  v_cargo_id uuid;
  v_colaborador_id uuid;
  v_total integer := 0;
  v_criados integer := 0;
  v_atualizados integer := 0;
  v_ignorados integer := 0;
begin
  if not public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]) then
    raise exception 'Acesso restrito ao RH e à administração.' using errcode = '42501';
  end if;

  if p_arquivo_nome is null or char_length(btrim(p_arquivo_nome)) not between 1 and 255 then
    raise exception 'Nome do arquivo inválido.' using errcode = '22023';
  end if;
  if p_arquivo_hash is null or p_arquivo_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Identificador seguro do arquivo inválido.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_registros) <> 'array' then
    raise exception 'A lista de colaboradores é inválida.' using errcode = '22023';
  end if;

  v_total := jsonb_array_length(p_registros);
  if v_total < 1 or v_total > 2000 then
    raise exception 'A importação deve conter entre 1 e 2.000 colaboradores.' using errcode = '22023';
  end if;

  insert into public.rh360_importacoes_colaboradores(
    arquivo_nome, arquivo_hash, total_recebidos, criado_por
  ) values (
    btrim(p_arquivo_nome), p_arquivo_hash, v_total, auth.uid()
  )
  on conflict (arquivo_hash) do nothing
  returning id into v_importacao_id;

  if v_importacao_id is null then
    raise exception 'Este arquivo já foi importado anteriormente.' using errcode = '23505';
  end if;

  for v_item in select value from jsonb_array_elements(p_registros)
  loop
    v_nome := btrim(regexp_replace(coalesce(v_item->>'nome', ''), '[[:space:]]+', ' ', 'g'));
    v_setor := nullif(btrim(regexp_replace(coalesce(v_item->>'setor', ''), '[[:space:]]+', ' ', 'g')), '');
    v_equipe := nullif(btrim(regexp_replace(coalesce(v_item->>'equipe', ''), '[[:space:]]+', ' ', 'g')), '');
    v_funcao := nullif(btrim(regexp_replace(coalesce(v_item->>'funcao', ''), '[[:space:]]+', ' ', 'g')), '');

    if char_length(v_nome) not between 3 and 180 or (v_setor is null and v_funcao is null) then
      v_ignorados := v_ignorados + 1;
      continue;
    end if;

    v_setor_id := null;
    v_equipe_id := null;
    v_cargo_id := null;
    v_colaborador_id := null;

    if v_setor is not null then
      select id into v_setor_id from public.setores
      where filial_id is null and lower(btrim(nome)) = lower(v_setor)
      order by criado_em limit 1;

      if v_setor_id is null then
        insert into public.setores(nome, ativo) values (left(v_setor, 255), true)
        returning id into v_setor_id;
      end if;
    end if;

    if v_funcao is not null then
      select id into v_cargo_id from public.cargos
      where lower(btrim(cargo)) = lower(v_funcao)
      order by created_at limit 1;

      if v_cargo_id is null then
        insert into public.cargos(cargo) values (left(v_funcao, 255))
        returning id into v_cargo_id;
      end if;
    end if;

    if v_equipe is not null and v_setor_id is not null then
      select id into v_equipe_id from public.equipes
      where setor_id = v_setor_id and lower(btrim(nome)) = lower(v_equipe)
      order by criado_em limit 1;

      if v_equipe_id is null then
        insert into public.equipes(setor_id, nome, ativo)
        values (v_setor_id, left(v_equipe, 255), true)
        returning id into v_equipe_id;
      end if;
    end if;

    select id into v_colaborador_id from public.colaboradores_v2
    where lower(regexp_replace(btrim(nome), '[[:space:]]+', ' ', 'g')) = lower(v_nome)
    order by criado_em limit 1;

    if v_colaborador_id is null then
      insert into public.colaboradores_v2(nome, setor_id, equipe_id, cargo_id, status)
      values (v_nome, v_setor_id, v_equipe_id, v_cargo_id, 'ativo');
      v_criados := v_criados + 1;
    else
      update public.colaboradores_v2
      set setor_id = coalesce(setor_id, v_setor_id),
          equipe_id = coalesce(equipe_id, v_equipe_id),
          cargo_id = coalesce(cargo_id, v_cargo_id),
          atualizado_em = now()
      where id = v_colaborador_id
        and ((setor_id is null and v_setor_id is not null)
          or (equipe_id is null and v_equipe_id is not null)
          or (cargo_id is null and v_cargo_id is not null));

      if found then v_atualizados := v_atualizados + 1;
      else v_ignorados := v_ignorados + 1;
      end if;
    end if;
  end loop;

  update public.rh360_importacoes_colaboradores
  set criados = v_criados, atualizados = v_atualizados, ignorados = v_ignorados
  where id = v_importacao_id;

  return jsonb_build_object(
    'importacao_id', v_importacao_id,
    'total', v_total,
    'criados', v_criados,
    'atualizados', v_atualizados,
    'ignorados', v_ignorados
  );
end;
$$;

revoke all on function public.rh360_importar_colaboradores(text,text,jsonb) from public, anon;
grant execute on function public.rh360_importar_colaboradores(text,text,jsonb) to authenticated;

create or replace function public.rh360_diagnostico_importacao_colaboradores()
returns table(chave text,titulo text,categoria text,status text,detalhe text,acao text,criticidade text,ordem integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.tem_perfil(array['administrador','rh']::public.perfil_acesso[]) then
    raise exception 'Acesso restrito.' using errcode = '42501';
  end if;

  return query select * from (values
    (
      'migracao_012'::text,
      'Migração 012 · Importação de colaboradores'::text,
      'Banco'::text,
      case when to_regclass('public.rh360_importacoes_colaboradores') is not null
        and to_regprocedure('public.rh360_importar_colaboradores(text,text,jsonb)') is not null
        then 'ok' else 'erro' end::text,
      'Carga controlada do cadastro mestre com deduplicação e auditoria.'::text,
      'Execute a migração 012.'::text,
      'critica'::text,
      70
    ),
    (
      'rls_importacao_colaboradores'::text,
      'RLS das importações de colaboradores'::text,
      'Segurança'::text,
      case when exists(
        select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relname = 'rh360_importacoes_colaboradores' and c.relrowsecurity
      ) then 'ok' else 'erro' end::text,
      'O histórico das cargas é visível somente para RH e administradores.'::text,
      'Revise as políticas da migração 012.'::text,
      'critica'::text,
      116
    )
  ) d(chave,titulo,categoria,status,detalhe,acao,criticidade,ordem)
  order by d.ordem;
end;
$$;

revoke all on function public.rh360_diagnostico_importacao_colaboradores() from public, anon;
grant execute on function public.rh360_diagnostico_importacao_colaboradores() to authenticated;

comment on table public.rh360_importacoes_colaboradores is 'Auditoria das cargas confirmadas para o cadastro mestre de colaboradores.';
comment on function public.rh360_importar_colaboradores(text,text,jsonb) is 'Importa até 2.000 colaboradores após prévia e confirmação explícita do RH.';
