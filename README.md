# Premazon RH 360

Plataforma de gestão de pessoas construída com Next.js, Supabase e TypeScript. A base é autenticada e auditável e já possui os módulos operacionais **Rumo ao Topo** e **Recrutamento & Seleção**.

Versão atual: **0.2.0**.

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
- criação e gestão de vagas de Recrutamento & Seleção;
- link público exclusivo para candidatura sem login;
- compartilhamento direto por WhatsApp, e-mail ou cópia do link;
- currículo em bucket privado e acesso interno por URL temporária;
- pipeline de candidatos com histórico de mudança de etapa.

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
SUPABASE_SECRET_KEY=SUA-CHAVE-SECRETA
```

`SUPABASE_SECRET_KEY` é usada somente no servidor para receber candidaturas e guardar currículos. Não use o prefixo `NEXT_PUBLIC_` nela. Não publique `.env.local`, chaves secretas ou senhas no GitHub.

## Preparar o Supabase

No SQL Editor do Supabase, execute nesta ordem:

1. `database/schema.sql` — estrutura inicial do sistema;
2. `database/migrations/20260812_001_rumo_ao_topo.sql` — identidade, permissões, auditoria e módulo Rumo ao Topo.
3. `database/migrations/20260812_002_recrutamento_selecao.sql` — vagas, candidaturas, RLS e bucket privado de currículos.

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

## Recrutamento & Seleção

1. Entre no painel e abra **Recrutamento & Seleção**.
2. Crie uma vaga; o sistema gera um token e um link exclusivo.
3. Envie o link pelo WhatsApp, e-mail ou copie para outro canal.
4. O candidato abre o formulário sem login, aceita o aviso de privacidade e anexa um currículo de até 5 MB.
5. O RH acompanha a candidatura, altera a etapa e abre o currículo por um link temporário.
6. Fechar a vaga desativa o formulário público imediatamente.

Na Vercel, cadastre as três variáveis acima em **Project Settings > Environment Variables** e faça um novo deploy. A planilha histórica de vagas enviada como referência contém nomes reais; por isso, seus registros não fazem parte do repositório. A arquitetura do módulo está em [docs/recrutamento-selecao.md](docs/recrutamento-selecao.md).

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
