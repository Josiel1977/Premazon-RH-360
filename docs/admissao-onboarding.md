# Admissão e Onboarding

A versão 0.8.0 transforma a aprovação no recrutamento em uma jornada operacional rastreável até o fim da experiência inicial. O Supabase é a fonte oficial; planilhas não são necessárias para manter o módulo funcionando.

## Jornada funcional

1. RH inicia um processo usando um candidato em Proposta/Admissão ou um cadastro manual.
2. O banco gera um token público exclusivo e cria automaticamente tarefas de RH, DP, Qualidade, SESMT, gestor e TI.
3. RH compartilha o link individual pelo canal escolhido.
4. O candidato informa seus dados, aceita o aviso de privacidade e envia documentos.
5. A API valida o token, a extensão, o MIME, a assinatura binária e o limite de cada arquivo.
6. RH revisa os documentos; uma rejeição registra a orientação e permite substituição pelo mesmo link.
7. As áreas concluem os itens de integração e o gestor registra os marcos de 7, 30, 60 e 90 dias.
8. A conclusão exige todas as tarefas obrigatórias e cria o registro em `colaboradores_v2` quando ele ainda não existe.

## Dados e armazenamento

- `adm_processos`: etapa, status, candidato, cargo, setor, gestor, datas e token.
- `adm_dados_preadmissao`: dados fornecidos pelo candidato. O CPF completo não é persistido; somente hash e quatro dígitos finais.
- `adm_documentos`: metadados e situação da conferência.
- `adm_modelos_tarefas`: modelos ativos por área.
- `adm_tarefas`: checklist materializado por processo, com prazo e conclusão.
- `admissao-documentos`: bucket privado para PDF, JPG e PNG de até 3 MB.

Os arquivos são enviados individualmente. Isso mantém cada requisição compatível com o limite de funções serverless e permite informar progresso ao candidato. Uma substituição só remove o arquivo anterior depois que o novo upload e seus metadados forem confirmados.

## Permissões

- administrador e RH: criam e administram processos, documentos e tarefas;
- diretoria: leitura dos processos e indicadores, sem acesso aos dados de pré-admissão ou arquivos;
- gestor: vê somente processos vinculados ao seu cadastro e atualiza apenas tarefas da área Gestor;
- candidato: usa o token individual; não recebe credencial e não consulta o Supabase diretamente;
- service role: usada exclusivamente nas rotas de servidor e nunca exposta ao navegador.

Documentos internos são abertos por URL assinada com validade de dois minutos. RLS permanece ativa nas tabelas operacionais.

## Instalação e diagnóstico

Execute `database/migrations/20260813_008_admissao_onboarding.sql` depois das migrações 001 a 007. Em seguida, abra **Gestão de Pessoas > Saúde do sistema**. O diagnóstico deve aprovar:

- Migração 008 · Admissão e Onboarding;
- bucket de documentos admissionais;
- RLS da admissão.

Se algum item falhar, não use o formulário público até corrigir a migração ou a variável `SUPABASE_SECRET_KEY`.
