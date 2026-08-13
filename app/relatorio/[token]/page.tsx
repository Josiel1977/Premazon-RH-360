"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  BriefcaseBusiness, Building2, Clock3, GraduationCap, Loader2,
  ShieldCheck, Siren, Target, Users,
} from "lucide-react";
import { MetricCard, MiniBarList, ProgramPanel } from "@/app/dashboard/_components/program-widgets";
import type { DashboardSnapshot } from "@/lib/relatorios";

type PublicReport = { titulo: string; snapshot: DashboardSnapshot; expira_em: string };

export default function PublicExecutiveReportPage() {
  const params = useParams<{ token: string }>();
  const [report, setReport] = useState<PublicReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await fetch(`/api/relatorios/${params.token}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar o relatório.");
      setReport(payload as PublicReport);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível carregar o relatório.");
    } finally {
      setLoading(false);
    }
  }, [params.token]);

  useEffect(() => { const timer = window.setTimeout(() => void loadReport(), 0); return () => window.clearTimeout(timer); }, [loadReport]);

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><div className="flex items-center rounded-2xl border border-slate-200 bg-white px-8 py-6 text-sm font-semibold text-slate-500 shadow-sm"><Loader2 className="mr-3 h-5 w-5 animate-spin" />Carregando indicadores protegidos…</div></main>;
  if (error || !report) return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><div className="max-w-lg rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm"><ShieldCheck className="mx-auto h-10 w-10 text-red-400" /><h1 className="mt-4 text-lg font-black text-slate-900">Relatório indisponível</h1><p className="mt-2 text-sm leading-6 text-slate-500">{error}</p><p className="mt-4 text-xs text-slate-400">Solicite ao RH um novo link de acesso.</p></div></main>;

  const { indicadores } = report.snapshot;
  return <main className="min-h-screen bg-slate-50">
    <header className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-800 text-white shadow-lg"><div className="mx-auto flex max-w-7xl items-center gap-4 px-5 py-6"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-300 text-blue-950"><Building2 className="h-7 w-7" /></span><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-200">Premazon RH 360</p><h1 className="mt-1 text-xl font-black">{report.titulo}</h1><p className="mt-1 text-xs text-blue-200">Retrato executivo gerado em {new Date(report.snapshot.gerado_em).toLocaleString("pt-BR")}</p></div></div></header>
    <div className="mx-auto max-w-7xl space-y-6 px-5 py-8">
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs leading-5 text-emerald-800"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" /><p><strong>Relatório protegido:</strong> este link contém apenas indicadores agregados. Não há nomes, CPF, e-mails, salários ou avaliações individuais. O acesso expira em {new Date(report.expira_em).toLocaleString("pt-BR")}.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Colaboradores ativos" value={indicadores.colaboradores_ativos} icon={Users} tone="blue" />
        <MetricCard label="Vagas abertas" value={indicadores.vagas_abertas} detail={`${indicadores.candidaturas_ativas} candidatura(s) ativa(s)`} icon={BriefcaseBusiness} tone="violet" />
        <MetricCard label="Carga horária no plano" value={`${Number(indicadores.carga_horaria_plano).toLocaleString("pt-BR")}h`} icon={GraduationCap} tone="emerald" />
        <MetricCard label="Pendências ativas" value={indicadores.pendencias_ativas} detail={`${indicadores.pendencias_vencidas} vencida(s)`} icon={Siren} tone={indicadores.pendencias_vencidas ? "red" : "amber"} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <ProgramPanel title="Colaboradores por setor"><MiniBarList items={report.snapshot.colaboradores_por_setor} empty="Sem dados para este indicador." color="bg-blue-700" /></ProgramPanel>
        <ProgramPanel title="Candidaturas por etapa"><MiniBarList items={report.snapshot.candidaturas_por_etapa} empty="Sem candidaturas ativas." color="bg-violet-600" /></ProgramPanel>
        <ProgramPanel title="Treinamentos por status"><MiniBarList items={report.snapshot.treinamentos_por_status} empty="Sem treinamentos cadastrados." color="bg-emerald-600" /></ProgramPanel>
        <ProgramPanel title="PDIs por status"><MiniBarList items={report.snapshot.pdis_por_status} empty="Sem PDIs cadastrados." color="bg-amber-500" /></ProgramPanel>
      </div>
      <div className="grid gap-4 sm:grid-cols-3"><MetricCard label="PDIs ativos" value={indicadores.pdis_ativos} icon={Target} tone="blue" /><MetricCard label="Candidaturas ativas" value={indicadores.candidaturas_ativas} icon={Clock3} tone="violet" /><MetricCard label="Pendências vencidas" value={indicadores.pendencias_vencidas} icon={Siren} tone={indicadores.pendencias_vencidas ? "red" : "slate"} /></div>
      <footer className="border-t border-slate-200 py-6 text-center text-[10px] font-semibold text-slate-400">Premazon RH 360 · Indicadores congelados no momento da geração do link</footer>
    </div>
  </main>;
}
