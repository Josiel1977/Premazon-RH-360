# Movimentações de Pessoal e documentos controlados

## Finalidade

O módulo transforma solicitações dos gestores em fluxos digitais rastreáveis, sem substituir os Registros da Qualidade mantidos pela PREMAZON. O documento oficial é vinculado somente quando sua finalidade corresponde à etapa executada na plataforma.

Solicitações disponíveis:

- desligamento;
- aumento de quadro;
- substituição.

Existem dois fluxos:

- desligamento: **Gestor → RH → Departamento Pessoal → Diretoria (somente aviso indenizado) → Conclusão**;
- contratação: **Gestor → RH → Recrutamento e Seleção → Admissão e Onboarding 360° → Conclusão**.

A abertura registra a atuação do gestor e encaminha a solicitação ao RH. Cada decisão é atômica, vinculada ao usuário autenticado e protegida por perfil no banco.

## Documentos conferidos

| Processo | Documento | Revisão | Situação da conferência |
|---|---|---:|---|
| Solicitação de desligamento | RQ.04.09 | 03 | Documento de uma página conferido; aprovação em 08/05/2023 |
| Ficha do candidato no recrutamento | RQ.04.10 | 00 | Documento de duas páginas conferido; aprovação em 05/05/2021 |

O RQ.04.09 registra colaborador, tipo de aviso, motivo, necessidade de substituição e assinaturas do setor, DP e Diretoria. A própria observação do documento limita a autorização da Diretoria aos avisos indenizados. O RQ.04.10 contém dados pessoais, documentos, escolaridade, experiências e pareceres do processo seletivo; portanto, ele permanece como ficha do candidato e não é usado como solicitação de vaga do gestor. Os arquivos oficiais devem ficar no bucket privado `qualidade-rqs`, após validação da Qualidade.

## Modelo de dados

- `rh_documentos_controlados`: código, título, revisão, aprovação, situação e caminho privado do arquivo;
- `rh_movimentacoes_pessoal`: protocolo, tipo, envolvidos, contexto organizacional, motivo, aviso, vaga vinculada, estágio e situação;
- `rh_movimentacoes_historico`: eventos imutáveis de solicitação, aprovação, rejeição e conclusão;
- `rh_movimentacoes_admissoes`: vínculos sem dados pessoais entre a solicitação e um ou mais processos admissionais;
- `rh360_pendencias`: recebe ou encerra automaticamente a pendência da etapa atual.

O protocolo usa o padrão `MOV-AAAA-000000`. No desligamento, o código e a revisão do RQ.04.09 são copiados para a solicitação; por isso, o histórico não muda quando um novo documento entra em vigor. Na contratação, o pedido do gestor é digital e o RQ.04.10 é aplicado somente ao candidato no recrutamento.

## Perfis e segregação

| Ação | Perfis autorizados |
|---|---|
| Abrir solicitação | Gestor, RH e administrador |
| Aprovar etapa RH | RH e administrador |
| Aprovar desligamento na etapa DP | DP e administrador |
| Aprovar aviso indenizado na Diretoria | Diretoria e administrador |
| Vincular solicitação a uma vaga | RH e administrador |
| Ver solicitação | Solicitante e perfis aprovadores |
| Manter catálogo de RQs | RH e administrador |

A autorização é executada novamente nas funções SQL. Ocultar ou exibir um botão no navegador não concede acesso. As tabelas operacionais não aceitam gravação direta pelo papel `authenticated`; criação e decisões ocorrem pelas funções controladas.

## Instalação

Execute separadamente e nesta ordem:

```text
database/migrations/20260814_015_perfil_departamento_pessoal.sql
database/migrations/20260814_016_movimentacoes_pessoal_rqs.sql
database/migrations/20260820_017_integracao_movimentacoes_recrutamento_admissao.sql
```

A separação é obrigatória porque o PostgreSQL precisa confirmar o novo valor `dp` do enum antes que outra transação o use em tabelas, funções ou políticas. A migração 017 é incremental e deve ser executada sozinha; se 015 e 016 já estiverem aplicadas, não as repita.

Depois, vincule a conta do responsável pelo Departamento Pessoal:

```sql
update public.perfis_usuario
set perfil = 'dp', ativo = true
where auth_user_id = 'UUID-DO-USUARIO';
```

Não altere um perfil existente sem validar se a pessoa deve perder as permissões anteriores. O modelo atual mantém um perfil por usuário; múltiplos papéis simultâneos serão tratados na futura fundação multiempresa.

## Operação segura

1. O gestor abre a solicitação e informa somente dados confirmados.
2. O sistema cria o protocolo e preserva código e revisão do RQ quando o documento se aplica ao processo.
3. O RH visualiza o motivo e decide se o desligamento segue ao DP ou se a contratação segue ao recrutamento.
4. No desligamento, o DP encaminha à Diretoria somente quando o aviso é indenizado.
5. Na contratação, o RH vincula uma vaga existente e conduz o candidato no módulo de Recrutamento e Seleção.
6. Ao abrir a admissão de um candidato dessa vaga, o protocolo avança automaticamente para Admissão e Onboarding 360°.
7. Pedidos com mais de uma vaga só são concluídos quando a quantidade correspondente de admissões estiver concluída.
8. Uma rejeição exige motivo e encerra o fluxo.
9. A conclusão fecha a pendência e mantém o histórico.
10. O painel Saúde do Sistema verifica as migrações, o bucket privado e o RLS.

O gestor vê o protocolo, a vaga e o avanço do processo, mas a integração não expõe dados pessoais do candidato. O módulo não executa desligamento, contratação, alteração de salário ou qualquer decisão trabalhista automaticamente. A execução administrativa continua dependente das áreas responsáveis e dos documentos oficiais.
