"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Building2,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Crown,
  Database,
  Download,
  FileHeart,
  FileSpreadsheet,
  Filter,
  Loader2,
  Printer,
  Save,
  Search,
  Upload,
  Users,
  WalletCards,
  X,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ModuleWorkspace, WorkspaceEmpty, type WorkspaceItem } from "@/app/dashboard/_components/module-workspace";
import { supabase } from "@/lib/supabase";
import {
  parseDelimitedText,
  parseRumoAoTopoRows,
  summarizeRumoAoTopo,
  type RumoAoTopoImportResult,
  type RumoAoTopoRegistro,
  type SpreadsheetCell,
} from "@/lib/rumo-ao-topo";
import { readXlsxRows } from "@/lib/xlsx-browser";

type View = "executivo" | "base" | "bonus" | "faltas" | "atrasos" | "atestados" | "setor" | "exportar";

const workspaceItems: WorkspaceItem<View>[] = [
  { key: "executivo", label: "Dashboard Executivo", icon: BarChart3 },
  { key: "base", label: "Base Geral da Planilha", icon: Database },
  { key: "bonus", label: "Aba Bônus (SIM)", icon: CheckCircle2, tone: "success" },
  { key: "faltas", label: "Aba Faltas", icon: CalendarDays, tone: "danger" },
  { key: "atrasos", label: "Aba Atrasos", icon: CalendarClock, tone: "warning" },
  { key: "atestados", label: "Aba Atestados", icon: FileHeart, tone: "info" },
  { key: "setor", label: "Visão por Setor", icon: Building2 },
  { key: "exportar", label: "Exportar p/ Diretoria", icon: Printer, tone: "accent", dividerBefore: true },
];

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function currentReference() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

async function fileHash(file: File) {
  const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function readSpreadsheet(file: File): Promise<SpreadsheetCell[][]> {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".csv")) return parseDelimitedText(await file.text());
  if (lowerName.endsWith(".xlsx")) return readXlsxRows(file);
  throw new Error("Formato não aceito. Envie um arquivo XLSX ou CSV.");
}

export default function RumoAoTopoPage() {
  const [view, setView] = useState<View>("executivo");
  const [reference, setReference] = useState(currentReference());
  const [bonusValue, setBonusValue] = useState(100);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<RumoAoTopoImportResult | null>(null);
  const [records, setRecords] = useState<RumoAoTopoRegistro[]>([]);
  const [sectorFilter, setSectorFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [lastImport, setLastImport] = useState<string | null>(null);

  async function loadLatestImport() {
    const { data: importData } = await supabase
      .from("rumo_topo_importacoes")
      .select("id,nome_arquivo,importado_em")
      .in("status", ["concluida", "concluida_com_avisos"])
      .order("importado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!importData) return;

    const { data: resultData } = await supabase
      .from("rumo_topo_resultados")
      .select("linha_original,colaborador_nome_importado,matricula_importada,setor_importado,equipe_importada,funcao_importada,bonus_original,elegivel,motivo_ineligibilidade,valor_bonus,faltas,atrasos,atestados,ferias,dds,observacoes,dados_origem")
      .eq("importacao_id", importData.id)
      .order("colaborador_nome_importado");

    if (resultData) {
      setRecords(resultData.map((item) => ({
        linha_original: item.linha_original ?? 0,
        colaborador_nome_importado: item.colaborador_nome_importado,
        matricula: item.matricula_importada,
        setor: item.setor_importado ?? "Não informado",
        equipe: item.equipe_importada ?? "Não informada",
        funcao: item.funcao_importada ?? "Não informada",
        bonus_original: item.bonus_original ?? "",
        elegivel: item.elegivel,
        motivo_ineligibilidade: item.motivo_ineligibilidade,
        valor_bonus: Number(item.valor_bonus),
        faltas: item.faltas,
        atrasos: item.atrasos,
        atestados: item.atestados,
        ferias: item.ferias,
        dds: item.dds,
        observacoes: item.observacoes,
        dados_origem: (item.dados_origem ?? {}) as Record<string, string>,
      })));
      setLastImport(`${importData.nome_arquivo} · ${new Date(importData.importado_em).toLocaleString("pt-BR")}`);
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadLatestImport(), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  async function handleFile(fileToRead: File | null, premio = bonusValue) {
    setFile(fileToRead);
    setPreview(null);
    setMessage(null);
    if (!fileToRead) return;
    setIsReading(true);
    try {
      const parsed = parseRumoAoTopoRows(await readSpreadsheet(fileToRead), premio);
      setPreview(parsed);
      setRecords(parsed.registros);
      setMessage({ type: "success", text: `${parsed.registros.length} colaboradores reconhecidos. Revise os dados antes de salvar.` });
    } catch (error) {
      setRecords([]);
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Falha ao ler a planilha." });
    } finally {
      setIsReading(false);
    }
  }

  async function saveImport() {
    if (!file || !preview || !reference) return;
    if (!preview.registros.length) {
      setMessage({ type: "error", text: "A planilha não possui registros válidos para salvar." });
      return;
    }
    setIsSaving(true);
    setMessage(null);
    let importId: string | null = null;
    try {
      const { data: program, error: programError } = await supabase.from("rumo_topo_programas").select("id").eq("nome", "Rumo ao Topo").single();
      if (programError) throw new Error(`Programa não configurado: ${programError.message}`);
      const cycleReference = `${reference}-01`;
      const { data: existingCycle, error: existingCycleError } = await supabase.from("rumo_topo_ciclos").select("id,status").eq("programa_id", program.id).eq("referencia", cycleReference).maybeSingle();
      if (existingCycleError) throw new Error(`Não foi possível consultar o ciclo: ${existingCycleError.message}`);
      if (existingCycle && !["rascunho", "em_revisao"].includes(existingCycle.status)) throw new Error(`O ciclo está ${existingCycle.status.replaceAll("_", " ")} e não aceita novas importações.`);

      const cycleRequest = existingCycle
        ? supabase.from("rumo_topo_ciclos").update({ valor_premiacao: bonusValue }).eq("id", existingCycle.id).select("id").single()
        : supabase.from("rumo_topo_ciclos").insert({ programa_id: program.id, referencia: cycleReference, valor_premiacao: bonusValue, status: "rascunho" }).select("id").single();
      const { data: cycle, error: cycleError } = await cycleRequest;
      if (cycleError) throw new Error(`Não foi possível criar o ciclo: ${cycleError.message}`);

      const digest = await fileHash(file);
      const { data: duplicate } = await supabase.from("rumo_topo_importacoes").select("id").eq("ciclo_id", cycle.id).eq("hash_arquivo", digest).in("status", ["concluida", "concluida_com_avisos"]).maybeSingle();
      if (duplicate) throw new Error("Esta mesma planilha já foi importada para o período selecionado.");

      const { data: importRecord, error: importError } = await supabase.from("rumo_topo_importacoes").insert({
        ciclo_id: cycle.id,
        nome_arquivo: file.name,
        tamanho_arquivo: file.size,
        hash_arquivo: digest,
        status: "processando",
        total_linhas: preview.linhasLidas,
        linhas_validas: preview.registros.length,
        linhas_rejeitadas: preview.linhasRejeitadas,
        avisos: preview.avisos,
        metadados: { linha_cabecalho: preview.linhaCabecalho, cabecalhos_reconhecidos: preview.cabecalhosReconhecidos },
      }).select("id").single();
      if (importError) throw new Error(`Não foi possível registrar a importação: ${importError.message}`);
      importId = importRecord.id;

      const payload = preview.registros.map((record) => ({
        ciclo_id: cycle.id, importacao_id: importRecord.id,
        colaborador_nome_importado: record.colaborador_nome_importado,
        matricula_importada: record.matricula, setor_importado: record.setor,
        equipe_importada: record.equipe, funcao_importada: record.funcao,
        bonus_original: record.bonus_original, elegivel: record.elegivel,
        motivo_ineligibilidade: record.motivo_ineligibilidade, valor_bonus: record.valor_bonus,
        faltas: record.faltas, atrasos: record.atrasos, atestados: record.atestados,
        ferias: record.ferias, dds: record.dds, observacoes: record.observacoes,
        linha_original: record.linha_original, dados_origem: record.dados_origem,
      }));
      for (let index = 0; index < payload.length; index += 500) {
        const { error } = await supabase.from("rumo_topo_resultados").insert(payload.slice(index, index + 500));
        if (error) throw new Error(`Falha ao salvar resultados: ${error.message}`);
      }
      const finalStatus = preview.avisos.length ? "concluida_com_avisos" : "concluida";
      const { error: finishError } = await supabase.from("rumo_topo_importacoes").update({ status: finalStatus, finalizado_em: new Date().toISOString() }).eq("id", importRecord.id);
      if (finishError) throw new Error(`Resultados salvos, mas o fechamento falhou: ${finishError.message}`);
      setLastImport(`${file.name} · ${new Date().toLocaleString("pt-BR")}`);
      setMessage({ type: "success", text: "Importação salva com histórico e rastreabilidade." });
      setPreview(null);
      setFile(null);
      setShowImport(false);
    } catch (error) {
      if (importId) {
        await supabase.from("rumo_topo_resultados").delete().eq("importacao_id", importId);
        await supabase.from("rumo_topo_importacoes").update({ status: "falhou", finalizado_em: new Date().toISOString() }).eq("id", importId);
      }
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Falha ao salvar a importação." });
    } finally {
      setIsSaving(false);
    }
  }

  const sectors = useMemo(() => [...new Set(records.map((record) => record.setor))].sort(), [records]);
  const filteredRecords = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return records.filter((record) => (!sectorFilter || record.setor === sectorFilter) && (!term || [record.colaborador_nome_importado, record.funcao, record.equipe, record.setor].some((value) => value.toLocaleLowerCase("pt-BR").includes(term))));
  }, [records, sectorFilter, search]);
  const summary = useMemo(() => summarizeRumoAoTopo(filteredRecords), [filteredRecords]);
  const sectorSummary = useMemo(() => buildSectorSummary(filteredRecords), [filteredRecords]);
  const viewRecords = view === "bonus" ? filteredRecords.filter((item) => item.elegivel)
    : view === "faltas" ? filteredRecords.filter((item) => item.faltas > 0)
      : view === "atrasos" ? filteredRecords.filter((item) => item.atrasos > 0)
        : view === "atestados" ? filteredRecords.filter((item) => item.atestados > 0)
          : filteredRecords;

  return (
    <ModuleWorkspace
      eyebrow="Programa de reconhecimento"
      title="Rumo ao Topo"
      description="Elegibilidade, ocorrências, premiação e análise gerencial preservadas em uma experiência integrada."
      icon={Crown}
      items={workspaceItems}
      active={view}
      onChange={setView}
      accent="from-slate-950 via-blue-950 to-indigo-800"
      actions={<><a href="/modelos/modelo-rumo-ao-topo.xlsx" download className="inline-flex items-center rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-bold text-white hover:bg-white/20"><Download className="mr-2 h-4 w-4" />Modelo</a><button type="button" onClick={() => setShowImport((value) => !value)} className="inline-flex items-center rounded-xl bg-amber-300 px-3.5 py-2 text-xs font-black text-slate-900 hover:bg-amber-200"><Upload className="mr-2 h-4 w-4" />Importar planilha</button></>}
    >
      <div className="space-y-5">
        {message && <Alert message={message} onClose={() => setMessage(null)} />}
        {showImport && <ImportPanel reference={reference} bonusValue={bonusValue} file={file} preview={preview} isReading={isReading} isSaving={isSaving} lastImport={lastImport} onReference={setReference} onBonus={(value) => { setBonusValue(value); if (file) void handleFile(file, value); }} onFile={(value) => void handleFile(value)} onSave={() => void saveImport()} />}

        <FilterBar sectors={sectors} sector={sectorFilter} search={search} onSector={setSectorFilter} onSearch={setSearch} />

        {view === "executivo" && <ExecutiveView records={filteredRecords} summary={summary} sectorSummary={sectorSummary} />}
        {view === "base" && <RecordsTable title="Base Geral da Planilha" subtitle="Estrutura completa da última importação salva, com a regra de premiação aplicada." records={viewRecords} variant="base" />}
        {view === "bonus" && <RecordsTable title="Aba Bônus (SIM)" subtitle={`Somente colaboradores aptos. Valor consolidado: ${money.format(summary.valorTotal)}.`} records={viewRecords} variant="bonus" />}
        {view === "faltas" && <RecordsTable title="Controle de Faltas" subtitle={`${viewRecords.reduce((total, item) => total + item.faltas, 0)} falta(s) no filtro atual.`} records={viewRecords} variant="faltas" />}
        {view === "atrasos" && <RecordsTable title="Controle de Atrasos" subtitle={`${viewRecords.reduce((total, item) => total + item.atrasos, 0)} registro(s) no filtro atual.`} records={viewRecords} variant="atrasos" />}
        {view === "atestados" && <RecordsTable title="Controle de Atestados" subtitle={`${viewRecords.reduce((total, item) => total + item.atestados, 0)} registro(s) no filtro atual.`} records={viewRecords} variant="atestados" />}
        {view === "setor" && <SectorView data={sectorSummary} />}
        {view === "exportar" && <ExecutiveReport records={filteredRecords} summary={summary} sectorSummary={sectorSummary} lastImport={lastImport} />}
      </div>
    </ModuleWorkspace>
  );
}

function buildSectorSummary(records: RumoAoTopoRegistro[]) {
  const map = new Map<string, { setor: string; colaboradores: number; aptos: number; faltas: number; atrasos: number; atestados: number; valor: number }>();
  records.forEach((record) => {
    const item = map.get(record.setor) ?? { setor: record.setor, colaboradores: 0, aptos: 0, faltas: 0, atrasos: 0, atestados: 0, valor: 0 };
    item.colaboradores += 1;
    item.aptos += record.elegivel ? 1 : 0;
    item.faltas += record.faltas;
    item.atrasos += record.atrasos;
    item.atestados += record.atestados;
    item.valor += record.valor_bonus;
    map.set(record.setor, item);
  });
  return [...map.values()].sort((a, b) => b.colaboradores - a.colaboradores);
}

function Alert({ message, onClose }: { message: { type: "success" | "error"; text: string }; onClose: () => void }) {
  return <div role="alert" className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>{message.type === "success" ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0" />}<span className="flex-1 font-medium">{message.text}</span><button type="button" aria-label="Fechar aviso" onClick={onClose}><X className="h-4 w-4" /></button></div>;
}

function ImportPanel({ reference, bonusValue, file, preview, isReading, isSaving, lastImport, onReference, onBonus, onFile, onSave }: { reference: string; bonusValue: number; file: File | null; preview: RumoAoTopoImportResult | null; isReading: boolean; isSaving: boolean; lastImport: string | null; onReference: (value: string) => void; onBonus: (value: number) => void; onFile: (value: File | null) => void; onSave: () => void }) {
  return <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center gap-3"><span className="rounded-xl bg-blue-50 p-2.5 text-primary"><FileSpreadsheet className="h-5 w-5" /></span><div><h2 className="text-sm font-black text-slate-800">Nova importação auditável</h2><p className="text-xs text-slate-500">A prévia é validada antes da gravação no ciclo mensal.</p></div></div><div className="grid gap-4 md:grid-cols-4"><label className="text-xs font-bold text-slate-600">Período<input type="month" value={reference} onChange={(event) => onReference(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-primary" /></label><label className="text-xs font-bold text-slate-600">Valor da premiação<input type="number" min="0" step="0.01" value={bonusValue} onChange={(event) => onBonus(Math.max(0, Number(event.target.value) || 0))} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-primary" /></label><label className="text-xs font-bold text-slate-600 md:col-span-2">Arquivo<span className="mt-1.5 flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-500 hover:border-primary hover:bg-blue-50"><span className="truncate">{file?.name ?? "Selecionar XLSX ou CSV"}</span>{isReading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}<input type="file" accept=".xlsx,.csv" className="sr-only" onChange={(event) => onFile(event.target.files?.[0] ?? null)} /></span></label></div>{preview && <div className="mt-4 flex flex-col gap-3 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-slate-600"><strong>{preview.registros.length}</strong> válidos · <strong>{preview.linhasRejeitadas}</strong> rejeitados · {preview.avisos.length} aviso(s)</p><button type="button" disabled={isSaving || !preview.registros.length} onClick={onSave} className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-xs font-black text-white disabled:opacity-50">{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Salvar ciclo</button></div>}{lastImport && <p className="mt-3 text-[10px] text-slate-400">Última importação: {lastImport}</p>}</section>;
}

function FilterBar({ sectors, sector, search, onSector, onSearch }: { sectors: string[]; sector: string; search: string; onSector: (value: string) => void; onSearch: (value: string) => void }) {
  return <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center"><div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Buscar colaborador, cargo ou equipe" className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-primary" /></div><div className="relative sm:w-64"><Filter className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><select value={sector} onChange={(event) => onSector(event.target.value)} className="w-full appearance-none rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs font-semibold text-slate-600 outline-none focus:border-primary"><option value="">Todos os setores</option>{sectors.map((item) => <option key={item} value={item}>{item}</option>)}</select></div></div>;
}

function ExecutiveView({ records, summary, sectorSummary }: { records: RumoAoTopoRegistro[]; summary: ReturnType<typeof summarizeRumoAoTopo>; sectorSummary: ReturnType<typeof buildSectorSummary> }) {
  const eligibleData = [{ name: "Aptos", value: summary.elegiveis }, { name: "Férias", value: summary.ferias }, { name: "Inaptos", value: Math.max(0, summary.total - summary.elegiveis - summary.ferias) }];
  return <div className="space-y-5"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Kpi label="Colaboradores" value={summary.total} icon={Users} color="blue" /><Kpi label="Aptos ao bônus" value={summary.elegiveis} icon={CheckCircle2} color="green" /><Kpi label="Em férias" value={summary.ferias} icon={CalendarDays} color="amber" /><Kpi label="Premiação calculada" value={money.format(summary.valorTotal)} icon={WalletCards} color="violet" /></div><div className="grid gap-3 sm:grid-cols-3"><MiniKpi label="Total de faltas" value={summary.faltas} tone="red" /><MiniKpi label="Total de atrasos" value={summary.atrasos} tone="amber" /><MiniKpi label="Total de atestados" value={summary.atestados} tone="cyan" /></div><div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]"><ChartCard title="Status de elegibilidade">{records.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={eligibleData} innerRadius={58} outerRadius={88} dataKey="value" paddingAngle={3}>{["#10b981", "#f59e0b", "#ef4444"].map((color) => <Cell key={color} fill={color} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer> : <ChartPlaceholder />}</ChartCard><ChartCard title="Ocorrências por setor">{sectorSummary.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={sectorSummary} margin={{ left: -20 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="setor" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="faltas" name="Faltas" fill="#ef4444" radius={[3, 3, 0, 0]} /><Bar dataKey="atrasos" name="Atrasos" fill="#f59e0b" radius={[3, 3, 0, 0]} /><Bar dataKey="atestados" name="Atestados" fill="#06b6d4" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer> : <ChartPlaceholder />}</ChartCard></div></div>;
}

function RecordsTable({ title, subtitle, records, variant }: { title: string; subtitle: string; records: RumoAoTopoRegistro[]; variant: "base" | "bonus" | "faltas" | "atrasos" | "atestados" }) {
  if (!records.length) return <WorkspaceEmpty icon={Database} title="Nenhum registro nesta visão" description="Importe uma planilha ou altere os filtros para preencher esta área." />;
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><h2 className="text-base font-black text-slate-900">{title}</h2><p className="mt-1 text-xs text-slate-500">{subtitle}</p></div><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Colaborador</th><th className="px-4 py-3">Setor</th><th className="px-4 py-3">Equipe / Função</th>{variant === "base" && <th className="px-4 py-3">Bônus original</th>}<th className="px-4 py-3">Situação</th>{["base", "faltas"].includes(variant) && <th className="px-4 py-3 text-center">Faltas</th>}{["base", "atrasos"].includes(variant) && <th className="px-4 py-3 text-center">Atrasos</th>}{["base", "atestados"].includes(variant) && <th className="px-4 py-3 text-center">Atestados</th>}<th className="px-4 py-3 text-right">Premiação</th></tr></thead><tbody className="divide-y divide-slate-100">{records.map((record) => <tr key={`${record.linha_original}-${record.colaborador_nome_importado}`} className="hover:bg-slate-50"><td className="px-4 py-3 font-bold text-slate-800">{record.colaborador_nome_importado}</td><td className="px-4 py-3 text-slate-600">{record.setor}</td><td className="px-4 py-3"><p className="font-semibold text-slate-700">{record.equipe}</p><p className="mt-0.5 text-[10px] text-slate-400">{record.funcao}</p></td>{variant === "base" && <td className="px-4 py-3 text-slate-500">{record.bonus_original || "—"}</td>}<td className="px-4 py-3"><Status record={record} /></td>{["base", "faltas"].includes(variant) && <td className="px-4 py-3 text-center font-black text-red-600">{record.faltas}</td>}{["base", "atrasos"].includes(variant) && <td className="px-4 py-3 text-center font-black text-amber-600">{record.atrasos}</td>}{["base", "atestados"].includes(variant) && <td className="px-4 py-3 text-center font-black text-cyan-600">{record.atestados}</td>}<td className="px-4 py-3 text-right font-black text-slate-800">{money.format(record.valor_bonus)}</td></tr>)}</tbody></table></div></section>;
}

function SectorView({ data }: { data: ReturnType<typeof buildSectorSummary> }) {
  if (!data.length) return <WorkspaceEmpty icon={Building2} title="Visão setorial aguardando dados" description="Importe a base do programa para consolidar os indicadores de cada setor." />;
  return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.map((item) => <article key={item.setor} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-wider text-primary">Setor</p><h2 className="mt-1 text-lg font-black text-slate-900">{item.setor}</h2></div><span className="rounded-xl bg-blue-50 p-2 text-primary"><Building2 className="h-5 w-5" /></span></div><div className="mt-5 grid grid-cols-2 gap-3 text-xs"><SectorMetric label="Colaboradores" value={item.colaboradores} /><SectorMetric label="Aproveitamento" value={`${item.colaboradores ? ((item.aptos / item.colaboradores) * 100).toFixed(1) : 0}%`} /><SectorMetric label="Faltas" value={item.faltas} /><SectorMetric label="Premiação" value={money.format(item.valor)} /></div></article>)}</div><ChartCard title="Comparativo de aproveitamento por setor"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.map((item) => ({ ...item, aproveitamento: item.colaboradores ? Number(((item.aptos / item.colaboradores) * 100).toFixed(1)) : 0 }))}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="setor" tick={{ fontSize: 10 }} /><YAxis unit="%" /><Tooltip /><Bar dataKey="aproveitamento" name="Aproveitamento" fill="#1d4ed8" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></ChartCard></div>;
}

function ExecutiveReport({ records, summary, sectorSummary, lastImport }: { records: RumoAoTopoRegistro[]; summary: ReturnType<typeof summarizeRumoAoTopo>; sectorSummary: ReturnType<typeof buildSectorSummary>; lastImport: string | null }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:border-0 print:p-0 print:shadow-none"><div className="mb-5 flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-600">Confidencial · Diretoria</p><h2 className="mt-1 text-2xl font-black text-slate-950">Relatório Executivo — Rumo ao Topo</h2><p className="mt-1 text-xs text-slate-500">{lastImport ? `Fonte: ${lastImport}` : "Aguardando base importada"}</p></div><button type="button" onClick={() => window.print()} className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white print:hidden"><Printer className="mr-2 h-4 w-4" />Imprimir / Salvar PDF</button></div><div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><ReportMetric label="Colaboradores" value={summary.total} /><ReportMetric label="Aptos" value={summary.elegiveis} /><ReportMetric label="Em férias" value={summary.ferias} /><ReportMetric label="Orçamento" value={money.format(summary.valorTotal)} /></div>{records.length ? <><div className="mt-6 grid gap-5 lg:grid-cols-2"><ChartCard title="Elegibilidade"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={[{ name: "Aptos", value: summary.elegiveis }, { name: "Demais", value: summary.total - summary.elegiveis }]} innerRadius={55} outerRadius={85} dataKey="value"><Cell fill="#10b981" /><Cell fill="#ef4444" /></Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></ChartCard><ChartCard title="Ocorrências setoriais"><ResponsiveContainer width="100%" height="100%"><BarChart data={sectorSummary}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="setor" tick={{ fontSize: 9 }} /><YAxis /><Tooltip /><Bar dataKey="faltas" name="Faltas" fill="#ef4444" /><Bar dataKey="atestados" name="Atestados" fill="#06b6d4" /></BarChart></ResponsiveContainer></ChartCard></div><div className="mt-6 overflow-x-auto"><table className="w-full text-left text-[10px]"><thead className="bg-slate-900 text-white"><tr><th className="p-2">Setor</th><th className="p-2">Colaboradores</th><th className="p-2">Aptos</th><th className="p-2">Faltas</th><th className="p-2">Atestados</th><th className="p-2 text-right">Premiação</th></tr></thead><tbody>{sectorSummary.map((item) => <tr key={item.setor} className="border-b border-slate-100"><td className="p-2 font-bold">{item.setor}</td><td className="p-2">{item.colaboradores}</td><td className="p-2">{item.aptos}</td><td className="p-2">{item.faltas}</td><td className="p-2">{item.atestados}</td><td className="p-2 text-right">{money.format(item.valor)}</td></tr>)}</tbody></table></div></> : <WorkspaceEmpty icon={Printer} title="Relatório aguardando dados" description="Importe a planilha para gerar o material executivo." />}</section>;
}

function Kpi({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: typeof Users; color: "blue" | "green" | "amber" | "violet" }) { const colors = { blue: "bg-blue-50 text-blue-700", green: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700", violet: "bg-violet-50 text-violet-700" }; return <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p><p className="mt-2 text-2xl font-black text-slate-900">{value}</p></div><span className={`rounded-xl p-3 ${colors[color]}`}><Icon className="h-5 w-5" /></span></div>; }
function MiniKpi({ label, value, tone }: { label: string; value: number; tone: "red" | "amber" | "cyan" }) { const colors = { red: "border-red-200 text-red-700", amber: "border-amber-200 text-amber-700", cyan: "border-cyan-200 text-cyan-700" }; return <div className={`rounded-2xl border-b-4 bg-white p-4 text-center shadow-sm ${colors[tone]}`}><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>; }
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xs font-black uppercase tracking-wide text-slate-600">{title}</h2><div className="mt-3 h-72">{children}</div></section>; }
function ChartPlaceholder() { return <div className="flex h-full items-center justify-center text-xs text-slate-400">Aguardando dados.</div>; }
function Status({ record }: { record: RumoAoTopoRegistro }) { return <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${record.elegivel ? "bg-emerald-100 text-emerald-700" : record.ferias ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{record.elegivel ? "Apto" : record.ferias ? "Férias" : "Inapto"}</span>; }
function SectorMetric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] font-bold uppercase text-slate-400">{label}</p><p className="mt-1 font-black text-slate-800">{value}</p></div>; }
function ReportMetric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-xl border border-slate-200 p-3 text-center"><p className="text-[9px] font-black uppercase text-slate-400">{label}</p><p className="mt-1 text-lg font-black text-slate-900">{value}</p></div>; }
