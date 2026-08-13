"use client";

import {
  BarChart3, Building2, ClipboardCheck, CloudSun, FileBarChart, HeartHandshake,
  Lightbulb, Megaphone, MessageCircle, RefreshCw, Search, Settings, Sparkles,
  Target, UserCheck, Users, Zap,
} from "lucide-react";
import { StrategicAreaPage, type StrategicAreaItem } from "@/app/dashboard/_components/strategic-area-page";

const items: StrategicAreaItem[] = [
  { key: "dashboard", label: "01. Dashboard Geral", icon: BarChart3, description: "Visão consolidada das pesquisas, participação, engajamento e andamento dos planos de ação.", governance: "Resultados consolidados devem respeitar filtros de acesso e quantidade mínima de respostas." },
  { key: "pesquisas", label: "02. Pesquisas de Clima", icon: ClipboardCheck, description: "Ciclos completos de pesquisa, questionários, públicos, prazos, respostas e devolutivas.", governance: "Anonimato, finalidade, retenção e público da pesquisa precisam ser definidos antes da publicação." },
  { key: "pulso", label: "03. Pesquisa Pulso", icon: Zap, description: "Escutas curtas e recorrentes para acompanhar mudanças de percepção entre pesquisas completas.", governance: "A frequência não deve gerar fadiga nem permitir identificação indireta das respostas." },
  { key: "humor", label: "04. Termômetro do Humor", icon: CloudSun, description: "Registro simples e voluntário da percepção cotidiana, com leitura agregada de tendências.", governance: "Não utilizar a resposta individual para punição, diagnóstico médico ou decisão automática." },
  { key: "voz", label: "05. Voz do Colaborador", icon: MessageCircle, description: "Canal estruturado de escuta para manifestações relacionadas ao ambiente e à experiência de trabalho.", governance: "Relatos sensíveis e denúncias devem seguir canal próprio, com acesso e tratamento especializados." },
  { key: "ideias", label: "06. Ideias e Sugestões", icon: Lightbulb, description: "Captação, triagem, avaliação e retorno sobre propostas de melhoria apresentadas pelas equipes.", governance: "Cada ideia precisa de responsável, status e retorno transparente ao autor quando identificado." },
  { key: "reconhecimento", label: "07. Reconhecimento", icon: HeartHandshake, description: "Programas e registros de reconhecimento alinhados aos valores e comportamentos esperados.", governance: "Critérios devem ser claros e monitorados para reduzir favoritismo e desigualdade de oportunidades." },
  { key: "campanhas", label: "08. Campanhas de Engajamento", icon: Megaphone, description: "Planejamento, público, comunicação, adesão e resultados das campanhas internas.", governance: "Campanhas devem ter objetivo, responsável, prazo e critério de avaliação previamente definidos." },
  { key: "lideranca", label: "09. Avaliação da Liderança", icon: UserCheck, description: "Percepções estruturadas sobre comunicação, confiança, direcionamento e desenvolvimento das equipes.", governance: "Apresentar resultados de modo agregado e oferecer devolutiva acompanhada de plano de desenvolvimento." },
  { key: "setor", label: "10. Clima por Setor", icon: Building2, description: "Comparação responsável dos resultados entre áreas, respeitando o mínimo de respondentes.", governance: "Setores pequenos devem ser agrupados ou ocultados para impedir reidentificação." },
  { key: "indicadores", label: "11. Indicadores de Engajamento", icon: BarChart3, description: "Indicadores de participação, favorabilidade, eNPS e evolução calculados a partir das bases oficiais.", governance: "Metodologia e período de cada indicador precisam permanecer visíveis e auditáveis." },
  { key: "atencao", label: "12. Pontos de Atenção", icon: Search, description: "Priorização de temas críticos por recorrência, impacto, tendência e abrangência.", governance: "A plataforma apoia a análise, mas não substitui avaliação humana do contexto." },
  { key: "plano", label: "13. Plano de Ação", icon: Target, description: "Conversão de achados em ações com responsável, prazo, público, evidência e resultado esperado.", governance: "Nenhuma ação deve expor respostas individuais ou atribuir culpa sem apuração apropriada." },
  { key: "acompanhamento", label: "14. Acompanhamento das Ações", icon: RefreshCw, description: "Monitoramento de prazos, entregas, bloqueios, evidências e impacto das ações aprovadas.", governance: "Alterações de prazo, escopo e responsável devem manter histórico auditável." },
  { key: "comparativos", label: "15. Comparativos", icon: Users, description: "Comparação entre ciclos, setores e públicos dentro dos limites de privacidade e qualidade da amostra.", governance: "Comparações só devem ser exibidas quando período, escala e público forem compatíveis." },
  { key: "analise", label: "16. Análise Inteligente", icon: Sparkles, description: "Apoio à síntese de temas, tendências e hipóteses para avaliação do RH.", governance: "IA não deve identificar autores, inferir saúde ou decidir promoções, punições ou desligamentos." },
  { key: "relatorios", label: "17. Relatórios", icon: FileBarChart, description: "Relatórios executivos e operacionais com filtros, metodologia e níveis apropriados de detalhamento.", governance: "Compartilhamentos devem priorizar dados agregados, prazo de validade e possibilidade de revogação." },
  { key: "configuracoes", label: "18. Configurações", icon: Settings, description: "Parâmetros de escalas, anonimato, públicos, prazos, notificações e permissões do módulo.", governance: "Mudanças de configuração relevantes devem ficar registradas e vinculadas ao ciclo correspondente." },
];

export default function ClimaEngajamentoPage() {
  return <StrategicAreaPage eyebrow="Ouvir · medir · analisar · agir · acompanhar" title="Clima e Engajamento" description="Escuta contínua e ação responsável para transformar a experiência das pessoas em melhoria verificável do ambiente de trabalho." icon={CloudSun} accent="from-amber-500 via-orange-600 to-rose-700" items={items} />;
}
