-- PREMAZON RH 360 · Compatibilidade dos cargos na importação de colaboradores
-- Execute depois da migração 013. Não remove cargos nem sobrescreve níveis informados.

insert into public.rh360_migracoes(versao, nome)
values ('014', 'Compatibilidade dos cargos na importação de colaboradores')
on conflict (versao) do update set nome = excluded.nome;

-- Algumas instalações tornaram nivel obrigatório. O cadastro mestre recebido
-- informa a função, mas não traz um nível confiável para o RH.
alter table public.cargos
add column if not exists nivel varchar(50);

update public.cargos
set nivel = 'Não informado'
where nivel is null;

alter table public.cargos
alter column nivel set default 'Não informado';

comment on column public.cargos.nivel is
'Nível definido pelo RH. Novas funções importadas recebem Não informado até a classificação cadastral.';
