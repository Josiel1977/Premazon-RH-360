-- PREMAZON RH 360 · Correção de compatibilidade da importação de colaboradores
-- Execute depois da migração 012. Não remove nem altera dados existentes.

insert into public.rh360_migracoes(versao, nome)
values ('013', 'Compatibilidade da importação de colaboradores')
on conflict (versao) do update set nome = excluded.nome;

-- O schema inicial criou public.setores.created_at. A fundação posterior passou
-- a usar criado_em, mas não adicionava a coluna quando a tabela já existia.
alter table public.setores
add column if not exists criado_em timestamptz not null default now();

comment on column public.setores.criado_em is
'Data de criação compatível com os módulos atuais; adicionada sem remover created_at legado.';
