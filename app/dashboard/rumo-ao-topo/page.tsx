"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Crown,
  Download,
  FileSpreadsheet,
  Loader2,
  Save,
  Upload,
  Users,
  WalletCards,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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

type ViewFilter = "todos" | "elegiveis" | "faltas" | "atrasos" | "atestados";

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

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
  if (lowerName.endsWith(".csv")) {
    return parseDelimitedText(await file.text());
  }
  if (lowerName.endsWith(".xlsx")) return readXlsxRows(file);
  throw new Error("Formato não aceito. Envie um arquivo XLSX ou CSV.");
}

export default function RumoAoTopoPage() {
  const [reference, setReference] = useState(currentReference());
  const [bonusValue, setBonusValue] = useState(100);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<RumoAoTopoImportResult | null>(null);
  const [records, setRecords] = useState<RumoAoTopoRegistro[]>([]);
  const [viewFilter, setViewFilter] = useState<ViewFilter>("todos");
  const [sectorFilter, setSectorFilter] = useState("");
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
      setRecords(
        resultData.map((item) => ({
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
        })),
      );
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
      setMessage({
        type: "success",
        text: `${parsed.registros.length} colaboradores reconhecidos. Revise os dados antes de salvar.`,
      });
    } catch (error) {
      setRecords([]);
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Falha ao ler a planilha." });
    } finally {
      setIsReading(false);
    }
  }

  async function saveImport() {
    if (!file || !preview || !reference) return;
    if (preview.registros.length === 0) {
      setMessage({ type: "error", text: "A planilha não possui registros válidos para salvar." });
      return;
    }
    setIsSaving(true);
    setMessage(null);
    let importId: string | null = null;

    try {
      const { data: program, error: programError } = await supabase
        .from("rumo_topo_programas")
        .select("id")
        .eq("nome", "Rumo ao Topo")
        .single();
      if (programError) throw new Error(`Programa não configurado: ${programError.message}`);

      const cycleReference = `${reference}-01`;
      const { data: existingCycle, error: existingCycleError } = await supabase
        .from("rumo_topo_ciclos")
        .select("id,status")
        .eq("programa_id", program.id)
        .eq("referencia", cycleReference)
        .maybeSingle();
      if (existingCycleError) throw new Error(`Não foi possível consultar o ciclo: ${existingCycleError.message}`);
      if (existingCycle && !["rascunho", "em_revisao"].includes(existingCycle.status)) {
        throw new Error(`O ciclo está ${existingCycle.status.replaceAll("_", " ")} e não aceita novas importações.`);
      }

      const cycleRequest = existingCycle
        ? supabase
            .from("rumo_topo_ciclos")
            .update({ valor_premiacao: bonusValue })
            .eq("id", existingCycle.id)
            .select("id")
            .single()
        : supabase
            .from("rumo_topo_ciclos")
            .insert({
              programa_id: program.id,
              referencia: cycleReference,
              valor_premiacao: bonusValue,
              status: "rascunho",
            })
            .select("id")
            .single();
      const { data: cycle, error: cycleError } = await cycleRequest;
      if (cycleError) throw new Error(`Não foi possível criar o ciclo: ${cycleError.message}`);

      const digest = await fileHash(file);
      const { data: duplicate } = await supabase
        .from("rumo_topo_importacoes")
        .select("id")
        .eq("ciclo_id", cycle.id)
        .eq("hash_arquivo", digest)
        .in("status", ["concluida", "concluida_com_avisos"])
        .maybeSingle();
      if (duplicate) throw new Error("Esta mesma planilha já foi importada para o período selecionado.");

      const { data: importRecord, error: importError } = await supabase
        .from("rumo_topo_importacoes")
        .insert({
          ciclo_id: cycle.id,
          nome_arquivo: file.name,
          tamanho_arquivo: file.size,
          hash_arquivo: digest,
          status: "processando",
          total_linhas: preview.linhasLidas,
          linhas_validas: preview.registros.length,
          linhas_rejeitadas: preview.linhasRejeitadas,
          avisos: preview.avisos,
          metadados: {
            linha_cabecalho: preview.linhaCabecalho,
            cabecalhos_reconhecidos: preview.cabecalhosReconhecidos,
          },
        })
        .select("id")
        .single();
      if (importError) throw new Error(`Não foi possível registrar a importação: ${importError.message}`);
      importId = importRecord.id;

      const payload = preview.registros.map((record) => ({
        ciclo_id: cycle.id,
        importacao_id: importRecord.id,
        colaborador_nome_importado: record.colaborador_nome_importado,
        matricula_importada: record.matricula,
        setor_importado: record.setor,
        equipe_importada: record.equipe,
        funcao_importada: record.funcao,
        bonus_original: record.bonus_original,
        elegivel: record.elegivel,
        motivo_ineligibilidade: record.motivo_ineligibilidade,
        valor_bonus: record.valor_bonus,
        faltas: record.faltas,
        atrasos: record.atrasos,
        atestados: record.atestados,
        ferias: record.ferias,
        dds: record.dds,
        observacoes: record.observacoes,
        linha_original: record.linha_original,
        dados_origem: record.dados_origem,
      }));

      for (let index = 0; index < payload.length; index += 500) {
        const { error: resultError } = await supabase
          .from("rumo_topo_resultados")
          .insert(payload.slice(index, index + 500));
        if (resultError) throw new Error(`Falha ao salvar resultados: ${resultError.message}`);
      }

      const finalStatus = preview.avisos.length ? "concluida_com_avisos" : "concluida";
      const { error: finishError } = await supabase
        .from("rumo_topo_importacoes")
        .update({ status: finalStatus, finalizado_em: new Date().toISOString() })
        .eq("id", importRecord.id);
      if (finishError) throw new Error(`Resultados salvos, mas o fechamento falhou: ${finishError.message}`);

      setLastImport(`${file.name} · ${new Date().toLocaleString("pt-BR")}`);
      setMessage({ type: "success", text: "Importação salva com histórico e rastreabilidade." });
      setPreview(null);
      setFile(null);
    } catch (error) {
      if (importId) {
        await supabase.from("rumo_topo_resultados").delete().eq("importacao_id", importId);
        await supabase
          .from("rumo_topo_importacoes")
          .update({ status: "falhou", finalizado_em: new Date().toISOString() })
          .eq("id", importId);
      }
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Falha ao salvar a importação." });
    } finally {
      setIsSaving(false);
    }
  }

  const sectors = useMemo(() => [...new Set(records.map((record) => record.setor))].sort(), [records]);
  const filteredRecords = useMemo(
    () =>
      records.filter((record) => {
        if (sectorFilter && record.setor !== sectorFilter) return false;
        if (viewFilter === "elegiveis") return record.elegivel;
        if (viewFilter === "faltas") return record.faltas > 0;
        if (viewFilter === "atrasos") return record.atrasos > 0;
        if (viewFilter === "atestados") return record.atestados > 0;
        return true;
      }),
    [records, sectorFilter, viewFilter],
  );
  const summary = useMemo(() => summarizeRumoAoTopo(filteredRecords), [filteredRecords]);
  const sectorChart = useMemo(() => {
    const sectorMap = new Map<string, { setor: string; faltas: number; atrasos: number; atestados: number }>();
    filteredRecords.forEach((record) => {
      const value = sectorMap.get(record.setor) ?? { setor: record.setor, faltas: 0, atrasos: 0, atestados: 0 };
      value.faltas += record.faltas;
      value.atrasos += record.atrasos;
      value.atestados += record.atestados;
      sectorMap.set(record.setor, value);
    });
    return [...sectorMap.values()];
  }, [filteredRecords]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-amber-500">
            <Crown className="h-6 w-6" />
            <span className="text-xs font-bold uppercase tracking-[0.2em]">Programa de reconhecimento</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-800">Rumo ao Topo</h2>
          <p className="mt-1 text-sm text-gray-500">Importação, elegibilidade, ocorrências e premiação por período.</p>
        </div>
        <a
          href="/modelos/modelo-rumo-ao-topo.xlsx"
          download
          className="inline-flex items-center justify-center rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-blue-50"
        >
          <Download className="mr-2 h-4 w-4" /> Baixar planilha modelo
        </a>
      </div>

      <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-start gap-3">
          <div className="rounded-lg bg-blue-50 p-3 text-primary"><FileSpreadsheet className="h-6 w-6" /></div>
          <div>
            <h3 className="font-bold text-gray-800">Nova importação</h3>
            <p className="text-sm text-gray-500">Aceita XLSX e CSV. A planilha é validada antes de qualquer gravação.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <label className="text-sm font-medium text-gray-700">
            Período de referência
            <input type="month" value={reference} onChange={(event) => setReference(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-primary focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Valor da premiação
            <input type="number" min="0" step="0.01" value={bonusValue} onChange={(event) => {
              const nextValue = Math.max(0, Number(event.target.value) || 0);
              setBonusValue(nextValue);
              if (file) void handleFile(file, nextValue);
            }} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-primary focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="md:col-span-2 text-sm font-medium text-gray-700">
            Arquivo
            <span className="mt-1 flex cursor-pointer items-center justify-between rounded-lg border border-dashed border-gray-300 px-4 py-2 text-gray-500 hover:border-primary hover:bg-blue-50">
              <span className="truncate">{file?.name ?? "Selecionar planilha"}</span>
              {isReading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
              <input type="file" accept=".xlsx,.csv" className="sr-only" onChange={(event) => void handleFile(event.target.files?.[0] ?? null)} />
            </span>
          </label>
        </div>
        {message && (
          <div role="status" className={`mt-4 flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
            {message.type === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
            {message.text}
          </div>
        )}
        {preview && (
          <div className="mt-4 rounded-lg bg-gray-50 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-gray-600">
                <strong>{preview.registros.length}</strong> válidos · <strong>{preview.linhasRejeitadas}</strong> rejeitados · cabeçalho na linha <strong>{preview.linhaCabecalho}</strong>
                {preview.avisos.length > 0 && <span className="ml-2 text-amber-700">{preview.avisos.length} aviso(s)</span>}
              </div>
              <button type="button" disabled={isSaving || preview.registros.length === 0} onClick={() => void saveImport()} className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar importação
              </button>
            </div>
            {preview.avisos.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-amber-200 pt-3 text-xs text-amber-800">
                {preview.avisos.slice(0, 6).map((warning) => <li key={warning}>• {warning}</li>)}
                {preview.avisos.length > 6 && <li>• Mais {preview.avisos.length - 6} aviso(s).</li>}
              </ul>
            )}
          </div>
        )}
        {lastImport && <p className="mt-3 text-xs text-gray-400">Última importação: {lastImport}</p>}
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Colaboradores" value={summary.total} icon={Users} color="blue" />
        <KpiCard label="Aptos ao bônus" value={summary.elegiveis} icon={CheckCircle2} color="green" />
        <KpiCard label="Em férias" value={summary.ferias} icon={CalendarDays} color="amber" />
        <KpiCard label="Premiação calculada" value={moneyFormatter.format(summary.valorTotal)} icon={WalletCards} color="violet" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="font-bold text-gray-800">Elegibilidade</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={[{ name: "Aptos", value: summary.elegiveis }, { name: "Férias", value: summary.ferias }, { name: "Inaptos", value: Math.max(0, summary.total - summary.elegiveis - summary.ferias) }]} innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                  {["#10b981", "#f59e0b", "#ef4444"].map((color) => <Cell key={color} fill={color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm xl:col-span-2">
          <h3 className="font-bold text-gray-800">Ocorrências por setor</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sectorChart} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="setor" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="faltas" name="Faltas" fill="#ef4444" radius={[3, 3, 0, 0]} />
                <Bar dataKey="atrasos" name="Atrasos" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                <Bar dataKey="atestados" name="Atestados" fill="#06b6d4" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {(["todos", "elegiveis", "faltas", "atrasos", "atestados"] as ViewFilter[]).map((filter) => (
              <button key={filter} type="button" onClick={() => setViewFilter(filter)} className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${viewFilter === filter ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {filter}
              </button>
            ))}
          </div>
          <select value={sectorFilter} onChange={(event) => setSectorFilter(event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 outline-none focus:border-primary">
            <option value="">Todos os setores</option>
            {sectors.map((sector) => <option key={sector} value={sector}>{sector}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr><th className="px-5 py-3">Colaborador</th><th className="px-5 py-3">Setor</th><th className="px-5 py-3">Equipe</th><th className="px-5 py-3">Função</th><th className="px-5 py-3">Situação</th><th className="px-5 py-3 text-center">Faltas</th><th className="px-5 py-3 text-center">Atrasos</th><th className="px-5 py-3 text-center">Atestados</th><th className="px-5 py-3 text-right">Premiação</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecords.map((record) => (
                <tr key={`${record.linha_original}-${record.colaborador_nome_importado}`} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-semibold text-gray-800">{record.colaborador_nome_importado}</td><td className="px-5 py-3 text-gray-600">{record.setor}</td><td className="px-5 py-3 text-gray-600">{record.equipe}</td><td className="px-5 py-3 text-gray-600">{record.funcao}</td>
                  <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${record.elegivel ? "bg-emerald-100 text-emerald-700" : record.ferias ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{record.elegivel ? "Apto" : record.ferias ? "Férias" : "Inapto"}</span></td>
                  <td className="px-5 py-3 text-center text-gray-700">{record.faltas}</td><td className="px-5 py-3 text-center text-gray-700">{record.atrasos}</td><td className="px-5 py-3 text-center text-gray-700">{record.atestados}</td><td className="px-5 py-3 text-right font-semibold text-gray-800">{moneyFormatter.format(record.valor_bonus)}</td>
                </tr>
              ))}
              {filteredRecords.length === 0 && <tr><td colSpan={9} className="px-5 py-12 text-center text-gray-400"><AlertTriangle className="mx-auto mb-2 h-6 w-6" />Nenhum registro para os filtros selecionados.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: typeof Users; color: "blue" | "green" | "amber" | "violet" }) {
  const colors = { blue: "bg-blue-50 text-blue-700", green: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700", violet: "bg-violet-50 text-violet-700" };
  return <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-5 shadow-sm"><div><p className="text-sm font-medium text-gray-500">{label}</p><p className="mt-1 text-2xl font-bold text-gray-800">{value}</p></div><div className={`rounded-xl p-3 ${colors[color]}`}><Icon className="h-6 w-6" /></div></div>;
}
