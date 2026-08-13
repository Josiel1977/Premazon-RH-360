# Premazon RH 360

Plataforma de gestão de pessoas construída com Next.js, Supabase e TypeScript. Esta versão transforma o protótipo inicial em uma base autenticada e auditável e entrega o primeiro módulo operacional: **Rumo ao Topo**.

Versão atual: **0.1.0**.

## O que já está disponível

- autenticação real por e-mail e senha com Supabase Auth;
- rotas internas protegidas no servidor;
- perfis de acesso: administrador, diretoria, RH, gestor, instrutor e colaborador;
- banco relacional com segurança por linha (RLS) e auditoria;
- importação segura de planilhas XLSX e arquivos CSV;
- validação e prévia antes da gravação;
- histórico mensal de ciclos e importações;
- indicadores, filtros, gráficos e relatório detalhado do Rumo ao Topo;
- planilha-modelo para download dentro da própria plataforma.

## Executar localmente

Pré-requisito: Node.js 22 ou superior.

```bash
npm install
cp .env.example .env.local
npm run dev
```

No Windows PowerShell, use `Copy-Item .env.example .env.local` no lugar de `cp`.

Preencha em `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=SUA-CHAVE-PUBLICAVEL
```

Não publique `.env.local`, a chave `service_role` ou qualquer senha no GitHub.

## Preparar o Supabase

No SQL Editor do Supabase, execute nesta ordem:

1. `database/schema.sql` — estrutura inicial do sistema;
2. `database/migrations/20260812_001_rumo_ao_topo.sql` — identidade, permissões, auditoria e módulo Rumo ao Topo.

Depois, em **Authentication > Users**, crie o primeiro usuário. Copie o UUID dele e execute no SQL Editor:

```sql
insert into public.perfis_usuario (auth_user_id, perfil)
values ('UUID-DO-USUARIO', 'administrador');
```

Esse passo concede acesso administrativo ao primeiro usuário. Os próximos perfis poderão ser administrados pela plataforma quando o módulo de usuários estiver concluído.

## Importar o Rumo ao Topo

1. Entre no sistema e abra **Rumo ao Topo** no menu lateral.
2. Baixe a planilha-modelo.
3. Preencha uma linha por colaborador, sem alterar os títulos das colunas.
4. Selecione o mês de referência e o valor da premiação.
5. Importe o arquivo XLSX ou CSV e confira a prévia.
6. Grave o ciclo no banco.

A planilha é apenas a entrada. Cada processamento registra ciclo, arquivo, resumo, avisos, resultados e usuário responsável. Arquivos XLS antigos e arquivos com macros não são aceitos.

As regras e o desenho técnico do módulo estão em [docs/rumo-ao-topo.md](docs/rumo-ao-topo.md).

## Qualidade

```bash
npm run lint
npm test
npx tsc --noEmit
npm run build
npm audit --omit=dev
```

## Estrutura principal

```text
app/                         páginas e componentes
database/                    schema e migrações SQL
docs/                        regras funcionais e arquitetura
lib/                         Supabase, importadores e regras de negócio
public/modelos/              planilhas-modelo
```
