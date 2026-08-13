"use client";

import type { LucideIcon } from "lucide-react";

export function MetricCard({ label, value, detail, icon: Icon, tone = "blue" }: {
  label: string;
  value: React.ReactNode;
  detail?: string;
  icon: LucideIcon;
  tone?: "blue" | "emerald" | "amber" | "red" | "violet" | "slate";
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    red: "bg-red-50 text-red-700 ring-red-100",
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
  };
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
          <p className="mt-2 truncate text-2xl font-black tracking-tight text-slate-900">{value}</p>
          {detail && <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>}
        </div>
        <span className={`rounded-xl p-3 ring-1 ${tones[tone]}`}><Icon className="h-5 w-5" /></span>
      </div>
    </article>
  );
}

export function ProgramPanel({ title, description, action, children, className = "" }: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-900">{title}</h3>
          {description && <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function MiniBarList({ items, empty = "Sem dados para este recorte.", color = "bg-blue-600", valueLabel }: {
  items: { name: string; value: number }[];
  empty?: string;
  color?: string;
  valueLabel?: (value: number) => string;
}) {
  const maximum = Math.max(...items.map((item) => item.value), 1);
  if (!items.length) return <p className="p-8 text-center text-xs text-slate-500">{empty}</p>;
  return (
    <div className="space-y-4 p-5">
      {items.map((item) => (
        <div key={item.name}>
          <div className="mb-1.5 flex items-center justify-between gap-4 text-xs">
            <span className="truncate font-bold text-slate-700" title={item.name}>{item.name}</span>
            <span className="shrink-0 font-black text-slate-500">{valueLabel ? valueLabel(item.value) : item.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(3, (item.value / maximum) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Pill({ children, tone = "slate" }: {
  children: React.ReactNode;
  tone?: "slate" | "blue" | "emerald" | "amber" | "red" | "violet";
}) {
  const tones = {
    slate: "bg-slate-100 text-slate-600", blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700", violet: "bg-violet-50 text-violet-700",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${tones[tone]}`}>{children}</span>;
}

export function SectionTitle({ title, description }: { title: string; description: string }) {
  return <div><h2 className="text-lg font-black tracking-tight text-slate-900">{title}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></div>;
}
