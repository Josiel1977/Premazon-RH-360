"use client";

import { ChevronDown, Menu, PanelLeftClose, PanelLeftOpen, type LucideIcon } from "lucide-react";
import { useState } from "react";

export type WorkspaceItem<T extends string> = {
  key: T;
  label: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "danger" | "warning" | "info" | "accent";
  dividerBefore?: boolean;
};

const toneClasses = {
  default: "text-slate-500",
  success: "text-emerald-500",
  danger: "text-red-500",
  warning: "text-amber-500",
  info: "text-cyan-500",
  accent: "text-violet-500",
};

export function ModuleWorkspace<T extends string>({
  eyebrow,
  title,
  description,
  icon: HeaderIcon,
  items,
  active,
  onChange,
  actions,
  children,
  accent = "from-blue-950 via-blue-900 to-blue-700",
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  items: WorkspaceItem<T>[];
  active: T;
  onChange: (view: T) => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
  accent?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const activeItem = items.find((item) => item.key === active) ?? items[0];
  const ActiveIcon = activeItem.icon;

  return (
    <div className="mx-auto max-w-[1600px] animate-in fade-in slide-in-from-bottom-3 duration-500">
      <section className={`relative overflow-hidden rounded-t-[1.75rem] bg-gradient-to-r ${accent} px-5 py-5 text-white shadow-lg sm:px-7`}>
        <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20 backdrop-blur-sm">
              <HeaderIcon className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/65">{eyebrow}</p>
              <h1 className="mt-1 truncate text-xl font-black tracking-tight sm:text-2xl">{title}</h1>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-white/70 sm:text-sm">{description}</p>
            </div>
          </div>
          {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
        </div>
      </section>

      <div className="border-x border-b border-slate-200 bg-white shadow-sm lg:hidden">
        <label className="relative block p-3">
          <span className="sr-only">Selecionar área do módulo</span>
          <Menu className="pointer-events-none absolute left-6 top-5.5 h-4 w-4 text-primary" />
          <select
            value={active}
            onChange={(event) => onChange(event.target.value as T)}
            className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm font-bold text-slate-700 outline-none focus:border-primary"
          >
            {items.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-6 top-5.5 h-4 w-4 text-slate-400" />
        </label>
      </div>

      <div className="flex items-stretch rounded-b-[1.75rem] border-x border-b border-slate-200 bg-[#f6f8fc] shadow-sm">
        <aside className={`relative hidden shrink-0 border-r border-slate-200 bg-white transition-[width] duration-200 lg:block ${collapsed ? "w-[4.5rem]" : "w-[16.5rem]"}`}>
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expandir menu do módulo" : "Recolher menu do módulo"}
            className="absolute -right-3 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm hover:text-primary"
          >
            {collapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
          </button>
          <nav className="sticky top-20 p-3">
            <p className={`px-3 pb-3 pt-1 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 ${collapsed ? "sr-only" : ""}`}>Navegação do programa</p>
            <ul className="space-y-1">
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = active === item.key;
                return (
                  <li key={item.key} className={item.dividerBefore ? "border-t border-slate-100 pt-2" : undefined}>
                    <button
                      type="button"
                      onClick={() => onChange(item.key)}
                      title={collapsed ? item.label : undefined}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold transition ${
                        isActive ? "bg-primary text-white shadow-md shadow-blue-950/10" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      } ${collapsed ? "justify-center" : ""}`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-amber-300" : toneClasses[item.tone ?? "default"]}`} />
                      {!collapsed && <span className="leading-4">{item.label}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <main className="min-w-0 flex-1 p-4 sm:p-5 xl:p-7">
          <div className="mb-5 flex items-center gap-2 border-b border-slate-200 pb-3 lg:hidden">
            <ActiveIcon className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-black text-slate-800">{activeItem.label}</h2>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

export function WorkspaceEmpty({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <Icon className="mx-auto h-9 w-9 text-slate-300" />
      <h3 className="mt-3 text-sm font-black text-slate-700">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">{description}</p>
    </div>
  );
}
