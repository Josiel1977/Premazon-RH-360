"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, Database, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";

export type StrategicAreaItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  description: string;
  governance: string;
};

export function StrategicAreaPage({
  eyebrow,
  title,
  description,
  icon: HeaderIcon,
  accent,
  items,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  items: StrategicAreaItem[];
}) {
  const keys = useMemo(() => new Set(items.map((item) => item.key)), [items]);
  const [active, setActive] = useState(items[0]?.key ?? "");

  useEffect(() => {
    const syncHash = () => {
      const requested = window.location.hash.replace(/^#/, "");
      setActive(keys.has(requested) ? requested : items[0]?.key ?? "");
    };
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [items, keys]);

  const current = items.find((item) => item.key === active) ?? items[0];
  if (!current) return null;
  const ActiveIcon = current.icon;

  function selectView(key: string) {
    setActive(key);
    window.history.replaceState(null, "", `${window.location.pathname}#${key}`);
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${accent} p-7 text-white shadow-xl sm:p-9`}>
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25"><HeaderIcon className="h-6 w-6" /></span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/65">{eyebrow}</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/75">{description}</p>
          </div>
        </div>
      </section>

      <label className="relative block rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:hidden">
        <span className="sr-only">Selecionar área</span>
        <select value={active} onChange={(event) => selectView(event.target.value)} className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm font-bold text-slate-700 outline-none focus:border-primary">
          {items.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-7 top-7 h-4 w-4 text-slate-400" />
      </label>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 border-b border-slate-100 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-primary"><ActiveIcon className="h-5 w-5" /></span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">Área selecionada</p>
              <h2 className="mt-1 text-xl font-black text-slate-900">{current.label}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{current.description}</p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center rounded-full bg-amber-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-amber-700 ring-1 ring-amber-200">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Estrutura preparada
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <Database className="h-5 w-5 text-blue-700" />
            <h3 className="mt-3 text-xs font-black text-slate-800">Dados reais</h3>
            <p className="mt-2 text-xs leading-5 text-slate-500">A tela não apresenta números demonstrativos. Indicadores serão calculados somente a partir dos registros oficiais.</p>
          </article>
          <article className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <ShieldCheck className="h-5 w-5 text-emerald-700" />
            <h3 className="mt-3 text-xs font-black text-slate-800">Governança</h3>
            <p className="mt-2 text-xs leading-5 text-slate-500">{current.governance}</p>
          </article>
          <article className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <CheckCircle2 className="h-5 w-5 text-violet-700" />
            <h3 className="mt-3 text-xs font-black text-slate-800">Próxima ativação</h3>
            <p className="mt-2 text-xs leading-5 text-slate-500">Formulário, fluxo de aprovação, base permanente, indicadores e relatórios serão ativados por etapa, sem interromper os módulos existentes.</p>
          </article>
        </div>
      </section>
    </div>
  );
}
