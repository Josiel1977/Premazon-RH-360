"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Award,
  BarChart3,
  Bell,
  BookOpenCheck,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  ClipboardCheck,
  CloudSun,
  Crown,
  GraduationCap,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Siren,
  ShieldCheck,
  Sparkles,
  Target,
  UserCheck,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

type MenuLink = {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
};

type MenuGroup = {
  name: string;
  icon: LucideIcon;
  links: MenuLink[];
};

const menuGroups: MenuGroup[] = [
  {
    name: "Recrutamento e Seleção",
    icon: UserPlus,
    links: [{ name: "Vagas e candidaturas", href: "/dashboard/recrutamento", icon: UserCheck }],
  },
  {
    name: "Admissão e Onboarding",
    icon: ClipboardCheck,
    links: [{ name: "Visão geral", href: "/dashboard/modulos/admissao-onboarding", icon: LayoutDashboard }],
  },
  {
    name: "Treinamento e Desenvolvimento",
    icon: GraduationCap,
    links: [
      { name: "Gestão de T&D", href: "/dashboard/treinamentos", icon: BarChart3 },
      { name: "Cursos em vídeo", href: "/dashboard/treinamentos/videos", icon: BookOpenCheck, badge: "NOVO" },
      { name: "Certificados", href: "/dashboard/certificados", icon: Award },
    ],
  },
  {
    name: "Avaliação e PDI",
    icon: Target,
    links: [
      { name: "Avaliações", href: "/dashboard/avaliacoes", icon: ClipboardCheck },
      { name: "Planos de desenvolvimento", href: "/dashboard/pdis", icon: Target },
    ],
  },
  {
    name: "Cargos e Benefícios",
    icon: BriefcaseBusiness,
    links: [
      { name: "Cargos", href: "/dashboard/cargos", icon: BriefcaseBusiness },
      { name: "Benefícios", href: "/dashboard/modulos/cargos-beneficios", icon: HeartHandshake },
    ],
  },
  {
    name: "Clima e Engajamento",
    icon: CloudSun,
    links: [{ name: "Visão geral", href: "/dashboard/modulos/clima-engajamento", icon: LayoutDashboard }],
  },
  {
    name: "Carreira e Sucessão",
    icon: Crown,
    links: [
      { name: "Rumo ao Topo", href: "/dashboard/rumo-ao-topo", icon: Crown },
      { name: "Trilhas e sucessão", href: "/dashboard/modulos/carreira-sucessao", icon: Sparkles },
    ],
  },
  {
    name: "Relações Trabalhistas",
    icon: ShieldCheck,
    links: [{ name: "Visão geral", href: "/dashboard/modulos/relacoes-trabalhistas", icon: LayoutDashboard }],
  },
  {
    name: "Gestão de Pessoas",
    icon: Users,
    links: [
      { name: "Dashboard executivo", href: "/dashboard", icon: LayoutDashboard },
      { name: "Colaborador 360", href: "/dashboard/colaboradores", icon: Users, badge: "NOVO" },
      { name: "Pendências e alertas", href: "/dashboard/pendencias", icon: Siren, badge: "NOVO" },
      { name: "Saúde do sistema", href: "/dashboard/saude-sistema", icon: ShieldCheck },
      { name: "Acessos e permissões", href: "/dashboard/acessos", icon: ShieldCheck },
    ],
  },
];

function routeIsActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const activeGroup = useMemo(
    () => menuGroups.find((group) => group.links.some((link) => routeIsActive(pathname, link.href)))?.name,
    [pathname],
  );
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("Usuário autenticado");

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setUserEmail(data.user.email);
    });
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  const sidebar = (
    <aside className="flex h-full w-[19rem] flex-col bg-[linear-gradient(180deg,#0f2557_0%,#163b78_55%,#102b60_100%)] text-white shadow-2xl">
      <div className="border-b border-white/10 px-5 py-5">
        <Link href="/dashboard" className="flex items-center gap-3" aria-label="Ir para o dashboard">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-yellow-500 text-[#102b60] shadow-lg shadow-amber-950/20">
            <Building2 className="h-6 w-6" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-lg font-black tracking-tight">Premazon RH 360</span>
            <span className="mt-0.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200">
              <Sparkles className="h-3 w-3 text-amber-300" /> People Intelligence
            </span>
          </span>
        </Link>
      </div>

      <div className="px-5 pb-2 pt-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300">Central de RH</p>
        <p className="mt-1 text-xs text-blue-100/70">Jornada completa de pessoas</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-5 pt-2 [scrollbar-color:rgba(255,255,255,.25)_transparent] [scrollbar-width:thin]">
        <ul className="space-y-1.5">
          {menuGroups.map((group) => {
            const GroupIcon = group.icon;
            const containsActive = group.name === activeGroup;
            const isOpen = containsActive || Boolean(openGroups[group.name]);
            return (
              <li key={group.name} className={containsActive ? "rounded-xl bg-white/[0.06]" : undefined}>
                <button
                  type="button"
                  onClick={() => setOpenGroups((current) => ({ ...current, [group.name]: !current[group.name] }))}
                  aria-expanded={isOpen}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                    containsActive ? "text-white" : "text-blue-100 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${containsActive ? "bg-amber-300 text-[#102b60]" : "bg-white/10 text-blue-200"}`}>
                    <GroupIcon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 leading-snug">{group.name}</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>

                {isOpen && (
                  <ul className="ml-7 space-y-1 border-l border-white/10 pb-2 pl-4 pr-2">
                    {group.links.map((link) => {
                      const LinkIcon = link.icon;
                      const isActive = routeIsActive(pathname, link.href);
                      return (
                        <li key={link.href}>
                          <Link
                            href={link.href}
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                              isActive
                                ? "bg-white text-[#173a73] shadow-md"
                                : "text-blue-100/80 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            <LinkIcon className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-amber-500" : ""}`} />
                            <span className="flex-1 leading-snug">{link.name}</span>
                            {link.badge && <span className="rounded-full bg-amber-300 px-1.5 py-0.5 text-[8px] font-black tracking-wide text-[#102b60]">{link.badge}</span>}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/[0.07] p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-primary">
            {userEmail.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-white">{userEmail}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[10px] text-emerald-300">
              <ShieldCheck className="h-3 w-3" /> Acesso protegido
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-blue-200 transition hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" /> Sair do sistema
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <div className="fixed inset-y-0 left-0 z-30 hidden lg:block">{sidebar}</div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
          <div className="relative h-full w-[19rem] max-w-[86vw]">
            {sidebar}
            <button type="button" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} className="absolute right-3 top-3 rounded-lg p-2 text-blue-100 hover:bg-white/10">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <div className="flex min-h-screen flex-col lg:ml-[19rem]">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" aria-label="Abrir menu" onClick={() => setMobileOpen(true)} className="rounded-xl border border-slate-200 p-2 text-slate-600 lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden items-center rounded-xl bg-slate-100/80 px-3 py-2 text-slate-500 sm:flex">
              <Search className="mr-2 h-4 w-4" />
              <input type="search" placeholder="Buscar na plataforma..." className="w-40 border-none bg-transparent text-xs outline-none md:w-56" />
            </div>
            <div className="min-w-0 sm:hidden">
              <p className="truncate text-sm font-black text-slate-800">Premazon RH 360</p>
              <p className="truncate text-[10px] text-slate-500">{activeGroup ?? "Gestão de Pessoas"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-amber-700 md:flex md:items-center md:gap-1.5">
              <Sparkles className="h-3 w-3" /> Experiência Premium
            </div>
            <button type="button" aria-label="Notificações" className="relative rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-amber-400" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
