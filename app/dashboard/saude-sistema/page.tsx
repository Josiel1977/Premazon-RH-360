"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, CheckCircle2, CircleHelp, Database, ExternalLink, HardDrive,
  Loader2, RefreshCw, ServerCog, ShieldCheck, Stethoscope, XCircle,
} from "lucide-react";
import { MetricCard, Pill, ProgramPanel, SectionTitle } from "@/app/dashboard/_components/program-widgets";
import { supabase } from "@/lib/supabase";

type CheckStatus = "ok" | "aviso" | "erro";
type SystemCheck = {
  chave: string; titulo: string; categoria: string; status: CheckStatus;
  detalhe: string; acao: string; criticidade: string; ordem: number;
};

const categoryIcons: Record<string, typeof Database> = {
  Banco: Database, Armazenamento: HardDrive, Segurança: ShieldCheck,
  Ambiente: ServerCog, Aplicação: Stethoscope, Acesso: ShieldCheck,
};

export default function SystemHealthPage() {
  const [checks, setChecks] = useState<SystemCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadHealth = useCallback(async () => {
    setLoading(true); setError(null);
    const runtimePromise = fetch("/api/saude", { cache: "no-store" }).then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível verificar o ambiente.");
      return payload as { checks: SystemCheck[]; checkedAt: string };
    });
    const databasePromise = supabase.rpc("rh360_diagnostico_sistema");
    const dataCenterPromise = supabase.rpc("rh360_diagnostico_central_dados");
    const admissionPromise = supabase.rpc("rh360_diagnostico_admissao");
    const onboardingPromise = supabase.rpc("rh360_diagnostico_onboarding_360");
    const candidateIdentificationPromise = supabase.rpc("rh360_diagnostico_identificacao_candidatos");
    const behavioralProfilePromise = supabase.rpc("rh360_diagnostico_perfil_comportamental");
    const employeeImportPromise = supabase.rpc("rh360_diagnostico_importacao_colaboradores");
    const personnelMovementsPromise = supabase.rpc("rh360_diagnostico_movimentacoes");
    const [runtime, database, dataCenter, admission, onboarding, candidateIdentification, behavioralProfile, employeeImport, personnelMovements] = await Promise.allSettled([runtimePromise, databasePromise, dataCenterPromise, admissionPromise, onboardingPromise, candidateIdentificationPromise, behavioralProfilePromise, employeeImportPromise, personnelMovementsPromise]);
    const collected: SystemCheck[] = [];
    if (runtime.status === "fulfilled") {
      collected.push(...runtime.value.checks);
      setCheckedAt(runtime.value.checkedAt);
    } else setError(runtime.reason instanceof Error ? runtime.reason.message : "Falha ao verificar o ambiente.");
    if (database.status === "fulfilled" && !database.value.error) collected.push(...((database.value.data ?? []) as SystemCheck[]));
    else {
      const detail = database.status === "fulfilled" ? database.value.error?.message : String(database.reason);
      collected.push({
        chave: "migracao_006_indisponivel", titulo: "Diagnóstico do banco indisponível", categoria: "Banco", status: "erro",
        detalhe: "A função de diagnóstico não foi encontrada ou o perfil atual não possui acesso.",
        acao: detail?.includes("rh360_diagnostico_sistema") ? "Execute a migração 006 no Supabase." : detail ?? "Revise a migração 006 e o perfil do usuário.",
        criticidade: "critica", ordem: 0,
      });
    }
    if (dataCenter.status === "fulfilled" && !dataCenter.value.error) collected.push(...((dataCenter.value.data ?? []) as SystemCheck[]));
    else {
      const detail = dataCenter.status === "fulfilled" ? dataCenter.value.error?.message : String(dataCenter.reason);
      collected.push({
        chave: "migracao_007_indisponivel", titulo: "Central de Dados indisponível", categoria: "Banco", status: "erro",
        detalhe: "O histórico unificado e os relatórios compartilháveis ainda não foram preparados.",
        acao: detail?.includes("rh360_diagnostico_central_dados") ? "Execute a migração 007 no Supabase." : detail ?? "Revise a migração 007.",
        criticidade: "critica", ordem: 65,
      });
    }
    if (admission.status === "fulfilled" && !admission.value.error) collected.push(...((admission.value.data ?? []) as SystemCheck[]));
    else {
      const detail = admission.status === "fulfilled" ? admission.value.error?.message : String(admission.reason);
      collected.push({
        chave: "migracao_008_indisponivel", titulo: "Admissão e Onboarding indisponível", categoria: "Banco", status: "erro",
        detalhe: "Processos, documentos privados e checklists admissionais ainda não foram preparados.",
        acao: detail?.includes("rh360_diagnostico_admissao") ? "Execute a migração 008 no Supabase." : detail ?? "Revise a migração 008.",
        criticidade: "critica", ordem: 66,
      });
    }
    if (onboarding.status === "fulfilled" && !onboarding.value.error) collected.push(...((onboarding.value.data ?? []) as SystemCheck[]));
    else {
      const detail = onboarding.status === "fulfilled" ? onboarding.value.error?.message : String(onboarding.reason);
      collected.push({
        chave: "migracao_009_indisponivel", titulo: "Onboarding 360° configurável indisponível", categoria: "Banco", status: "erro",
        detalhe: "Conteúdos versionados, regras por contexto e evidências de ciência ainda não foram preparados.",
        acao: detail?.includes("rh360_diagnostico_onboarding_360") ? "Execute a migração 009 no Supabase." : detail ?? "Revise a migração 009.",
        criticidade: "critica", ordem: 67,
      });
    }
    if (candidateIdentification.status === "fulfilled" && !candidateIdentification.value.error) collected.push(...((candidateIdentification.value.data ?? []) as SystemCheck[]));
    else {
      const detail = candidateIdentification.status === "fulfilled" ? candidateIdentification.value.error?.message : String(candidateIdentification.reason);
      collected.push({
        chave: "migracao_010_indisponivel", titulo: "Identificação protegida de candidatos indisponível", categoria: "Banco", status: "erro",
        detalhe: "CPF protegido, filiação materna e nascimento ainda não foram preparados no cadastro de candidaturas.",
        acao: detail?.includes("rh360_diagnostico_identificacao_candidatos") ? "Execute a migração 010 no Supabase." : detail ?? "Revise a migração 010.",
        criticidade: "critica", ordem: 68,
      });
    }
    if (behavioralProfile.status === "fulfilled" && !behavioralProfile.value.error) collected.push(...((behavioralProfile.value.data ?? []) as SystemCheck[]));
    else {
      const detail = behavioralProfile.status === "fulfilled" ? behavioralProfile.value.error?.message : String(behavioralProfile.reason);
      collected.push({
        chave: "migracao_011_indisponivel", titulo: "Questionário comportamental indisponível", categoria: "Banco", status: "erro",
        detalhe: "Convites individuais, respostas e resultados D/I/S/C ainda não foram preparados.",
        acao: detail?.includes("rh360_diagnostico_perfil_comportamental") ? "Execute a migração 011 no Supabase." : detail ?? "Revise a migração 011.",
        criticidade: "critica", ordem: 69,
      });
    }
    if (employeeImport.status === "fulfilled" && !employeeImport.value.error) collected.push(...((employeeImport.value.data ?? []) as SystemCheck[]));
    else {
      const detail = employeeImport.status === "fulfilled" ? employeeImport.value.error?.message : String(employeeImport.reason);
      collected.push({
        chave: "migracao_012_indisponivel", titulo: "Importação do cadastro mestre indisponível", categoria: "Banco", status: "erro",
        detalhe: "A carga controlada de colaboradores ativos ainda não foi preparada.",
        acao: detail?.includes("rh360_diagnostico_importacao_colaboradores") ? "Execute a migração 012 no Supabase." : detail ?? "Revise a migração 012.",
        criticidade: "critica", ordem: 70,
      });
    }
    if (personnelMovements.status === "fulfilled" && !personnelMovements.value.error) collected.push(...((personnelMovements.value.data ?? []) as SystemCheck[]));
    else {
      const detail = personnelMovements.status === "fulfilled" ? personnelMovements.value.error?.message : String(personnelMovements.reason);
      collected.push({
        chave: "migracao_016_indisponivel", titulo: "Movimentações de Pessoal indisponíveis", categoria: "Banco", status: "erro",
        detalhe: "RQs controlados, solicitações e fluxo segregado ainda não foram preparados.",
        acao: detail?.includes("rh360_diagnostico_movimentacoes") ? "Execute as migrações 015 e 016 no Supabase, nessa ordem." : detail ?? "Revise as migrações 015 e 016.",
        criticidade: "critica", ordem: 74,
      });
    }
    setChecks(collected.sort((a, b) => a.ordem - b.ordem)); setLoading(false);
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => void loadHealth(), 0); return () => window.clearTimeout(timer); }, [loadHealth]);

  const summary = useMemo(() => ({
    ok: checks.filter((item) => item.status === "ok").length,
    warnings: checks.filter((item) => item.status === "aviso").length,
    errors: checks.filter((item) => item.status === "erro").length,
    score: checks.length ? Math.round((checks.filter((item) => item.status === "ok").length / checks.length) * 100) : 0,
  }), [checks]);
  const grouped = useMemo(() => [...new Set(checks.map((item) => item.categoria))].map((category) => ({ category, items: checks.filter((item) => item.categoria === category) })), [checks]);

  return <div className="mx-auto max-w-7xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><SectionTitle title="Saúde do Sistema" description="Diagnóstico seguro das migrações, ambiente, armazenamento, acesso e proteção dos dados." /><button type="button" onClick={() => void loadHealth()} disabled={loading} className="flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-xs font-black text-white disabled:opacity-60"><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Executar diagnóstico</button></div>
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800">{error}</div>}
    {loading && !checks.length ? <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-16 text-sm text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Verificando a plataforma…</div> : <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Índice de saúde" value={`${summary.score}%`} detail={summary.errors ? "Existem correções necessárias" : "Serviços essenciais verificados"} icon={Stethoscope} tone={summary.errors ? "red" : "emerald"} /><MetricCard label="Verificações aprovadas" value={summary.ok} icon={CheckCircle2} tone="emerald" /><MetricCard label="Avisos" value={summary.warnings} icon={AlertTriangle} tone="amber" /><MetricCard label="Erros críticos" value={summary.errors} icon={XCircle} tone={summary.errors ? "red" : "slate"} /></div>
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs leading-5 text-blue-800"><strong>Segurança:</strong> este painel verifica somente a presença e a configuração dos serviços. Chaves, tokens, senhas e conteúdos pessoais nunca são exibidos. {checkedAt && ` Última verificação: ${new Date(checkedAt).toLocaleString("pt-BR")}.`}</div>
      <div className="grid gap-5 xl:grid-cols-2">{grouped.map(({ category, items }) => { const CategoryIcon = categoryIcons[category] ?? CircleHelp; return <ProgramPanel key={category} title={category} description={`${items.filter((item) => item.status === "ok").length} de ${items.length} verificações aprovadas`}><div className="divide-y divide-slate-100">{items.map((item) => <article key={item.chave} className="p-5"><div className="flex items-start gap-3"><span className={`mt-0.5 rounded-xl p-2 ${item.status === "ok" ? "bg-emerald-50 text-emerald-700" : item.status === "aviso" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>{item.status === "ok" ? <CheckCircle2 className="h-4 w-4" /> : item.status === "aviso" ? <AlertTriangle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-xs font-black text-slate-800">{item.titulo}</h3><Pill tone={item.status === "ok" ? "emerald" : item.status === "aviso" ? "amber" : "red"}>{item.status === "ok" ? "Aprovado" : item.status === "aviso" ? "Atenção" : "Corrigir"}</Pill></div><p className="mt-1 text-xs leading-5 text-slate-500">{item.detalhe}</p>{item.status !== "ok" && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[10px] font-bold leading-4 text-slate-700">Ação: {item.acao}</p>}</div><CategoryIcon className="h-4 w-4 shrink-0 text-slate-300" /></div></article>)}</div></ProgramPanel>; })}</div>
      {summary.errors > 0 && <a href="https://github.com/Josiel1977/Premazon-RH-360/tree/main/database/migrations" target="_blank" rel="noreferrer" className="flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-xs font-black text-primary hover:bg-slate-50"><ExternalLink className="mr-2 h-4 w-4" />Abrir migrações no GitHub</a>}
    </>}
  </div>;
}
