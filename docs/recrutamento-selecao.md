# Recrutamento & Seleção

## Fluxo entregue

```text
RH cria a vaga
  → sistema gera um token público não previsível
  → RH compartilha por WhatsApp, e-mail ou outro canal
  → candidato preenche sem login e anexa currículo
  → servidor valida os dados e guarda o arquivo em bucket privado
  → candidatura entra em Triagem
  → RH movimenta o candidato pelo pipeline
```

O formulário público mostra apenas os dados necessários da oportunidade. O token não permite listar vagas, consultar candidaturas ou abrir currículos.

## Estrutura do banco

- `rs_vagas`: abertura, contratação, solicitante, SLA, custos, descrição, requisitos e situação do link;
- `rs_candidaturas`: contato, experiência, consentimento, etapa e metadados do currículo;
- `rs_movimentacoes`: histórico das alterações de etapa;
- `rs_importacoes_historico`: arquivo, hash, validação, rejeições e avisos da base analítica;
- `rs_historico_processos`: admissões, desligamentos, substituições, SLA e custos reais importados;
- `auditoria_eventos`: registra alterações sem copiar os dados pessoais do candidato;
- bucket `curriculos-candidatos`: privado, com limite de 5 MB e formatos PDF, DOC e DOCX.

As tabelas não concedem acesso ao papel `anon`. A submissão passa por uma rota de servidor que aceita somente campos conhecidos, valida o token e usa a chave secreta exclusivamente no servidor. Usuários internos continuam sujeitos às políticas RLS e aos perfis do RH360.

## Variável secreta

Além das duas variáveis públicas do Supabase, o ambiente do servidor precisa de:

```env
SUPABASE_SECRET_KEY=sb_secret_...
```

Obtenha a chave em **Supabase > Project Settings > API Keys > Secret keys**. Cadastre-a também na Vercel, sem o prefixo `NEXT_PUBLIC_`. Ela não deve ser colocada em mensagens, screenshots, commits ou arquivos versionados.

## Decisões de LGPD

- CPF não é solicitado na candidatura inicial; deve ser coletado somente quando necessário para admissão;
- o consentimento é obrigatório e registra data e hora;
- currículos não possuem URL pública;
- a auditoria guarda IDs, etapa e status, sem duplicar nome, e-mail ou telefone;
- o candidato recebe um protocolo, mas o protocolo não expõe o andamento publicamente;
- o RH pode fechar a vaga, o que invalida o link imediatamente.

## Referência da planilha

A planilha histórica serviu para modelar cargo, departamento, solicitante, abertura, tipo de contratação, substituição, SLA e custo. Ela pode ser importada de forma controlada pela área **Importar Planilha CSV**, com prévia e avisos antes da gravação. Os dados continuam fora do repositório.

O menu interno também oferece Dashboard Executivo, base completa, gráficos da Diretoria, análises por departamento e gestor, tipos de contratação e desligamento, substituições, custos, uniformes/EPIs e relatórios. Custos de EPI ou uniforme permanecem vazios quando o CSV não traz essas colunas; nenhum valor é estimado pelo cargo.

Para ativar o histórico analítico, execute também:

```text
database/migrations/20260813_005_programas_estrategicos.sql
```
