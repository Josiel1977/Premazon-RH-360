# Central de Dados e Relatórios

A versão 0.7.0 estabelece o Supabase como fonte oficial e permanente do Premazon RH 360. A planilha continua disponível, mas funciona como um canal controlado de entrada e saída — nunca como requisito para o dashboard funcionar.

## Regra operacional

### Primeira carga

Cada base histórica deve ser importada uma única vez. Antes da gravação, o módulo apresenta a prévia, valida os registros e calcula o SHA-256 do arquivo. O nome, tamanho, hash, quantidades, avisos, usuário e horário permanecem registrados.

### Atualização contínua

Depois da primeira carga, os dados entram por:

- formulários internos da plataforma;
- links públicos específicos, como candidatura;
- cadastros e atualizações operacionais;
- arquivos incrementais contendo somente novas linhas.

Um arquivo exatamente igual ao já concluído é bloqueado pelo hash. Quando a planilha original for atualizada fora da plataforma, a exportação incremental deve conter apenas as novas respostas ou processos. Isso evita reenviar registros históricos em um arquivo diferente.

Nenhuma rotina da Central de Dados apaga ou substitui silenciosamente a base existente.

## Histórico unificado

A view `rh360_historico_importacoes`, executada com as permissões do usuário, consolida:

| Origem | Tabela de importação | Uso |
|---|---|---|
| Rumo ao Topo | `rumo_topo_importacoes` | ciclos mensais |
| Recrutamento e Seleção | `rs_importacoes_historico` | processos históricos |
| Treinamento e Desenvolvimento | `td_importacoes` | LNT e desempenho |

A Central mostra arquivo, competência, status, linhas válidas, rejeições, avisos e fragmento do hash. A exportação do histórico utiliza CSV UTF-8 com ponto e vírgula, apropriado para abertura no Excel em ambiente brasileiro.

## Exportação segura

O Dashboard Executivo exporta indicadores e distribuições agregadas. Valores iniciados por caracteres reconhecidos pelo Excel como fórmula são neutralizados antes da criação do CSV, reduzindo o risco de CSV Injection.

As exportações não fabricam percentuais, custos, nomes ou rankings. Estado vazio e zero significam ausência de registros no banco.

## Compartilhamento executivo

O botão **Compartilhar** chama `rh360_criar_compartilhamento_dashboard`. A função, restrita a administrador, RH e diretoria:

1. calcula os indicadores no banco;
2. remove qualquer dimensão individual;
3. grava um snapshot imutável;
4. cria um token UUID não previsível;
5. limita a validade a no máximo 90 dias.

O snapshot contém somente:

- totais de colaboradores, vagas, candidaturas, treinamentos, PDIs e pendências;
- distribuição agregada por setor, etapa e status;
- data da geração e declaração de privacidade.

Ele não contém nomes, CPF, e-mails, telefones, salários, avaliações individuais, documentos ou currículos.

## Acesso público e revogação

A página `/relatorio/[token]` consulta a API do servidor. A API valida o token, a situação do link e o prazo antes de usar a chave secreta do Supabase. A chave nunca é enviada ao navegador.

Cada acesso atualiza contador e horário. Administrador, RH ou diretoria podem revogar o link imediatamente pela Central de Dados. Registros revogados ou expirados retornam uma mensagem genérica e não revelam a existência dos dados.

As tabelas permanecem com RLS ativada e sem permissão direta para usuários anônimos.
