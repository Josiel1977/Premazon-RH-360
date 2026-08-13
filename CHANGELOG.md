# Histórico de versões

## 0.5.0 — 2026-08-13

- navegação interna própria e responsiva para Rumo ao Topo, T&D e Recrutamento & Seleção;
- oito áreas restauradas no Rumo ao Topo, incluindo bases temáticas, visão por setor e relatório executivo;
- dez áreas de T&D: ficha com radar, PDI, catálogo, matriz por setor, LNT, gestão, custos/ROI, cronograma e 9-Box;
- treze áreas de R&S, unindo vagas e candidaturas atuais ao histórico analítico da planilha;
- importação CSV de R&S com prévia, hash contra duplicidade, lotes, avisos e auditoria;
- PDI e ações persistentes no Supabase, com permissões por perfil;
- custos de EPI/uniforme e ROI deixam de usar números simulados: ausências aparecem como pendência;
- testes para agregações de R&S, SLA inválido, 9-Box e potencial com dados parciais.

## 0.4.0 — 2026-08-13

- menu lateral premium, responsivo e agrupado nas nove áreas estratégicas de RH;
- hubs preparados para Admissão, Benefícios, Clima, Carreira e Relações Trabalhistas;
- Universidade Corporativa com catálogo, construtor de cursos, módulos e videoaulas;
- upload privado e retomável por TUS, com progresso, cancelamento e validação de arquivo;
- publicação de cursos, autoinscrição, reprodução protegida e acompanhamento de conclusão;
- banco relacional, RLS por matrícula, auditoria e bucket privado para vídeos;
- documentação operacional e testes das regras de URL, nome de arquivo e duração.

## 0.3.0 — 2026-08-13

- módulo operacional de Treinamento & Desenvolvimento;
- importação segura de LNT e avaliação de desempenho com prévia e hash de duplicidade;
- 15 competências reais e escala auditável de 2 a 10;
- rejeição de respostas vazias sem atribuição de nota padrão;
- LNT consolidada, priorização, catálogo e plano anual com custos;
- estrutura para participantes, frequência, certificados privados e avaliação de eficácia;
- políticas RLS, auditoria sem dados pessoais e documentação operacional.

## 0.2.0 — 2026-08-12

- módulo de Recrutamento & Seleção com vagas e pipeline;
- link público exclusivo compartilhável por WhatsApp e e-mail;
- formulário de candidatura sem login e com consentimento LGPD;
- currículos em armazenamento privado com links temporários;
- migração idempotente, RLS, auditoria sem dados pessoais e documentação operacional.

## 0.1.0 — 2026-08-12

- autenticação real com Supabase Auth;
- proteção das rotas internas;
- perfis de acesso e segurança por linha no banco;
- primeiro módulo operacional: Rumo ao Topo;
- importação validada de XLSX e CSV;
- ciclos mensais, histórico, auditoria e detecção de duplicidade;
- indicadores, gráficos, filtros e resultados individuais;
- planilha-modelo para download;
- atualização para Next.js 16.3.0, sem vulnerabilidades conhecidas na auditoria;
- ambiente de produção fixado em Node.js 22.
