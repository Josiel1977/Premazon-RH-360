"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban, CheckCircle2, Copy, Crown, Database, Download, ExternalLink,
  FileSpreadsheet, GraduationCap, Loader2, Search, ShieldCheck,
  Upload, UserPlus, X, XCircle,
} from "lucide-react";
import { MetricCard, Pill, ProgramPanel, SectionTitle } from "@/app/dashboard/_components/program-widgets";
import { downloadCsv, formatBytes, publicReportUrl } from "@/lib/relatorios";
import { supabase } from "@/lib/supabase";

type ImportRecord = {
  id: string; origem: string; tipo: string; nome_arquivo: string; tamanho_arquivo: number | null;
  hash_arquivo: string | null; status: string; total_linhas: number; linhas_validas: number;
  linhas_rejeitadas: number; avisos: unknown[]; importado_em: string; finalizado_em: string | null;
  referencia: string | null;
};
type ShareRecord = { id: string; token: string; titulo: string; expira_em: string; ativo: boolean; total_acessos: number; ultimo_acesso_em: string | null; criado_em: string };
type BaseCount = { colaboradores: number; rumo: number; recrutamento: number; lnt: number; avaliacoes: number };

const originLabels: Record<string, string> = { rumo_topo: "Rumo ao Topo", recrutamento: "Recrutamento e Seleção", treinamento: "Treinamento e Desenvolvimento" };
const typeLabels: Record<string, string> = { ciclo_mensal: "Ciclo mensal", historico_processos: "Histórico de processos", lnt: "LNT", avaliacao_desempenho: "Avaliação de desempenho" };
const statusLabels: Record<string, string> = { processando: "Processando", concluida: "Concluída", concluida_com_avisos: "Concluída com avisos", falhou: "Falhou", cancelada: "Cancelada" };

const sources = [
  { title: "Rumo ao Topo", detail: "Um ciclo por competência. Junho permanece salvo quando julho for incluído.", href: "/dashboard/rumo-ao-topo", icon: Crown, tone: "from-amber-500 to-orange-600" },
  { title: "Recrutamento e Seleção", detail: "Base histórica uma vez; novas vagas e candidaturas entram pelos formulários.", href: "/dashboard/recrutamento", icon: UserPlus, tone: "from-violet-600 to-indigo-700" },
  { title: "Treinamento e Desenvolvimento", detail: "LNT e avaliações incrementais, preservando cada importação e o histórico.", href: "/dashboard/treinamentos", icon: GraduationCap, tone: "from-emerald-600 to-teal-700" },
];

export default function DataCenterPage() {
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [counts, setCounts] = useState<BaseCount>({ colaboradores: 0, rumo: 0, recrutamento: 0, lnt: 0, avaliacoes: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [origin, setOrigin] = useState("todas");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true); setMessage(null);
    const [history, shareResult, collaborators, rumo, recruitment, lnt, evaluations] = await Promise.all([
      supabase.from("rh360_historico_importacoes").select("id,origem,tipo,nome_arquivo,tamanho_arquivo,hash_arquivo,status,total_linhas,linhas_validas,linhas_rejeitadas,avisos,importado_em,finalizado_em,referencia").order("importado_em", { ascending: false }).limit(500),
      supabase.from("rh360_compartilhamentos").select("id,token,titulo,expira_em,ativo,total_acessos,ultimo_acesso_em,criado_em").order("criado_em", { ascending: false }).limit(100),
      supabase.from("colaboradores_v2").select("id", { count: "exact", head: true }),
      supabase.from("rumo_topo_resultados").select("id", { count: "exact", head: true }),
      supabase.from("rs_historico_processos").select("id", { count: "exact", head: true }),
      supabase.from("td_lnt_necessidades").select("id", { count: "exact", head: true }),
      supabase.from("td_avaliacoes_sinais").select("id", { count: "exact", head: true }),
    ]);
    if (history.error) setMessage({ type: "error", text: history.error.message.includes("rh360_historico_importacoes") ? "Execute a migração 007 no Supabase para ativar a Central de Dados." : history.error.message });
    else setImports((history.data ?? []) as ImportRecord[]);
    if (!shareResult.error) setShares((shareResult.data ?? []) as ShareRecord[]);
    setCounts({ colaboradores: collaborators.count ?? 0, rumo: rumo.count ?? 0, recrutamento: recruitment.count ?? 0, lnt: lnt.count ?? 0, avaliacoes: evaluations.count ?? 0 });
    setLoading(false);
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => void loadData(), 0); return () => window.clearTimeout(timer); }, [loadData]);

  const filtered = useMemo(() => imports.filter((item) => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return (origin === "todas" || item.origem === origin) && (!term || [item.nome_arquivo, originLabels[item.origem] ?? item.origem, typeLabels[item.tipo] ?? item.tipo].some((value) => value.toLocaleLowerCase("pt-BR").includes(term)));
  }), [imports, origin, search]);

  const completed = imports.filter((item) => ["concluida", "concluida_com_avisos"].includes(item.status));
  const rejected = imports.reduce((sum, item) => sum + item.linhas_rejeitadas, 0);
  const officialRecords = counts.colaboradores + counts.rumo + counts.recrutamento + counts.lnt + counts.avaliacoes;

  function exportHistory() {
    downloadCsv(`historico-importacoes-rh360-${new Date().toISOString().slice(0, 10)}.csv`, ["Data", "Módulo", "Tipo", "Arquivo", "Referência", "Status", "Linhas", "Válidas", "Rejeitadas", "Hash"], filtered.map((item) => [new Date(item.importado_em).toLocaleString("pt-BR"), originLabels[item.origem] ?? item.origem, typeLabels[item.tipo] ?? item.tipo, item.nome_arquivo, item.referencia, statusLabels[item.status] ?? item.status, item.total_linhas, item.linhas_validas, item.linhas_rejeitadas, item.hash_arquivo]));
  }

  async function copyShare(token: string) {
    await navigator.clipboard.writeText(publicReportUrl(window.location.origin, token));
    setMessage({ type: "success", text: "Link seguro copiado para a área de transferência." });
  }

  async function revokeShare(id: string) {
    const { error } = await supabase.from("rh360_compartilhamentos").update({ ativo: false, revogado_em: new Date().toISOString() }).eq("id", id);
    if (error) setMessage({ type: "error", text: `Não foi possível revogar o link: ${error.message}` });
    else { setShares((current) => current.map((item) => item.id === id ? { ...item, ativo: false } : item)); setMessage({ type: "success", text: "Link revogado. Ele não poderá mais abrir o relatório." }); }
  }

  return <div className="mx-auto max-w-[1500px] space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><SectionTitle title="Central de Dados e Relatórios" description="O banco é a fonte oficial. Planilhas permanecem como uma forma controlada de adicionar e retirar dados." /><button type="button" onClick={exportHistory} disabled={!filtered.length} className="flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-black text-slate-700 disabled:opacity-50"><Download className="mr-2 h-4 w-4" />Exportar histórico</button></div>
    {message && <div className={`flex items-center justify-between rounded-xl border px-4 py-3 text-xs font-semibold ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}><span>{message.text}</span><button type="button" onClick={() => setMessage(null)}><X className="h-4 w-4" /></button></div>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Registros oficiais" value={officialRecords.toLocaleString("pt-BR")} detail="Nas cinco bases consolidadas" icon={Database} tone="blue" /><MetricCard label="Importações concluídas" value={completed.length} detail={`${imports.length} tentativa(s) registradas`} icon={CheckCircle2} tone="emerald" /><MetricCard label="Linhas rejeitadas" value={rejected} detail="Permanecem no histórico para correção" icon={XCircle} tone={rejected ? "red" : "slate"} /><MetricCard label="Links ativos" value={shares.filter((item) => item.ativo && new Date(item.expira_em) > new Date()).length} detail="Somente indicadores agregados" icon={ShieldCheck} tone="violet" /></div>

    <section className="rounded-2xl bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-800 p-6 text-white shadow-lg"><div className="grid gap-6 lg:grid-cols-3"><div><Pill tone="emerald">1 · Carga inicial</Pill><h3 className="mt-3 text-sm font-black">Importe a planilha histórica uma vez</h3><p className="mt-2 text-xs leading-5 text-blue-100">O arquivo, hash, resultado e registros ficam guardados no Supabase. O dashboard consulta o banco, não a planilha.</p></div><div><Pill tone="amber">2 · Operação contínua</Pill><h3 className="mt-3 text-sm font-black">Adicione somente fatos novos</h3><p className="mt-2 text-xs leading-5 text-blue-100">Use formulários internos, links públicos ou arquivos incrementais contendo as novas linhas. A mesma planilha é bloqueada pelo SHA‑256.</p></div><div><Pill tone="violet">3 · Saída e decisão</Pill><h3 className="mt-3 text-sm font-black">Exporte ou compartilhe indicadores</h3><p className="mt-2 text-xs leading-5 text-blue-100">CSV abre no Excel. Links executivos possuem prazo, podem ser revogados e não incluem dados pessoais.</p></div></div></section>

    <div className="grid gap-5 lg:grid-cols-3">{sources.map((source) => { const Icon = source.icon; return <article key={source.title} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className={`bg-gradient-to-r ${source.tone} p-5 text-white`}><Icon className="h-7 w-7" /><h3 className="mt-3 text-sm font-black">{source.title}</h3></div><div className="p-5"><p className="min-h-16 text-xs leading-5 text-slate-500">{source.detail}</p><Link href={source.href} className="mt-4 flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white"><Upload className="mr-2 h-4 w-4" />Adicionar dados</Link></div></article>; })}</div>

    {loading ? <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-16 text-sm text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Consolidando o histórico…</div> : <ProgramPanel title="Histórico unificado de importações" description="Rastreabilidade de cada arquivo processado nos módulos"><div className="grid gap-2 border-b border-slate-100 p-3 md:grid-cols-[1fr_240px]"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar arquivo, módulo ou tipo" className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-primary" /></div><select value={origin} onChange={(event) => setOrigin(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600"><option value="todas">Todos os módulos</option>{Object.entries(originLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-xs"><thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="px-5 py-3">Importação</th><th className="px-5 py-3">Módulo</th><th className="px-5 py-3">Arquivo</th><th className="px-5 py-3">Linhas</th><th className="px-5 py-3">Qualidade</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((item) => <tr key={`${item.origem}:${item.id}`}><td className="px-5 py-4"><p className="font-bold text-slate-800">{new Date(item.importado_em).toLocaleString("pt-BR")}</p><p className="mt-1 text-[10px] text-slate-400">{typeLabels[item.tipo] ?? item.tipo}{item.referencia ? ` · ${item.referencia}` : ""}</p></td><td className="px-5 py-4 font-bold text-slate-600">{originLabels[item.origem] ?? item.origem}</td><td className="max-w-xs px-5 py-4"><p className="truncate font-bold text-slate-700" title={item.nome_arquivo}>{item.nome_arquivo}</p><p className="mt-1 text-[10px] text-slate-400">{formatBytes(item.tamanho_arquivo)} · hash {item.hash_arquivo?.slice(0, 10) ?? "—"}</p></td><td className="px-5 py-4"><strong>{item.linhas_validas}</strong> válidas<br /><span className="text-[10px] text-slate-400">de {item.total_linhas} lidas</span></td><td className="px-5 py-4"><Pill tone={item.linhas_rejeitadas ? "red" : (item.avisos?.length ?? 0) ? "amber" : "emerald"}>{item.linhas_rejeitadas ? `${item.linhas_rejeitadas} rejeitada(s)` : (item.avisos?.length ?? 0) ? `${item.avisos.length} aviso(s)` : "Aprovada"}</Pill></td><td className="px-5 py-4"><Pill tone={item.status === "concluida" ? "emerald" : item.status === "concluida_com_avisos" ? "amber" : item.status === "falhou" ? "red" : "slate"}>{statusLabels[item.status] ?? item.status}</Pill></td></tr>)}{!filtered.length && <tr><td colSpan={6} className="p-10 text-center text-xs text-slate-500">Nenhuma importação encontrada neste recorte.</td></tr>}</tbody></table></div></ProgramPanel>}

    <ProgramPanel title="Links de relatórios executivos" description="Acompanhamento, cópia e revogação dos compartilhamentos gerados no Dashboard"><div className="divide-y divide-slate-100">{shares.map((item) => { const valid = item.ativo && new Date(item.expira_em) > new Date(); const url = typeof window === "undefined" ? "#" : publicReportUrl(window.location.origin, item.token); return <article key={item.id} className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${valid ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>{valid ? <ShieldCheck className="h-5 w-5" /> : <Ban className="h-5 w-5" />}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-xs font-black text-slate-800">{item.titulo}</h3><Pill tone={valid ? "emerald" : "slate"}>{valid ? "Ativo" : "Encerrado"}</Pill></div><p className="mt-1 text-[10px] text-slate-500">Expira em {new Date(item.expira_em).toLocaleString("pt-BR")} · {item.total_acessos} acesso(s){item.ultimo_acesso_em ? ` · último em ${new Date(item.ultimo_acesso_em).toLocaleString("pt-BR")}` : ""}</p></div><div className="flex flex-wrap gap-2">{valid && <><button type="button" onClick={() => void copyShare(item.token)} className="flex items-center rounded-lg border border-slate-300 px-3 py-2 text-[10px] font-black"><Copy className="mr-1.5 h-4 w-4" />Copiar</button><a href={url} target="_blank" rel="noreferrer" className="flex items-center rounded-lg border border-slate-300 px-3 py-2 text-[10px] font-black text-primary"><ExternalLink className="mr-1.5 h-4 w-4" />Abrir</a><button type="button" onClick={() => void revokeShare(item.id)} className="flex items-center rounded-lg bg-red-600 px-3 py-2 text-[10px] font-black text-white"><Ban className="mr-1.5 h-4 w-4" />Revogar</button></>}</div></article>; })}{!shares.length && <div className="p-10 text-center"><FileSpreadsheet className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 text-sm font-black text-slate-700">Nenhum relatório compartilhado</p><p className="mt-1 text-xs text-slate-500">Use o botão Compartilhar no Dashboard Executivo.</p></div>}</div></ProgramPanel>
  </div>;
}
