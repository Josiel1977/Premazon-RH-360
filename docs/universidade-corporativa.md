# Universidade Corporativa e cursos em vídeo

O módulo transforma o catálogo de Treinamento e Desenvolvimento em uma experiência de aprendizagem online, preservando LNT, plano anual, participações, certificados e avaliação de eficácia.

## Fluxo funcional

1. RH ou administrador cria um curso como rascunho.
2. O curso recebe módulos ordenados e videoaulas.
3. Cada vídeo é enviado ao bucket privado `td-videos` pelo protocolo TUS, com progresso, retomada automática e partes de 6 MB.
4. O RH revisa a trilha e publica o curso.
5. O usuário autenticado realiza a matrícula.
6. A plataforma cria um link temporário para reprodução e registra o avanço da aula.
7. Ao concluir todas as aulas publicadas, a matrícula é concluída automaticamente e fica preparada para emissão de certificado.

## Segurança

- O bucket de vídeos é privado.
- Somente administrador e RH podem enviar, alterar ou excluir vídeos.
- O usuário só recebe um link temporário quando possui matrícula ativa ou concluída no curso.
- O caminho do objeto começa com o UUID do curso; a política de armazenamento cruza esse UUID com a matrícula do usuário.
- Rascunhos podem ser gerenciados pelo RH, mas aulas só entram no catálogo quando o curso é publicado.
- Módulos, aulas, matrículas e certificados geram eventos de auditoria. O progresso é mantido fora da auditoria detalhada para evitar volume excessivo de eventos.

## Vídeos de aproximadamente 20 minutos

O tamanho depende da resolução e da taxa de bits. Como padrão operacional, recomenda-se MP4 com codec H.264, resolução de 720p ou 1080p e áudio AAC. O bucket aceita MP4, WebM e MOV, com limite de 500 MB por arquivo.

O Supabase limita projetos gratuitos a 50 MB por arquivo. Para videoaulas com duração próxima de 20 minutos, normalmente será necessário um plano que permita aumentar o limite global de arquivos. No painel do Supabase, ajuste **Storage > Settings > Global file size limit** para um valor compatível, sem ultrapassar 500 MB configurados no bucket.

## Banco de dados

A migração `database/migrations/20260813_004_universidade_corporativa.sql` adiciona:

- metadados de publicação ao catálogo `td_cursos`;
- `td_curso_modulos` e `td_curso_aulas`;
- `td_matriculas_cursos`;
- `td_progresso_aulas`;
- `td_certificados_cursos`;
- cálculo automático de conclusão;
- RLS, auditoria e bucket privado `td-videos`.

Execute essa migração somente depois de `20260813_003_treinamento_desenvolvimento.sql`.
