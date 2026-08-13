"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3, BookOpenCheck, Boxes, CalendarDays, CheckCircle2, ChevronDown,
  ClipboardList, FileSpreadsheet, GraduationCap, Grid3X3, Loader2, Plus,
  Printer, Save, Search, Target, Upload, UserRound, Users, WalletCards, X,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, PolarAngleAxis, PolarGrid, Radar,
  RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { ModuleWorkspace, WorkspaceEmpty, type WorkspaceItem } from "@/app/dashboard/_components/module-workspace";
import { MetricCard, MiniBarList, Pill, ProgramPanel, SectionTitle } from "@/app/dashboard/_components/program-widgets";
import { supabase } from "@/lib/supabase";
import { readXlsxRows } from "@/lib/xlsx-browser";
import { estimatedPotential, nineBoxPosition, performanceBand } from "@/lib/td-analytics";
import {
  parseLntRows, parsePerformanceRows, TD_COMPETENCIES, type TdImportType,
  type TdLntRecord, type TdParseResult, type TdPerformanceRecord,
} from "@/lib/treinamento-desenvolvimento";

type View = "dashboard" | "colaboradores" | "pdi" | "tipos" | "matriz" | "lnt" | "gestao" | "custos" | "cronograma" | "ninebox";
type Preview =
  | { type: "lnt"; file: File; result: TdParseResult<TdLntRecord> }
  | { type: "avaliacao_desempenho"; file: File; result: TdParseResult<TdPerformanceRecord> };
type NeedRecord = {
  id: string; colaborador_nome_importado: string; gestor_importado: string; setor_importado: string;
  cargo_importado: string; necessidades_tecnicas: string[]; temas_comportamentais: string[];
  treinamento_sugerido: string | null; prioridade: string; status: string; vinculo_status: string;
};
type SignalRecord = {
  id: string; colaborador_nome_importado: string; gestor_importado: string; setor_importado: string;
  cargo_importado: string; media_geral: number; competencias: Record<string, { nota: number; evidencia?: string | null }>;
  pontos_fortes: string | null; pontos_desenvolver: string | null;
};
type CourseRecord = {
  id: string; nome: string; categoria: string; competencia_chave: string | null; modalidade: string;
  carga_horaria: number; validade_meses: number | null; obrigatorio: boolean;
};
type TrainingRecord = {
  id: string; curso_id: string | null; titulo: string; categoria: string; modalidade: string;
  carga_horaria: number; data_inicio: string; data_fim: string | null; fornecedor: string | null;
  instrutor: string | null; publico_alvo: string | null; custo_planejado: number | null;
  custo_real: number | null; status: string;
};
type ParticipationRecord = {
  id: string; treinamento_id: string; colaborador_nome_importado: string | null; status: string;
  frequencia_percentual: number | null; nota: number | null;
};
type PdiRecord = {
  id: string; colaborador_nome_importado: string; objetivo: string; status: string;
  data_inicio: string; data_limite: string | null; td_pdi_acoes?: { id: string; descricao: string; status: string }[];
};

const inputClass = "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-blue-100";
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const colors = ["#1d4ed8", "#0f766e", "#7c3aed", "#d97706", "#dc2626", "#0891b2"];
const categoryLabels: Record<string, string> = { tecnico: "Técnico", comportamental: "Comportamental", nr_legal: "NR / Legal", integracao: "Integração", qualidade: "Qualidade", gestao: "Gestão", outro: "Outro" };
const statusLabels: Record<string, string> = { planejado: "Planejado", inscricoes: "Inscrições", em_andamento: "Em andamento", concluido: "Concluído", cancelado: "Cancelado" };

const workspaceItems: WorkspaceItem<View>[] = [
  { key: "dashboard", label: "Dashboard Executivo", icon: BarChart3, tone: "info" },
  { key: "colaboradores", label: "Ficha de Colaboradores", icon: UserRound, tone: "success" },
  { key: "pdi", label: "Gerar PDI Individual", icon: Target, tone: "accent" },
  { key: "tipos", label: "Tipos de Treinamentos", icon: BookOpenCheck, tone: "warning" },
  { key: "matriz", label: "Matriz por Setor", icon: Grid3X3, tone: "info" },
  { key: "lnt", label: "Necessidades (LNT)", icon: ClipboardList, tone: "danger" },
  { key: "gestao", label: "Gestão de Treinamentos", icon: GraduationCap, tone: "success" },
  { key: "custos", label: "Custos & ROI", icon: WalletCards, tone: "warning" },
  { key: "cronograma", label: "Cronograma Anual", icon: CalendarDays, tone: "info" },
  { key: "ninebox", label: "Matriz 9-Box", icon: Boxes, tone: "accent" },
];

async function fileHash(file: File) {
  const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
}
function normalize(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }
function competenceLabel(key: string) { return TD_COMPETENCIES.find((item) => item.key === key)?.label ?? key; }
function groupCount<T>(items: T[], key: (item: T) => string) {
  const grouped = new Map<string, number>();
  items.forEach((item) => { const label = key(item) || "Não informado"; grouped.set(label, (grouped.get(label) ?? 0) + 1); });
  return [...grouped].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export default function TreinamentoDesenvolvimentoPage() {
  const [view, setView] = useState<View>("dashboard");
  const [needs, setNeeds] = useState<NeedRecord[]>([]);
  const [signals, setSignals] = useState<SignalRecord[]>([]);
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [trainings, setTrainings] = useState<TrainingRecord[]>([]);
  const [participations, setParticipations] = useState<ParticipationRecord[]>([]);
  const [pdis, setPdis] = useState<PdiRecord[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reading, setReading] = useState<TdImportType | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showTrainingForm, setShowTrainingForm] = useState(false);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [selectedSignalId, setSelectedSignalId] = useState("");
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("todos");
  const [benefit, setBenefit] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [needsResult, signalsResult, coursesResult, trainingsResult, participationResult, pdiResult] = await Promise.all([
      supabase.from("td_lnt_necessidades").select("id,colaborador_nome_importado,gestor_importado,setor_importado,cargo_importado,necessidades_tecnicas,temas_comportamentais,treinamento_sugerido,prioridade,status,vinculo_status").order("criado_em", { ascending: false }).limit(1000),
      supabase.from("td_avaliacoes_sinais").select("id,colaborador_nome_importado,gestor_importado,setor_importado,cargo_importado,media_geral,competencias,pontos_fortes,pontos_desenvolver").order("criado_em", { ascending: false }).limit(1000),
      supabase.from("td_cursos").select("id,nome,categoria,competencia_chave,modalidade,carga_horaria,validade_meses,obrigatorio").eq("ativo", true).order("nome"),
      supabase.from("td_treinamentos").select("id,curso_id,titulo,categoria,modalidade,carga_horaria,data_inicio,data_fim,fornecedor,instrutor,publico_alvo,custo_planejado,custo_real,status").order("data_inicio"),
      supabase.from("td_participacoes").select("id,treinamento_id,colaborador_nome_importado,status,frequencia_percentual,nota").limit(2000),
      supabase.from("td_pdis").select("id,colaborador_nome_importado,objetivo,status,data_inicio,data_limite,td_pdi_acoes(id,descricao,status)").order("criado_em", { ascending: false }).limit(500),
    ]);
    const coreError = [needsResult.error, signalsResult.error, coursesResult.error, trainingsResult.error, participationResult.error].find(Boolean);
    if (coreError) setMessage({ type: "error", text: coreError.message.includes("td_") ? "Prepare o módulo executando as migrações 003 e 005 no Supabase." : `Não foi possível carregar T&D: ${coreError.message}` });
    else {
      setNeeds((needsResult.data ?? []) as NeedRecord[]);
      setSignals((signalsResult.data ?? []).map((item) => ({ ...item, media_geral: Number(item.media_geral) })) as SignalRecord[]);
      setCourses((coursesResult.data ?? []).map((item) => ({ ...item, carga_horaria: Number(item.carga_horaria) })) as CourseRecord[]);
      setTrainings((trainingsResult.data ?? []).map((item) => ({ ...item, carga_horaria: Number(item.carga_horaria), custo_planejado: item.custo_planejado == null ? null : Number(item.custo_planejado), custo_real: item.custo_real == null ? null : Number(item.custo_real) })) as TrainingRecord[]);
      setParticipations((participationResult.data ?? []).map((item) => ({ ...item, frequencia_percentual: item.frequencia_percentual == null ? null : Number(item.frequencia_percentual), nota: item.nota == null ? null : Number(item.nota) })) as ParticipationRecord[]);
    }
    if (!pdiResult.error) setPdis((pdiResult.data ?? []) as PdiRecord[]);
    setLoading(false);
  }, []);

  useEffect(() => { const timeout = window.setTimeout(() => void loadData(), 0); return () => window.clearTimeout(timeout); }, [loadData]);
  const sectors = useMemo(() => [...new Set([...signals.map((item) => item.setor_importado), ...needs.map((item) => item.setor_importado)])].sort(), [needs, signals]);
  const filteredSignals = useMemo(() => signals.filter((item) => {
    const matchesSector = sector === "todos" || item.setor_importado === sector;
    const term = normalize(search);
    return matchesSector && (!term || [item.colaborador_nome_importado, item.gestor_importado, item.cargo_importado].some((value) => normalize(value).includes(term)));
  }), [search, sector, signals]);
  const filteredNeeds = useMemo(() => needs.filter((item) => {
    const matchesSector = sector === "todos" || item.setor_importado === sector;
    const term = normalize(search);
    return matchesSector && (!term || [item.colaborador_nome_importado, item.gestor_importado, item.cargo_importado, item.treinamento_sugerido ?? ""].some((value) => normalize(value).includes(term)));
  }), [needs, search, sector]);
  const effectiveSignalId = selectedSignalId || signals[0]?.id || "";
  const selectedSignal = signals.find((item) => item.id === effectiveSignalId) ?? null;
  const selectedRadar = selectedSignal ? TD_COMPETENCIES.map((item) => ({ name: item.label, nota: selectedSignal.competencias[item.key]?.nota ?? null })).filter((item) => item.nota != null) : [];
  const selectedGaps = selectedSignal ? Object.entries(selectedSignal.competencias).filter(([, value]) => Number(value.nota) < 7).sort((a, b) => a[1].nota - b[1].nota) : [];
  const openNeeds = needs.filter((item) => !["atendida", "cancelada"].includes(item.status));
  const plannedInvestment = trainings.reduce((total, item) => total + (item.custo_planejado ?? 0), 0);
  const realInvestment = trainings.reduce((total, item) => total + (item.custo_real ?? 0), 0);
  const benefitValue = Number(benefit.replace(",", "."));
  const roi = benefitValue > 0 && (realInvestment || plannedInvestment) > 0 ? ((benefitValue - (realInvestment || plannedInvestment)) / (realInvestment || plannedInvestment)) * 100 : null;

  const gapRanking = useMemo(() => {
    const map = new Map<string, number>();
    signals.forEach((signal) => Object.entries(signal.competencias).forEach(([key, value]) => { if (Number(value.nota) < 7) map.set(key, (map.get(key) ?? 0) + 1); }));
    return [...map].map(([key, value]) => ({ name: competenceLabel(key), value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [signals]);
  const sectorNeeds = useMemo(() => groupCount(openNeeds, (item) => item.setor_importado).slice(0, 8), [openNeeds]);
  const performanceDistribution = useMemo(() => groupCount(signals, (item) => performanceBand(item.media_geral)), [signals]);
  const categorySummary = useMemo(() => groupCount(trainings, (item) => categoryLabels[item.categoria] ?? item.categoria), [trainings]);

  async function readFile(type: TdImportType, file: File | null) {
    if (!file) return;
    setReading(type); setPreview(null); setMessage(null);
    try {
      if (!file.name.toLowerCase().endsWith(".xlsx")) throw new Error("Envie a planilha no formato XLSX.");
      const rows = await readXlsxRows(file);
      setPreview(type === "lnt" ? { type, file, result: parseLntRows(rows) } : { type, file, result: parsePerformanceRows(rows) });
    } catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Não foi possível ler a planilha." }); }
    finally { setReading(null); }
  }

  async function saveImport() {
    if (!preview) return;
    setSaving(true); setMessage(null);
    let importId: string | null = null;
    try {
      const digest = await fileHash(preview.file);
      const { data: duplicate, error: duplicateError } = await supabase.from("td_importacoes").select("id").eq("tipo", preview.type).eq("hash_arquivo", digest).in("status", ["concluida", "concluida_com_avisos"]).maybeSingle();
      if (duplicateError) throw new Error(duplicateError.message);
      if (duplicate) throw new Error("Esta mesma planilha já foi importada.");
      const { data: imported, error: importError } = await supabase.from("td_importacoes").insert({ tipo: preview.type, nome_arquivo: preview.file.name, tamanho_arquivo: preview.file.size, hash_arquivo: digest, status: "processando", ano_referencia: new Date().getFullYear(), total_linhas: preview.result.linhasLidas, linhas_validas: preview.result.registros.length, linhas_rejeitadas: preview.result.linhasRejeitadas, avisos: preview.result.avisos.slice(0, 500), metadados: { linha_cabecalho: preview.result.linhaCabecalho } }).select("id").single();
      if (importError) throw new Error(importError.message);
      importId = imported.id;
      const table = preview.type === "lnt" ? "td_lnt_necessidades" : "td_avaliacoes_sinais";
      const payload = preview.result.registros.map((record) => preview.type === "lnt" ? { importacao_id: imported.id, ...record, prioridade: "media", status: "identificada", vinculo_status: "pendente" } : { importacao_id: imported.id, ...record, vinculo_status: "pendente" });
      for (let index = 0; index < payload.length; index += 250) { const { error } = await supabase.from(table).insert(payload.slice(index, index + 250)); if (error) throw new Error(error.message); }
      const status = preview.result.avisos.length || preview.result.linhasRejeitadas ? "concluida_com_avisos" : "concluida";
      const { error } = await supabase.from("td_importacoes").update({ status, finalizado_em: new Date().toISOString() }).eq("id", imported.id);
      if (error) throw new Error(error.message);
      setPreview(null); setShowImport(false); setMessage({ type: "success", text: `${payload.length} registros importados com rastreabilidade.` }); await loadData();
    } catch (error) {
      if (importId) await supabase.from("td_importacoes").update({ status: "falhou", finalizado_em: new Date().toISOString() }).eq("id", importId);
      setMessage({ type: "error", text: error instanceof Error ? error.message : "A importação falhou." });
    } finally { setSaving(false); }
  }

  async function updateNeed(id: string, field: "prioridade" | "status", value: string) {
    const { error } = await supabase.from("td_lnt_necessidades").update({ [field]: value }).eq("id", id);
    if (error) setMessage({ type: "error", text: error.message });
    else setNeeds((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item));
  }

  async function createPdi(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selectedSignal) return;
    setSaving(true); const form = new FormData(event.currentTarget);
    const objective = String(form.get("objetivo") ?? "").trim(); const deadline = String(form.get("data_limite") ?? "") || null;
    const { data, error } = await supabase.from("td_pdis").insert({ avaliacao_sinal_id: selectedSignal.id, colaborador_nome_importado: selectedSignal.colaborador_nome_importado, gestor_importado: selectedSignal.gestor_importado, setor_importado: selectedSignal.setor_importado, cargo_importado: selectedSignal.cargo_importado, objetivo: objective, status: "ativo", data_limite: deadline }).select("id").single();
    if (error) setMessage({ type: "error", text: `Não foi possível salvar o PDI. Execute a migração 005: ${error.message}` });
    else {
      const actions = selectedGaps.map(([key]) => { const course = courses.find((item) => item.competencia_chave === key); return { pdi_id: data.id, competencia_chave: key, tipo_acao: course ? "curso" : "pratica_supervisionada", descricao: course ? `Concluir ${course.nome}` : `Praticar ${competenceLabel(key)} com acompanhamento do gestor`, curso_id: course?.id ?? null, resultado_esperado: `Evoluir a competência ${competenceLabel(key)} em nova avaliação`, data_limite: deadline, status: "planejada" }; });
      if (actions.length) { const { error: actionsError } = await supabase.from("td_pdi_acoes").insert(actions); if (actionsError) setMessage({ type: "error", text: `PDI salvo, mas as ações falharam: ${actionsError.message}` }); else setMessage({ type: "success", text: `PDI criado com ${actions.length} ação(ões) baseada(s) nos gaps reais.` }); }
      else setMessage({ type: "success", text: "PDI criado. Não há gap abaixo de 7; o objetivo seguirá como ação de manutenção." });
      await loadData();
    }
    setSaving(false);
  }

  async function createTraining(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); const form = new FormData(event.currentTarget); const courseId = String(form.get("curso_id") ?? ""); const course = courses.find((item) => item.id === courseId);
    const { error } = await supabase.from("td_treinamentos").insert({ curso_id: courseId || null, titulo: String(form.get("titulo") ?? "").trim(), categoria: String(form.get("categoria") ?? course?.categoria ?? "outro"), modalidade: String(form.get("modalidade") ?? course?.modalidade ?? "presencial"), carga_horaria: Number(form.get("carga_horaria") ?? course?.carga_horaria ?? 1), data_inicio: String(form.get("data_inicio") ?? ""), fornecedor: String(form.get("fornecedor") ?? "").trim() || null, instrutor: String(form.get("instrutor") ?? "").trim() || null, publico_alvo: String(form.get("publico_alvo") ?? "").trim() || null, custo_planejado: form.get("custo_planejado") ? Number(form.get("custo_planejado")) : null, status: "planejado" });
    if (error) setMessage({ type: "error", text: error.message }); else { setShowTrainingForm(false); setMessage({ type: "success", text: "Treinamento incluído no plano anual." }); await loadData(); } setSaving(false);
  }

  async function createCourse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); const form = new FormData(event.currentTarget);
    const { error } = await supabase.from("td_cursos").insert({ nome: String(form.get("nome") ?? "").trim(), categoria: String(form.get("categoria") ?? "outro"), competencia_chave: String(form.get("competencia_chave") ?? "") || null, modalidade: String(form.get("modalidade") ?? "presencial"), carga_horaria: Number(form.get("carga_horaria") ?? 1), validade_meses: form.get("validade_meses") ? Number(form.get("validade_meses")) : null, obrigatorio: form.get("obrigatorio") === "true", ativo: true });
    if (error) setMessage({ type: "error", text: error.message }); else { setShowCourseForm(false); setMessage({ type: "success", text: "Tipo de treinamento cadastrado." }); await loadData(); } setSaving(false);
  }

  const toolbar = <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
    <div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar colaborador, gestor ou cargo" className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-primary" /></div>
    <div className="relative sm:w-56"><select value={sector} onChange={(event) => setSector(event.target.value)} className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 pr-8 text-xs font-bold text-slate-600 outline-none"><option value="todos">Todos os setores</option>{sectors.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-400" /></div>
  </div>;

  return (
    <ModuleWorkspace eyebrow="Premazon RH 360 · Programa estratégico" title="Treinamento & Desenvolvimento" description="Uma jornada completa: diagnóstico, ficha individual, PDI, catálogo, plano anual, investimento, eficácia e sucessão." icon={GraduationCap} items={workspaceItems} active={view} onChange={setView} accent="from-emerald-950 via-teal-900 to-cyan-800" actions={<><button type="button" onClick={() => setShowImport((value) => !value)} className="flex items-center rounded-xl bg-white/10 px-3 py-2 text-xs font-black ring-1 ring-white/20 hover:bg-white/20"><Upload className="mr-2 h-4 w-4" />Importar novos dados</button><button type="button" onClick={() => { setView("gestao"); setShowTrainingForm(true); }} className="flex items-center rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-slate-950 hover:bg-amber-300"><Plus className="mr-2 h-4 w-4" />Planejar ação</button></>}>
      <div className="space-y-5">
        {message && <div role="alert" className={`flex items-start justify-between rounded-xl border px-4 py-3 text-xs font-semibold ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}><span>{message.text}</span><button type="button" aria-label="Fechar aviso" onClick={() => setMessage(null)}><X className="h-4 w-4" /></button></div>}
        {showImport && <ImportPanel preview={preview} reading={reading} saving={saving} onRead={readFile} onSave={saveImport} onClose={() => { setShowImport(false); setPreview(null); }} />}
        {loading ? <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-16 text-sm text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Carregando programa…</div> : <>
          {view !== "custos" && view !== "cronograma" && view !== "tipos" && toolbar}
          {view === "dashboard" && <DashboardView needs={openNeeds} signals={signals} trainings={trainings} investment={plannedInvestment} gaps={gapRanking} sectorNeeds={sectorNeeds} distribution={performanceDistribution} />}
          {view === "colaboradores" && <EmployeeView signals={filteredSignals} selectedId={effectiveSignalId} onSelect={setSelectedSignalId} selected={selectedSignal} radar={selectedRadar} gaps={selectedGaps} needs={needs} />}
          {view === "pdi" && <PdiView signals={filteredSignals} selectedId={effectiveSignalId} onSelect={setSelectedSignalId} selected={selectedSignal} gaps={selectedGaps} courses={courses} pdis={pdis} saving={saving} onSubmit={createPdi} />}
          {view === "tipos" && <TypesView courses={courses} trainings={trainings} summary={categorySummary} onNew={() => setShowCourseForm(true)} />}
          {view === "matriz" && <MatrixView signals={filteredSignals} />}
          {view === "lnt" && <LntView needs={filteredNeeds} onUpdate={updateNeed} />}
          {view === "gestao" && <ManagementView trainings={trainings} participations={participations} onNew={() => setShowTrainingForm(true)} />}
          {view === "custos" && <CostsView planned={plannedInvestment} real={realInvestment} benefit={benefit} onBenefit={setBenefit} roi={roi} trainings={trainings} />}
          {view === "cronograma" && <CalendarView trainings={trainings} />}
          {view === "ninebox" && <NineBoxView signals={filteredSignals} />}
        </>}
      </div>
      {showTrainingForm && <TrainingModal courses={courses} saving={saving} onClose={() => setShowTrainingForm(false)} onSubmit={createTraining} />}
      {showCourseForm && <CourseModal saving={saving} onClose={() => setShowCourseForm(false)} onSubmit={createCourse} />}
    </ModuleWorkspace>
  );
}

function DashboardView({ needs, signals, trainings, investment, gaps, sectorNeeds, distribution }: { needs: NeedRecord[]; signals: SignalRecord[]; trainings: TrainingRecord[]; investment: number; gaps: { name: string; value: number }[]; sectorNeeds: { name: string; value: number }[]; distribution: { name: string; value: number }[] }) {
  const average = signals.length ? signals.reduce((sum, item) => sum + item.media_geral, 0) / signals.length : 0;
  return <div className="space-y-5"><SectionTitle title="Dashboard Executivo" description="Leitura consolidada do ciclo de desenvolvimento, construída apenas com dados registrados." />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Pessoas avaliadas" value={signals.length} detail="Avaliações válidas importadas" icon={Users} tone="blue" /><MetricCard label="Média de desempenho" value={signals.length ? average.toFixed(1) : "—"} detail="Escala real de 0 a 10" icon={Target} tone="emerald" /><MetricCard label="Necessidades abertas" value={needs.length} detail="LNT ainda não atendida" icon={ClipboardList} tone="red" /><MetricCard label="Investimento planejado" value={money.format(investment)} detail={`${trainings.length} ação(ões) no plano`} icon={WalletCards} tone="amber" /></div>
    <div className="grid gap-5 xl:grid-cols-2"><ProgramPanel title="Gaps mais frequentes" description="Competências abaixo de 7 nas avaliações"><MiniBarList items={gaps} color="bg-red-500" empty="Importe a avaliação de desempenho para identificar gaps." /></ProgramPanel><ProgramPanel title="Necessidades por setor" description="Demandas abertas da LNT"><MiniBarList items={sectorNeeds} color="bg-teal-600" empty="Importe a LNT para consolidar as necessidades." /></ProgramPanel></div>
    <ProgramPanel title="Distribuição de desempenho" description="Faixas calculadas a partir da média real"><div className="h-72 p-4"><ResponsiveContainer width="100%" height="100%"><BarChart data={distribution}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" radius={[8, 8, 0, 0]}>{distribution.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}</Bar></BarChart></ResponsiveContainer></div></ProgramPanel>
  </div>;
}

function EmployeeView({ signals, selectedId, onSelect, selected, radar, gaps, needs }: { signals: SignalRecord[]; selectedId: string; onSelect: (id: string) => void; selected: SignalRecord | null; radar: { name: string; nota: number | null }[]; gaps: [string, { nota: number; evidencia?: string | null }][]; needs: NeedRecord[] }) {
  const relatedNeeds = selected ? needs.filter((item) => normalize(item.colaborador_nome_importado) === normalize(selected.colaborador_nome_importado)) : [];
  return <div className="space-y-5"><SectionTitle title="Ficha de Colaboradores" description="Perfil de desempenho, evidências, pontos fortes, gaps e necessidades em uma visão individual." />
    <ProgramPanel title="Selecionar colaborador"><div className="p-5"><select value={selectedId} onChange={(event) => onSelect(event.target.value)} className={inputClass}>{signals.map((item) => <option key={item.id} value={item.id}>{item.colaborador_nome_importado} · {item.setor_importado}</option>)}</select></div></ProgramPanel>
    {!selected ? <WorkspaceEmpty icon={UserRound} title="Nenhum colaborador avaliado" description="Importe a avaliação de desempenho para liberar as fichas individuais." /> : <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
      <ProgramPanel title={selected.colaborador_nome_importado} description={`${selected.cargo_importado} · ${selected.setor_importado} · Gestor: ${selected.gestor_importado}`}><div className="h-[420px] p-4"><ResponsiveContainer width="100%" height="100%"><RadarChart data={radar}><PolarGrid /><PolarAngleAxis dataKey="name" tick={{ fontSize: 9 }} /><Radar dataKey="nota" stroke="#0f766e" fill="#14b8a6" fillOpacity={0.3} /><Tooltip /></RadarChart></ResponsiveContainer></div></ProgramPanel>
      <div className="space-y-5"><MetricCard label="Média geral" value={selected.media_geral.toFixed(1)} detail={performanceBand(selected.media_geral)} icon={Target} tone="emerald" /><ProgramPanel title="Leitura qualitativa"><div className="space-y-4 p-5 text-xs"><div><p className="font-black text-emerald-700">Pontos fortes</p><p className="mt-1 leading-5 text-slate-600">{selected.pontos_fortes || "Não informado"}</p></div><div><p className="font-black text-red-700">Pontos a desenvolver</p><p className="mt-1 leading-5 text-slate-600">{selected.pontos_desenvolver || "Não informado"}</p></div></div></ProgramPanel><ProgramPanel title="Gaps e LNT"><div className="space-y-2 p-5">{gaps.length ? gaps.map(([key, value]) => <div key={key} className="flex justify-between rounded-lg bg-red-50 px-3 py-2 text-xs"><span className="font-bold text-red-800">{competenceLabel(key)}</span><span className="font-black text-red-700">{value.nota}</span></div>) : <p className="text-xs text-slate-500">Nenhuma competência abaixo de 7.</p>}{relatedNeeds.map((item) => <p key={item.id} className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">LNT: {[...item.necessidades_tecnicas, ...item.temas_comportamentais].join(", ") || item.treinamento_sugerido || "Sem tema informado"}</p>)}</div></ProgramPanel></div>
    </div>}
  </div>;
}

function PdiView({ signals, selectedId, onSelect, selected, gaps, courses, pdis, saving, onSubmit }: { signals: SignalRecord[]; selectedId: string; onSelect: (id: string) => void; selected: SignalRecord | null; gaps: [string, { nota: number }][]; courses: CourseRecord[]; pdis: PdiRecord[]; saving: boolean; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return <div className="space-y-5"><SectionTitle title="Gerar PDI Individual" description="Plano construído sobre a avaliação real, com ações, resultado esperado, prazo e acompanhamento." />
    {!signals.length ? <WorkspaceEmpty icon={Target} title="Avaliação necessária" description="Importe uma avaliação de desempenho antes de gerar o PDI." /> : <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]"><ProgramPanel title="Dados do PDI"><form onSubmit={onSubmit} className="space-y-4 p-5"><label className="text-xs font-bold text-slate-700">Colaborador<select value={selectedId} onChange={(event) => onSelect(event.target.value)} className={inputClass}>{signals.map((item) => <option key={item.id} value={item.id}>{item.colaborador_nome_importado}</option>)}</select></label><label className="text-xs font-bold text-slate-700">Objetivo principal<textarea name="objetivo" required minLength={10} rows={4} defaultValue={selected ? `Desenvolver as competências prioritárias de ${selected.colaborador_nome_importado} e acompanhar a evolução com o gestor.` : ""} className={inputClass} /></label><label className="text-xs font-bold text-slate-700">Prazo<input name="data_limite" type="date" required min={new Date().toISOString().slice(0, 10)} className={inputClass} /></label><button disabled={saving || !selected} className="flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-xs font-black text-white disabled:opacity-50"><Save className="mr-2 h-4 w-4" />Salvar PDI e ações</button></form></ProgramPanel><ProgramPanel title="Ações recomendadas" description="Recomendação automática; RH e gestor validam antes do acompanhamento"><div className="space-y-3 p-5">{gaps.length ? gaps.map(([key, value]) => { const course = courses.find((item) => item.competencia_chave === key); return <div key={key} className="rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between"><p className="text-xs font-black text-slate-800">{competenceLabel(key)}</p><Pill tone="red">Nota {value.nota}</Pill></div><p className="mt-2 text-xs leading-5 text-slate-500">{course ? `Curso sugerido: ${course.nome} (${course.carga_horaria}h)` : "Prática supervisionada com feedback periódico do gestor."}</p></div>; }) : <p className="text-xs text-slate-500">Sem gaps abaixo de 7. Cadastre um objetivo de manutenção ou preparação para novos desafios.</p>}</div></ProgramPanel></div>}
    <ProgramPanel title="PDIs registrados" action={<button type="button" onClick={() => window.print()} className="flex items-center text-xs font-black text-primary"><Printer className="mr-1.5 h-4 w-4" />Imprimir</button>}><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="px-5 py-3">Colaborador</th><th className="px-5 py-3">Objetivo</th><th className="px-5 py-3">Prazo</th><th className="px-5 py-3">Ações</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{pdis.map((item) => <tr key={item.id}><td className="px-5 py-4 font-bold text-slate-800">{item.colaborador_nome_importado}</td><td className="max-w-sm px-5 py-4 text-slate-600">{item.objetivo}</td><td className="px-5 py-4">{formatDate(item.data_limite)}</td><td className="px-5 py-4">{item.td_pdi_acoes?.length ?? 0}</td><td className="px-5 py-4"><Pill tone={item.status === "concluido" ? "emerald" : "blue"}>{item.status}</Pill></td></tr>)}</tbody></table>{!pdis.length && <p className="p-8 text-center text-xs text-slate-500">Nenhum PDI registrado.</p>}</div></ProgramPanel>
  </div>;
}

function TypesView({ courses, trainings, summary, onNew }: { courses: CourseRecord[]; trainings: TrainingRecord[]; summary: { name: string; value: number }[]; onNew: () => void }) {
  return <div className="space-y-5"><SectionTitle title="Tipos de Treinamentos" description="Catálogo corporativo e leitura do histórico por categoria, modalidade e obrigatoriedade." /><div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]"><ProgramPanel title="Ações por categoria"><MiniBarList items={summary} empty="Planeje treinamentos para formar o histórico." color="bg-violet-600" /></ProgramPanel><ProgramPanel title="Catálogo corporativo" action={<button type="button" onClick={onNew} className="flex items-center rounded-lg bg-primary px-3 py-2 text-xs font-black text-white"><Plus className="mr-1.5 h-4 w-4" />Novo tipo</button>}><div className="grid gap-3 p-5 md:grid-cols-2">{courses.map((course) => <article key={course.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-2"><Pill tone={course.obrigatorio ? "red" : "blue"}>{categoryLabels[course.categoria] ?? course.categoria}</Pill><span className="text-xs font-black text-slate-500">{course.carga_horaria}h</span></div><h4 className="mt-3 text-sm font-black text-slate-800">{course.nome}</h4><p className="mt-1 text-xs text-slate-500">{course.modalidade} · {course.validade_meses ? `validade ${course.validade_meses} meses` : "sem validade"}</p></article>)}</div>{!courses.length && <p className="p-8 text-center text-xs text-slate-500">Nenhum curso cadastrado.</p>}</ProgramPanel></div><MetricCard label="Treinamentos registrados" value={trainings.length} detail="Planejados, em andamento e concluídos" icon={GraduationCap} tone="violet" /></div>;
}

function MatrixView({ signals }: { signals: SignalRecord[] }) {
  return <div className="space-y-5"><SectionTitle title="Matriz por Setor" description="Comparação pessoa × competência. Células vazias permanecem vazias; o sistema não completa notas." /><ProgramPanel title="Matriz de competências"><div className="overflow-x-auto"><table className="min-w-[1500px] text-left text-[10px]"><thead className="sticky top-0 bg-slate-900 text-white"><tr><th className="px-3 py-3">Colaborador</th><th className="px-3 py-3">Setor</th>{TD_COMPETENCIES.map((item) => <th key={item.key} className="px-2 py-3 text-center">{item.label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{signals.map((signal) => <tr key={signal.id}><td className="whitespace-nowrap px-3 py-3 font-bold text-slate-800">{signal.colaborador_nome_importado}</td><td className="px-3 py-3 text-slate-500">{signal.setor_importado}</td>{TD_COMPETENCIES.map((item) => { const score = signal.competencias[item.key]?.nota; const style = score == null ? "bg-slate-50 text-slate-300" : score < 6 ? "bg-red-100 text-red-800" : score < 8 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"; return <td key={item.key} className="px-1 py-2 text-center"><span className={`inline-flex h-7 w-8 items-center justify-center rounded-md font-black ${style}`}>{score ?? "—"}</span></td>; })}</tr>)}</tbody></table>{!signals.length && <p className="p-8 text-center text-xs text-slate-500">Nenhuma avaliação disponível.</p>}</div></ProgramPanel></div>;
}

function LntView({ needs, onUpdate }: { needs: NeedRecord[]; onUpdate: (id: string, field: "prioridade" | "status", value: string) => void }) {
  return <div className="space-y-5"><SectionTitle title="Necessidades (LNT)" description="Base consolidada, priorização e transformação da necessidade em ação de desenvolvimento." /><ProgramPanel title="Levantamento de necessidades" description={`${needs.length} registro(s) no recorte atual`}><div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left text-xs"><thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="px-4 py-3">Colaborador</th><th className="px-4 py-3">Setor / Cargo</th><th className="px-4 py-3">Necessidades</th><th className="px-4 py-3">Sugestão</th><th className="px-4 py-3">Prioridade</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{needs.map((item) => <tr key={item.id}><td className="px-4 py-4"><p className="font-bold text-slate-800">{item.colaborador_nome_importado}</p><p className="mt-1 text-[10px] text-slate-400">Gestor: {item.gestor_importado}</p></td><td className="px-4 py-4 text-slate-600">{item.setor_importado}<br />{item.cargo_importado}</td><td className="max-w-sm px-4 py-4 text-slate-600">{[...item.necessidades_tecnicas, ...item.temas_comportamentais].join(", ") || "Não informada"}</td><td className="px-4 py-4 text-slate-600">{item.treinamento_sugerido || "—"}</td><td className="px-4 py-4"><select value={item.prioridade} onChange={(event) => void onUpdate(item.id, "prioridade", event.target.value)} className="rounded-lg border border-slate-200 p-2"><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option><option value="critica">Crítica</option></select></td><td className="px-4 py-4"><select value={item.status} onChange={(event) => void onUpdate(item.id, "status", event.target.value)} className="rounded-lg border border-slate-200 p-2"><option value="identificada">Identificada</option><option value="priorizada">Priorizada</option><option value="planejada">Planejada</option><option value="atendida">Atendida</option><option value="cancelada">Cancelada</option></select></td></tr>)}</tbody></table>{!needs.length && <p className="p-8 text-center text-xs text-slate-500">Nenhuma necessidade encontrada.</p>}</div></ProgramPanel></div>;
}

function ManagementView({ trainings, participations, onNew }: { trainings: TrainingRecord[]; participations: ParticipationRecord[]; onNew: () => void }) {
  return <div className="space-y-5"><SectionTitle title="Gestão de Treinamentos" description="Plano, execução, público, investimento e participação em uma base operacional única." /><ProgramPanel title="Plano de treinamentos" action={<button type="button" onClick={onNew} className="flex items-center rounded-lg bg-primary px-3 py-2 text-xs font-black text-white"><Plus className="mr-1.5 h-4 w-4" />Planejar</button>}><div className="grid gap-4 p-5 lg:grid-cols-2">{trainings.map((item) => { const people = participations.filter((person) => person.treinamento_id === item.id); return <article key={item.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><Pill tone={item.status === "concluido" ? "emerald" : item.status === "cancelado" ? "red" : "blue"}>{statusLabels[item.status] ?? item.status}</Pill><h4 className="mt-3 text-sm font-black text-slate-800">{item.titulo}</h4><p className="mt-1 text-xs text-slate-500">{formatDate(item.data_inicio)} · {item.carga_horaria}h · {item.modalidade}</p></div><span className="text-xs font-black text-slate-600">{money.format(item.custo_real ?? item.custo_planejado ?? 0)}</span></div><div className="mt-4 flex gap-4 border-t border-slate-100 pt-3 text-[10px] font-bold text-slate-500"><span>{people.length} participante(s)</span><span>{item.publico_alvo || "Público não informado"}</span></div></article>; })}</div>{!trainings.length && <p className="p-8 text-center text-xs text-slate-500">Nenhum treinamento planejado.</p>}</ProgramPanel></div>;
}

function CostsView({ planned, real, benefit, onBenefit, roi, trainings }: { planned: number; real: number; benefit: string; onBenefit: (value: string) => void; roi: number | null; trainings: TrainingRecord[] }) {
  return <div className="space-y-5"><SectionTitle title="Custos & ROI" description="Investimento do plano e cálculo transparente. O ROI só é exibido após informar um benefício mensurado." /><div className="grid gap-4 sm:grid-cols-3"><MetricCard label="Custo planejado" value={money.format(planned)} icon={WalletCards} tone="amber" /><MetricCard label="Custo realizado" value={money.format(real)} icon={CheckCircle2} tone="emerald" /><MetricCard label="ROI calculado" value={roi == null ? "Pendente" : `${roi.toFixed(1)}%`} detail={roi == null ? "Informe o benefício mensurado" : "(benefício − investimento) ÷ investimento"} icon={BarChart3} tone={roi != null && roi >= 0 ? "emerald" : "red"} /></div><ProgramPanel title="Mensuração do benefício" description="Ex.: redução de retrabalho, acidentes, horas extras ou perdas, validada pela área responsável"><div className="grid gap-4 p-5 md:grid-cols-2"><label className="text-xs font-bold text-slate-700">Benefício financeiro mensurado (R$)<input type="number" min="0" step="0.01" value={benefit} onChange={(event) => onBenefit(event.target.value)} className={inputClass} /></label><div className="rounded-xl bg-blue-50 p-4 text-xs leading-5 text-blue-800"><strong>Critério:</strong> o sistema não presume retorno. Registre somente um benefício que possa ser demonstrado por indicador e período.</div></div></ProgramPanel><ProgramPanel title="Custos por ação"><MiniBarList items={trainings.filter((item) => (item.custo_real ?? item.custo_planejado) != null).map((item) => ({ name: item.titulo, value: item.custo_real ?? item.custo_planejado ?? 0 })).sort((a, b) => b.value - a.value)} valueLabel={(value) => money.format(value)} color="bg-amber-500" empty="Nenhum custo informado no plano." /></ProgramPanel></div>;
}

function CalendarView({ trainings }: { trainings: TrainingRecord[] }) {
  const year = new Date().getFullYear(); const months = Array.from({ length: 12 }, (_, index) => new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date(year, index, 1)));
  return <div className="space-y-5"><SectionTitle title="Cronograma Anual" description={`Calendário ${year} construído com as datas reais do plano.`} /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{months.map((month, index) => { const monthTrainings = trainings.filter((item) => { const date = new Date(`${item.data_inicio}T12:00:00`); return date.getFullYear() === year && date.getMonth() === index; }); return <ProgramPanel key={month} title={month.charAt(0).toUpperCase() + month.slice(1)} description={`${monthTrainings.length} ação(ões)`}><div className="space-y-2 p-4">{monthTrainings.map((item) => <div key={item.id} className="rounded-xl border border-slate-200 p-3"><p className="text-xs font-black text-slate-800">{item.titulo}</p><p className="mt-1 text-[10px] text-slate-500">{formatDate(item.data_inicio)} · {statusLabels[item.status] ?? item.status}</p></div>)}{!monthTrainings.length && <p className="py-3 text-center text-[10px] text-slate-400">Sem ações planejadas</p>}</div></ProgramPanel>; })}</div></div>;
}

function NineBoxView({ signals }: { signals: SignalRecord[] }) {
  const cells = ["Risco", "Eficaz", "Especialista", "Questionável", "Mantenedor", "Alta Performance", "Enigma", "Forte Desempenho", "Estrela"];
  const positioned = signals.map((signal) => ({ signal, potential: estimatedPotential(signal.competencias) }));
  const pending = positioned.filter((item) => item.potential == null);
  return <div className="space-y-5"><SectionTitle title="Matriz 9-Box" description="Desempenho × potencial. Potencial é estimado apenas quando há notas nas competências declaradas; ausências ficam pendentes." /><div className="grid gap-3 lg:grid-cols-3">{cells.map((cell, index) => { const people = positioned.filter((item) => item.potential != null && nineBoxPosition(item.signal.media_geral, item.potential) === cell); const tone = index >= 6 ? "border-emerald-200 bg-emerald-50" : index >= 3 ? "border-amber-200 bg-amber-50" : "border-red-200 bg-red-50"; return <article key={cell} className={`min-h-40 rounded-2xl border p-4 ${tone}`}><div className="flex items-center justify-between"><h3 className="text-xs font-black text-slate-800">{cell}</h3><span className="text-xs font-black text-slate-500">{people.length}</span></div><div className="mt-3 space-y-2">{people.map(({ signal, potential }) => <div key={signal.id} className="rounded-lg bg-white/80 p-2 text-[10px] shadow-sm"><p className="font-black text-slate-800">{signal.colaborador_nome_importado}</p><p className="mt-0.5 text-slate-500">D {signal.media_geral.toFixed(1)} · P {potential?.toFixed(1)}</p></div>)}</div></article>; })}</div>{pending.length > 0 && <ProgramPanel title="Potencial pendente" description="Essas pessoas não foram posicionadas porque faltam competências válidas para estimar potencial"><div className="flex flex-wrap gap-2 p-5">{pending.map(({ signal }) => <Pill key={signal.id} tone="slate">{signal.colaborador_nome_importado}</Pill>)}</div></ProgramPanel>}</div>;
}

function ImportPanel({ preview, reading, saving, onRead, onSave, onClose }: { preview: Preview | null; reading: TdImportType | null; saving: boolean; onRead: (type: TdImportType, file: File | null) => void; onSave: () => void; onClose: () => void }) {
  return <ProgramPanel title="Importar bases de T&D" description="Na primeira carga, envie a base histórica. Depois, envie arquivos somente com as novas respostas; reimportações idênticas são bloqueadas." action={<button type="button" onClick={onClose}><X className="h-4 w-4 text-slate-400" /></button>}><div className="grid gap-4 p-5 md:grid-cols-2">{([{ type: "lnt", label: "Planilha de LNT" }, { type: "avaliacao_desempenho", label: "Avaliação de desempenho" }] as const).map((item) => <label key={item.type} className="cursor-pointer rounded-xl border border-dashed border-slate-300 p-5 text-center hover:border-primary"><FileSpreadsheet className="mx-auto h-7 w-7 text-emerald-600" /><span className="mt-2 block text-xs font-black text-slate-700">{item.label}</span><span className="mt-1 block text-[10px] text-slate-400">XLSX · leitura local com prévia</span><input type="file" accept=".xlsx" className="sr-only" onChange={(event) => void onRead(item.type, event.target.files?.[0] ?? null)} />{reading === item.type && <Loader2 className="mx-auto mt-3 h-4 w-4 animate-spin" />}</label>)}</div>{preview && <div className="border-t border-slate-100 p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black text-slate-800">{preview.file.name}</p><p className="mt-1 text-[10px] text-slate-500">{preview.result.registros.length} válidos · {preview.result.linhasRejeitadas} rejeitados · {preview.result.avisos.length} avisos</p></div><button type="button" disabled={saving || !preview.result.registros.length} onClick={() => void onSave()} className="flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-xs font-black text-white disabled:opacity-50">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Confirmar importação incremental</button></div></div>}</ProgramPanel>;
}

function TrainingModal({ courses, saving, onClose, onSubmit }: { courses: CourseRecord[]; saving: boolean; onClose: () => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return <Modal title="Planejar treinamento" onClose={onClose}><form onSubmit={onSubmit} className="space-y-4 p-6"><div className="grid gap-4 md:grid-cols-2"><label className="text-xs font-bold">Curso do catálogo<select name="curso_id" className={inputClass}><option value="">Ação avulsa</option>{courses.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label><label className="text-xs font-bold">Título *<input name="titulo" required className={inputClass} /></label><label className="text-xs font-bold">Categoria<select name="categoria" className={inputClass}>{Object.entries(categoryLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="text-xs font-bold">Modalidade<select name="modalidade" className={inputClass}><option value="presencial">Presencial</option><option value="ead">EAD</option><option value="hibrido">Híbrido</option></select></label><label className="text-xs font-bold">Carga horária *<input name="carga_horaria" type="number" min="0.5" step="0.5" required className={inputClass} /></label><label className="text-xs font-bold">Data *<input name="data_inicio" type="date" required className={inputClass} /></label><label className="text-xs font-bold">Fornecedor<input name="fornecedor" className={inputClass} /></label><label className="text-xs font-bold">Instrutor<input name="instrutor" className={inputClass} /></label><label className="text-xs font-bold">Público-alvo<input name="publico_alvo" className={inputClass} /></label><label className="text-xs font-bold">Custo planejado<input name="custo_planejado" type="number" min="0" step="0.01" className={inputClass} /></label></div><SubmitButtons saving={saving} onClose={onClose} label="Salvar no plano" /></form></Modal>;
}

function CourseModal({ saving, onClose, onSubmit }: { saving: boolean; onClose: () => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return <Modal title="Novo tipo de treinamento" onClose={onClose}><form onSubmit={onSubmit} className="space-y-4 p-6"><div className="grid gap-4 md:grid-cols-2"><label className="text-xs font-bold md:col-span-2">Nome *<input name="nome" required className={inputClass} /></label><label className="text-xs font-bold">Categoria<select name="categoria" className={inputClass}>{Object.entries(categoryLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="text-xs font-bold">Competência vinculada<select name="competencia_chave" className={inputClass}><option value="">Não vinculada</option>{TD_COMPETENCIES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label><label className="text-xs font-bold">Modalidade<select name="modalidade" className={inputClass}><option value="presencial">Presencial</option><option value="ead">EAD</option><option value="hibrido">Híbrido</option></select></label><label className="text-xs font-bold">Carga horária *<input name="carga_horaria" type="number" min="0.5" step="0.5" required className={inputClass} /></label><label className="text-xs font-bold">Validade (meses)<input name="validade_meses" type="number" min="1" max="120" className={inputClass} /></label><label className="text-xs font-bold">Obrigatório?<select name="obrigatorio" className={inputClass}><option value="false">Não</option><option value="true">Sim</option></select></label></div><SubmitButtons saving={saving} onClose={onClose} label="Cadastrar tipo" /></form></Modal>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm md:p-8"><div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-100 px-6 py-5"><h3 className="font-black text-slate-900">{title}</h3><button type="button" onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button></div>{children}</div></div>; }
function SubmitButtons({ saving, onClose, label }: { saving: boolean; onClose: () => void; label: string }) { return <div className="flex justify-end gap-3 border-t border-slate-100 pt-4"><button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-600">Cancelar</button><button disabled={saving} className="flex items-center rounded-xl bg-primary px-4 py-2.5 text-xs font-black text-white disabled:opacity-50">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{label}</button></div>; }
