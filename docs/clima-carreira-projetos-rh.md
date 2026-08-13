# Clima, carreira e projetos estratégicos de RH

## Organização da navegação

O menu da versão 0.10.0 separa os módulos permanentes dos projetos estratégicos:

- **Clima e Engajamento** reúne escuta, pesquisas, reconhecimento, campanhas, planos de ação, indicadores e relatórios;
- **Carreira e Sucessão** reúne trilhas, talentos, movimentações, desenvolvimento, sucessão e evolução;
- **Projetos de RH** funciona como portfólio para Rumo ao Topo, Campanhas de Engajamento, Reconhecimento, Qualidade de Vida e Segurança.

Campanhas e Reconhecimento aparecem no portfólio como atalhos gerenciais, mas usam a mesma área operacional de Clima e Engajamento. Não devem existir bases duplicadas para a mesma iniciativa.

## Princípios de implantação

- telas sem registros reais permanecem com estado vazio; indicadores demonstrativos não são fabricados;
- respostas anônimas de clima devem ser apresentadas apenas em grupos com quantidade mínima aprovada pelo RH;
- comentários livres exigem acesso restrito e política de retenção;
- avaliações de potencial e sucessão não produzem decisões automáticas sobre pessoas;
- o colaborador acessa sua própria trilha e PDI, enquanto mapas de sucessão permanecem restritos ao RH e à gestão autorizada;
- iniciativas de Segurança possuem governança conjunta com o SESMT e não substituem PGR, PCMSO, treinamentos legais ou registros oficiais.

## Identificação na candidatura

O formulário público passa a solicitar CPF, nome completo da mãe e data de nascimento. A API valida os campos e grava somente o hash e os quatro últimos dígitos do CPF. Os três dados ficam em `rs_candidatos_identificacao`, uma tabela separada cuja RLS permite leitura somente por administrador e RH; diretoria e gestores não recebem esses campos.

Execute `database/migrations/20260813_010_identificacao_candidatos.sql` depois da migração 009.
