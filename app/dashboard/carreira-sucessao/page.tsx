"use client";

import {
  BarChart3, BookOpenCheck, BriefcaseBusiness, Crown, History, Map, RefreshCw,
  Sparkles, Target, UserCheck, Users,
} from "lucide-react";
import { StrategicAreaPage, type StrategicAreaItem } from "@/app/dashboard/_components/strategic-area-page";

const items: StrategicAreaItem[] = [
  { key: "dashboard", label: "01. Dashboard de Carreira", icon: BarChart3, description: "Visão de trilhas, movimentações, talentos, sucessores e ações de desenvolvimento.", governance: "Indicadores devem ser calculados somente sobre registros oficiais e permissões compatíveis." },
  { key: "plano", label: "02. Plano de Carreira", icon: BriefcaseBusiness, description: "Estruturas de evolução por famílias de cargos, requisitos, níveis e possibilidades de movimentação.", governance: "Critérios de progressão precisam ser transparentes, objetivos e aprovados pela organização." },
  { key: "trilhas", label: "03. Trilhas de Carreira", icon: Map, description: "Caminhos de desenvolvimento conectando cargo atual, competências, experiências e posições possíveis.", governance: "Trilhas orientam o desenvolvimento, mas não representam promessa automática de promoção." },
  { key: "talentos", label: "04. Mapa de Talentos", icon: Users, description: "Leitura integrada de desempenho, potencial, mobilidade e prontidão para necessidades futuras.", governance: "Acesso restrito e revisão humana são obrigatórios para evitar rótulos permanentes e vieses." },
  { key: "potenciais", label: "05. Identificação de Potenciais", icon: Sparkles, description: "Registro de evidências e avaliações estruturadas sobre capacidade e interesse de evolução.", governance: "Potencial não deve ser inferido apenas por IA, nome, idade, gênero ou característica protegida." },
  { key: "movimentacao", label: "06. Movimentação Interna", icon: RefreshCw, description: "Oportunidades internas, candidaturas, avaliações, aprovações e histórico de movimentações.", governance: "Critérios, conflitos de interesse e aprovações devem permanecer rastreáveis." },
  { key: "desenvolvimento", label: "07. Plano de Desenvolvimento de Carreira", icon: Target, description: "Ações individuais conectadas a lacunas, aspirações, trilhas, PDI e treinamentos.", governance: "O colaborador deve conhecer suas ações e participar da construção do próprio plano." },
  { key: "sucessao", label: "08. Sucessão", icon: Crown, description: "Posições críticas, candidatos a sucessão, prontidão, riscos e planos de preparação.", governance: "Planos de sucessão são confidenciais e não constituem garantia de nomeação ou promoção." },
  { key: "banco", label: "09. Banco de Talentos", icon: UserCheck, description: "Pessoas interessadas e elegíveis para oportunidades futuras, com competências e disponibilidade atualizadas.", governance: "Inclusão, permanência e uso das informações exigem finalidade definida e revisão periódica." },
  { key: "historico", label: "10. Histórico de Evolução", icon: History, description: "Linha do tempo de cargos, trilhas, PDIs, treinamentos, avaliações e movimentações confirmadas.", governance: "O histórico deve diferenciar fatos registrados de avaliações ou hipóteses de desenvolvimento." },
  { key: "indicadores", label: "11. Indicadores de Carreira", icon: BookOpenCheck, description: "Mobilidade, prontidão, cobertura sucessória e execução dos planos com metodologia auditável.", governance: "Indicadores não substituem a análise do contexto nem autorizam decisões automáticas sobre pessoas." },
];

export default function CarreiraSucessaoPage() {
  return <StrategicAreaPage eyebrow="Talentos · mobilidade · futuro" title="Carreira e Sucessão" description="Desenvolvimento e continuidade organizacional conectados a cargos, desempenho, PDI, capacitação e oportunidades reais." icon={Crown} accent="from-yellow-500 via-amber-600 to-orange-800" items={items} />;
}
