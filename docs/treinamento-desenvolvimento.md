# Treinamento & Desenvolvimento

## Objetivo

O módulo transforma duas entradas — LNT e avaliação de desempenho — em um ciclo rastreável:

```text
Necessidade identificada
  → revisão e priorização pelo RH
  → curso padronizado no catálogo
  → ação distribuída no plano anual
  → participantes, frequência e resultado
  → certificado privado
  → avaliação de eficácia
  → necessidade atendida ou replanejada
```

## Planilhas analisadas

### Levantamento de Necessidades de Treinamento

A base contém gestor, setor, colaborador, cargo, necessidades técnicas, tema comportamental, descrição complementar e curso sugerido. O importador aceita somente XLSX, identifica o cabeçalho, separa listas delimitadas por ponto e vírgula e apresenta uma prévia antes de gravar.

### Avaliação de Desempenho

A base possui 15 competências, cada uma acompanhada de comentários ou evidências:

1. Comunicação;
2. Assertividade e segurança;
3. Influência;
4. Liderança;
5. Comprometimento;
6. Responsabilidade;
7. Pontualidade;
8. Organização;
9. Agilidade e qualidade;
10. Disciplina;
11. Equilíbrio emocional;
12. Desenvolvimento contínuo;
13. Resiliência;
14. Ética;
15. Trabalho em equipe.

A escala usada é `Sempre = 10`, `Frequentemente = 8`, `Às vezes = 6`, `Raramente = 4` e `Nunca = 2`. Campo vazio não recebe nota. A média considera apenas competências efetivamente respondidas.

Na base recebida, 73 linhas foram lidas: 34 possuem as 15 notas reconhecíveis e 39 estão sem escala de competência. Essas 39 linhas são rejeitadas com aviso para evitar indicadores falsos.

## Estrutura do banco

- `td_importacoes`: arquivo, hash, status, linhas válidas, rejeições e avisos;
- `td_lnt_necessidades`: demandas técnicas e comportamentais revisáveis;
- `td_avaliacoes_sinais`: competências, evidências e média calculada;
- `td_cursos`: catálogo corporativo e treinamentos legais;
- `td_treinamentos`: calendário, modalidade, carga, fornecedor, custo e situação;
- `td_participacoes`: inscrição, presença, aprovação e certificado;
- `td_avaliacoes_eficacia`: comparação posterior e resultado da ação.
- `td_pdis`: objetivo, prazo, status e vínculo com o sinal de desempenho;
- `td_pdi_acoes`: ações mensuráveis, curso relacionado, resultado esperado e andamento.

## Áreas do programa

O menu interno organiza a jornada em 13 áreas:

1. Dashboard;
2. Avaliação de Desempenho;
3. Perfil Comportamental;
4. Matriz de Competências;
5. Análise de Lacunas;
6. Necessidades de Treinamento;
7. PDI;
8. Catálogo de Treinamentos;
9. Custos e Orçamento;
10. Cronograma Anual;
11. Custos por Setor;
12. Histórico de Treinamentos;
13. Indicadores.

A Matriz 9-Box original permanece disponível como visão complementar. Nenhum dado ou fluxo anterior foi removido.

O Perfil Comportamental possui duas fontes separadas: o questionário de autopercepção D/I/S/C respondido por link individual e a leitura complementar das competências já presentes na avaliação de desempenho. Nenhuma delas constitui teste psicológico, diagnóstico, prova de aptidão ou decisão automatizada. Convites e resultados são versionados, protegidos por RLS e acessíveis ao RH e ao próprio titular autenticado. Consulte [perfil-comportamental.md](perfil-comportamental.md).

O potencial do 9-Box é estimado somente quando existem notas nas competências declaradas. O ROI exige que o usuário informe um benefício financeiro mensurado. Custos por Setor usa o texto informado em público-alvo/setor, separa valores sem alocação e não inventa rateios. A aplicação não usa notas, potencial ou retorno padrão para preencher ausências.

O bucket `td-documentos` é privado e aceita certificados e evidências em PDF, PNG, JPEG ou XLSX, com limite de 10 MB.

## Segurança e qualidade

- nenhum dado das planilhas é gravado no GitHub;
- importações iguais são detectadas por SHA-256;
- gravação em lotes e limpeza de linhas parciais em caso de falha;
- dados acessíveis somente a perfis autenticados e autorizados por RLS;
- auditoria exclui nomes, evidências, necessidades e observações;
- a ausência de matrícula impede vínculo automático por nome;
- gestores e diretoria possuem leitura; RH e administrador gerenciam as bases;
- instrutores podem consultar ações e participantes, sem administrar importações.

## Ativação

Execute no SQL Editor do Supabase:

```text
database/migrations/20260813_003_treinamento_desenvolvimento.sql
database/migrations/20260813_005_programas_estrategicos.sql
database/migrations/20260813_011_perfil_comportamental_colaborador.sql
```

Depois, atualize a implantação da Vercel. Este módulo não adiciona novas variáveis de ambiente.
