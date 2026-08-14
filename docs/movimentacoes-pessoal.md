# Movimentações de Pessoal e documentos controlados

## Finalidade

O módulo transforma solicitações de pessoal em um fluxo digital rastreável, sem substituir os Registros da Qualidade mantidos pela PREMAZON. O sistema conserva o código e a revisão vigentes do RQ em cada protocolo, mesmo que uma revisão futura substitua o documento no catálogo.

Solicitações disponíveis:

- desligamento;
- aumento de quadro;
- substituição.

O fluxo aprovado é **Gestor → RH → Departamento Pessoal → Diretoria → Conclusão**. A abertura registra a atuação do gestor e encaminha a solicitação ao RH. Cada decisão posterior é atômica, vinculada ao usuário autenticado e protegida por perfil no banco.

## Documentos conferidos

| Processo | Documento | Revisão | Situação da conferência |
|---|---|---:|---|
| Solicitação de desligamento | RQ.04.09 | 03 | Código e revisão informados pelo RH; arquivo oficial não encaminhado |
| Recrutamento para funções | RQ.04.10 | 00 | Documento de duas páginas conferido; aprovação em 05/05/2021 |

Os dois arquivos `.doc` recebidos na análise eram cópias byte a byte do mesmo RQ.04.10. Nenhum campo do RQ.04.09 foi inventado. Quando a Qualidade disponibilizar o documento oficial, o arquivo deverá ser colocado no bucket privado `qualidade-rqs` e o respectivo `arquivo_path` deverá ser vinculado ao cadastro controlado.

## Modelo de dados

- `rh_documentos_controlados`: código, título, revisão, aprovação, situação e caminho privado do arquivo;
- `rh_movimentacoes_pessoal`: protocolo, tipo, envolvidos, contexto organizacional, justificativa, RQ congelado, estágio e situação;
- `rh_movimentacoes_historico`: eventos imutáveis de solicitação, aprovação, rejeição e conclusão;
- `rh360_pendencias`: recebe ou encerra automaticamente a pendência da etapa atual.

O protocolo usa o padrão `MOV-AAAA-000000`. O código e a revisão do RQ são copiados para a solicitação; por isso, o histórico não muda quando um novo documento entra em vigor.

## Perfis e segregação

| Ação | Perfis autorizados |
|---|---|
| Abrir solicitação | Gestor, RH e administrador |
| Aprovar etapa RH | RH e administrador |
| Aprovar etapa DP | DP e administrador |
| Aprovar etapa Diretoria | Diretoria e administrador |
| Ver solicitação | Solicitante e perfis aprovadores |
| Manter catálogo de RQs | RH e administrador |

A autorização é executada novamente nas funções SQL. Ocultar ou exibir um botão no navegador não concede acesso. As tabelas operacionais não aceitam gravação direta pelo papel `authenticated`; criação e decisões ocorrem pelas funções controladas.

## Instalação

Execute separadamente e nesta ordem:

```text
database/migrations/20260814_015_perfil_departamento_pessoal.sql
database/migrations/20260814_016_movimentacoes_pessoal_rqs.sql
```

A separação é obrigatória porque o PostgreSQL precisa confirmar o novo valor `dp` do enum antes que outra transação o use em tabelas, funções ou políticas.

Depois, vincule a conta do responsável pelo Departamento Pessoal:

```sql
update public.perfis_usuario
set perfil = 'dp', ativo = true
where auth_user_id = 'UUID-DO-USUARIO';
```

Não altere um perfil existente sem validar se a pessoa deve perder as permissões anteriores. O modelo atual mantém um perfil por usuário; múltiplos papéis simultâneos serão tratados na futura fundação multiempresa.

## Operação segura

1. O gestor abre a solicitação e informa somente dados confirmados.
2. O sistema cria o protocolo e preserva código e revisão do RQ.
3. RH, DP e Diretoria aprovam exclusivamente sua etapa.
4. Uma rejeição exige motivo e encerra o fluxo.
5. A conclusão fecha a pendência e mantém o histórico.
6. O painel Saúde do Sistema verifica as migrações, o bucket privado e o RLS.

O módulo não executa desligamento, contratação, alteração de salário ou qualquer decisão trabalhista automaticamente. A conclusão representa a aprovação do fluxo na plataforma; a execução administrativa continua dependente das áreas responsáveis e dos documentos oficiais.
