"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  UserMinus,
  UserRoundPlus,
  Users,
  XCircle,
} from "lucide-react";
import { ModuleWorkspace, type WorkspaceItem } from "@/app/dashboard/_components/module-workspace";
import { MetricCard, Pill, ProgramPanel, SectionTitle } from "@/app/dashboard/_components/program-widgets";
import {
  canApproveMovement,
  movementDocumentCode,
  movementProgress,
  movementStageLabels,
  movementStatusLabels,
  movementTypeLabels,
  type MovementStage,
  type MovementStatus,
  type MovementType,
} from "@/lib/movimentacoes-pessoal";
import { supabase } from "@/lib/supabase";

type View = "desligamento" | "aumento" | "substituicao" | "minhas" | "acompanhar" | "aprovacoes";
type Named = { id: string; nome: string };
type Employee = Named & { status: string; setor_id: string | null; cargo_id: string | null };
type ControlledDocument = {
  id: string;
  codigo: string;
  titulo: string;
  revisao: string;
  aprovado_em: string | null;
  arquivo_path: string | null;
  observacoes: string | null;
  metadados: { arquivo_conferido?: boolean } | null;
};
type Movement = {
  id: string;
  protocolo: string;
  tipo: MovementType;
  solicitante_auth_user_id: string;
  solicitante_colaborador_id: string | null;
  colaborador_id: string | null;
  setor_id: string | null;
  cargo_id: string | null;
  cargo_nome_solicitado: string | null;
  quantidade: number;
  justificativa: string;
  data_desejada: string | null;
  prioridade: "baixa" | "media" | "alta" | "critica";
  documento_codigo: string;
  documento_revisao: string;
  etapa_atual: MovementStage;
  status: MovementStatus;
  criado_em: string;
  atualizado_em: string;
};
type History = {
  id: number;
  movimentacao_id: string;
  etapa: MovementStage;
  acao: "solicitada" | "aprovada" | "rejeitada" | "cancelada" | "concluida";
  ator_perfil: string | null;
  observacao: string | null;
  criado_em: string;
};

const views: WorkspaceItem<View>[] = [
  { key: "desligamento", label: "Solicitar Desligamento", icon: UserMinus, tone: "danger" },
  { key: "aumento", label: "Solicitar Aumento de Quadro", icon: UserRoundPlus, tone: "success" },
  { key: "substituicao", label: "Solicitar Substituição", icon: RefreshCw, tone: "info" },
  { key: "minhas", label: "Minhas Solicitações", icon: ClipboardList, tone: "accent", dividerBefore: true },
  { key: "acompanhar", label: "Acompanhar Solicitações", icon: BarChart3, tone: "info" },
  { key: "aprovacoes", label: "Pendências / Aprovações", icon: ShieldCheck, tone: "warning" },
];

const fieldClass = "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-100";
const priorityLabels = { baixa: "Baixa", media: "Média", alta: "Alta", critica: "Crítica" };
const historyActionLabels = { solicitada: "Solicitada", aprovada: "Aprovada", rejeitada: "Rejeitada", cancelada: "Cancelada", concluida: "Concluída" };

function formatDate(value: string | null, withTime = false) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", withTime ? { dateStyle: "short", timeStyle: "short" } : { timeZone: "UTC" }).format(new Date(withTime ? value : `${value.slice(0, 10)}T12:00:00Z`));
}

function statusTone(status: MovementStatus): "blue" | "emerald" | "red" | "slate" {
  if (status === "concluida") return "emerald";
  if (status === "rejeitada" || status === "cancelada") return "red";
  return "blue";
}

export default function PersonnelMovementsPage() {
  const [view, setView] = useState<View>("desligamento");
  const [profile, setProfile] = useState("");
  const [userId, setUserId] = useState("");
  const [movements, setMovements] = useState<Movement[]>([]);
  const [history, setHistory] = useState<History[]>([]);
  const [documents, setDocuments] = useState<ControlledDocument[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sectors, setSectors] = useState<Named[]>([]);
  const [roles, setRoles] = useState<Named[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedMovementId, setSelectedMovementId] = useState<string | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [sectorId, setSectorId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [roleName, setRoleName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [justification, setJustification] = useState("");
  const [desiredDate, setDesiredDate] = useState("");
  const [priority, setPriority] = useState<Movement["prioridade"]>("media");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data: auth } = await supabase.auth.getUser();
    const currentUser = auth.user?.id ?? "";
    setUserId(currentUser);
    const [movementResult, historyResult, documentResult, employeeResult, sectorResult, roleResult, profileResult] = await Promise.all([
      supabase.from("rh_movimentacoes_pessoal").select("*").order("criado_em", { ascending: false }),
      supabase.from("rh_movimentacoes_historico").select("*").order("criado_em", { ascending: true }),
      supabase.from("rh_documentos_controlados").select("id,codigo,titulo,revisao,aprovado_em,arquivo_path,observacoes,metadados").eq("status", "vigente").order("codigo"),
      supabase.from("colaboradores_v2").select("id,nome,status,setor_id,cargo_id").neq("status", "desligado").order("nome"),
      supabase.from("setores").select("id,nome").eq("ativo", true).order("nome"),
      supabase.from("cargos").select("id,nome").order("nome"),
      currentUser ? supabase.from("perfis_usuario").select("perfil,ativo").eq("auth_user_id", currentUser).maybeSingle() : Promise.resolve({ data: null, error: null }),
    ]);
    const databaseError = movementResult.error ?? historyResult.error ?? documentResult.error;
    if (databaseError) setError(databaseError.message.includes("rh_movimentacoes") ? "Execute as migrações 015 e 016 para habilitar Movimentações de Pessoal." : databaseError.message);
    const nextMovements = (movementResult.data ?? []) as Movement[];
    setMovements(nextMovements);
    setHistory((historyResult.data ?? []) as History[]);
    setDocuments((documentResult.data ?? []) as ControlledDocument[]);
    setEmployees((employeeResult.data ?? []) as Employee[]);
    setSectors((sectorResult.data ?? []) as Named[]);
    setRoles((roleResult.data ?? []) as Named[]);
    setProfile(profileResult.data?.ativo ? String(profileResult.data.perfil) : "");
    setSelectedMovementId((current) => current && nextMovements.some((item) => item.id === current) ? current : nextMovements[0]?.id ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    const requestedView = new URLSearchParams(window.location.search).get("view") as View | null;
    if (requestedView && views.some((item) => item.key === requestedView)) setView(requestedView);
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const canCreate = ["administrador", "rh", "gestor"].includes(profile);
  const myMovements = movements.filter((item) => item.solicitante_auth_user_id === userId);
  const pendingApprovals = movements.filter((item) => item.status === "em_fluxo" && canApproveMovement(profile, item.etapa_atual));
  const selectedMovement = movements.find((item) => item.id === selectedMovementId) ?? null;
  const selectedHistory = history.filter((item) => item.movimentacao_id === selectedMovementId);
  const metrics = useMemo(() => ({
    total: movements.length,
    open: movements.filter((item) => item.status === "em_fluxo").length,
    completed: movements.filter((item) => item.status === "concluida").length,
    pending: pendingApprovals.length,
  }), [movements, pendingApprovals.length]);

  useEffect(() => {
    if (view !== "aprovacoes" || !pendingApprovals.length) return;
    if (!selectedMovementId || !pendingApprovals.some((item) => item.id === selectedMovementId)) setSelectedMovementId(pendingApprovals[0].id);
  }, [pendingApprovals, selectedMovementId, view]);

  function resetForm() {
    setEmployeeId(""); setSectorId(""); setRoleId(""); setRoleName(""); setQuantity("1");
    setJustification(""); setDesiredDate(""); setPriority("media");
  }

  function selectEmployee(id: string, type: MovementType) {
    setEmployeeId(id);
    if (type === "substituicao") {
      const employee = employees.find((item) => item.id === id);
      setSectorId(employee?.setor_id ?? "");
      setRoleId(employee?.cargo_id ?? "");
    }
  }

  async function createMovement(type: MovementType) {
    setError(""); setSuccess("");
    if (!canCreate) return setError("Seu perfil possui acesso de consulta, mas não pode abrir solicitações.");
    if (justification.trim().length < 10) return setError("Informe uma justificativa com pelo menos 10 caracteres.");
    setSaving(true);
    const { data, error: requestError } = await supabase.rpc("rh_criar_movimentacao", {
      p_tipo: type,
      p_colaborador_id: employeeId || null,
      p_setor_id: sectorId || null,
      p_cargo_id: roleId || null,
      p_cargo_nome_solicitado: roleName.trim() || null,
      p_quantidade: Number(quantity) || 1,
      p_justificativa: justification.trim(),
      p_data_desejada: desiredDate || null,
      p_prioridade: priority,
    });
    setSaving(false);
    if (requestError) return setError(requestError.message);
    resetForm();
    setSelectedMovementId(String(data));
    setSuccess("Solicitação registrada, protocolada e encaminhada ao RH.");
    setView("minhas");
    await load();
  }

  async function decide(decision: "aprovar" | "rejeitar") {
    if (!selectedMovement) return;
    if (decision === "rejeitar" && decisionNote.trim().length < 5) return setError("Informe o motivo da rejeição.");
    setSaving(true); setError(""); setSuccess("");
    const { data, error: decisionError } = await supabase.rpc("rh_decidir_movimentacao", {
      p_movimentacao_id: selectedMovement.id,
      p_decisao: decision,
      p_observacao: decisionNote.trim() || null,
    });
    setSaving(false);
    if (decisionError) return setError(decisionError.message);
    setDecisionNote("");
    setSuccess(decision === "aprovar" ? `Etapa aprovada. Próximo estado: ${String(data)}.` : "Solicitação rejeitada com justificativa registrada.");
    await load();
  }

  async function openDocument(document: ControlledDocument) {
    if (!document.arquivo_path) return setError("O arquivo oficial ainda não foi vinculado pela Qualidade. A referência e a revisão permanecem preservadas.");
    const { data, error: storageError } = await supabase.storage.from("qualidade-rqs").createSignedUrl(document.arquivo_path, 300);
    if (storageError || !data?.signedUrl) return setError(storageError?.message ?? "Não foi possível abrir o documento oficial.");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  const employeeName = (id: string | null) => employees.find((item) => item.id === id)?.nome ?? "—";
  const sectorName = (id: string | null) => sectors.find((item) => item.id === id)?.nome ?? "—";
  const roleNameFor = (movement: Movement) => roles.find((item) => item.id === movement.cargo_id)?.nome ?? movement.cargo_nome_solicitado ?? "—";

  function documentCard(type: MovementType) {
    const code = movementDocumentCode(type);
    const document = documents.find((item) => item.codigo === code);
    return <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs text-blue-950">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="font-black uppercase tracking-wide">Documento oficial vinculado</p><p className="mt-1 text-sm font-black">{document ? `${document.codigo} · ${document.titulo} · Rev. ${document.revisao}` : `${code} · configuração pendente`}</p><p className="mt-1 leading-5 text-blue-800">A plataforma conduz e audita o fluxo. O RQ permanece sendo o registro oficial controlado pela Qualidade.</p></div>
        <button type="button" disabled={!document} onClick={() => document && void openDocument(document)} className="shrink-0 rounded-xl border border-blue-200 bg-white px-4 py-2 font-black text-primary disabled:cursor-not-allowed disabled:opacity-50"><FileText className="mr-2 inline h-4 w-4" />{document?.arquivo_path ? "Abrir RQ" : "Arquivo pendente"}</button>
      </div>
    </div>;
  }

  function requestForm(type: MovementType) {
    const needsEmployee = type !== "aumento_quadro";
    return <div className="space-y-5">
      <SectionTitle title={movementTypeLabels[type]} description="Ao enviar, o sistema cria um protocolo e registra a etapa do gestor antes de encaminhar ao RH." />
      {documentCard(type)}
      {!canCreate && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-900"><AlertTriangle className="mr-2 inline h-4 w-4" />Abertura restrita a gestor, RH e administrador.</div>}
      <ProgramPanel title="Dados da solicitação" description="Preencha somente informações confirmadas. Nenhuma decisão sobre pessoas é tomada automaticamente.">
        <div className="grid gap-5 p-5 md:grid-cols-2">
          {needsEmployee && <label className="text-xs font-bold text-slate-700">Colaborador {type === "substituicao" ? "a ser substituído" : "envolvido"}<select value={employeeId} onChange={(event) => selectEmployee(event.target.value, type)} className={fieldClass}><option value="">Selecione...</option>{employees.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>}
          {(type === "aumento_quadro" || type === "substituicao") && <label className="text-xs font-bold text-slate-700">Setor<select value={sectorId} onChange={(event) => setSectorId(event.target.value)} className={fieldClass}><option value="">Selecione...</option>{sectors.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>}
          {(type === "aumento_quadro" || type === "substituicao") && <label className="text-xs font-bold text-slate-700">Função cadastrada<select value={roleId} onChange={(event) => setRoleId(event.target.value)} className={fieldClass}><option value="">Selecione ou descreva abaixo...</option>{roles.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>}
          {type === "aumento_quadro" && <label className="text-xs font-bold text-slate-700">Função ainda não cadastrada<input value={roleName} onChange={(event) => setRoleName(event.target.value)} maxLength={120} placeholder="Use somente se a função não existir" className={fieldClass} /></label>}
          {type === "aumento_quadro" && <label className="text-xs font-bold text-slate-700">Quantidade<input type="number" min="1" max="999" value={quantity} onChange={(event) => setQuantity(event.target.value)} className={fieldClass} /></label>}
          <label className="text-xs font-bold text-slate-700">Data desejada<input type="date" value={desiredDate} onChange={(event) => setDesiredDate(event.target.value)} className={fieldClass} /></label>
          <label className="text-xs font-bold text-slate-700">Prioridade<select value={priority} onChange={(event) => setPriority(event.target.value as Movement["prioridade"])} className={fieldClass}>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="text-xs font-bold text-slate-700 md:col-span-2">Justificativa<textarea value={justification} onChange={(event) => setJustification(event.target.value)} minLength={10} maxLength={4000} rows={5} placeholder="Registre o contexto e os fatos necessários para a análise." className={fieldClass} /></label>
        </div>
        <div className="flex justify-end border-t border-slate-100 p-5"><button type="button" disabled={saving || !canCreate} onClick={() => void createMovement(type)} className="rounded-xl bg-primary px-5 py-3 text-xs font-black text-white disabled:opacity-50">{saving ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> : <Send className="mr-2 inline h-4 w-4" />}Enviar para aprovação</button></div>
      </ProgramPanel>
    </div>;
  }

  function movementList(items: Movement[], empty: string) {
    if (!items.length) return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">{empty}</div>;
    return <div className="grid gap-3">{items.map((movement) => <button key={movement.id} type="button" onClick={() => setSelectedMovementId(movement.id)} className={`rounded-2xl border bg-white p-4 text-left transition hover:border-blue-300 ${selectedMovementId === movement.id ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black text-primary">{movement.protocolo}</p><h3 className="mt-1 text-sm font-black text-slate-800">{movementTypeLabels[movement.tipo]}</h3><p className="mt-1 text-xs text-slate-500">{employeeName(movement.colaborador_id)} · {sectorName(movement.setor_id)} · {roleNameFor(movement)}</p></div><div className="flex flex-wrap gap-2"><Pill tone={statusTone(movement.status)}>{movementStatusLabels[movement.status]}</Pill><Pill tone="slate">{movementStageLabels[movement.etapa_atual]}</Pill></div></div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-primary" style={{ width: `${movementProgress(movement.etapa_atual, movement.status)}%` }} /></div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[10px] font-bold text-slate-500"><span>{movement.documento_codigo} · Rev. {movement.documento_revisao}</span><span>{priorityLabels[movement.prioridade]}</span><span>{formatDate(movement.criado_em, true)}</span></div>
    </button>)}</div>;
  }

  function movementDetails() {
    if (!selectedMovement) return null;
    return <ProgramPanel title="Rastreabilidade da solicitação" description={`${selectedMovement.protocolo} · ${selectedMovement.documento_codigo} Rev. ${selectedMovement.documento_revisao}`}>
      <div className="space-y-5 p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase text-slate-400">Colaborador</p><p className="mt-1 text-xs font-black text-slate-800">{employeeName(selectedMovement.colaborador_id)}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase text-slate-400">Setor</p><p className="mt-1 text-xs font-black text-slate-800">{sectorName(selectedMovement.setor_id)}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase text-slate-400">Função</p><p className="mt-1 text-xs font-black text-slate-800">{roleNameFor(selectedMovement)}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase text-slate-400">Data desejada</p><p className="mt-1 text-xs font-black text-slate-800">{formatDate(selectedMovement.data_desejada)}</p></div></div>
        <div className="rounded-xl border border-slate-200 p-4"><p className="text-[10px] font-bold uppercase text-slate-400">Justificativa registrada</p><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-700">{selectedMovement.justificativa}</p></div>
        <ol className="space-y-3">{selectedHistory.map((item) => <li key={item.id} className="flex gap-3"><span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${item.acao === "rejeitada" ? "bg-red-500" : item.acao === "concluida" ? "bg-emerald-500" : "bg-blue-500"}`} /><div><p className="text-xs font-black text-slate-800">{movementStageLabels[item.etapa]} · {historyActionLabels[item.acao]}</p><p className="text-[10px] text-slate-500">{formatDate(item.criado_em, true)}{item.ator_perfil ? ` · perfil ${item.ator_perfil.toUpperCase()}` : ""}</p>{item.observacao && <p className="mt-1 text-xs leading-5 text-slate-600">{item.observacao}</p>}</div></li>)}</ol>
      </div>
    </ProgramPanel>;
  }

  function dashboard() {
    return <div className="space-y-5"><SectionTitle title="Acompanhar Solicitações" description="Visão gerencial do volume, do estágio atual e da rastreabilidade de cada protocolo." /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Solicitações visíveis" value={metrics.total} icon={ClipboardList} tone="blue" /><MetricCard label="Em aprovação" value={metrics.open} icon={Clock3} tone="amber" /><MetricCard label="Concluídas" value={metrics.completed} icon={CheckCircle2} tone="emerald" /><MetricCard label="Aguardando você" value={metrics.pending} icon={ShieldCheck} tone={metrics.pending ? "red" : "slate"} /></div><div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,.8fr)]"><div>{movementList(movements, "Nenhuma movimentação registrada.")}</div>{movementDetails()}</div></div>;
  }

  function approvals() {
    return <div className="space-y-5"><SectionTitle title="Pendências e Aprovações" description="Cada perfil decide somente sua etapa. A autorização é validada novamente no banco de dados." />{pendingApprovals.length ? <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,.8fr)]"><div>{movementList(pendingApprovals, "Não há solicitações aguardando este perfil.")}</div><div className="space-y-5">{movementDetails()}{selectedMovement && pendingApprovals.some((item) => item.id === selectedMovement.id) && <ProgramPanel title={`Decisão · ${movementStageLabels[selectedMovement.etapa_atual]}`} description="A aprovação encaminha à próxima área; a rejeição encerra o fluxo e exige justificativa."><div className="space-y-4 p-5"><label className="text-xs font-bold text-slate-700">Parecer / observação<textarea value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} rows={4} maxLength={2000} className={fieldClass} /></label><div className="flex flex-wrap justify-end gap-3"><button type="button" disabled={saving} onClick={() => void decide("rejeitar")} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-black text-red-700 disabled:opacity-50"><XCircle className="mr-2 inline h-4 w-4" />Rejeitar</button><button type="button" disabled={saving} onClick={() => void decide("aprovar")} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"><CheckCircle2 className="mr-2 inline h-4 w-4" />Aprovar etapa</button></div></div></ProgramPanel>}</div></div> : <div className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 p-10 text-center"><CheckCircle2 className="mx-auto h-9 w-9 text-emerald-500" /><p className="mt-3 text-sm font-black text-emerald-900">Nenhuma aprovação pendente para seu perfil</p><p className="mt-1 text-xs text-emerald-700">As solicitações de outras etapas não ficam disponíveis para decisão.</p></div>}</div>;
  }

  return <ModuleWorkspace eyebrow="Gestão de Pessoas" title="Movimentações de Pessoal" description="Solicitações vinculadas aos RQs oficiais, com segregação de funções e histórico auditável." icon={Users} items={views} active={view} onChange={setView} accent="from-slate-950 via-blue-950 to-blue-700" actions={<button type="button" onClick={() => void load()} disabled={loading} className="rounded-xl bg-white/10 px-4 py-2 text-xs font-black text-white ring-1 ring-white/20 disabled:opacity-50"><RefreshCw className={`mr-2 inline h-4 w-4 ${loading ? "animate-spin" : ""}`} />Atualizar</button>}>
    {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800"><AlertTriangle className="mr-2 inline h-4 w-4" />{error}</div>}
    {success && <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800"><CheckCircle2 className="mr-2 inline h-4 w-4" />{success}</div>}
    {loading && !movements.length && view !== "desligamento" && view !== "aumento" && view !== "substituicao" ? <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-16 text-sm text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Carregando movimentações…</div> : <>
      {view === "desligamento" && requestForm("desligamento")}
      {view === "aumento" && requestForm("aumento_quadro")}
      {view === "substituicao" && requestForm("substituicao")}
      {view === "minhas" && <div className="space-y-5"><SectionTitle title="Minhas Solicitações" description="Protocolos abertos por você e o respectivo histórico de decisões." /><div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,.8fr)]"><div>{movementList(myMovements, "Você ainda não abriu uma solicitação.")}</div>{movementDetails()}</div></div>}
      {view === "acompanhar" && dashboard()}
      {view === "aprovacoes" && approvals()}
    </>}
  </ModuleWorkspace>;
}
