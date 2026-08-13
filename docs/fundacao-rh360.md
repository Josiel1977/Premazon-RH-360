# Fundação RH 360

A versão 0.6.0 conecta os módulos existentes por meio de três capacidades transversais: **Saúde do Sistema**, **Colaborador 360** e **Central de Pendências e Alertas**. O objetivo é transformar registros dispersos em informação verificável e ação acompanhável, sem criar dados artificiais.

## Ordem de instalação

Execute `database/migrations/20260813_006_fundacao_colaborador_360.sql` depois das migrações 001 a 005. A etapa 006 depende das tabelas, funções e tipos criados anteriormente.

Se a Universidade Corporativa ainda exibir alerta, execute primeiro a migração 004. Depois execute a 005 e, por último, a 006.

## Saúde do Sistema

O painel fica em **Gestão de Pessoas > Saúde do sistema** e é restrito a administrador e RH. Ele verifica:

- presença das migrações 001 a 006;
- buckets privados de currículos, documentos e videoaulas;
- RLS do cadastro mestre e da Central de Pendências;
- presença das variáveis públicas e secreta do Supabase;
- versão do aplicativo e runtime Node.js.

O diagnóstico verifica configuração e presença. Chaves, tokens, senhas e dados pessoais não são retornados ao navegador.

## Colaborador 360

O cadastro mestre passa a reunir:

- identificação profissional, matrícula, contato e status;
- filial, setor, equipe, cargo, gestor e centro de custo;
- contrato, jornada, admissão e término da experiência;
- avaliações, necessidades de treinamento, PDIs e treinamentos;
- cursos online e progresso na Universidade Corporativa;
- resultados históricos do programa Rumo ao Topo.

Registros importados podem chegar sem `colaborador_id`. Quando o nome normalizado é exatamente igual ao cadastro selecionado, a plataforma apresenta uma **sugestão de vínculo**. O RH precisa confirmar cada vínculo. A aplicação não une pessoas automaticamente e não usa correspondência aproximada para decidir identidade.

## Central de Pendências e Alertas

A função `rh360_sincronizar_pendencias()` cria ou atualiza alertas para:

| Origem | Condição | Prioridade |
|---|---|---|
| Recrutamento | vaga aberta além do SLA | alta ou crítica |
| PDI | plano ativo com prazo vencido | alta ou crítica |
| LNT | necessidade alta/crítica ainda não planejada | igual à prioridade da LNT |
| Treinamento | ação concluída sem avaliação de eficácia | média ou alta |
| Certificado | validade vencida ou nos próximos 30 dias | alta ou crítica |

Quando a condição de origem deixa de existir, a pendência automática aberta é concluída pelo sistema com registro da resolução. Uma condição que reapareça reabre a pendência correspondente. A chave de origem única evita duplicidade.

Administrador e RH podem sincronizar, criar tarefas e alterar status. Diretoria e gestor têm leitura conforme RLS. As alterações relevantes são auditadas sem copiar conteúdos pessoais para o log.

## Dashboard executivo

O dashboard usa consultas reais ao Supabase. Na ausência de registros, apresenta zero ou estado vazio. Ele não inclui nomes, percentuais, custos ou rankings de demonstração.

Os indicadores atuais abrangem colaboradores ativos, vagas e candidaturas, carga horária de treinamentos, PDIs, qualidade cadastral e prioridades da Central de Pendências.
