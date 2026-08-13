import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  CloudSun,
  Crown,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

type ModuleDefinition = {
  title: string;
  eyebrow: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  capabilities: string[];
  connection: string;
  connectionHref: string;
};

const modules: Record<string, ModuleDefinition> = {
  "admissao-onboarding": {
    title: "Admissão e Onboarding",
    eyebrow: "Jornada de entrada",
    description: "Uma experiência coordenada desde a aprovação do candidato até sua integração completa à cultura e à rotina da empresa.",
    icon: ClipboardCheck,
    accent: "from-cyan-500 to-blue-700",
    capabilities: ["Checklist admissional por responsável", "Integrações com RH, DP, Qualidade e SESMT", "Documentos e prazos centralizados", "Acompanhamento dos primeiros 90 dias"],
    connection: "Conectar candidatos aprovados",
    connectionHref: "/dashboard/recrutamento",
  },
  "cargos-beneficios": {
    title: "Cargos e Benefícios",
    eyebrow: "Arquitetura organizacional",
    description: "Estrutura de cargos, faixas, responsabilidades e benefícios conectada às decisões de atração, desempenho e carreira.",
    icon: BriefcaseBusiness,
    accent: "from-indigo-500 to-violet-700",
    capabilities: ["Descrição e requisitos dos cargos", "Faixas e estrutura salarial", "Políticas e elegibilidade de benefícios", "Análises de equidade interna"],
    connection: "Abrir cadastro de cargos",
    connectionHref: "/dashboard/cargos",
  },
  "clima-engajamento": {
    title: "Clima e Engajamento",
    eyebrow: "Escuta contínua",
    description: "Pesquisas, eNPS e planos de ação para transformar a percepção das pessoas em melhoria concreta do ambiente de trabalho.",
    icon: CloudSun,
    accent: "from-amber-400 to-orange-600",
    capabilities: ["Pesquisas de clima e pulsos", "eNPS e comentários protegidos", "Cultura, valores e reconhecimento", "Planos de ação por setor"],
    connection: "Ver gestão de pessoas",
    connectionHref: "/dashboard",
  },
  "carreira-sucessao": {
    title: "Carreira e Sucessão",
    eyebrow: "Talentos e futuro",
    description: "Trilhas de carreira, talentos críticos e sucessores preparados com base em evidências de desempenho e desenvolvimento.",
    icon: Crown,
    accent: "from-yellow-400 to-amber-700",
    capabilities: ["Trilhas de carreira por família de cargos", "Mapeamento de talentos e potencial", "Plano de sucessão por posição crítica", "Conexão com PDI e capacitação"],
    connection: "Abrir Rumo ao Topo",
    connectionHref: "/dashboard/rumo-ao-topo",
  },
  "relacoes-trabalhistas": {
    title: "Relações Trabalhistas",
    eyebrow: "Governança e conformidade",
    description: "Políticas, ocorrências e obrigações geridas com rastreabilidade, acesso controlado e visão preventiva de riscos.",
    icon: ShieldCheck,
    accent: "from-emerald-500 to-teal-700",
    capabilities: ["Políticas e regulamentos internos", "Acordos e convenções coletivas", "Medidas disciplinares com histórico", "Conformidade, privacidade e LGPD"],
    connection: "Abrir acessos e permissões",
    connectionHref: "/dashboard/acessos",
  },
};

export function generateStaticParams() {
  return Object.keys(modules).map((slug) => ({ slug }));
}

export default async function ModuleHubPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug === "admissao-onboarding") redirect("/dashboard/admissao");
  if (slug === "clima-engajamento") redirect("/dashboard/clima-engajamento#dashboard");
  if (slug === "carreira-sucessao") redirect("/dashboard/carreira-sucessao#dashboard");
  const definition = modules[slug];
  if (!definition) notFound();

  const Icon = definition.icon;
  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${definition.accent} p-7 text-white shadow-xl sm:p-10`}>
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-slate-950/15 blur-3xl" />
        <div className="relative max-w-3xl">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm"><Icon className="h-6 w-6" /></span>
            <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ring-1 ring-white/20">{definition.eyebrow}</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{definition.title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/80 sm:text-base">{definition.description}</p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_0.8fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Estrutura premium</p>
              <h2 className="mt-2 text-xl font-black text-slate-900">Capacidades previstas para o módulo</h2>
            </div>
            <Sparkles className="h-6 w-6 shrink-0 text-amber-500" />
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {definition.capabilities.map((capability) => (
              <div key={capability} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                <span className="text-sm font-semibold leading-5 text-slate-700">{capability}</span>
              </div>
            ))}
          </div>
        </section>

        <aside className="rounded-3xl border border-blue-100 bg-gradient-to-b from-blue-50 to-white p-6 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white"><HeartHandshake className="h-5 w-5" /></div>
          <h2 className="mt-5 text-lg font-black text-slate-900">Pronto para evoluir</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">A área já ocupa seu lugar na nova Central de RH. As próximas funções serão adicionadas sem interromper os módulos ativos.</p>
          <Link href={definition.connectionHref} className="mt-6 flex items-center justify-between rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-800">
            {definition.connection}<ArrowRight className="h-4 w-4" />
          </Link>
        </aside>
      </div>
    </div>
  );
}
