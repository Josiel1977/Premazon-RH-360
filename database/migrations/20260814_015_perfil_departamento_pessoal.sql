-- PREMAZON RH 360 · Perfil Departamento Pessoal
-- Execute depois da migração 014 e confirme o sucesso antes de executar a 016.
-- O PostgreSQL exige que um novo valor de enum seja confirmado antes de ser usado por outra migração.

alter type public.perfil_acesso add value if not exists 'dp' after 'rh';

insert into public.rh360_migracoes(versao, nome, metadados)
values (
  '015',
  'Perfil Departamento Pessoal',
  jsonb_build_object('perfil', 'dp', 'motivo', 'aprovação segregada das movimentações de pessoal')
)
on conflict (versao) do update set
  nome = excluded.nome,
  metadados = excluded.metadados;
