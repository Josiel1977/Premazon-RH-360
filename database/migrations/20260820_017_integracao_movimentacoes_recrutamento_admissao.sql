-- PREMAZON RH 360 · Integração de Movimentações, Recrutamento e Admissão
-- Execute somente depois das migrações 015 e 016.
-- Esta migração é incremental: preserva protocolos já registrados e não infere decisões de RH.

insert into public.rh360_migracoes(versao, nome, metadados)
values (
  '017',
  'Integração de Movimentações com Recrutamento e Admissão',
  jsonb_build_object(
    'desligamento', array['gestor','rh','dp','diretoria_condicional','conclusao'],
    'recrutamento', array['gestor','rh','recrutamento','admissao','conclusao'],
    'preserva_migracao_016', true
  )
)
on conflict (versao) do update set
  nome = excluded.nome,
  metadados = excluded.metadados;

insert into public.rh_documentos_controlados(codigo, titulo, revisao, aprovado_em, observacoes, metadados)
values
  (
    'RQ.04.09',
    'Solicitação de Desligamento',
    '03',
    '2023-05-08',
    'Documento oficial de uma página conferido. O arquivo deve permanecer no repositório privado da Qualidade.',
    jsonb_build_object(
      'origem', 'documento_oficial_conferido',
      'arquivo_conferido', true,
      'paginas', 1,
      'destino', 'Departamento de Pessoal',
      'diretoria_condicional', 'somente aviso indenizado'
    )
  ),
  (
    'RQ.04.10',
    'Recrutamento para Funções',
    '00',
    '2021-05-05',
    'Documento oficial de duas páginas conferido. É a ficha do candidato no recrutamento, não a solicitação de vaga do gestor.',
    jsonb_build_object(
      'origem', 'documento_oficial_conferido',
      'arquivo_conferido', true,
      'paginas', 2,
      'titulo_impresso', 'RECRUTAMENTO PARA FUNÇÕES ADMINISTRATIVA',
      'aplicacao', 'ficha_do_candidato',
      'nao_e_solicitacao_do_gestor', true
    )
  )
on conflict (codigo, revisao) do update set
  titulo = excluded.titulo,
  aprovado_em = coalesce(public.rh_documentos_controlados.aprovado_em, excluded.aprovado_em),
  observacoes = excluded.observacoes,
  metadados = public.rh_documentos_controlados.metadados || excluded.metadados;

alter table public.rh_movimentacoes_pessoal
  add column if not exists tipo_aviso text,
  add column if not exists requer_substituicao boolean,
  add column if not exists vaga_id uuid references public.rs_vagas(id) on delete restrict,
  add column if not exists candidatura_id uuid references public.rs_candidaturas(id) on delete set null,
  add column if not exists admissao_processo_id uuid references public.adm_processos(id) on delete set null;

alter table public.rh_movimentacoes_pessoal
  alter column documento_controlado_id drop not null,
  alter column documento_codigo drop not null,
  alter column documento_revisao drop not null;

alter table public.rh_movimentacoes_pessoal
  drop constraint if exists rh_movimentacoes_pessoal_tipo_aviso_check,
  drop constraint if exists rh_movimentacoes_pessoal_etapa_atual_check,
  drop constraint if exists rh_movimentacoes_pessoal_etapa_integrada_check;

alter table public.rh_movimentacoes_pessoal
  add constraint rh_movimentacoes_pessoal_tipo_aviso_check
    check (tipo_aviso is null or tipo_aviso in ('trabalhado','indenizado','termino_contrato')),
  add constraint rh_movimentacoes_pessoal_etapa_integrada_check
    check (etapa_atual in ('gestor','rh','dp','diretoria','recrutamento','admissao','conclusao'));

alter table public.rh_movimentacoes_historico
  drop constraint if exists rh_movimentacoes_historico_etapa_check,
  drop constraint if exists rh_movimentacoes_historico_acao_check,
  drop constraint if exists rh_movimentacoes_historico_etapa_integrada_check,
  drop constraint if exists rh_movimentacoes_historico_acao_integrada_check;

alter table public.rh_movimentacoes_historico
  add constraint rh_movimentacoes_historico_etapa_integrada_check
    check (etapa in ('gestor','rh','dp','diretoria','recrutamento','admissao','conclusao')),
  add constraint rh_movimentacoes_historico_acao_integrada_check
    check (acao in ('solicitada','aprovada','rejeitada','cancelada','vaga_vinculada','admissao_iniciada','concluida'));

create table if not exists public.rh_movimentacoes_admissoes (
  id uuid primary key default gen_random_uuid(),
  movimentacao_id uuid not null references public.rh_movimentacoes_pessoal(id) on delete cascade,
  candidatura_id uuid not null references public.rs_candidaturas(id) on delete restrict,
  admissao_processo_id uuid not null unique references public.adm_processos(id) on delete restrict,
  status text not null check (status in ('aberto','em_andamento','aguardando_candidato','bloqueado','concluido','cancelado')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (movimentacao_id, candidatura_id)
);

create unique index if not exists idx_rh_movimentacoes_vaga
  on public.rh_movimentacoes_pessoal(vaga_id) where vaga_id is not null;
create index if not exists idx_rh_movimentacoes_admissao
  on public.rh_movimentacoes_pessoal(admissao_processo_id) where admissao_processo_id is not null;
create index if not exists idx_rh_movimentacoes_admissoes_movimentacao
  on public.rh_movimentacoes_admissoes(movimentacao_id, status);

drop function if exists public.rh_criar_movimentacao(text,uuid,uuid,uuid,text,integer,text,date,text);

create or replace function public.rh_criar_movimentacao(
  p_tipo text,
  p_colaborador_id uuid,
  p_setor_id uuid,
  p_cargo_id uuid,
  p_cargo_nome_solicitado text,
  p_quantidade integer,
  p_justificativa text,
  p_data_desejada date,
  p_prioridade text,
  p_tipo_aviso text default null,
  p_requer_substituicao boolean default null
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
  if p_tipo = 'desligamento' and (p_tipo_aviso is null or p_tipo_aviso not in ('trabalhado','indenizado','termino_contrato')) then
    raise exception 'Informe o tipo de aviso do desligamento.' using errcode = '22023';
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

  if p_tipo = 'desligamento' then
    select d.* into v_documento
    from public.rh_documentos_controlados d
    where d.codigo = 'RQ.04.09' and d.status = 'vigente'
    order by d.criado_em desc
    limit 1;
    if v_documento.id is null then
      raise exception 'RQ.04.09 vigente não configurado para o desligamento.' using errcode = 'P0001';
    end if;
  end if;

  insert into public.rh_movimentacoes_pessoal(
    protocolo, tipo, solicitante_auth_user_id, solicitante_colaborador_id,
    colaborador_id, setor_id, cargo_id, cargo_nome_solicitado, quantidade,
    justificativa, tipo_aviso, requer_substituicao, data_desejada, prioridade,
    documento_controlado_id, documento_codigo, documento_revisao, etapa_atual, status
  ) values (
    public.rh_movimentacao_proximo_protocolo(), p_tipo, auth.uid(), v_solicitante_colaborador_id,
    p_colaborador_id, p_setor_id, p_cargo_id, nullif(trim(p_cargo_nome_solicitado), ''), coalesce(p_quantidade, 1),
    trim(p_justificativa), case when p_tipo = 'desligamento' then p_tipo_aviso end,
    case when p_tipo = 'desligamento' then coalesce(p_requer_substituicao, false) end,
    p_data_desejada, p_prioridade, v_documento.id, v_documento.codigo, v_documento.revisao, 'rh', 'em_fluxo'
  ) returning id into v_id;

  insert into public.rh_movimentacoes_historico(
    movimentacao_id, etapa, acao, ator_auth_user_id, ator_perfil, observacao
  ) values (
    v_id, 'gestor', 'solicitada', auth.uid(), v_perfil, 'Solicitação registrada e encaminhada ao RH.'
  );
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
  if p_decisao = 'aprovar' and v_mov.etapa_atual = 'dp' and v_mov.tipo = 'desligamento' and v_mov.tipo_aviso is null then
    raise exception 'Classifique o tipo de aviso deste protocolo legado antes da decisão do DP.' using errcode = '22023';
  end if;

  if p_decisao = 'rejeitar' then
    update public.rh_movimentacoes_pessoal
    set status = 'rejeitada', rejeitada_em = now(), atualizado_em = now(), versao = versao + 1
    where id = v_mov.id;
    insert into public.rh_movimentacoes_historico(movimentacao_id, etapa, acao, ator_auth_user_id, ator_perfil, observacao)
    values (v_mov.id, v_mov.etapa_atual, 'rejeitada', auth.uid(), v_perfil, trim(p_observacao));
    return 'rejeitada';
  end if;

  v_proxima_etapa := case
    when v_mov.etapa_atual = 'rh' and v_mov.tipo = 'desligamento' then 'dp'
    when v_mov.etapa_atual = 'rh' then 'recrutamento'
    when v_mov.etapa_atual = 'dp' and v_mov.tipo_aviso = 'indenizado' then 'diretoria'
    when v_mov.etapa_atual in ('dp','diretoria') then 'conclusao'
  end;

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

create or replace function public.rh_vincular_vaga_movimentacao(
  p_movimentacao_id uuid,
  p_vaga_id uuid
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_mov public.rh_movimentacoes_pessoal%rowtype;
  v_vaga public.rs_vagas%rowtype;
  v_perfil public.perfil_acesso;
begin
  select p.perfil into v_perfil
  from public.perfis_usuario p
  where p.auth_user_id = auth.uid() and p.ativo;

  if v_perfil is null or v_perfil not in ('administrador','rh') then
    raise exception 'Apenas RH ou administrador pode vincular a vaga.' using errcode = '42501';
  end if;

  select * into v_mov
  from public.rh_movimentacoes_pessoal
  where id = p_movimentacao_id
  for update;

  if v_mov.id is null then
    raise exception 'Solicitação não encontrada.' using errcode = 'P0002';
  end if;
  if v_mov.tipo not in ('aumento_quadro','substituicao') or v_mov.status <> 'em_fluxo' or v_mov.etapa_atual <> 'recrutamento' then
    raise exception 'Esta solicitação não está aguardando vínculo com uma vaga.' using errcode = '22023';
  end if;

  select * into v_vaga from public.rs_vagas where id = p_vaga_id;
  if v_vaga.id is null or v_vaga.status in ('fechada','cancelada') then
    raise exception 'Selecione uma vaga ativa.' using errcode = '22023';
  end if;
  if (v_mov.tipo = 'substituicao' and v_vaga.tipo_contratacao <> 'substituicao')
    or (v_mov.tipo = 'aumento_quadro' and v_vaga.tipo_contratacao = 'substituicao') then
    raise exception 'O tipo da vaga não corresponde ao tipo da solicitação.' using errcode = '22023';
  end if;
  if v_vaga.quantidade <> v_mov.quantidade then
    raise exception 'A quantidade da vaga deve ser igual à quantidade aprovada na solicitação.' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.rh_movimentacoes_pessoal m
    where m.vaga_id = p_vaga_id and m.id <> v_mov.id
  ) then
    raise exception 'Esta vaga já está vinculada a outra solicitação.' using errcode = '23505';
  end if;

  update public.rh_movimentacoes_pessoal
  set vaga_id = p_vaga_id, atualizado_em = now(), versao = versao + 1
  where id = v_mov.id;

  insert into public.rh_movimentacoes_historico(
    movimentacao_id, etapa, acao, ator_auth_user_id, ator_perfil, observacao
  ) values (
    v_mov.id, 'recrutamento', 'vaga_vinculada', auth.uid(), v_perfil,
    'Vaga ' || v_vaga.codigo || ' vinculada ao protocolo. O RQ.04.10 será usado como ficha do candidato no processo seletivo.'
  );
  return v_vaga.codigo;
end;
$$;

create or replace function public.rh_sincronizar_admissao_movimentacao()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_mov public.rh_movimentacoes_pessoal%rowtype;
  v_vaga_id uuid;
  v_total integer;
  v_concluidas integer;
  v_primeiro_vinculo boolean := false;
  v_vinculo_existente boolean := false;
begin
  if new.candidatura_id is null then return new; end if;

  select c.vaga_id into v_vaga_id
  from public.rs_candidaturas c
  where c.id = new.candidatura_id;

  select * into v_mov
  from public.rh_movimentacoes_pessoal m
  where m.vaga_id = v_vaga_id
    and m.tipo in ('aumento_quadro','substituicao')
    and m.status = 'em_fluxo'
  for update;

  if v_mov.id is null then return new; end if;

  select exists(
    select 1 from public.rh_movimentacoes_admissoes a
    where a.movimentacao_id = v_mov.id and a.candidatura_id = new.candidatura_id
  ) into v_vinculo_existente;
  v_primeiro_vinculo := not v_vinculo_existente;

  insert into public.rh_movimentacoes_admissoes(
    movimentacao_id, candidatura_id, admissao_processo_id, status
  ) values (
    v_mov.id, new.candidatura_id, new.id, new.status
  )
  on conflict (movimentacao_id, candidatura_id) do update set
    admissao_processo_id = excluded.admissao_processo_id,
    status = excluded.status,
    atualizado_em = now();

  select count(*), count(*) filter (where a.status = 'concluido')
    into v_total, v_concluidas
  from public.rh_movimentacoes_admissoes a
  where a.movimentacao_id = v_mov.id and a.status <> 'cancelado';

  update public.rh_movimentacoes_pessoal
  set candidatura_id = new.candidatura_id,
      admissao_processo_id = new.id,
      etapa_atual = case when v_concluidas >= quantidade then 'conclusao' else 'admissao' end,
      status = case when v_concluidas >= quantidade then 'concluida' else 'em_fluxo' end,
      concluida_em = case when v_concluidas >= quantidade then coalesce(concluida_em, now()) else concluida_em end,
      atualizado_em = now(),
      versao = versao + 1
  where id = v_mov.id;

  if v_primeiro_vinculo then
    insert into public.rh_movimentacoes_historico(
      movimentacao_id, etapa, acao, ator_auth_user_id, ator_perfil, observacao
    ) values (
      v_mov.id, 'admissao', 'admissao_iniciada', auth.uid(), null,
      'Candidato aprovado encaminhado para Admissão e Onboarding 360° (' || v_total || ' de ' || v_mov.quantidade || ').'
    );
  end if;

  if v_concluidas >= v_mov.quantidade and v_mov.etapa_atual <> 'conclusao' then
    insert into public.rh_movimentacoes_historico(
      movimentacao_id, etapa, acao, ator_auth_user_id, ator_perfil, observacao
    ) values (
      v_mov.id, 'conclusao', 'concluida', auth.uid(), null,
      'Quantidade solicitada concluída na Admissão e Onboarding 360°.'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_rh_sincronizar_admissao_movimentacao on public.adm_processos;
create trigger trg_rh_sincronizar_admissao_movimentacao
after insert or update of status, etapa, candidatura_id on public.adm_processos
for each row execute function public.rh_sincronizar_admissao_movimentacao();

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
    case when tg_op in ('INSERT','UPDATE') then jsonb_build_object(
      'tipo', new.tipo, 'status', new.status, 'etapa', new.etapa_atual, 'versao', new.versao,
      'documento', new.documento_codigo, 'revisao', new.documento_revisao,
      'vaga_id', new.vaga_id, 'admissao_processo_id', new.admissao_processo_id
    ) end
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.rh_sincronizar_pendencia_movimentacao()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_perfil public.perfil_acesso;
begin
  v_perfil := case new.etapa_atual
    when 'rh' then 'rh'::public.perfil_acesso
    when 'dp' then 'dp'::public.perfil_acesso
    when 'diretoria' then 'diretoria'::public.perfil_acesso
    when 'recrutamento' then 'rh'::public.perfil_acesso
    when 'admissao' then 'rh'::public.perfil_acesso
    else null
  end;

  insert into public.rh360_pendencias(
    chave_origem, origem, tipo, entidade, entidade_id, titulo, descricao,
    prioridade, status, responsavel_perfil, automatica, link_acao, metadados,
    resolvida_em, resolucao
  ) values (
    'movimentacao:' || new.id, 'movimentacao', new.tipo, 'rh_movimentacoes_pessoal', new.id,
    new.protocolo || ' · ' || case new.tipo when 'desligamento' then 'Solicitação de desligamento' when 'aumento_quadro' then 'Aumento de quadro' else 'Substituição' end,
    'Etapa atual: ' || upper(new.etapa_atual) || ' · ' || case
      when new.tipo = 'desligamento' and new.documento_codigo is not null then 'Documento ' || new.documento_codigo || ' Rev. ' || new.documento_revisao
      else 'Solicitação gerencial digital integrada a Recrutamento e Admissão'
    end,
    new.prioridade,
    case when new.status = 'em_fluxo' then 'aberta' when new.status = 'cancelada' then 'cancelada' else 'concluida' end,
    v_perfil,
    false,
    case when new.etapa_atual in ('recrutamento','admissao') then '/dashboard/movimentacoes?view=acompanhar' else '/dashboard/movimentacoes?view=aprovacoes' end,
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
    link_acao = excluded.link_acao,
    metadados = excluded.metadados,
    resolvida_em = excluded.resolvida_em,
    resolucao = excluded.resolucao;
  return new;
end;
$$;

insert into public.rh360_pendencias(
  chave_origem, origem, tipo, entidade, entidade_id, titulo, descricao,
  prioridade, status, responsavel_perfil, automatica, link_acao, metadados,
  resolvida_em, resolucao
)
select
  'movimentacao:' || m.id, 'movimentacao', m.tipo, 'rh_movimentacoes_pessoal', m.id,
  m.protocolo || ' · ' || case m.tipo when 'desligamento' then 'Solicitação de desligamento' when 'aumento_quadro' then 'Aumento de quadro' else 'Substituição' end,
  'Etapa atual: ' || upper(m.etapa_atual) || ' · ' || case
    when m.tipo = 'desligamento' and m.documento_codigo is not null then 'Documento ' || m.documento_codigo || ' Rev. ' || m.documento_revisao
    else 'Solicitação gerencial digital integrada a Recrutamento e Admissão'
  end,
  m.prioridade,
  case when m.status = 'em_fluxo' then 'aberta' when m.status = 'cancelada' then 'cancelada' else 'concluida' end,
  case m.etapa_atual
    when 'rh' then 'rh'::public.perfil_acesso
    when 'dp' then 'dp'::public.perfil_acesso
    when 'diretoria' then 'diretoria'::public.perfil_acesso
    when 'recrutamento' then 'rh'::public.perfil_acesso
    when 'admissao' then 'rh'::public.perfil_acesso
    else null
  end,
  false,
  case when m.etapa_atual in ('recrutamento','admissao') then '/dashboard/movimentacoes?view=acompanhar' else '/dashboard/movimentacoes?view=aprovacoes' end,
  jsonb_build_object('protocolo', m.protocolo, 'etapa', m.etapa_atual, 'status', m.status),
  case when m.status = 'em_fluxo' then null else now() end,
  case when m.status = 'concluida' then 'Fluxo aprovado e concluído.' when m.status = 'rejeitada' then 'Solicitação rejeitada.' when m.status = 'cancelada' then 'Solicitação cancelada.' else null end
from public.rh_movimentacoes_pessoal m
on conflict (chave_origem) do update set
  titulo = excluded.titulo,
  descricao = excluded.descricao,
  prioridade = excluded.prioridade,
  status = excluded.status,
  responsavel_perfil = excluded.responsavel_perfil,
  link_acao = excluded.link_acao,
  metadados = excluded.metadados,
  resolvida_em = excluded.resolvida_em,
  resolucao = excluded.resolucao;

alter table public.rh_movimentacoes_admissoes enable row level security;

drop policy if exists "solicitante e aprovadores leem admissoes vinculadas" on public.rh_movimentacoes_admissoes;
create policy "solicitante e aprovadores leem admissoes vinculadas"
on public.rh_movimentacoes_admissoes for select to authenticated
using (
  exists (
    select 1 from public.rh_movimentacoes_pessoal m
    where m.id = movimentacao_id
      and (
        m.solicitante_auth_user_id = auth.uid()
        or public.tem_perfil(array['administrador','diretoria','rh','dp']::public.perfil_acesso[])
      )
  )
);

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
      'Solicitações, RQs controlados e histórico base.', 'Execute a migração 016.', 'critica', 74),
    ('migracao_017', 'Migração 017 · Integração R&S e Admissão', 'Banco',
      case when to_regclass('public.rh_movimentacoes_admissoes') is not null and exists(select 1 from pg_trigger where tgname='trg_rh_sincronizar_admissao_movimentacao' and not tgisinternal) then 'ok' else 'erro' end,
      'Vagas e processos admissionais sincronizados sem expor dados pessoais ao gestor.', 'Execute a migração 017.', 'critica', 75),
    ('bucket_rqs', 'Bucket de RQs oficiais', 'Armazenamento',
      case when exists(select 1 from storage.buckets where id='qualidade-rqs' and not public) then 'ok' else 'erro' end,
      'Documentos oficiais da Qualidade permanecem privados.', 'Revise a migração 016.', 'critica', 96),
    ('rls_movimentacoes', 'RLS das movimentações de pessoal', 'Segurança',
      case when exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='rh_movimentacoes_pessoal' and c.relrowsecurity) and exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='rh_movimentacoes_admissoes' and c.relrowsecurity) then 'ok' else 'erro' end,
      'Solicitantes e aprovadores enxergam somente o escopo autorizado.', 'Revise as políticas das migrações 016 e 017.', 'critica', 114)
  ) as diagnostico(chave, titulo, categoria, status, detalhe, acao, criticidade, ordem)
  order by diagnostico.ordem;
end;
$$;

revoke all on public.rh_movimentacoes_admissoes from anon, authenticated;
grant select on public.rh_movimentacoes_admissoes to authenticated;
revoke all on function public.rh_criar_movimentacao(text,uuid,uuid,uuid,text,integer,text,date,text,text,boolean) from public, anon;
revoke all on function public.rh_decidir_movimentacao(uuid,text,text) from public, anon;
revoke all on function public.rh_vincular_vaga_movimentacao(uuid,uuid) from public, anon;
revoke all on function public.rh_sincronizar_admissao_movimentacao() from public, anon, authenticated;
revoke all on function public.rh360_diagnostico_movimentacoes() from public, anon;
grant execute on function public.rh_criar_movimentacao(text,uuid,uuid,uuid,text,integer,text,date,text,text,boolean) to authenticated;
grant execute on function public.rh_decidir_movimentacao(uuid,text,text) to authenticated;
grant execute on function public.rh_vincular_vaga_movimentacao(uuid,uuid) to authenticated;
grant execute on function public.rh360_diagnostico_movimentacoes() to authenticated;

comment on table public.rh_movimentacoes_admissoes is 'Vínculos sem dados pessoais entre a solicitação gerencial e os processos de Admissão e Onboarding 360°.';
comment on function public.rh_criar_movimentacao(text,uuid,uuid,uuid,text,integer,text,date,text,text,boolean) is 'Abre solicitação gerencial; RQ.04.09 é vinculado somente ao desligamento.';
comment on function public.rh_vincular_vaga_movimentacao(uuid,uuid) is 'Vincula solicitação aprovada a uma vaga existente sem expor dados pessoais do candidato ao gestor.';
