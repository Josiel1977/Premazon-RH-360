"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, CheckCircle2, ChevronDown, CircleDot, Clock3, ExternalLink,
  Loader2, PauseCircle, PlayCircle, Plus, RefreshCw, Search, Siren,
  TimerOff, X,
} from "lucide-react";
import { MetricCard, Pill, ProgramPanel, SectionTitle } from "@/app/dashboard/_components/program-widgets";
import { supabase } from "@/lib/supabase";
import { isPendingOverdue, pendingUrgency, type PendingPriority, type PendingStatus } from "@/lib/rh360";

type PendingRecord = {
  id: string; chave_origem: string; origem: string; tipo: string; titulo: string;
  descricao: string | null; prioridade: PendingPriority; status: PendingStatus;
  prazo: string | null; automatica: boolean; link_acao: string | null;
  criado_em: string; atualizado_em: string;
};

const originLabels: Record<string, string> = { recrutamento: "Recrutamento", treinamento: "Treinamento", pdi: "PDI", universidade: "Universidade", rumo_topo: "Rumo ao Topo", cadastro: "Cadastro", sistema: "Sistema", manual: "Manual" };
const statusLabels: Record<PendingStatus, string> = { aberta: "Aberta", em_andamento: "Em andamento", aguardando: "Aguardando", concluida: "Concluída", cancelada: "Cancelada" };
const priorityLabels: Record<PendingPriority, string> = { baixa: "Baixa", media: "Média", alta: "Alta", critica: "Crítica" };
const fieldClass = "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-100";

export default function PendingCenterPage() {
  const [items, setItems] = useState<PendingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ativas");
  const [priorityFilter, setPriorityFilter] = useState("todas");
  const [originFilter, setOriginFilter] = useState("todas");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true); setMessage(null);
    const { data: authData } = await supabase.auth.getUser();
    const profileResult = authData.user ? await supabase.from("perfis_usuario").select("perfil,ativo").eq("auth_user_id", authData.user.id).maybeSingle() : { data: null };
    const manager = Boolean(profileResult.data?.ativo && ["administrador", "rh"].includes(profileResult.data.perfil));
    setCanManage(manager);
    if (manager) {
      const sync = await supabase.rpc("rh360_sincronizar_pendencias");
      if (sync.error) {
        setMessage({ type: "error", text: sync.error.message.includes("rh360_sincronizar_pendencias") ? "Execute a migração 006 no Supabase para liberar a Central de Pendências." : `A sincronização automática falhou: ${sync.error.message}` });
      }
    }
    const { data, error } = await supabase.from("rh360_pendencias").select("id,chave_origem,origem,tipo,titulo,descricao,prioridade,status,prazo,automatica,link_acao,criado_em,atualizado_em").order("prazo", { ascending: true, nullsFirst: false }).order("criado_em", { ascending: false });
    if (error) setMessage({ type: "error", text: error.message.includes("rh360_pendencias") ? "Execute a migração 006 no Supabase para criar a Central de Pendências." : error.message });
    else setItems((data ?? []) as PendingRecord[]);
    setLoading(false);
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => void loadItems(), 0); return () => window.clearTimeout(timer); }, [loadItems]);

  const active = items.filter((item) => !["concluida", "cancelada"].includes(item.status));
  const filtered = useMemo(() => items.filter((item) => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    const statusMatch = statusFilter === "todas" || (statusFilter === "ativas" ? !["concluida", "cancelada"].includes(item.status) : item.status === statusFilter);
    return statusMatch && (priorityFilter === "todas" || item.prioridade === priorityFilter) && (originFilter === "todas" || item.origem === originFilter) && (!term || [item.titulo, item.descricao ?? "", originLabels[item.origem] ?? item.origem].some((value) => value.toLocaleLowerCase("pt-BR").includes(term)));
  }).sort((a, b) => pendingUrgency(b.prioridade, b.prazo, b.status) - pendingUrgency(a.prioridade, a.prazo, a.status)), [items, originFilter, priorityFilter, search, statusFilter]);

  async function updateStatus(id: string, status: PendingStatus) {
    setSaving(true);
    const completed = status === "concluida";
    const { error } = await supabase.from("rh360_pendencias").update({ status, resolvida_em: completed ? new Date().toISOString() : null, resolucao: completed ? "Concluída pela Central de Pendências." : null }).eq("id", id);
    if (error) setMessage({ type: "error", text: `Não foi possível atualizar: ${error.message}` });
    else setItems((current) => current.map((item) => item.id === id ? { ...item, status } : item));
    setSaving(false);
  }

  async function createManual(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); const form = new FormData(event.currentTarget);
    const { error } = await supabase.from("rh360_pendencias").insert({
      chave_origem: `manual:${crypto.randomUUID()}`, origem: "manual", tipo: "tarefa_manual",
      titulo: String(form.get("titulo") ?? "").trim(), descricao: String(form.get("descricao") ?? "").trim() || null,
      prioridade: String(form.get("prioridade") ?? "media"), prazo: String(form.get("prazo") ?? "") || null,
      status: "aberta", automatica: false, link_acao: String(form.get("link_acao") ?? "").trim() || null,
    });
    if (error) setMessage({ type: "error", text: `Não foi possível criar a tarefa: ${error.message}` });
    else { setShowForm(false); setMessage({ type: "success", text: "Tarefa adicionada à Central de Pendências." }); await loadItems(); }
    setSaving(false);
  }

  return <div className="mx-auto max-w-7xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><SectionTitle title="Central de Pendências e Alertas" description="Uma caixa de trabalho para transformar SLA, prazo e necessidade em ação acompanhável." /><div className="flex gap-2"><button type="button" onClick={() => void loadItems()} className="flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-black text-slate-700"><RefreshCw className="mr-2 h-4 w-4" />{canManage ? "Sincronizar" : "Atualizar"}</button>{canManage && <button type="button" onClick={() => setShowForm(true)} className="flex items-center rounded-xl bg-primary px-4 py-2.5 text-xs font-black text-white"><Plus className="mr-2 h-4 w-4" />Nova tarefa</button>}</div></div>
    {message && <div className={`flex justify-between rounded-xl border px-4 py-3 text-xs font-semibold ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}><span>{message.text}</span><button type="button" onClick={() => setMessage(null)}><X className="h-4 w-4" /></button></div>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Pendências ativas" value={active.length} icon={CircleDot} tone="blue" /><MetricCard label="Críticas" value={active.filter((item) => item.prioridade === "critica").length} icon={Siren} tone="red" /><MetricCard label="Prazos vencidos" value={active.filter((item) => isPendingOverdue(item.prazo, item.status)).length} icon={TimerOff} tone="amber" /><MetricCard label="Em andamento" value={active.filter((item) => item.status === "em_andamento").length} icon={PlayCircle} tone="emerald" /></div>
    <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-[1fr_180px_160px_180px]"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar tarefa ou descrição" className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-primary" /></div><FilterSelect value={statusFilter} onChange={setStatusFilter}><option value="ativas">Pendências ativas</option><option value="todas">Todos os status</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</FilterSelect><FilterSelect value={priorityFilter} onChange={setPriorityFilter}><option value="todas">Prioridades</option>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</FilterSelect><FilterSelect value={originFilter} onChange={setOriginFilter}><option value="todas">Todos os módulos</option>{Object.entries(originLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</FilterSelect></div>
    {loading ? <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-16 text-sm text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Atualizando pendências…</div> : <ProgramPanel title="Fila de trabalho" description={`${filtered.length} tarefa(s) no recorte atual`}><div className="divide-y divide-slate-100">{filtered.map((item) => { const overdue = isPendingOverdue(item.prazo, item.status); return <article key={item.id} className="p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${overdue || item.prioridade === "critica" ? "bg-red-50 text-red-700" : item.prioridade === "alta" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>{overdue ? <AlertTriangle className="h-5 w-5" /> : item.status === "concluida" ? <CheckCircle2 className="h-5 w-5" /> : <Clock3 className="h-5 w-5" />}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Pill tone={item.prioridade === "critica" ? "red" : item.prioridade === "alta" ? "amber" : "blue"}>{priorityLabels[item.prioridade]}</Pill><Pill tone="slate">{originLabels[item.origem] ?? item.origem}</Pill>{item.automatica && <Pill tone="violet">Automática</Pill>}{overdue && <Pill tone="red">Prazo vencido</Pill>}</div><h3 className="mt-2 text-sm font-black text-slate-900">{item.titulo}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{item.descricao || "Sem descrição adicional."}</p><p className="mt-1 text-[10px] font-bold text-slate-400">{item.prazo ? `Prazo: ${new Date(`${item.prazo}T12:00:00`).toLocaleDateString("pt-BR")}` : "Sem prazo definido"} · {statusLabels[item.status]}</p></div><div className="flex shrink-0 flex-wrap gap-2">{item.link_acao && <Link href={item.link_acao} className="flex items-center rounded-lg border border-slate-300 px-3 py-2 text-[10px] font-black text-primary"><ExternalLink className="mr-1.5 h-4 w-4" />Abrir módulo</Link>}{canManage && item.status === "aberta" && <button type="button" disabled={saving} onClick={() => void updateStatus(item.id, "em_andamento")} className="flex items-center rounded-lg bg-blue-700 px-3 py-2 text-[10px] font-black text-white"><PlayCircle className="mr-1.5 h-4 w-4" />Iniciar</button>}{canManage && item.status === "em_andamento" && <button type="button" disabled={saving} onClick={() => void updateStatus(item.id, "aguardando")} className="flex items-center rounded-lg border border-slate-300 px-3 py-2 text-[10px] font-black"><PauseCircle className="mr-1.5 h-4 w-4" />Aguardar</button>}{canManage && !["concluida", "cancelada"].includes(item.status) && <button type="button" disabled={saving} onClick={() => void updateStatus(item.id, "concluida")} className="flex items-center rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-black text-white"><CheckCircle2 className="mr-1.5 h-4 w-4" />Concluir</button>}{canManage && item.status === "concluida" && !item.automatica && <button type="button" disabled={saving} onClick={() => void updateStatus(item.id, "aberta")} className="flex items-center rounded-lg border border-slate-300 px-3 py-2 text-[10px] font-black"><RefreshCw className="mr-1.5 h-4 w-4" />Reabrir</button>}</div></div></article>; })}{!filtered.length && <div className="p-12 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-emerald-300" /><p className="mt-3 text-sm font-black text-slate-700">Nenhuma pendência neste recorte</p><p className="mt-1 text-xs text-slate-500">Os filtros podem ser alterados para consultar tarefas concluídas.</p></div>}</div></ProgramPanel>}
    {showForm && <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm md:p-8"><div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-100 px-6 py-5"><h2 className="font-black text-slate-900">Nova tarefa manual</h2><button type="button" onClick={() => setShowForm(false)}><X className="h-5 w-5 text-slate-400" /></button></div><form onSubmit={createManual} className="space-y-4 p-6"><label className="text-xs font-bold">Título *<input name="titulo" required minLength={5} maxLength={180} className={fieldClass} /></label><label className="text-xs font-bold">Descrição<textarea name="descricao" rows={4} maxLength={2000} className={fieldClass} /></label><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold">Prioridade<select name="prioridade" defaultValue="media" className={fieldClass}>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-xs font-bold">Prazo<input name="prazo" type="date" className={fieldClass} /></label></div><label className="text-xs font-bold">Link interno para ação<input name="link_acao" placeholder="/dashboard/..." pattern="^/dashboard(/.*)?$" className={fieldClass} /></label><div className="flex justify-end gap-3 border-t border-slate-100 pt-4"><button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold">Cancelar</button><button disabled={saving} className="flex items-center rounded-xl bg-primary px-4 py-2.5 text-xs font-black text-white disabled:opacity-50">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar tarefa</button></div></form></div></div>}
  </div>;
}

function FilterSelect({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: React.ReactNode }) { return <div className="relative"><select value={value} onChange={(event) => onChange(event.target.value)} className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 pr-8 text-xs font-bold text-slate-600">{children}</select><ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-400" /></div>; }
