# Questionário de Autopercepção Comportamental

## Origem e finalidade

A versão `rh-disc-24-v1.0` foi estruturada a partir do HTML fornecido pelo RH. Ela contém 24 perguntas, cada uma com quatro alternativas relacionadas às dimensões D — Dominância, I — Influência, S — Estabilidade e C — Conformidade.

O recurso serve para autoconhecimento e planejamento de desenvolvimento. A plataforma não o apresenta como teste psicológico, diagnóstico, prova de aptidão ou instrumento suficiente para decidir seleção, promoção, sucessão, desligamento ou medida disciplinar.

## Análise do HTML recebido

O protótipo original possuía boa organização visual e conteúdo compreensível, mas exigia correções antes de receber dados reais:

- cálculo inteiramente no navegador, passível de adulteração;
- alternativas sempre na ordem D/I/S/C, tornando o padrão previsível;
- ausência de identidade, banco de dados, consentimento ou ciência, versionamento e auditoria;
- nenhuma expiração, revogação ou limitação de tentativas;
- empate resolvido pela ordem fixa do código;
- resultado e treinamentos definidos apenas pelo perfil contado como primeiro;
- uso do termo “teste” sem demonstrar estudos de validade, precisão ou normatização.

## Fluxo implementado

1. RH seleciona um colaborador ativo em **T&D > Perfil Comportamental**.
2. Define a validade e cria um convite individual.
3. Envia o link por WhatsApp, e-mail ou outro canal privado.
4. O colaborador lê a finalidade e responde às 24 perguntas, uma por etapa.
5. O navegador envia somente os identificadores das escolhas.
6. A API valida todas as respostas e calcula D/I/S/C no servidor.
7. O resultado é gravado uma única vez e o convite é encerrado.
8. Colaborador e RH recebem uma leitura descritiva para contextualização humana.

## Critério de cálculo

- cada alternativa soma um ponto à dimensão correspondente;
- os percentuais são normalizados para totalizar exatamente 100%;
- quando a diferença entre as duas maiores dimensões é de até dois pontos, o perfil é apresentado como combinado;
- empates exatos preservam todas as dimensões empatadas, sem escolher uma delas arbitrariamente;
- pontos fortes, pontos de atenção e temas de desenvolvimento são hipóteses para conversa, não conclusões clínicas ou prescrições automáticas.

O resultado conserva `instrumento_versao`, `algoritmo_versao` e `aviso_privacidade_versao`, permitindo saber exatamente qual regra produziu cada registro.

## Segurança e privacidade

- token UUID individual, temporário, revogável e de resposta única;
- consulta e gravação públicas somente pela API de servidor;
- mapeamento de pontuação não é enviado ao navegador;
- respostas e resultados protegidos por RLS;
- administração restrita a `administrador` e `rh`;
- titular autenticado pode consultar o próprio registro;
- nenhuma chave, IP ou dado pessoal é incluído na auditoria técnica;
- resultados não são expostos em dashboards públicos ou links executivos.

O RH deve documentar finalidade, base legal, retenção, perfis autorizados e procedimento para exercício dos direitos do titular. No vínculo de trabalho existe assimetria entre empregador e empregado; por isso, a simples marcação de uma caixa não substitui a definição jurídica da operação de tratamento.

## Ativação

Execute no SQL Editor do Supabase, depois da migração 010:

```text
database/migrations/20260813_011_perfil_comportamental_colaborador.sql
database/migrations/20260813_012_importacao_cadastro_mestre.sql
database/migrations/20260813_013_compatibilidade_importacao_colaboradores.sql
database/migrations/20260813_014_compatibilidade_cargos_importacao.sql
```

Se o cadastro mestre estiver vazio, use **Colaborador 360 > Importar ativos** depois da migração 012. A carga apresenta prévia, rejeita rodapés, não duplica nomes já cadastrados e registra o hash do arquivo. Depois, abra **Gestão de Pessoas > Saúde do Sistema** e confirme as verificações das migrações 011 e 012. A aplicação reutiliza `SUPABASE_SECRET_KEY`; não existe variável de ambiente adicional.
