import Link from "next/link";
import {
  ArrowRight, Crown, FolderKanban, HardHat, HeartHandshake, HeartPulse,
  Megaphone, ShieldCheck, Sparkles,
} from "lucide-react";

const projects = [
  {
    key: "rumo-ao-topo",
    title: "Rumo ao Topo",
    description: "Programa ativo de reconhecimento por desempenho, assiduidade e critérios aprovados.",
    href: "/dashboard/rumo-ao-topo",
    icon: Crown,
    status: "Programa ativo",
    tone: "from-yellow-400 to-amber-600",
  },
  {
    key: "campanhas",
    title: "Campanhas de Engajamento",
    description: "Portfólio de campanhas internas conectado à área operacional de Clima e Engajamento.",
    href: "/dashboard/clima-engajamento#campanhas",
    icon: Megaphone,
    status: "Estrutura preparada",
    tone: "from-orange-400 to-rose-600",
  },
  {
    key: "reconhecimento",
    title: "Reconhecimento",
    description: "Iniciativas baseadas em critérios claros, valores organizacionais e acompanhamento de alcance.",
    href: "/dashboard/clima-engajamento#reconhecimento",
    icon: HeartHandshake,
    status: "Estrutura preparada",
    tone: "from-pink-500 to-violet-700",
  },
  {
    key: "qualidade-vida",
    title: "Qualidade de Vida",
    description: "Ações de bem-estar e qualidade de vida com objetivo, público, responsável e avaliação de resultado.",
    href: "/dashboard/projetos-rh#qualidade-vida",
    icon: HeartPulse,
    status: "Projeto futuro",
    tone: "from-emerald-400 to-teal-700",
  },
  {
    key: "seguranca",
    title: "Segurança",
    description: "Projetos educativos e preventivos de RH em governança conjunta com o SESMT.",
    href: "/dashboard/projetos-rh#seguranca",
    icon: HardHat,
    status: "Projeto futuro",
    tone: "from-sky-500 to-blue-800",
  },
];

export default function ProjetosRhPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-950 via-indigo-900 to-blue-800 p-8 text-white shadow-xl sm:p-10">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-300 text-indigo-950"><FolderKanban className="h-6 w-6" /></span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200">Portfólio estratégico</p>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">Projetos de RH</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100/80">Programas temporários ou estratégicos organizados sem duplicar os módulos permanentes e suas bases de dados.</p>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">Rumo ao Topo e futuros projetos estratégicos</p>
            <h2 className="mt-1 text-xl font-black text-slate-900">Portfólio da área</h2>
          </div>
          <Sparkles className="h-5 w-5 text-amber-500" />
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const Icon = project.icon;
            return (
              <article id={project.key} key={project.key} className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className={`h-2 bg-gradient-to-r ${project.tone}`} />
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-primary"><Icon className="h-5 w-5" /></span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-slate-600">{project.status}</span>
                  </div>
                  <h3 className="mt-5 text-base font-black text-slate-900">{project.title}</h3>
                  <p className="mt-2 min-h-16 text-xs leading-5 text-slate-500">{project.description}</p>
                  <Link href={project.href} className="mt-5 flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-xs font-black text-primary transition hover:border-blue-300 hover:bg-blue-50">
                    Abrir projeto <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-xs leading-5 text-amber-900">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
        <p><strong>Governança:</strong> projetos de Segurança serão conduzidos em conjunto com o SESMT e não substituirão PGR, PCMSO, treinamentos legais ou registros oficiais. Qualidade de Vida não será usada para armazenar diagnósticos ou dados médicos em cadastros gerais.</p>
      </section>
    </div>
  );
}
