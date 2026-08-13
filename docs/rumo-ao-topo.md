# Módulo Rumo ao Topo

## Objetivo

Transformar a planilha mensal do programa em um processo rastreável:

**arquivo → validação → prévia → ciclo → resultados → indicadores → decisão**

O banco de dados, e não a planilha, passa a ser a fonte histórica oficial.

## Regras preservadas da planilha original

- a linha de cabeçalho pode vir depois de um título e é localizada pela coluna `Colaborador`;
- linhas vazias e marcações `INSS` ou `PACATUBA` são ignoradas;
- colaborador em férias não recebe premiação;
- fora de férias, `Bonus = SIM` gera o valor configurado para o ciclo;
- `Falta` aceita quantidade numérica;
- qualquer marcação não vazia e diferente de zero em `Atraso` ou `Atestado` conta como uma ocorrência;
- linhas incompletas podem ser recusadas ou salvas com aviso, sempre com o número da linha de origem.

## Colunas de entrada

| Coluna | Obrigatória | Uso |
|---|---:|---|
| Matrícula | Não | Vincula automaticamente ao cadastro quando houver correspondência |
| Colaborador | Sim | Nome exibido e usado na validação |
| Setor | Recomendada | Filtros e indicadores por área; ausências ficam como `Não informado` |
| Equipe | Não | Detalhamento organizacional |
| Função | Não | Função informada na origem |
| Bonus | Sim | `SIM` ou `NÃO` |
| Falta | Não | Quantidade inteira não negativa |
| Atraso | Não | Marcação ou quantidade |
| Atestado | Não | Marcação ou quantidade |
| Férias | Não | Marcação de férias no período |
| DDS | Não | Informação complementar |
| OBS | Não | Observações livres |

O importador também reconhece pequenas variações de acentuação e capitalização. XLSX e CSV são aceitos; XLS e arquivos com macros são recusados.

## Dados persistidos

| Tabela | Responsabilidade |
|---|---|
| `rumo_topo_programas` | Configuração do programa e valor padrão |
| `rumo_topo_ciclos` | Competência mensal, valor e status de aprovação |
| `rumo_topo_importacoes` | Arquivo, hash, contagens, avisos e responsável |
| `rumo_topo_resultados` | Resultado individual e cópia normalizada da linha de origem |
| `auditoria_eventos` | Registro de inserções, alterações e exclusões |
| `colaboradores_v2` | Cadastro independente da existência de conta de acesso |
| `perfis_usuario` | Papel e permissões de cada usuário autenticado |

## Segurança e integridade

- o arquivo é processado no navegador e não é armazenado como blob;
- há limites de tamanho, quantidade de entradas e volume descompactado para XLSX;
- a gravação exige usuário autenticado com perfil RH ou administrador;
- diretoria e gestores têm leitura dos indicadores;
- RLS é ativada em todas as tabelas novas;
- o hash do arquivo ajuda a detectar reimportações da mesma competência;
- uma falha durante a gravação remove resultados parciais e marca a importação como falha;
- eventos críticos ficam associados ao usuário autenticado.

## Próximos incrementos recomendados

1. tela de revisão e aprovação do ciclo;
2. bloqueio explícito de alteração após o status `pago`;
3. cadastro de colaboradores e sincronização de matrículas;
4. exportação de relatório para folha de pagamento;
5. notificações aos gestores sobre pendências;
6. metas e regras configuráveis por programa, sem alteração de código.
