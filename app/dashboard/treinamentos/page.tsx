"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileCheck2,
  FileSpreadsheet,
  GraduationCap,
  Loader2,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Target,
  Upload,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { readXlsxRows } from "@/lib/xlsx-browser";
import {
  parseLntRows,
  parsePerformanceRows,
  summarizeLnt,
  summarizePerformance,
  TD_COMPETENCIES,
  type TdImportType,
  type TdLntRecord,
  type TdParseResult,
  type TdPerformanceRecord,
} from "@/lib/treinamento-desenvolvimento";

type View = "visao" | "importacoes" | "lnt" | "agenda" | "catalogo";
type Preview =
  | { type: "lnt"; file: File; result: TdParseResult<TdLntRecord> }
  | { type: "avaliacao_desempenho"; file: File; result: TdParseResult<TdPerformanceRecord> };

type ImportRecord = {
  id: string;
  tipo: TdImportType;
  nome_arquivo: string;
  status: string;
  total_linhas: number;
  linhas_validas: number;
  linhas_rejeitadas: number;
  importado_em: string;
};

type NeedRecord = {
  id: string;
  colaborador_nome_importado: string;
  gestor_importado: string;
  setor_importado: string;
  cargo_importado: string;
  necessidades_tecnicas: string[];
  temas_comportamentais: string[];
  treinamento_sugerido: string | null;
  prioridade: string;
  status: string;
  vinculo_status: string;
};

type SignalRecord = {
  id: string;
  setor_importado: string;
  media_geral: number;
  competencias: Record<string, { nota: number }>;
};

type CourseRecord = {
  id: string;
  nome: string;
  categoria: string;
  competencia_chave: string | null;
  modalidade: string;
  carga_horaria: number;
  validade_meses: number | null;
  obrigatorio: boolean;
  ativo: boolean;
};

type TrainingRecord = {
  id: string;
  curso_id: string | null;
  titulo: string;
  categoria: string;
  modalidade: string;
  carga_horaria: number;
  data_inicio: string;
  data_fim: string | null;
  fornecedor: string | null;
  instrutor: string | null;
  publico_alvo: string | null;
  custo_planejado: number | null;
  status: string;
};

const inputClass = "mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100";
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const categoryLabels: Record<string, string> = {
  tecnico: "Técnico", comportamental: "Comportamental", nr_legal: "NR / Legal",
  integracao: "Integração", qualidade: "Qualidade", gestao: "Gestão", outro: "Outro",
};
const statusLabels: Record<string, string> = {
  planejado: "Planejado", inscricoes: "Inscrições", em_andamento: "Em andamento",
  concluido: "Concluído", cancelado: "Cancelado",
};

async function fileHash(file: File) {
  const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function currentYear() {
  return new Date().getFullYear();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}

export default function TreinamentoDesenvolvimentoPage() {
  const [view, setView] = useState<View>("visao");
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [needs, setNeeds] = useState<NeedRecord[]>([]);
  const [signals, setSignals] = useState<SignalRecord[]>([]);
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [trainings, setTrainings] = useState<TrainingRecord[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [reading, setReading] = useState<TdImportType | null>(null);
  const [saving, setSaving] = useState(false);
  const [showTrainingForm, setShowTrainingForm] = useState(false);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [importsResult, needsResult, signalsResult, coursesResult, trainingsResult] = await Promise.all([
      supabase.from("td_importacoes").select("id,tipo,nome_arquivo,status,total_linhas,linhas_validas,linhas_rejeitadas,importado_em").order("importado_em", { ascending: false }).limit(20),
      supabase.from("td_lnt_necessidades").select("id,colaborador_nome_importado,gestor_importado,setor_importado,cargo_importado,necessidades_tecnicas,temas_comportamentais,treinamento_sugerido,prioridade,status,vinculo_status").order("criado_em", { ascending: false }).limit(500),
      supabase.from("td_avaliacoes_sinais").select("id,setor_importado,media_geral,competencias").order("criado_em", { ascending: false }).limit(500),
      supabase.from("td_cursos").select("id,nome,categoria,competencia_chave,modalidade,carga_horaria,validade_meses,obrigatorio,ativo").eq("ativo", true).order("nome"),
      supabase.from("td_treinamentos").select("id,curso_id,titulo,categoria,modalidade,carga_horaria,data_inicio,data_fim,fornecedor,instrutor,publico_alvo,custo_planejado,status").order("data_inicio"),
    ]);

    const firstError = [importsResult.error, needsResult.error, signalsResult.error, coursesResult.error, trainingsResult.error].find(Boolean);
    if (firstError) {
      setMessage({
        type: "error",
        text: firstError.message.includes("td_importacoes")
          ? "O banco do módulo ainda não foi preparado. Execute a migração 20260813_003 no Supabase."
          : `Não foi possível carregar o módulo: ${firstError.message}`,
      });
    } else {
      setImports((importsResult.data ?? []) as ImportRecord[]);
      setNeeds((needsResult.data ?? []) as NeedRecord[]);
      setSignals((signalsResult.data ?? []) as SignalRecord[]);
      setCourses((coursesResult.data ?? []).map((item) => ({ ...item, carga_horaria: Number(item.carga_horaria) })) as CourseRecord[]);
      setTrainings((trainingsResult.data ?? []).map((item) => ({ ...item, carga_horaria: Number(item.carga_horaria), custo_planejado: item.custo_planejado == null ? null : Number(item.custo_planejado) })) as TrainingRecord[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadData]);

  const openNeeds = needs.filter((item) => !["atendida", "cancelada"].includes(item.status));
  const plannedInvestment = trainings.reduce((total, item) => total + (item.custo_planejado ?? 0), 0);
  const pendingEffectiveness = trainings.filter((item) => item.status === "concluido").length;

  const gapRanking = useMemo(() => {
    const counts = new Map<string, number>();
    signals.forEach((signal) => Object.entries(signal.competencias ?? {}).forEach(([key, value]) => {
      if (Number(value?.nota) < 7) counts.set(key, (counts.get(key) ?? 0) + 1);
    }));
    return [...counts.entries()]
      .map(([key, count]) => ({ key, label: TD_COMPETENCIES.find((item) => item.key === key)?.label ?? key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [signals]);

  const sectorRanking = useMemo(() => {
    const counts = new Map<string, number>();
    openNeeds.forEach((item) => counts.set(item.setor_importado, (counts.get(item.setor_importado) ?? 0) + 1));
    return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [openNeeds]);

  const filteredNeeds = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    if (!term) return needs;
    return needs.filter((item) => [item.colaborador_nome_importado, item.setor_importado, item.cargo_importado, item.treinamento_sugerido ?? ""]
      .some((value) => value.toLocaleLowerCase("pt-BR").includes(term)));
  }, [needs, search]);

  async function readFile(type: TdImportType, file: File | null) {
    if (!file) return;
    setReading(type);
    setMessage(null);
    setPreview(null);
    try {
      if (!file.name.toLowerCase().endsWith(".xlsx")) throw new Error("Envie a planilha no formato XLSX.");
      const rows = await readXlsxRows(file);
      if (type === "lnt") setPreview({ type, file, result: parseLntRows(rows) });
      else setPreview({ type, file, result: parsePerformanceRows(rows) });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Não foi possível ler a planilha." });
    } finally {
      setReading(null);
    }
  }

  async function saveImport() {
    if (!preview) return;
    setSaving(true);
    setMessage(null);
    let importId: string | null = null;
    try {
      const digest = await fileHash(preview.file);
      const { data: duplicate, error: duplicateError } = await supabase.from("td_importacoes").select("id").eq("tipo", preview.type).eq("hash_arquivo", digest).in("status", ["concluida", "concluida_com_avisos"]).maybeSingle();
      if (duplicateError) throw new Error(`Não foi possível verificar duplicidade: ${duplicateError.message}`);
      if (duplicate) throw new Error("Esta mesma planilha já foi importada para este módulo.");

      const { data: importRecord, error: importError } = await supabase.from("td_importacoes").insert({
        tipo: preview.type,
        nome_arquivo: preview.file.name,
        tamanho_arquivo: preview.file.size,
        hash_arquivo: digest,
        status: "processando",
        ano_referencia: currentYear(),
        total_linhas: preview.result.linhasLidas,
        linhas_validas: preview.result.registros.length,
        linhas_rejeitadas: preview.result.linhasRejeitadas,
        avisos: preview.result.avisos.slice(0, 500),
        metadados: { linha_cabecalho: preview.result.linhaCabecalho },
      }).select("id").single();
      if (importError) throw new Error(`Não foi possível registrar a importação: ${importError.message}`);
      importId = importRecord.id;

      if (preview.type === "lnt") {
        const payload = preview.result.registros.map((record) => ({ importacao_id: importRecord.id, ...record, prioridade: "media", status: "identificada", vinculo_status: "pendente" }));
        for (let index = 0; index < payload.length; index += 300) {
          const { error } = await supabase.from("td_lnt_necessidades").insert(payload.slice(index, index + 300));
          if (error) throw new Error(`Falha ao salvar as linhas: ${error.message}`);
        }
      } else {
        const payload = preview.result.registros.map((record) => ({ importacao_id: importRecord.id, ...record, vinculo_status: "pendente" }));
        for (let index = 0; index < payload.length; index += 300) {
          const { error } = await supabase.from("td_avaliacoes_sinais").insert(payload.slice(index, index + 300));
          if (error) throw new Error(`Falha ao salvar as linhas: ${error.message}`);
        }
      }

      const status = preview.result.avisos.length || preview.result.linhasRejeitadas ? "concluida_com_avisos" : "concluida";
      const { error: finishError } = await supabase.from("td_importacoes").update({ status, finalizado_em: new Date().toISOString() }).eq("id", importRecord.id);
      if (finishError) throw new Error(`Dados salvos, mas o fechamento falhou: ${finishError.message}`);

      setMessage({ type: "success", text: `${preview.result.registros.length} registros importados. Os vínculos com colaboradores permanecem pendentes para conferência.` });
      setPreview(null);
      await loadData();
    } catch (error) {
      if (importId) {
        await Promise.all([
          supabase.from("td_lnt_necessidades").delete().eq("importacao_id", importId),
          supabase.from("td_avaliacoes_sinais").delete().eq("importacao_id", importId),
        ]);
        await supabase.from("td_importacoes").update({ status: "falhou", finalizado_em: new Date().toISOString() }).eq("id", importId);
      }
      setMessage({ type: "error", text: error instanceof Error ? error.message : "A importação falhou." });
    } finally {
      setSaving(false);
    }
  }

  async function updateNeed(id: string, field: "prioridade" | "status", value: string) {
    const { error } = await supabase.from("td_lnt_necessidades").update({ [field]: value }).eq("id", id);
    if (error) setMessage({ type: "error", text: `Não foi possível atualizar a necessidade: ${error.message}` });
    else setNeeds((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item));
  }

  async function createTraining(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const courseId = String(form.get("curso_id") ?? "");
    const course = courses.find((item) => item.id === courseId);
    const { error } = await supabase.from("td_treinamentos").insert({
      curso_id: courseId || null,
      titulo: String(form.get("titulo") ?? "").trim(),
      categoria: String(form.get("categoria") ?? course?.categoria ?? "outro"),
      modalidade: String(form.get("modalidade") ?? course?.modalidade ?? "presencial"),
      carga_horaria: Number(form.get("carga_horaria") ?? course?.carga_horaria ?? 1),
      data_inicio: String(form.get("data_inicio") ?? ""),
      fornecedor: String(form.get("fornecedor") ?? "").trim() || null,
      instrutor: String(form.get("instrutor") ?? "").trim() || null,
      publico_alvo: String(form.get("publico_alvo") ?? "").trim() || null,
      custo_planejado: form.get("custo_planejado") ? Number(form.get("custo_planejado")) : null,
      status: "planejado",
    });
    if (error) setMessage({ type: "error", text: `Não foi possível planejar o treinamento: ${error.message}` });
    else {
      setShowTrainingForm(false);
      setMessage({ type: "success", text: "Ação adicionada ao plano anual." });
      await loadData();
    }
    setSaving(false);
  }

  async function createCourse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const { error } = await supabase.from("td_cursos").insert({
      nome: String(form.get("nome") ?? "").trim(),
      categoria: String(form.get("categoria") ?? "outro"),
      competencia_chave: String(form.get("competencia_chave") ?? "") || null,
      modalidade: String(form.get("modalidade") ?? "presencial"),
      carga_horaria: Number(form.get("carga_horaria") ?? 1),
      validade_meses: form.get("validade_meses") ? Number(form.get("validade_meses")) : null,
      obrigatorio: form.get("obrigatorio") === "true",
      ativo: true,
    });
    if (error) setMessage({ type: "error", text: `Não foi possível cadastrar o curso: ${error.message}` });
    else {
      setShowCourseForm(false);
      setMessage({ type: "success", text: "Curso adicionado ao catálogo." });
      await loadData();
    }
    setSaving(false);
  }

  async function updateTrainingStatus(id: string, status: string) {
    const { error } = await supabase.from("td_treinamentos").update({ status }).eq("id", id);
    if (error) setMessage({ type: "error", text: `Não foi possível atualizar o treinamento: ${error.message}` });
    else setTrainings((current) => current.map((item) => item.id === id ? { ...item, status } : item));
  }

  const tabs: { key: View; label: string; icon: typeof BarChart3 }[] = [
    { key: "visao", label: "Visão geral", icon: BarChart3 },
    { key: "importacoes", label: "Importar bases", icon: Upload },
    { key: "lnt", label: "LNT consolidada", icon: ClipboardList },
    { key: "agenda", label: "Plano anual", icon: CalendarDays },
    { key: "catalogo", label: "Catálogo", icon: BookOpenCheck },
  ];

  return (
    <div className="space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div><p className="text-sm font-semibold text-secondary">Treinamento & Desenvolvimento</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">Da necessidade à eficácia</h2><p className="mt-1 text-sm text-gray-500">LNT, desempenho, catálogo, calendário, custos e acompanhamento em uma única trilha.</p></div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setView("agenda"); setShowTrainingForm(true); }} className="flex items-center rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-dark"><Plus className="mr-2 h-4 w-4" />Planejar treinamento</button></div>
      </div>

      {message && <div role="alert" className={`flex items-start justify-between rounded-xl border px-4 py-3 text-sm ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}><span>{message.text}</span><button type="button" aria-label="Fechar aviso" onClick={() => setMessage(null)}><X className="h-4 w-4" /></button></div>}

      <nav className="flex gap-1 overflow-x-auto rounded-xl border border-gray-100 bg-white p-1.5 shadow-sm">{tabs.map(({ key, label, icon: Icon }) => <button key={key} type="button" onClick={() => setView(key)} className={`flex shrink-0 items-center rounded-lg px-4 py-2.5 text-sm font-semibold transition ${view === key ? "bg-primary text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"}`}><Icon className="mr-2 h-4 w-4" />{label}</button>)}</nav>

      {loading ? <div className="flex items-center justify-center rounded-xl border border-gray-100 bg-white p-16 text-sm text-gray-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Carregando o módulo…</div> : <>
        {view === "visao" && <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
            { label: "Necessidades abertas", value: openNeeds.length, icon: Target, color: "bg-red-50 text-red-700" },
            { label: "Ações planejadas", value: trainings.filter((item) => !["concluido", "cancelado"].includes(item.status)).length, icon: CalendarDays, color: "bg-blue-50 text-blue-700" },
            { label: "Eficácia a acompanhar", value: pendingEffectiveness, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700" },
            { label: "Investimento planejado", value: money.format(plannedInvestment), icon: WalletCards, color: "bg-amber-50 text-amber-700" },
          ].map(({ label, value, icon: Icon, color }) => <div key={label} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p><p className="mt-2 text-2xl font-bold text-gray-900">{value}</p></div><div className={`rounded-xl p-3 ${color}`}><Icon className="h-5 w-5" /></div></div></div>)}</section>
          <section className="grid gap-5 xl:grid-cols-2">
            <RankingCard title="Gaps de desempenho por competência" empty="Importe a avaliação para identificar os principais gaps." items={gapRanking} color="bg-red-500" />
            <RankingCard title="Necessidades abertas por setor" empty="Importe a LNT para consolidar as demandas dos setores." items={sectorRanking} color="bg-blue-600" />
          </section>
          <section className="rounded-xl border border-blue-100 bg-blue-50 p-5"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-800" /><div><h3 className="text-sm font-bold text-blue-950">Vínculo humano obrigatório</h3><p className="mt-1 text-sm text-blue-800">As planilhas não possuem matrícula. Os nomes são importados com status pendente e só devem ser ligados ao cadastro oficial após conferência do RH.</p></div></div></section>
        </div>}

        {view === "importacoes" && <div className="space-y-6">
          <section className="grid gap-5 lg:grid-cols-2"><ImportCard type="lnt" title="Levantamento de Necessidades (LNT)" description="Gestor, setor, colaborador, cargo, necessidades técnicas, temas comportamentais e curso sugerido." reading={reading === "lnt"} onFile={(file) => void readFile("lnt", file)} /><ImportCard type="avaliacao_desempenho" title="Avaliação de Desempenho" description="15 competências reais, evidências, pontos fortes e pontos a desenvolver. Respostas vazias não recebem nota." reading={reading === "avaliacao_desempenho"} onFile={(file) => void readFile("avaliacao_desempenho", file)} /></section>
          {preview && <PreviewPanel preview={preview} saving={saving} onCancel={() => setPreview(null)} onSave={() => void saveImport()} />}
          <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm"><div className="border-b border-gray-100 p-5"><h3 className="font-bold text-gray-900">Histórico de importações</h3><p className="mt-1 text-xs text-gray-500">O arquivo original não é publicado; o banco mantém hash, resultado e rastreabilidade.</p></div>{imports.length === 0 ? <div className="p-10 text-center text-sm text-gray-500">Nenhuma base importada.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-5 py-3">Base</th><th className="px-5 py-3">Arquivo</th><th className="px-5 py-3">Resultado</th><th className="px-5 py-3">Linhas</th><th className="px-5 py-3">Data</th></tr></thead><tbody className="divide-y divide-gray-100">{imports.map((item) => <tr key={item.id}><td className="px-5 py-4 font-semibold text-gray-800">{item.tipo === "lnt" ? "LNT" : "Desempenho"}</td><td className="px-5 py-4 text-gray-600">{item.nome_arquivo}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.status === "concluida" ? "bg-emerald-50 text-emerald-700" : item.status === "concluida_com_avisos" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>{item.status.replaceAll("_", " ")}</span></td><td className="px-5 py-4 text-gray-600">{item.linhas_validas} válidas · {item.linhas_rejeitadas} rejeitadas</td><td className="px-5 py-4 text-gray-500">{new Date(item.importado_em).toLocaleString("pt-BR")}</td></tr>)}</tbody></table></div>}</section>
        </div>}

        {view === "lnt" && <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-gray-100 p-5 md:flex-row md:items-center md:justify-between"><div><h3 className="font-bold text-gray-900">LNT consolidada</h3><p className="mt-1 text-xs text-gray-500">Priorize a demanda e acompanhe até ela ser atendida.</p></div><div className="relative w-full md:w-80"><Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary" placeholder="Buscar pessoa, setor, cargo ou curso" /></div></div>{filteredNeeds.length === 0 ? <div className="p-12 text-center text-sm text-gray-500">Importe a planilha de LNT para preencher esta visão.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[1180px] text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Colaborador</th><th className="px-4 py-3">Setor / Cargo</th><th className="px-4 py-3">Necessidades</th><th className="px-4 py-3">Curso sugerido</th><th className="px-4 py-3">Prioridade</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Vínculo</th></tr></thead><tbody className="divide-y divide-gray-100">{filteredNeeds.map((item) => <tr key={item.id} className="align-top hover:bg-gray-50/60"><td className="px-4 py-4"><p className="font-semibold text-gray-900">{item.colaborador_nome_importado}</p><p className="mt-1 text-xs text-gray-500">Gestor: {item.gestor_importado}</p></td><td className="px-4 py-4"><p className="font-medium text-gray-700">{item.setor_importado}</p><p className="mt-1 text-xs text-gray-500">{item.cargo_importado}</p></td><td className="max-w-sm px-4 py-4"><div className="flex flex-wrap gap-1">{[...item.necessidades_tecnicas, ...item.temas_comportamentais].slice(0, 5).map((need) => <span key={need} className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-800">{need}</span>)}</div></td><td className="max-w-xs px-4 py-4 text-gray-600">{item.treinamento_sugerido || "—"}</td><td className="px-4 py-4"><SelectWithChevron value={item.prioridade} onChange={(value) => void updateNeed(item.id, "prioridade", value)} options={["baixa", "media", "alta", "critica"]} /></td><td className="px-4 py-4"><SelectWithChevron value={item.status} onChange={(value) => void updateNeed(item.id, "status", value)} options={["identificada", "priorizada", "planejada", "atendida", "cancelada"]} /></td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.vinculo_status === "vinculado" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{item.vinculo_status.replaceAll("_", " ")}</span></td></tr>)}</tbody></table></div>}</section>}

        {view === "agenda" && <div className="space-y-5"><div className="flex justify-end"><button type="button" onClick={() => setShowTrainingForm(true)} className="flex items-center rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-dark"><Plus className="mr-2 h-4 w-4" />Nova ação</button></div><section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{trainings.length === 0 ? <div className="col-span-full rounded-xl border border-gray-100 bg-white p-12 text-center text-sm text-gray-500">O plano anual ainda está vazio.</div> : trainings.map((item) => <article key={item.id} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><span className="text-xs font-bold uppercase tracking-wide text-blue-700">{categoryLabels[item.categoria] ?? item.categoria}</span><h3 className="mt-1 font-bold text-gray-900">{item.titulo}</h3></div><span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">{statusLabels[item.status] ?? item.status}</span></div><div className="mt-4 space-y-2 text-sm text-gray-600"><p><CalendarDays className="mr-2 inline h-4 w-4 text-gray-400" />{formatDate(item.data_inicio)}</p><p><GraduationCap className="mr-2 inline h-4 w-4 text-gray-400" />{item.carga_horaria}h · {item.modalidade}</p><p><Users className="mr-2 inline h-4 w-4 text-gray-400" />{item.publico_alvo || "Público a definir"}</p><p><WalletCards className="mr-2 inline h-4 w-4 text-gray-400" />{item.custo_planejado == null ? "Custo a definir" : money.format(item.custo_planejado)}</p></div><div className="relative mt-4"><select value={item.status} onChange={(event) => void updateTrainingStatus(item.id, event.target.value)} className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-9 text-xs font-semibold text-gray-700 outline-none focus:border-primary">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-gray-400" /></div></article>)}</section></div>}

        {view === "catalogo" && <div className="space-y-5"><div className="flex justify-end"><button type="button" onClick={() => setShowCourseForm(true)} className="flex items-center rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-dark"><Plus className="mr-2 h-4 w-4" />Novo curso</button></div><section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">{courses.length === 0 ? <div className="p-12 text-center text-sm text-gray-500">Execute a migração para criar o catálogo inicial.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-5 py-3">Curso</th><th className="px-5 py-3">Categoria</th><th className="px-5 py-3">Competência</th><th className="px-5 py-3">Modalidade</th><th className="px-5 py-3">Carga</th><th className="px-5 py-3">Validade</th><th className="px-5 py-3">Obrigatório</th></tr></thead><tbody className="divide-y divide-gray-100">{courses.map((course) => <tr key={course.id}><td className="px-5 py-4 font-semibold text-gray-900">{course.nome}</td><td className="px-5 py-4 text-gray-600">{categoryLabels[course.categoria] ?? course.categoria}</td><td className="px-5 py-4 text-gray-600">{TD_COMPETENCIES.find((item) => item.key === course.competencia_chave)?.label ?? "—"}</td><td className="px-5 py-4 capitalize text-gray-600">{course.modalidade}</td><td className="px-5 py-4 text-gray-600">{course.carga_horaria}h</td><td className="px-5 py-4 text-gray-600">{course.validade_meses ? `${course.validade_meses} meses` : "Sem validade"}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${course.obrigatorio ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-600"}`}>{course.obrigatorio ? "Sim" : "Não"}</span></td></tr>)}</tbody></table></div>}</section></div>}
      </>}

      {showTrainingForm && <Modal title="Planejar ação de treinamento" subtitle="A ação entra no calendário e poderá receber participantes, presença e avaliação de eficácia." onClose={() => setShowTrainingForm(false)}><form onSubmit={createTraining} className="space-y-5"><div className="grid gap-5 md:grid-cols-2"><label className="text-sm font-semibold text-gray-700 md:col-span-2">Título *<input name="titulo" required minLength={3} maxLength={200} className={inputClass} /></label><label className="text-sm font-semibold text-gray-700">Curso do catálogo<select name="curso_id" className={inputClass} defaultValue=""><option value="">Sem vínculo</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.nome}</option>)}</select></label><label className="text-sm font-semibold text-gray-700">Categoria *<select name="categoria" className={inputClass} defaultValue="tecnico">{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-sm font-semibold text-gray-700">Modalidade *<select name="modalidade" className={inputClass} defaultValue="presencial"><option value="presencial">Presencial</option><option value="ead">EAD</option><option value="hibrido">Híbrido</option></select></label><label className="text-sm font-semibold text-gray-700">Carga horária *<input name="carga_horaria" type="number" min="0.5" max="1000" step="0.5" defaultValue="8" required className={inputClass} /></label><label className="text-sm font-semibold text-gray-700">Data de início *<input name="data_inicio" type="date" required className={inputClass} /></label><label className="text-sm font-semibold text-gray-700">Custo planejado<input name="custo_planejado" type="number" min="0" step="0.01" className={inputClass} /></label><label className="text-sm font-semibold text-gray-700">Fornecedor<input name="fornecedor" maxLength={160} className={inputClass} /></label><label className="text-sm font-semibold text-gray-700">Instrutor<input name="instrutor" maxLength={160} className={inputClass} /></label><label className="text-sm font-semibold text-gray-700 md:col-span-2">Público-alvo<input name="publico_alvo" maxLength={500} placeholder="Ex.: Equipe de Manutenção Elétrica" className={inputClass} /></label></div><FormActions saving={saving} onCancel={() => setShowTrainingForm(false)} label="Adicionar ao plano" /></form></Modal>}

      {showCourseForm && <Modal title="Adicionar curso ao catálogo" subtitle="O catálogo padroniza modalidade, carga horária, competência e validade." onClose={() => setShowCourseForm(false)}><form onSubmit={createCourse} className="space-y-5"><div className="grid gap-5 md:grid-cols-2"><label className="text-sm font-semibold text-gray-700 md:col-span-2">Nome do curso *<input name="nome" required minLength={3} maxLength={200} className={inputClass} /></label><label className="text-sm font-semibold text-gray-700">Categoria *<select name="categoria" className={inputClass} defaultValue="tecnico">{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-sm font-semibold text-gray-700">Competência vinculada<select name="competencia_chave" className={inputClass} defaultValue=""><option value="">Nenhuma</option>{TD_COMPETENCIES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label><label className="text-sm font-semibold text-gray-700">Modalidade *<select name="modalidade" className={inputClass} defaultValue="presencial"><option value="presencial">Presencial</option><option value="ead">EAD</option><option value="hibrido">Híbrido</option></select></label><label className="text-sm font-semibold text-gray-700">Carga horária *<input name="carga_horaria" type="number" min="0.5" max="1000" step="0.5" defaultValue="8" required className={inputClass} /></label><label className="text-sm font-semibold text-gray-700">Validade em meses<input name="validade_meses" type="number" min="1" max="120" className={inputClass} /></label><label className="flex items-center gap-3 pt-7 text-sm font-semibold text-gray-700"><input name="obrigatorio" value="true" type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary" />Treinamento obrigatório</label></div><FormActions saving={saving} onCancel={() => setShowCourseForm(false)} label="Salvar curso" /></form></Modal>}
    </div>
  );
}

function RankingCard({ title, empty, items, color }: { title: string; empty: string; items: { label: string; count: number }[]; color: string }) {
  const maximum = Math.max(1, ...items.map((item) => item.count));
  return <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"><h3 className="font-bold text-gray-900">{title}</h3>{items.length === 0 ? <p className="mt-8 text-center text-sm text-gray-500">{empty}</p> : <div className="mt-5 space-y-4">{items.map((item) => <div key={item.label}><div className="mb-1.5 flex items-center justify-between gap-4 text-sm"><span className="truncate font-medium text-gray-700">{item.label}</span><span className="font-bold text-gray-900">{item.count}</span></div><div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(5, (item.count / maximum) * 100)}%` }} /></div></div>)}</div>}</div>;
}

function ImportCard({ type, title, description, reading, onFile }: { type: TdImportType; title: string; description: string; reading: boolean; onFile: (file: File | null) => void }) {
  const inputId = `file-${type}`;
  return <article className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"><div className="flex items-start gap-4"><div className="rounded-xl bg-blue-50 p-3 text-blue-800"><FileSpreadsheet className="h-6 w-6" /></div><div><h3 className="font-bold text-gray-900">{title}</h3><p className="mt-1 text-sm leading-6 text-gray-500">{description}</p></div></div><label htmlFor={inputId} className="mt-6 flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-sm font-semibold text-gray-700 transition hover:border-primary hover:bg-blue-50">{reading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Lendo e validando…</> : <><Upload className="mr-2 h-5 w-5 text-primary" />Selecionar planilha XLSX</>}</label><input id={inputId} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={(event) => onFile(event.target.files?.[0] ?? null)} /></article>;
}

function PreviewPanel({ preview, saving, onCancel, onSave }: { preview: Preview; saving: boolean; onCancel: () => void; onSave: () => void }) {
  const summaryText = preview.type === "lnt"
    ? (() => {
        const summary = summarizeLnt(preview.result.registros);
        return `${summary.colaboradores} colaboradores, ${summary.setores} setores e ${summary.necessidadesTecnicas + summary.necessidadesComportamentais} necessidades mapeadas.`;
      })()
    : (() => {
        const summary = summarizePerformance(preview.result.registros);
        return `${summary.registros} avaliações válidas, média ${summary.media.toFixed(2)} e ${summary.gaps} gaps abaixo de 7.`;
      })();
  return <section className="rounded-xl border border-blue-200 bg-white p-6 shadow-sm"><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><div className="flex items-center gap-2 text-blue-800"><FileCheck2 className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-wide">Prévia validada</span></div><h3 className="mt-2 font-bold text-gray-900">{preview.file.name}</h3><p className="mt-1 text-sm text-gray-500">Confira os números antes de gravar. Nenhum vínculo por nome será feito automaticamente.</p></div><div className="flex gap-2"><button type="button" onClick={onCancel} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancelar</button><button type="button" disabled={saving || preview.result.registros.length === 0} onClick={onSave} className="flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-dark disabled:opacity-60">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{saving ? "Gravando…" : "Confirmar importação"}</button></div></div><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><PreviewMetric label="Linhas lidas" value={preview.result.linhasLidas} /><PreviewMetric label="Registros válidos" value={preview.result.registros.length} /><PreviewMetric label="Rejeitados" value={preview.result.linhasRejeitadas} /><PreviewMetric label="Avisos" value={preview.result.avisos.length} /></div><div className="mt-5 rounded-lg bg-gray-50 p-4 text-sm text-gray-600"><strong>Resumo:</strong> {summaryText}</div>{preview.result.avisos.length > 0 && <details className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4"><summary className="cursor-pointer text-sm font-bold text-amber-800"><AlertTriangle className="mr-2 inline h-4 w-4" />Ver avisos de qualidade ({preview.result.avisos.length})</summary><ul className="mt-3 max-h-44 space-y-1 overflow-y-auto pl-6 text-xs text-amber-800">{preview.result.avisos.slice(0, 100).map((warning, index) => <li key={`${warning}-${index}`} className="list-disc">{warning}</li>)}</ul></details>}</section>;
}

function PreviewMetric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"><p className="text-xs font-semibold uppercase text-gray-500">{label}</p><p className="mt-1 text-xl font-bold text-gray-900">{value}</p></div>;
}

function SelectWithChevron({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) {
  return <div className="relative"><select value={value} onChange={(event) => onChange(event.target.value)} className="appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-xs font-semibold text-gray-700 outline-none focus:border-primary">{options.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</select><ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-3.5 w-3.5 text-gray-400" /></div>;
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-gray-950/50 p-4 backdrop-blur-sm md:p-8"><div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-gray-100 px-6 py-5"><div><h3 className="text-lg font-bold text-gray-900">{title}</h3><p className="mt-1 text-xs text-gray-500">{subtitle}</p></div><button type="button" aria-label="Fechar" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><X className="h-5 w-5" /></button></div><div className="p-6">{children}</div></div></div>;
}

function FormActions({ saving, onCancel, label }: { saving: boolean; onCancel: () => void; label: string }) {
  return <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={onCancel} className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancelar</button><button type="submit" disabled={saving} className="flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-dark disabled:opacity-60">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{saving ? "Salvando…" : label}</button></div>;
}
