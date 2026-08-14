# JM People 360 · Fundação multiempresa

**Status:** preparação técnica, sem alteração de produção e sem migration executável.

## Decisão de marca

- Produto: **JM People 360**
- Posicionamento: **Gestão de Desempenho, Clima e Desenvolvimento de Pessoas**
- Primeiro ambiente: **PREMAZON RH 360**
- Assinatura no ambiente da cliente: **Tecnologia JM People 360**
- Programa exclusivo inicial: **Rumo ao Topo**

A marca do produto e a identidade da empresa cliente serão camadas separadas. A Premazon mantém nome, logomarca, cores, projetos, documentos e comunicação próprios.

## Princípios obrigatórios

1. Nenhum dado de uma organização pode ser lido, alterado ou inferido por outra.
2. Toda tabela de negócio deve possuir vínculo explícito com a organização.
3. RLS deve permanecer habilitada nas tabelas expostas.
4. A chave secreta do Supabase permanece somente no servidor.
5. Currículos, documentos, certificados e vídeos devem usar caminhos separados por organização.
6. A migração da Premazon precisa ser progressiva, auditável e reversível.
7. Programas como Rumo ao Topo não devem ser generalizados por código fixo; serão configurações da organização.
8. Nenhuma regra de RH deve inferir cargo, nível, vínculo ou decisão sobre pessoas sem confirmação humana.
9. Alterações multiempresa não serão misturadas com hotfixes operacionais.
10. Dados pessoais não serão usados em ambiente de demonstração.

## Modelo-alvo inicial

### Organizações

- `organizacoes`: empresa cliente, situação, identificação, plano e configurações gerais.
- `organizacao_identidade`: nome exibido, logomarca, cores, domínio, rodapé e remetentes.
- `organizacao_modulos`: módulos contratados e recursos habilitados.
- `organizacao_usuarios`: vínculo entre usuário, organização e perfil.
- `organizacao_configuracoes`: nomenclaturas e preferências operacionais versionadas.

### Isolamento

As tabelas de colaboradores, candidatos, vagas, setores, equipes, cargos, treinamentos, avaliações, PDIs, clima, carreira, onboarding, projetos, relatórios, auditorias e importações receberão `organizacao_id`.

As políticas deverão validar simultaneamente:

- usuário autenticado;
- vínculo ativo com a organização;
- perfil autorizado;
- organização correspondente ao registro;
- finalidade da operação.

### Contexto da aplicação

A aplicação resolverá a organização ativa pelo vínculo do usuário e, futuramente, por domínio autorizado. Toda consulta interna receberá o contexto da organização; o navegador não poderá escolher livremente um `organizacao_id`.

## Estratégia de migração segura

### Etapa 0 · Estabilização

- concluir a importação dos colaboradores;
- validar as migrations 013 e 014;
- concluir a PR #5;
- confirmar o diagnóstico de saúde em 100%.

### Etapa 1 · Identidade configurável

- centralizar os textos e elementos visuais atualmente fixos;
- criar configuração padrão da JM People 360;
- criar identidade PREMAZON RH 360;
- preservar rotas, banco e funcionamento existentes.

### Etapa 2 · Fundação multiempresa

A migration futura será dividida em passos:

1. criar organizações e vínculos;
2. cadastrar a Premazon como organização inicial;
3. adicionar `organizacao_id` inicialmente anulável;
4. preencher os registros existentes com a organização Premazon;
5. validar contagens e relacionamentos;
6. implantar políticas RLS multiempresa;
7. executar testes de isolamento positivo e negativo;
8. tornar o vínculo obrigatório somente após a validação;
9. registrar trilha de auditoria.

Não será feita alteração ampla com `NOT NULL` antes do preenchimento e da conferência dos dados existentes.

### Etapa 3 · Experiência multiempresa

- identidade visual por organização;
- alternância de organização somente para usuários autorizados;
- módulos e menus por plano;
- relatórios e exportações identificados pela empresa;
- links públicos vinculados à organização;
- templates de WhatsApp e e-mail personalizados.

### Etapa 4 · Produto comercial

- onboarding de nova empresa;
- ambiente de demonstração sem dados reais;
- planos e limites;
- armazenamento e consumo;
- aceite contratual e privacidade;
- suspensão sem exclusão automática;
- exportação e encerramento assistido.

### Etapa 5 · Piloto

- Premazon permanece como cliente de referência;
- cadastrar uma segunda organização de teste;
- demonstrar que usuários, dados, arquivos e indicadores não se cruzam;
- somente depois iniciar comercialização.

## Critérios de aceite

- Premazon mantém a experiência atual e o Rumo ao Topo.
- A mudança de identidade não exige duplicar o código.
- Um usuário sem vínculo não acessa nenhuma organização.
- Um gestor acessa apenas o escopo autorizado dentro da própria organização.
- Links públicos não revelam identificadores internos nem dados de outra empresa.
- Service role não é exposta ao navegador.
- Backups, auditoria e exportação mantêm o contexto da organização.
- Testes automatizados comprovam o isolamento entre pelo menos duas organizações.
- A Saúde do Sistema verifica a fundação multiempresa antes da ativação comercial.

## O que dependerá do proprietário amanhã

1. Confirmar a razão social responsável comercialmente pela JM People 360.
2. Separar a logomarca da JM e, se desejar, uma variação específica do produto.
3. Escolher o domínio principal; credenciais nunca devem ser enviadas em conversa.
4. Confirmar quem será o administrador proprietário da plataforma.
5. Autorizar a execução da migration somente depois da revisão e do backup.
6. Confirmar a implantação na Vercel após os testes.
7. Validar a identidade PREMAZON RH 360 com a gerente de RH.

## Próxima entrega técnica

Depois da estabilização da PR #5, abrir uma PR exclusiva contendo:

- camada de configuração de marca;
- identidade padrão JM People 360;
- identidade Premazon;
- fundação de organizações e vínculos;
- migration progressiva com backfill;
- testes de RLS e isolamento;
- documentação de implantação e reversão.
