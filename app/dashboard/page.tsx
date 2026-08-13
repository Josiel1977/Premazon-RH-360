"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, BriefcaseBusiness, CheckCircle2, Clock3, GraduationCap,
  Loader2, RefreshCw, Siren, Target, Users,
} from "lucide-react";
import { MetricCard, MiniBarList, Pill, ProgramPanel, SectionTitle } from "@/app/dashboard/_components/program-widgets";
import { groupByLabel, isPendingOverdue, pendingUrgency, type PendingPriority, type PendingStatus } from "@/lib/rh360";
import { supabase } from "@/lib/supabase";

type Employee = { id: string; nome: string; status: string; setor_id: string | null; cargo_id: string | null; email: string | null; data_admissao: string | null };
type Sector = { id: string; nome: string };
type Vacancy = { id: string; status: string };
type Application = { id: string; etapa: string; status: string };
type Training = { id: string; status: string; carga_horaria: number | string };
type Pdi = { id: string; status: string; data_limite: string | null };
type Pending = { id: string; titulo: string; descricao: string | null; origem: string; prioridade: PendingPriority; status: PendingStatus; prazo: string | null; link_acao: string | null; criado_em: string };
type QueryResult<T> = { data: T[] | null; error: { message: string } | null };

const trainingStatus: Record<string, string> = { planejado: "Planejado", inscricoes: "Inscrições", em_andamento: "Em andamento", concluido: "Concluído", cancelado: "Cancelado" };
const pdiStatus: Record<string, string> = { rascunho: "Rascunho", ativo: "Ativo", concluido: "Concluído", cancelado: "Cancelado" };
const applicationStages: Record<string, string> = { triagem: "Triagem", entrevista_rh: "Entrevista RH", teste_tecnico: "Teste técnico", entrevista_gestor: "Entrevista gestor", proposta: "Proposta", admissao: "Admissão", encerrado: "Encerrado" };
const originLabels: Record<string, string> = { recrutamento: "Recrutamento", treinamento: "Treinamento", pdi: "PDI", universidade: "Universidade", rumo_topo: "Rumo ao Topo", cadastro: "Cadastro", sistema: "Sistema", manual: "Manual" };
const priorityLabels: Record<PendingPriority, string> = { baixa: "Baixa", media: "Média", alta: "Alta", critica: "Crítica" };

export default function DashboardPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [pdis, setPdis] = useState<Pdi[]>([]);
  const [pendencies, setPendencies] = useState<Pending[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true); setMessage(null);
    const results = await Promise.all([
      supabase.from("colaboradores_v2").select("id,nome,status,setor_id,cargo_id,email,data_admissao"),
      supabase.from("setores").select("id,nome").eq("ativo", true),
      supabase.from("rs_vagas").select("id,status"),
      supabase.from("rs_candidaturas").select("id,etapa,status"),
      supabase.from("td_treinamentos").select("id,status,carga_horaria"),
      supabase.from("td_pdis").select("id,status,data_limite"),
      supabase.from("rh360_pendencias").select("id,titulo,descricao,origem,prioridade,status,prazo,link_acao,criado_em").order("criado_em", { ascending: false }).limit(200),
    ]) as unknown as [QueryResult<Employee>, QueryResult<Sector>, QueryResult<Vacancy>, QueryResult<Application>, QueryResult<Training>, QueryResult<Pdi>, QueryResult<Pending>];

    const [employeeResult, sectorResult, vacancyResult, applicationResult, trainingResult, pdiResult, pendingResult] = results;
    setEmployees(employeeResult.data ?? []); setSectors(sectorResult.data ?? []);
    setVacancies(vacancyResult.data ?? []); setApplications(applicationResult.data ?? []);
    setTrainings(trainingResult.data ?? []); setPdis(pdiResult.data ?? []); setPendencies(pendingResult.data ?? []);

    const coreErrors = results.slice(0, 6).flatMap((result) => result.error ? [result.error.message] : []);
    if (coreErrors.length) setMessage(`Alguns indicadores não puderam ser carregados: ${coreErrors[0]}`);
    else if (pendingResult.error) setMessage("Execute a migração 006 no Supabase para ativar pendências e alertas no painel.");
    setUpdatedAt(new Date()); setLoading(false);
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => void loadDashboard(), 0); return () => window.clearTimeout(timer); }, [loadDashboard]);

  const activeEmployees = useMemo(() => employees.filter((item) => item.status === "ativo"), [employees]);
  const openVacancies = vacancies.filter((item) => item.status === "aberta");
  const activePendencies = useMemo(() => pendencies.filter((item) => !["concluida", "cancelada"].includes(item.status)), [pendencies]);
  const overduePendencies = activePendencies.filter((item) => isPendingOverdue(item.prazo, item.status));
  const plannedTrainingHours = trainings.filter((item) => item.status !== "cancelado").reduce((sum, item) => sum + Number(item.carga_horaria || 0), 0);
  const incompleteEmployees = activeEmployees.filter((item) => !item.setor_id || !item.cargo_id || !item.email || !item.data_admissao);

  const employeesBySector = useMemo(() => {
    const names = new Map(sectors.map((item) => [item.id, item.nome]));
    return groupByLabel(activeEmployees, (item) => item.setor_id ? names.get(item.setor_id) ?? "Setor não localizado" : "Sem setor").slice(0, 8);
  }, [activeEmployees, sectors]);
  const trainingByStatus = useMemo(() => groupByLabel(trainings, (item) => trainingStatus[item.status] ?? item.status), [trainings]);
  const pdiByStatus = useMemo(() => groupByLabel(pdis, (item) => pdiStatus[item.status] ?? item.status), [pdis]);
  const candidatesByStage = useMemo(() => groupByLabel(applications.filter((item) => item.status === "ativa"), (item) => applicationStages[item.etapa] ?? item.etapa), [applications]);
  const urgentPendencies = useMemo(() => [...activePendencies].sort((a, b) => pendingUrgency(b.prioridade, b.prazo, b.status) - pendingUrgency(a.prioridade, a.prazo, a.status)).slice(0, 6), [activePendencies]);

  return <div className="mx-auto max-w-[1500px] space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <SectionTitle title="Dashboard Executivo RH" description="Indicadores integrados calculados sobre os registros reais da plataforma." />
      <button type="button" onClick={() => void loadDashboard()} disabled={loading} className="flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-black text-slate-700 disabled:opacity-60"><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Atualizar dados</button>
    </div>
    {message && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800"><AlertTriangle className="mr-2 inline h-4 w-4" />{message}</div>}
    {loading ? <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-16 text-sm text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Consolidando indicadores…</div> : <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Colaboradores ativos" value={activeEmployees.length} detail={`${employees.length} cadastro(s) no total`} icon={Users} tone="blue" />
        <MetricCard label="Vagas abertas" value={openVacancies.length} detail={`${applications.filter((item) => item.status === "ativa").length} candidatura(s) ativa(s)`} icon={BriefcaseBusiness} tone="violet" />
        <MetricCard label="Carga horária no plano" value={`${plannedTrainingHours.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}h`} detail={`${trainings.filter((item) => item.status !== "cancelado").length} treinamento(s) não cancelado(s)`} icon={GraduationCap} tone="emerald" />
        <MetricCard label="Pendências ativas" value={activePendencies.length} detail={`${overduePendencies.length} com prazo vencido`} icon={Siren} tone={overduePendencies.length ? "red" : "amber"} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ProgramPanel title="Quadro por setor" description="Distribuição dos colaboradores com status ativo"><MiniBarList items={employeesBySector} empty="Cadastre colaboradores e setores para visualizar a distribuição." color="bg-blue-700" /></ProgramPanel>
        <ProgramPanel title="Pipeline de candidatos" description="Candidaturas ativas por etapa"><MiniBarList items={candidatesByStage} empty="Nenhuma candidatura ativa no momento." color="bg-violet-600" /></ProgramPanel>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <ProgramPanel title="Treinamentos" description="Ações por status"><MiniBarList items={trainingByStatus} empty="Nenhum treinamento cadastrado." color="bg-emerald-600" /></ProgramPanel>
        <ProgramPanel title="Planos de desenvolvimento" description="PDIs por status"><MiniBarList items={pdiByStatus} empty="Nenhum PDI cadastrado." color="bg-amber-500" /></ProgramPanel>
        <ProgramPanel title="Qualidade do cadastro" description="Campos essenciais do Colaborador 360"><div className="space-y-4 p-5"><div className="flex items-center justify-between rounded-xl bg-slate-50 p-4"><span className="text-xs font-bold text-slate-600">Cadastros completos</span><span className="text-xl font-black text-emerald-700">{Math.max(activeEmployees.length - incompleteEmployees.length, 0)}</span></div><div className="flex items-center justify-between rounded-xl bg-amber-50 p-4"><span className="text-xs font-bold text-amber-800">Precisam de complemento</span><span className="text-xl font-black text-amber-700">{incompleteEmployees.length}</span></div><Link href="/dashboard/colaboradores" className="flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-xs font-black text-white">Abrir Colaborador 360</Link></div></ProgramPanel>
      </div>

      <ProgramPanel title="Prioridades para ação" description="Pendências ativas ordenadas por criticidade e prazo" action={<Link href="/dashboard/pendencias" className="text-xs font-black text-primary">Ver central completa</Link>}>
        <div className="divide-y divide-slate-100">{urgentPendencies.map((item) => { const overdue = isPendingOverdue(item.prazo, item.status); return <article key={item.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${overdue || item.prioridade === "critica" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{overdue ? <Clock3 className="h-5 w-5" /> : <Target className="h-5 w-5" />}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2"><Pill tone={item.prioridade === "critica" ? "red" : item.prioridade === "alta" ? "amber" : "blue"}>{priorityLabels[item.prioridade]}</Pill><Pill>{originLabels[item.origem] ?? item.origem}</Pill>{overdue && <Pill tone="red">Vencida</Pill>}</div><h3 className="mt-2 text-sm font-black text-slate-900">{item.titulo}</h3><p className="mt-1 line-clamp-1 text-xs text-slate-500">{item.descricao || "Sem descrição adicional."}</p></div>{item.link_acao && <Link href={item.link_acao} className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-[10px] font-black text-primary">Abrir ação</Link>}</article>; })}{!urgentPendencies.length && <div className="p-10 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-emerald-300" /><p className="mt-3 text-sm font-black text-slate-700">Nenhuma pendência ativa</p><p className="mt-1 text-xs text-slate-500">A sincronização automática preencherá esta área quando houver prazos ou necessidades.</p></div>}</div>
      </ProgramPanel>
      <p className="text-right text-[10px] font-semibold text-slate-400">{updatedAt ? `Atualizado em ${updatedAt.toLocaleString("pt-BR")}` : ""}</p>
    </>}
  </div>;
}
