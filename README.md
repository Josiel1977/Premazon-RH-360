# Premazon RH 360

Plataforma de gestão de pessoas construída com Next.js, Supabase e TypeScript. A base é autenticada e auditável e já possui os módulos operacionais **Rumo ao Topo**, **Recrutamento & Seleção**, **Admissão & Onboarding** e **Treinamento & Desenvolvimento**.

Versão atual: **0.8.0**.

## O que já está disponível

- autenticação real por e-mail e senha com Supabase Auth;
- rotas internas protegidas no servidor;
- perfis de acesso: administrador, diretoria, RH, gestor, instrutor e colaborador;
- banco relacional com segurança por linha (RLS) e auditoria;
- importação segura de planilhas XLSX e arquivos CSV;
- validação e prévia antes da gravação;
- histórico mensal de ciclos e importações;
- indicadores, filtros, gráficos e relatório detalhado do Rumo ao Topo;
- planilha-modelo para download dentro da própria plataforma;
- criação e gestão de vagas de Recrutamento & Seleção;
- link público exclusivo para candidatura sem login;
- compartilhamento direto por WhatsApp, e-mail ou cópia do link;
- currículo em bucket privado e acesso interno por URL temporária;
- pipeline de candidatos com histórico de mudança de etapa.
- importação revisável de LNT e avaliação de desempenho;
- mapeamento das 15 competências reais, sem notas artificiais para campos vazios;
- catálogo de cursos, plano anual, custos, frequência, certificados e eficácia;
- consolidação de necessidades e gaps por setor e competência.
- Central de RH premium com navegação responsiva nas nove áreas estratégicas;
- Universidade Corporativa com cursos, módulos e videoaulas privadas;
- upload retomável de vídeos, publicação, matrículas e acompanhamento de progresso;
- reprodução por URL temporária e acesso protegido por perfil e matrícula.
- áreas internas completas dos três programas estratégicos, preservando a identidade de cada solução;
- PDI individual persistente, matriz de competências, cronograma, custos, ROI verificável e 9-Box;
- histórico analítico de R&S com importação CSV, relatórios para diretoria e custos sem valores artificiais.
- dashboard executivo conectado aos registros reais, sem nomes ou métricas demonstrativas;
- Colaborador 360 com cadastro mestre, estrutura organizacional e histórico integrado de desempenho, PDI, treinamentos, Universidade e Rumo ao Topo;
- conferência humana antes de vincular registros importados ao cadastro oficial do colaborador;
- Central de Pendências com tarefas manuais e alertas automáticos de SLA, PDI, LNT, eficácia e certificados;
- Saúde do Sistema com diagnóstico seguro de migrações, buckets privados, RLS, ambiente e acesso, sem exibir segredos.
- Central de Dados com histórico unificado das planilhas, contagem das bases oficiais e acesso direto aos importadores;
- fluxo explícito de carga inicial e atualizações incrementais, sem substituir a base já gravada;
- exportação CSV compatível com Excel e proteção contra fórmulas maliciosas em células;
- links executivos temporários, revogáveis e auditáveis, contendo somente indicadores agregados.
- Admissão e Onboarding com processo originado no R&S ou cadastro manual;
- link individual de pré-admissão para compartilhamento por WhatsApp ou e-mail;
- documentos privados, conferência do RH e substituição segura de arquivos rejeitados;
- CPF persistido somente como hash e quatro dígitos finais;
- checklist automático de RH, DP, Qualidade, SESMT, gestor e TI;
- acompanhamento da experiência nos marcos de 7, 30, 60 e 90 dias;
- conclusão controlada que cria o cadastro mestre somente após as tarefas obrigatórias.

## Executar localmente

Pré-requisito: Node.js 22 ou superior.

```bash
npm install
cp .env.example .env.local
npm run dev
```

No Windows PowerShell, use `Copy-Item .env.example .env.local` no lugar de `cp`.

Preencha em `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=SUA-CHAVE-PUBLICAVEL
SUPABASE_SECRET_KEY=SUA-CHAVE-SECRETA
```

`SUPABASE_SECRET_KEY` é usada somente no servidor para receber candidaturas e guardar currículos. Não use o prefixo `NEXT_PUBLIC_` nela. Não publique `.env.local`, chaves secretas ou senhas no GitHub.

## Preparar o Supabase

No SQL Editor do Supabase, execute nesta ordem:

1. `database/schema.sql` — estrutura inicial do sistema;
2. `database/migrations/20260812_001_rumo_ao_topo.sql` — identidade, permissões, auditoria e módulo Rumo ao Topo.
3. `database/migrations/20260812_002_recrutamento_selecao.sql` — vagas, candidaturas, RLS e bucket privado de currículos.
4. `database/migrations/20260813_003_treinamento_desenvolvimento.sql` — LNT, desempenho, catálogo, plano anual, participações e eficácia.
5. `database/migrations/20260813_004_universidade_corporativa.sql` — cursos online, módulos, videoaulas, matrículas, progresso, certificados e bucket privado.
6. `database/migrations/20260813_005_programas_estrategicos.sql` — PDI individual e histórico analítico de Recrutamento & Seleção.
7. `database/migrations/20260813_006_fundacao_colaborador_360.sql` — Saúde do Sistema, Colaborador 360 e Central de Pendências.
8. `database/migrations/20260813_007_central_dados_relatorios.sql` — histórico unificado, exportação e relatórios executivos compartilháveis.
9. `database/migrations/20260813_008_admissao_onboarding.sql` — pré-admissão, documentos privados, checklists e experiência 7/30/60/90.

Depois, em **Authentication > Users**, crie o primeiro usuário. Copie o UUID dele e execute no SQL Editor:

```sql
insert into public.perfis_usuario (auth_user_id, perfil)
values ('UUID-DO-USUARIO', 'administrador');
```

Esse passo concede acesso administrativo ao primeiro usuário. Os próximos perfis poderão ser administrados pela plataforma quando o módulo de usuários estiver concluído.

## Importar o Rumo ao Topo

1. Entre no sistema e abra **Rumo ao Topo** no menu lateral; use a navegação interna para Dashboard, Base Geral, Bônus, Faltas, Atrasos, Atestados, Setores e relatório da Diretoria.
2. Baixe a planilha-modelo.
3. Preencha uma linha por colaborador, sem alterar os títulos das colunas.
4. Selecione o mês de referência e o valor da premiação.
5. Importe o arquivo XLSX ou CSV e confira a prévia.
6. Grave o ciclo no banco.

A planilha é apenas a entrada. Cada processamento registra ciclo, arquivo, resumo, avisos, resultados e usuário responsável. Arquivos XLS antigos e arquivos com macros não são aceitos.

As regras e o desenho técnico do módulo estão em [docs/rumo-ao-topo.md](docs/rumo-ao-topo.md).

## Recrutamento & Seleção

1. Entre no painel e abra **Recrutamento & Seleção**.
2. Crie uma vaga; o sistema gera um token e um link exclusivo.
3. Envie o link pelo WhatsApp, e-mail ou copie para outro canal.
4. O candidato abre o formulário sem login, aceita o aviso de privacidade e anexa um currículo de até 5 MB.
5. O RH acompanha a candidatura, altera a etapa e abre o currículo por um link temporário.
6. Fechar a vaga desativa o formulário público imediatamente.
7. Em **Importar Planilha CSV**, grave a base histórica para liberar análises por departamento, gestor, contratação, desligamento, substituição e custos.

Na Vercel, cadastre as três variáveis acima em **Project Settings > Environment Variables** e faça um novo deploy. A planilha histórica de vagas enviada como referência contém nomes reais; por isso, seus registros não fazem parte do repositório. A arquitetura do módulo está em [docs/recrutamento-selecao.md](docs/recrutamento-selecao.md).

## Admissão & Onboarding

1. Execute `database/migrations/20260813_008_admissao_onboarding.sql` depois da migração 007.
2. Abra **Admissão e Onboarding > Jornada admissional**.
3. Inicie o processo a partir de um candidato em Proposta/Admissão ou faça um cadastro manual.
4. Selecione o gestor e a data prevista; o sistema cria o checklist completo por área.
5. Copie o link seguro ou envie-o ao candidato por WhatsApp/e-mail.
6. O candidato preenche os dados e envia cada documento em PDF, JPG ou PNG de até 3 MB.
7. O RH abre os arquivos por URL temporária, aprova ou informa a correção necessária.
8. As áreas concluem suas tarefas e o gestor registra os acompanhamentos de 7, 30, 60 e 90 dias.
9. Somente administrador ou RH conclui a admissão; tarefas obrigatórias pendentes bloqueiam essa ação.

O formulário público não cria conta e não possui acesso direto ao banco. A API de servidor valida o token, os dados, o tipo real do arquivo e grava documentos no bucket privado `admissao-documentos`. Consulte [docs/admissao-onboarding.md](docs/admissao-onboarding.md).

## Treinamento & Desenvolvimento

1. Execute as migrações `20260813_003_treinamento_desenvolvimento.sql` e `20260813_005_programas_estrategicos.sql` no Supabase.
2. Abra **Treinamento & Desenvolvimento** e clique em **Importar bases** no cabeçalho do programa.
3. Importe primeiro a LNT e confira a prévia antes de gravar.
4. Importe a avaliação de desempenho; respostas sem nota serão rejeitadas com aviso em vez de receber média artificial.
5. Priorize as necessidades, mantenha o catálogo e distribua as ações no plano anual.
6. Depois da execução, registre participantes, frequência, certificado e avaliação de eficácia.

As planilhas de origem contêm dados pessoais e não fazem parte do repositório. Como elas não possuem matrícula, o vínculo com o cadastro oficial permanece pendente até conferência do RH. Consulte [docs/treinamento-desenvolvimento.md](docs/treinamento-desenvolvimento.md).

## Universidade Corporativa

1. Execute a migração `20260813_004_universidade_corporativa.sql` no Supabase.
2. Abra **Treinamento e Desenvolvimento > Cursos em vídeo**.
3. Crie um curso, organize os módulos e envie as videoaulas.
4. Revise a trilha e publique o curso para liberar matrículas.
5. O aluno matriculado assiste por um link temporário e tem o progresso salvo automaticamente.

O envio usa o protocolo TUS, com retomada automática e barra de progresso. O bucket privado aceita MP4, WebM e MOV de até 500 MB, mas o limite global do projeto Supabase também precisa permitir o tamanho do arquivo. Projetos gratuitos são limitados a 50 MB por arquivo; videoaulas de aproximadamente 20 minutos normalmente exigem um limite maior. Consulte [docs/universidade-corporativa.md](docs/universidade-corporativa.md).

## Fundação RH 360

1. Execute a migração `20260813_006_fundacao_colaborador_360.sql` somente depois das migrações 001 a 005.
2. Abra **Gestão de Pessoas > Saúde do sistema** e execute o diagnóstico.
3. Complete o cadastro mestre em **Colaborador 360**.
4. Confira as sugestões de vínculo com dados importados; o sistema nunca confirma pessoas automaticamente apenas pela semelhança do nome.
5. Abra **Pendências e alertas** para sincronizar condições automáticas, criar tarefas e acompanhar a resolução.

As regras funcionais, fontes dos alertas e permissões estão em [docs/fundacao-rh360.md](docs/fundacao-rh360.md).

## Central de Dados e Relatórios

1. Execute a migração `20260813_007_central_dados_relatorios.sql` depois da migração 006.
2. Abra **Gestão de Pessoas > Central de dados** para consultar o histórico das importações.
3. Na primeira carga de cada fonte, importe a base histórica completa.
4. Nas cargas seguintes, use os formulários da plataforma ou envie planilhas contendo somente as novas linhas.
5. Use **Exportar CSV** no Dashboard para abrir os indicadores no Excel.
6. Use **Compartilhar** para criar um retrato executivo com validade entre 1 e 90 dias.
7. Acompanhe os acessos e revogue o link pela Central de Dados quando necessário.

Os relatórios públicos não consultam diretamente os registros operacionais e não contêm nomes, CPF, e-mails, salários ou avaliações individuais. Consulte [docs/central-dados-relatorios.md](docs/central-dados-relatorios.md).

## Qualidade

```bash
npm run lint
npm test
npx tsc --noEmit
npm run build
npm audit --omit=dev
```

## Estrutura principal

```text
app/                         páginas e componentes
database/                    schema e migrações SQL
docs/                        regras funcionais e arquitetura
lib/                         Supabase, importadores e regras de negócio
public/modelos/              planilhas-modelo
```
