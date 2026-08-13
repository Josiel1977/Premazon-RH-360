# Onboarding 360° configurável

## Decisão de arquitetura

A solicitação analisada é coerente com a evolução da plataforma: RH, Departamento Pessoal, Qualidade, SESMT, gestor e TI precisam trabalhar sobre o mesmo processo, com responsabilidades e evidências separadas. A implementação amplia as tabelas `adm_*` da versão 0.8, preservando candidatos, documentos, checklist e experiência 7/30/60/90.

Não foram criadas tabelas paralelas `onboarding_*`. Cursos e vídeos continuam em `td_cursos`, `td_curso_modulos` e `td_curso_aulas`; o conteúdo de onboarding apenas referencia o curso aplicável.

## Fluxo operacional

1. O RH cadastra um item no catálogo e define a área, o tipo e o nível de acesso.
2. Uma versão é criada com vigência. Documento controlado é guardado no bucket privado `onboarding-conteudos` e recebe hash SHA-256.
3. O RH publica a versão e aprova regras específicas por cargo, setor ou filial.
4. Ao iniciar uma admissão, a plataforma escolhe a regra mais específica: cargo, setor, filial e, por último, global.
5. O candidato envia a pré-admissão. Somente então a jornada liberada por `publico_link` aparece no token individual.
6. Conteúdo autenticado ou interno permanece fora do link público.
7. O acesso inicia o item e a confirmação registra uma ciência simples vinculada à versão.
8. Tarefas e conteúdos obrigatórios pendentes bloqueiam a conclusão da admissão.

Uma alteração de regra vale integralmente para novos processos. Na sincronização de jornadas em andamento, novos itens aplicáveis podem ser incluídos, mas um conteúdo já atribuído não é apagado automaticamente; isso preserva a versão apresentada e a trilha de auditoria.

O catálogo inicial é criado sem regras de conteúdo ativas. Publicar uma versão, sozinho, não a torna obrigatória para todos: o RH ainda precisa aprovar um escopo global ou específico.

## Governança de conteúdo

- Conteúdo publicado não deve ser sobrescrito para corrigir o passado; a correção gera outra versão.
- A vigência usada na atribuição considera a data da admissão.
- Regras de riscos, NRs, EPI e segurança dependem de aprovação humana do SESMT.
- O sistema não conclui conformidade legal automaticamente a partir do nome de um cargo.
- O canal de denúncias pode ser apresentado, mas relatos, denunciantes e apurações não pertencem ao banco do onboarding.
- A plataforma não registra IP para a ciência simples, pois esse dado não é necessário ao propósito atual.

## Ciência e assinatura

O registro `adm_ciencias_conteudo` comprova qual versão foi apresentada, em qual processo, por qual método e em qual momento. Seus metadados declaram `assinatura_eletronica: false`.

Esse aceite não é apresentado como assinatura eletrônica avançada ou qualificada. Documentos que exijam identidade robusta, integridade jurídica específica ou assinatura formal devem usar um provedor e um procedimento aprovados pelo jurídico e pela proteção de dados.

## Etilometria

Etilometria ficou intencionalmente fora da migração 009. Antes de qualquer implementação, a empresa deve aprovar finalidade, base jurídica, responsáveis, acesso, retenção, procedimento de recusa/contraprova, calibração dos equipamentos e atuação do SESMT. O onboarding não deve se tornar repositório geral de dados sensíveis de saúde ou disciplinares.

## Permissões

- Administrador e RH: catálogo, versões, regras, sincronização e evidências.
- Diretoria: consulta conforme RLS, sem edição.
- Responsável de área: consulta ao conteúdo da própria área e atualização das atribuições permitidas.
- Gestor: itens da área gestor apenas para processos vinculados ao próprio cadastro.
- Link individual: API de servidor, processo ativo e conteúdo marcado `publico_link`; sem consulta direta anônima às tabelas.

## Implantação

Execute `database/migrations/20260813_009_onboarding_360_configuravel.sql` depois da migração 008. Em seguida:

1. abra **Admissão e Onboarding > Conteúdos e regras**;
2. revise o catálogo inicial;
3. crie e publique versões reais — o catálogo inicial não publica textos ou políticas fictícias;
4. valide regras de Qualidade e SESMT com os responsáveis técnicos;
5. abra **Gestão de Pessoas > Saúde do sistema** e confirme a migração 009 e o bucket privado;
6. teste primeiro com um processo controlado antes de liberar a jornada em produção.
