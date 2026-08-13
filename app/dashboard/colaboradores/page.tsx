"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award, BriefcaseBusiness, Building2, CheckCircle2, ClipboardList, Crown,
  FileSpreadsheet, GraduationCap, Link2, Loader2, Mail, Pencil, Phone, Plus,
  Save, Search, ShieldCheck, Target, Upload, UserRound, Users, X,
} from "lucide-react";
import { MetricCard, Pill, ProgramPanel, SectionTitle } from "@/app/dashboard/_components/program-widgets";
import { parseColaboradoresRows, type ColaboradoresImportResult } from "@/lib/colaboradores-importacao";
import { supabase } from "@/lib/supabase";
import { normalizePersonName } from "@/lib/rh360";
import { readXlsxRows } from "@/lib/xlsx-browser";

type Employee = {
  id: string; auth_user_id: string | null; matricula: string | null; nome: string; nome_social: string | null;
  cpf: string | null; email: string | null; telefone: string | null; cargo_id: string | null;
  setor_id: string | null; equipe_id: string | null; filial_id: string | null; gestor_id: string | null;
  data_admissao: string | null; data_desligamento: string | null; data_experiencia_fim: string | null;
  status: string; centro_custo: string | null; tipo_contrato: string | null; jornada: string | null;
  observacoes_profissionais: string | null;
};
type Lookup = { id: string; nome: string; parentId?: string | null };
type Performance = { id: string; colaborador_id: string | null; colaborador_nome_importado: string; media_geral: number; setor_importado: string };
type Need = { id: string; colaborador_id: string | null; colaborador_nome_importado: string; treinamento_sugerido: string | null; prioridade: string; status: string; necessidades_tecnicas: string[]; temas_comportamentais: string[] };
type Pdi = { id: string; colaborador_id: string | null; colaborador_nome_importado: string; objetivo: string; status: string; data_limite: string | null };
type Participation = { id: string; colaborador_id: string | null; colaborador_nome_importado: string | null; treinamento_id: string; status: string; certificado_valido_ate: string | null };
type Training = { id: string; titulo: string; carga_horaria: number; data_inicio: string; status: string };
type Enrollment = { id: string; colaborador_id: string | null; curso_id: string; status: string; progresso_percentual: number };
type Course = { id: string; nome: string };
type RumoResult = { id: string; colaborador_id: string | null; colaborador_nome_importado: string; elegivel: boolean; valor_bonus: number; faltas: number; atrasos: number; atestados: number; criado_em: string };
type Tab = "resumo" | "desempenho" | "treinamentos" | "rumo" | "vinculos";
type LinkCandidate = { id: string; source: "avaliacao" | "lnt" | "pdi" | "participacao" | "rumo"; table: string; title: string; detail: string };
type EmployeeImportPreview = { file: File; hash: string; result: ColaboradoresImportResult };

const fieldClass = "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-blue-100";
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const statusLabels: Record<string, string> = { ativo: "Ativo", afastado: "Afastado", ferias: "Férias", desligado: "Desligado" };
const contractLabels: Record<string, string> = { clt: "CLT", temporario: "Temporário", aprendiz: "Aprendiz", estagio: "Estágio", pj: "PJ", terceirizado: "Terceirizado", outro: "Outro" };

async function sha256(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<Lookup[]>([]);
  const [sectors, setSectors] = useState<Lookup[]>([]);
  const [teams, setTeams] = useState<Lookup[]>([]);
  const [branches, setBranches] = useState<Lookup[]>([]);
  const [performance, setPerformance] = useState<Performance[]>([]);
  const [needs, setNeeds] = useState<Need[]>([]);
  const [pdis, setPdis] = useState<Pdi[]>([]);
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [rumo, setRumo] = useState<RumoResult[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [tab, setTab] = useState<Tab>("resumo");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [formSector, setFormSector] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [readingImport, setReadingImport] = useState(false);
  const [importPreview, setImportPreview] = useState<EmployeeImportPreview | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true); setMessage(null);
    const results = await Promise.all([
      supabase.from("colaboradores_v2").select("id,auth_user_id,matricula,nome,nome_social,cpf,email,telefone,cargo_id,setor_id,equipe_id,filial_id,gestor_id,data_admissao,data_desligamento,data_experiencia_fim,status,centro_custo,tipo_contrato,jornada,observacoes_profissionais").order("nome"),
      supabase.from("cargos").select("id,cargo").order("cargo"),
      supabase.from("setores").select("id,nome,filial_id").eq("ativo", true).order("nome"),
      supabase.from("equipes").select("id,nome,setor_id").eq("ativo", true).order("nome"),
      supabase.from("filiais").select("id,nome").eq("ativo", true).order("nome"),
      supabase.from("td_avaliacoes_sinais").select("id,colaborador_id,colaborador_nome_importado,media_geral,setor_importado").order("criado_em", { ascending: false }).limit(3000),
      supabase.from("td_lnt_necessidades").select("id,colaborador_id,colaborador_nome_importado,treinamento_sugerido,prioridade,status,necessidades_tecnicas,temas_comportamentais").order("criado_em", { ascending: false }).limit(3000),
      supabase.from("td_pdis").select("id,colaborador_id,colaborador_nome_importado,objetivo,status,data_limite").order("criado_em", { ascending: false }).limit(2000),
      supabase.from("td_participacoes").select("id,colaborador_id,colaborador_nome_importado,treinamento_id,status,certificado_valido_ate").limit(5000),
      supabase.from("td_treinamentos").select("id,titulo,carga_horaria,data_inicio,status").limit(2000),
      supabase.from("td_matriculas_cursos").select("id,colaborador_id,curso_id,status,progresso_percentual").limit(5000),
      supabase.from("td_cursos").select("id,nome").limit(2000),
      supabase.from("rumo_topo_resultados").select("id,colaborador_id,colaborador_nome_importado,elegivel,valor_bonus,faltas,atrasos,atestados,criado_em").order("criado_em", { ascending: false }).limit(5000),
    ]);
    const employeeResult = results[0];
    if (employeeResult.error) setMessage({ type: "error", text: employeeResult.error.message.includes("filial_id") || employeeResult.error.message.includes("nome_social") ? "Execute a migração 006 no Supabase para ativar o Colaborador 360." : employeeResult.error.message });
    else {
      const data = (employeeResult.data ?? []) as Employee[]; setEmployees(data);
      setSelectedId((current) => current && data.some((item) => item.id === current) ? current : data[0]?.id ?? "");
    }
    const roleResult = results[1];
    const sectorResult = results[2];
    const teamResult = results[3];
    const branchResult = results[4];
    if (!roleResult.error) setRoles(((roleResult.data ?? []) as unknown as { id: string; cargo: string }[]).map((item) => ({ id: item.id, nome: item.cargo })));
    if (!sectorResult.error) setSectors(((sectorResult.data ?? []) as unknown as { id: string; nome: string; filial_id: string | null }[]).map((item) => ({ id: item.id, nome: item.nome, parentId: item.filial_id })));
    if (!teamResult.error) setTeams(((teamResult.data ?? []) as unknown as { id: string; nome: string; setor_id: string | null }[]).map((item) => ({ id: item.id, nome: item.nome, parentId: item.setor_id })));
    if (!branchResult.error) setBranches((branchResult.data ?? []) as unknown as Lookup[]);
    if (!results[5].error) setPerformance((results[5].data ?? []).map((item) => ({ ...item, media_geral: Number(item.media_geral) })) as Performance[]);
    if (!results[6].error) setNeeds((results[6].data ?? []) as Need[]);
    if (!results[7].error) setPdis((results[7].data ?? []) as Pdi[]);
    if (!results[8].error) setParticipations((results[8].data ?? []) as Participation[]);
    if (!results[9].error) setTrainings((results[9].data ?? []).map((item) => ({ ...item, carga_horaria: Number(item.carga_horaria) })) as Training[]);
    if (!results[10].error) setEnrollments((results[10].data ?? []).map((item) => ({ ...item, progresso_percentual: Number(item.progresso_percentual) })) as Enrollment[]);
    if (!results[11].error) setCourses((results[11].data ?? []) as Course[]);
    if (!results[12].error) setRumo((results[12].data ?? []).map((item) => ({ ...item, valor_bonus: Number(item.valor_bonus) })) as RumoResult[]);
    setLoading(false);
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => void loadData(), 0); return () => window.clearTimeout(timer); }, [loadData]);

  const selected = employees.find((item) => item.id === selectedId) ?? null;
  const roleNames = useMemo(() => new Map(roles.map((item) => [item.id, item.nome])), [roles]);
  const sectorNames = useMemo(() => new Map(sectors.map((item) => [item.id, item.nome])), [sectors]);
  const roleName = useCallback((id: string | null) => id ? roleNames.get(id) ?? "Não informado" : "Não informado", [roleNames]);
  const sectorName = useCallback((id: string | null) => id ? sectorNames.get(id) ?? "Não informado" : "Não informado", [sectorNames]);
  const branchName = (id: string | null) => branches.find((item) => item.id === id)?.nome ?? "Não informada";
  const managerName = (id: string | null) => employees.find((item) => item.id === id)?.nome ?? "Não informado";
  const filteredEmployees = useMemo(() => { const term = normalizePersonName(search); return employees.filter((item) => !term || [item.nome, item.matricula ?? "", item.email ?? "", roleName(item.cargo_id), sectorName(item.setor_id)].some((value) => normalizePersonName(value).includes(term))); }, [employees, roleName, search, sectorName]);
  const employeePerformance = performance.filter((item) => item.colaborador_id === selectedId);
  const employeeNeeds = needs.filter((item) => item.colaborador_id === selectedId);
  const employeePdis = pdis.filter((item) => item.colaborador_id === selectedId);
  const employeeParticipations = participations.filter((item) => item.colaborador_id === selectedId);
  const employeeEnrollments = enrollments.filter((item) => item.colaborador_id === selectedId);
  const employeeRumo = rumo.filter((item) => item.colaborador_id === selectedId);
  const latestPerformance = employeePerformance[0] ?? null;

  const linkCandidates = useMemo<LinkCandidate[]>(() => {
    if (!selected) return [];
    const target = normalizePersonName(selected.nome); const candidates: LinkCandidate[] = [];
    performance.filter((item) => !item.colaborador_id && normalizePersonName(item.colaborador_nome_importado) === target).forEach((item) => candidates.push({ id: item.id, source: "avaliacao", table: "td_avaliacoes_sinais", title: "Avaliação de desempenho", detail: `${item.setor_importado} · média ${item.media_geral.toFixed(1)}` }));
    needs.filter((item) => !item.colaborador_id && normalizePersonName(item.colaborador_nome_importado) === target).forEach((item) => candidates.push({ id: item.id, source: "lnt", table: "td_lnt_necessidades", title: "Necessidade de treinamento", detail: item.treinamento_sugerido || [...item.necessidades_tecnicas, ...item.temas_comportamentais].join(", ") || "Sem tema" }));
    pdis.filter((item) => !item.colaborador_id && normalizePersonName(item.colaborador_nome_importado) === target).forEach((item) => candidates.push({ id: item.id, source: "pdi", table: "td_pdis", title: "Plano de desenvolvimento", detail: item.objetivo }));
    participations.filter((item) => !item.colaborador_id && item.colaborador_nome_importado && normalizePersonName(item.colaborador_nome_importado) === target).forEach((item) => candidates.push({ id: item.id, source: "participacao", table: "td_participacoes", title: "Participação em treinamento", detail: trainings.find((training) => training.id === item.treinamento_id)?.titulo ?? "Treinamento" }));
    rumo.filter((item) => !item.colaborador_id && normalizePersonName(item.colaborador_nome_importado) === target).forEach((item) => candidates.push({ id: item.id, source: "rumo", table: "rumo_topo_resultados", title: "Resultado Rumo ao Topo", detail: `${item.elegivel ? "Elegível" : "Não elegível"} · ${money.format(item.valor_bonus)}` }));
    return candidates;
  }, [needs, participations, pdis, performance, rumo, selected, trainings]);

  const completeness = selected ? Math.round(([selected.matricula, selected.email, selected.cargo_id, selected.setor_id, selected.filial_id, selected.gestor_id, selected.data_admissao].filter(Boolean).length / 7) * 100) : 0;

  function openForm(employee: Employee | null) { setEditing(employee); setFormSector(employee?.setor_id ?? ""); setFormOpen(true); }
  async function saveEmployee(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); const form = new FormData(event.currentTarget);
    const payload = {
      nome: String(form.get("nome") ?? "").trim(), nome_social: String(form.get("nome_social") ?? "").trim() || null,
      cpf: String(form.get("cpf") ?? "").replace(/\D/g, "") || null, matricula: String(form.get("matricula") ?? "").trim() || null,
      email: String(form.get("email") ?? "").trim().toLowerCase() || null, telefone: String(form.get("telefone") ?? "").trim() || null,
      cargo_id: String(form.get("cargo_id") ?? "") || null, setor_id: String(form.get("setor_id") ?? "") || null,
      equipe_id: String(form.get("equipe_id") ?? "") || null, filial_id: String(form.get("filial_id") ?? "") || null,
      gestor_id: String(form.get("gestor_id") ?? "") || null, data_admissao: String(form.get("data_admissao") ?? "") || null,
      data_experiencia_fim: String(form.get("data_experiencia_fim") ?? "") || null, status: String(form.get("status") ?? "ativo"),
      centro_custo: String(form.get("centro_custo") ?? "").trim() || null, tipo_contrato: String(form.get("tipo_contrato") ?? "") || null,
      jornada: String(form.get("jornada") ?? "").trim() || null, observacoes_profissionais: String(form.get("observacoes_profissionais") ?? "").trim() || null,
    };
    const operation = editing ? supabase.from("colaboradores_v2").update(payload).eq("id", editing.id) : supabase.from("colaboradores_v2").insert(payload).select("id").single();
    const { data, error } = await operation;
    if (error) setMessage({ type: "error", text: `Não foi possível salvar o colaborador: ${error.message}` });
    else { setFormOpen(false); setMessage({ type: "success", text: editing ? "Cadastro do colaborador atualizado." : "Colaborador incluído no cadastro mestre." }); if (!editing && data && "id" in data) setSelectedId(String(data.id)); await loadData(); }
    setSaving(false);
  }

  async function readEmployeeImport(file: File | null) {
    if (!file) return;
    setReadingImport(true); setMessage(null); setImportPreview(null);
    try {
      if (!file.name.toLowerCase().endsWith(".xlsx")) throw new Error("Envie a relação de colaboradores no formato XLSX.");
      const [rows, hash] = await Promise.all([readXlsxRows(file), sha256(file)]);
      const result = parseColaboradoresRows(rows);
      setImportPreview({ file, hash, result });
      setMessage({ type: "success", text: `${result.registros.length} colaboradores reconhecidos. Confira a prévia antes de gravar.` });
    } catch (importError) {
      setMessage({ type: "error", text: importError instanceof Error ? importError.message : "Não foi possível ler a planilha." });
    } finally { setReadingImport(false); }
  }

  async function saveEmployeeImport() {
    if (!importPreview) return;
    setSaving(true); setMessage(null);
    const { data, error } = await supabase.rpc("rh360_importar_colaboradores", {
      p_arquivo_nome: importPreview.file.name,
      p_arquivo_hash: importPreview.hash,
      p_registros: importPreview.result.registros.map((item) => ({
        nome: item.nome,
        setor: item.setor,
        equipe: item.equipe,
        funcao: item.funcao,
      })),
    });

    if (error) {
      setMessage({ type: "error", text: error.message.includes("rh360_importar_colaboradores") ? "Execute a migração 012 no Supabase para liberar a importação do cadastro mestre." : error.message });
    } else {
      const summary = data as { criados?: number; atualizados?: number; ignorados?: number } | null;
      setMessage({ type: "success", text: `Importação concluída: ${summary?.criados ?? 0} criado(s), ${summary?.atualizados ?? 0} complementado(s) e ${summary?.ignorados ?? 0} ignorado(s).` });
      setImportPreview(null); setImportOpen(false); await loadData();
    }
    setSaving(false);
  }

  async function confirmLink(candidate: LinkCandidate) {
    if (!selected) return; setSaving(true);
    const allowed = new Set(["td_avaliacoes_sinais", "td_lnt_necessidades", "td_pdis", "td_participacoes", "rumo_topo_resultados"]);
    if (!allowed.has(candidate.table)) { setSaving(false); return; }
    const { error } = await supabase.from(candidate.table).update({ colaborador_id: selected.id }).eq("id", candidate.id).is("colaborador_id", null);
    if (error) setMessage({ type: "error", text: `Não foi possível confirmar o vínculo: ${error.message}` });
    else { setMessage({ type: "success", text: `${candidate.title} vinculada ao cadastro de ${selected.nome}.` }); await loadData(); }
    setSaving(false);
  }

  const tabs: { key: Tab; label: string; icon: typeof UserRound }[] = [
    { key: "resumo", label: "Resumo profissional", icon: UserRound }, { key: "desempenho", label: "Desempenho e PDI", icon: Target },
    { key: "treinamentos", label: "Treinamentos", icon: GraduationCap }, { key: "rumo", label: "Rumo ao Topo", icon: Crown },
    { key: "vinculos", label: `Vínculos (${linkCandidates.length})`, icon: Link2 },
  ];

  return <div className="mx-auto max-w-[1500px] space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><SectionTitle title="Colaborador 360" description="Cadastro mestre e histórico integrado de desempenho, desenvolvimento, treinamentos e reconhecimento." /><div className="flex flex-col gap-2 sm:flex-row"><button type="button" onClick={() => { setImportOpen((value) => !value); setImportPreview(null); }} className="flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-black text-primary"><Upload className="mr-2 h-4 w-4" />Importar ativos</button><button type="button" onClick={() => openForm(null)} className="flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-xs font-black text-white"><Plus className="mr-2 h-4 w-4" />Novo colaborador</button></div></div>
    {message && <div className={`flex justify-between rounded-xl border px-4 py-3 text-xs font-semibold ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}><span>{message.text}</span><button type="button" onClick={() => setMessage(null)}><X className="h-4 w-4" /></button></div>}
    {importOpen && <EmployeeImportPanel preview={importPreview} reading={readingImport} saving={saving} existingNames={new Set(employees.map((item) => normalizePersonName(item.nome)))} onRead={readEmployeeImport} onSave={saveEmployeeImport} onClose={() => { setImportOpen(false); setImportPreview(null); }} />}
    {loading ? <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-16 text-sm text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Carregando cadastros…</div> : <div className="grid min-h-[700px] gap-5 xl:grid-cols-[320px_1fr]">
      <ProgramPanel title="Cadastro mestre" description={`${employees.length} colaborador(es)`}><div className="border-b border-slate-100 p-3"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome, matrícula, cargo ou setor" className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-primary" /></div></div><div className="max-h-[650px] divide-y divide-slate-100 overflow-y-auto">{filteredEmployees.map((item) => <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={`flex w-full items-center gap-3 p-4 text-left transition ${selectedId === item.id ? "bg-blue-50" : "hover:bg-slate-50"}`}><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-black ${selectedId === item.id ? "bg-primary text-white" : "bg-slate-100 text-slate-600"}`}>{item.nome.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span><span className="min-w-0"><span className="block truncate text-xs font-black text-slate-800">{item.nome_social || item.nome}</span><span className="mt-0.5 block truncate text-[10px] text-slate-500">{item.matricula || "Sem matrícula"} · {roleName(item.cargo_id)}</span><span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-black ${item.status === "ativo" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{statusLabels[item.status] ?? item.status}</span></span></button>)}{!filteredEmployees.length && <p className="p-8 text-center text-xs text-slate-500">Nenhum colaborador encontrado.</p>}</div></ProgramPanel>
      {!selected ? <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><div><Users className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 text-sm font-black text-slate-700">Selecione ou cadastre um colaborador</p></div></div> : <div className="space-y-5"><section className="overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-800 p-6 text-white shadow-lg"><div className="flex flex-col gap-5 lg:flex-row lg:items-center"><span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl font-black ring-1 ring-white/20">{selected.nome.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Pill tone={selected.status === "ativo" ? "emerald" : "slate"}>{statusLabels[selected.status] ?? selected.status}</Pill>{selected.auth_user_id && <span className="flex items-center text-[10px] font-black text-emerald-300"><ShieldCheck className="mr-1 h-3.5 w-3.5" />Acesso vinculado</span>}</div><h2 className="mt-2 truncate text-2xl font-black">{selected.nome_social || selected.nome}</h2>{selected.nome_social && <p className="mt-1 text-xs text-blue-200">Nome civil: {selected.nome}</p>}<p className="mt-1 text-sm text-blue-100">{roleName(selected.cargo_id)} · {sectorName(selected.setor_id)} · {branchName(selected.filial_id)}</p><p className="mt-2 text-xs text-blue-200">Matrícula {selected.matricula || "não informada"} · Gestor: {managerName(selected.gestor_id)}</p></div><div className="flex shrink-0 flex-col gap-2"><button type="button" onClick={() => openForm(selected)} className="flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-xs font-black text-primary"><Pencil className="mr-2 h-4 w-4" />Editar cadastro</button><div className="rounded-xl bg-white/10 px-4 py-2 text-center"><p className="text-[9px] font-black uppercase tracking-wide text-blue-200">Completude</p><p className="text-lg font-black">{completeness}%</p></div></div></div></section>
        <nav className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">{tabs.map(({ key, label, icon: Icon }) => <button key={key} type="button" onClick={() => setTab(key)} className={`flex shrink-0 items-center rounded-lg px-3 py-2.5 text-[10px] font-black ${tab === key ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-50"}`}><Icon className="mr-1.5 h-4 w-4" />{label}</button>)}</nav>
        {tab === "resumo" && <SummaryTab employee={selected} role={roleName(selected.cargo_id)} sector={sectorName(selected.setor_id)} branch={branchName(selected.filial_id)} manager={managerName(selected.gestor_id)} completeness={completeness} />}
        {tab === "desempenho" && <PerformanceTab performance={employeePerformance} latest={latestPerformance} needs={employeeNeeds} pdis={employeePdis} />}
        {tab === "treinamentos" && <TrainingTab participations={employeeParticipations} trainings={trainings} enrollments={employeeEnrollments} courses={courses} />}
        {tab === "rumo" && <RumoTab records={employeeRumo} />}
        {tab === "vinculos" && <LinksTab candidates={linkCandidates} saving={saving} onLink={confirmLink} />}
      </div>}
    </div>}
    {formOpen && <EmployeeModal employee={editing} roles={roles} sectors={sectors} teams={teams.filter((item) => !formSector || item.parentId === formSector)} branches={branches} managers={employees.filter((item) => item.id !== editing?.id && item.status === "ativo")} formSector={formSector} setFormSector={setFormSector} saving={saving} onClose={() => setFormOpen(false)} onSubmit={saveEmployee} />}
  </div>;
}

function EmployeeImportPanel({ preview, reading, saving, existingNames, onRead, onSave, onClose }: {
  preview: EmployeeImportPreview | null;
  reading: boolean;
  saving: boolean;
  existingNames: Set<string>;
  onRead: (file: File | null) => Promise<void>;
  onSave: () => Promise<void>;
  onClose: () => void;
}) {
  const existing = preview?.result.registros.filter((item) => existingNames.has(normalizePersonName(item.nome))).length ?? 0;
  return <ProgramPanel title="Importar colaboradores ativos" description="Carga controlada para o cadastro mestre; a planilha original não é enviada nem armazenada" action={<button type="button" onClick={onClose}><X className="h-4 w-4 text-slate-400" /></button>}>
    <div className="space-y-5 p-5">
      <label className="flex cursor-pointer flex-col items-center rounded-2xl border border-dashed border-slate-300 p-7 text-center hover:border-primary hover:bg-blue-50"><FileSpreadsheet className="h-9 w-9 text-emerald-600" /><span className="mt-3 text-xs font-black text-slate-800">Selecionar relação de colaboradores</span><span className="mt-1 text-[10px] text-slate-500">XLSX · leitura local · limite de 15 MB</span><input type="file" accept=".xlsx" className="sr-only" onChange={(event) => void onRead(event.target.files?.[0] ?? null)} />{reading && <Loader2 className="mt-3 h-5 w-5 animate-spin text-primary" />}</label>
      {preview && <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Reconhecidos" value={preview.result.registros.length} detail={`Cabeçalho na linha ${preview.result.linhaCabecalho}`} icon={Users} tone="emerald" /><MetricCard label="Rejeitados" value={preview.result.linhasRejeitadas} detail="Rodapés ou linhas incompletas" icon={ClipboardList} tone={preview.result.linhasRejeitadas ? "amber" : "emerald"} /><MetricCard label="Duplicados no arquivo" value={preview.result.duplicadosNoArquivo} detail="Somente a primeira ocorrência" icon={Link2} tone={preview.result.duplicadosNoArquivo ? "amber" : "emerald"} /><MetricCard label="Já cadastrados" value={existing} detail="Não serão duplicados" icon={ShieldCheck} tone="blue" /></div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[10px] leading-5 text-amber-900"><strong>Qualidade cadastral:</strong> esta planilha contém nome, setor, equipe e função, mas não possui matrícula, CPF ou e-mail. Os registros serão criados como ativos e esses campos permanecerão pendentes para conferência do RH.</div>
        <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[720px] text-left text-xs"><thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="px-4 py-3">Linha</th><th className="px-4 py-3">Colaborador</th><th className="px-4 py-3">Setor</th><th className="px-4 py-3">Equipe</th><th className="px-4 py-3">Função</th></tr></thead><tbody className="divide-y divide-slate-100">{preview.result.registros.slice(0, 8).map((item) => <tr key={`${item.linha_original}:${item.nome}`}><td className="px-4 py-3 text-slate-400">{item.linha_original}</td><td className="px-4 py-3 font-black text-slate-800">{item.nome}</td><td className="px-4 py-3 text-slate-600">{item.setor ?? "—"}</td><td className="px-4 py-3 text-slate-600">{item.equipe ?? "—"}</td><td className="px-4 py-3 text-slate-600">{item.funcao ?? "—"}</td></tr>)}</tbody></table></div>
        {preview.result.avisos.length > 0 && <p className="text-[10px] leading-5 text-amber-700">{preview.result.avisos.slice(0, 3).join(" ")}{preview.result.avisos.length > 3 ? ` Mais ${preview.result.avisos.length - 3} aviso(s).` : ""}</p>}
        <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black text-slate-800">{preview.file.name}</p><p className="mt-1 text-[10px] text-slate-500">A confirmação cria setores, equipes e funções ausentes em uma única transação.</p></div><button type="button" disabled={saving || !preview.result.registros.length} onClick={() => void onSave()} className="flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-xs font-black text-white disabled:opacity-50">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Confirmar importação</button></div></>}
    </div>
  </ProgramPanel>;
}

function SummaryTab({ employee, role, sector, branch, manager, completeness }: { employee: Employee; role: string; sector: string; branch: string; manager: string; completeness: number }) {
  const fields = [
    { label: "Cargo", value: role, icon: BriefcaseBusiness }, { label: "Setor", value: sector, icon: Building2 },
    { label: "Filial", value: branch, icon: Building2 }, { label: "Gestor", value: manager, icon: UserRound },
    { label: "Admissão", value: employee.data_admissao ? new Date(`${employee.data_admissao}T12:00:00`).toLocaleDateString("pt-BR") : "Não informada", icon: CheckCircle2 },
    { label: "Contrato", value: employee.tipo_contrato ? contractLabels[employee.tipo_contrato] ?? employee.tipo_contrato : "Não informado", icon: ClipboardList },
    { label: "Centro de custo", value: employee.centro_custo || "Não informado", icon: Building2 },
    { label: "Jornada", value: employee.jornada || "Não informada", icon: ClipboardList },
  ];
  return <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{fields.map(({ label, value, icon: Icon }) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><Icon className="h-4 w-4 text-primary" /><p className="mt-3 text-[9px] font-black uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-xs font-black text-slate-800">{value}</p></article>)}</div><div className="grid gap-5 xl:grid-cols-2"><ProgramPanel title="Contato profissional"><div className="space-y-3 p-5 text-xs"><p className="flex items-center text-slate-600"><Mail className="mr-2 h-4 w-4 text-blue-600" />{employee.email || "E-mail não informado"}</p><p className="flex items-center text-slate-600"><Phone className="mr-2 h-4 w-4 text-emerald-600" />{employee.telefone || "Telefone não informado"}</p><p className="flex items-center text-slate-600"><ShieldCheck className="mr-2 h-4 w-4 text-violet-600" />{employee.auth_user_id ? "Conta de acesso vinculada" : "Sem conta de acesso vinculada"}</p></div></ProgramPanel><ProgramPanel title="Qualidade cadastral" description={`${completeness}% dos campos essenciais preenchidos`}><div className="p-5"><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${completeness >= 85 ? "bg-emerald-500" : completeness >= 60 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${completeness}%` }} /></div><p className="mt-3 text-xs leading-5 text-slate-500">Matrícula, e-mail, cargo, setor, filial, gestor e admissão formam o conjunto mínimo recomendado.</p></div></ProgramPanel></div>{employee.observacoes_profissionais && <ProgramPanel title="Observações profissionais"><p className="p-5 text-xs leading-5 text-slate-600">{employee.observacoes_profissionais}</p></ProgramPanel>}</div>;
}

function PerformanceTab({ performance, latest, needs, pdis }: { performance: Performance[]; latest: Performance | null; needs: Need[]; pdis: Pdi[] }) {
  return <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-3"><MetricCard label="Última média" value={latest ? latest.media_geral.toFixed(1) : "—"} detail={latest ? "Escala real de 0 a 10" : "Sem avaliação vinculada"} icon={Target} tone="blue" /><MetricCard label="Avaliações" value={performance.length} icon={ClipboardList} tone="violet" /><MetricCard label="PDIs ativos" value={pdis.filter((item) => item.status === "ativo").length} icon={CheckCircle2} tone="emerald" /></div><div className="grid gap-5 xl:grid-cols-2"><ProgramPanel title="Planos de desenvolvimento"><div className="divide-y divide-slate-100">{pdis.map((item) => <article key={item.id} className="p-4"><div className="flex items-center justify-between gap-3"><Pill tone={item.status === "concluido" ? "emerald" : "blue"}>{item.status}</Pill><span className="text-[10px] font-bold text-slate-400">{item.data_limite ? `Prazo ${new Date(`${item.data_limite}T12:00:00`).toLocaleDateString("pt-BR")}` : "Sem prazo"}</span></div><p className="mt-2 text-xs leading-5 text-slate-700">{item.objetivo}</p></article>)}{!pdis.length && <p className="p-8 text-center text-xs text-slate-500">Nenhum PDI vinculado.</p>}</div></ProgramPanel><ProgramPanel title="Necessidades de treinamento"><div className="divide-y divide-slate-100">{needs.map((item) => <article key={item.id} className="p-4"><div className="flex gap-2"><Pill tone={item.prioridade === "critica" ? "red" : item.prioridade === "alta" ? "amber" : "blue"}>{item.prioridade}</Pill><Pill tone="slate">{item.status}</Pill></div><p className="mt-2 text-xs font-bold text-slate-700">{item.treinamento_sugerido || [...item.necessidades_tecnicas, ...item.temas_comportamentais].join(", ") || "Necessidade sem tema informado"}</p></article>)}{!needs.length && <p className="p-8 text-center text-xs text-slate-500">Nenhuma LNT vinculada.</p>}</div></ProgramPanel></div></div>;
}

function TrainingTab({ participations, trainings, enrollments, courses }: { participations: Participation[]; trainings: Training[]; enrollments: Enrollment[]; courses: Course[] }) {
  const completed = participations.filter((item) => ["presente", "aprovado"].includes(item.status));
  const hours = completed.reduce((total, item) => total + (trainings.find((training) => training.id === item.treinamento_id)?.carga_horaria ?? 0), 0);
  return <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-3"><MetricCard label="Participações" value={participations.length} icon={GraduationCap} tone="blue" /><MetricCard label="Horas concluídas" value={`${hours.toFixed(1)}h`} icon={CheckCircle2} tone="emerald" /><MetricCard label="Cursos online" value={enrollments.length} icon={Award} tone="violet" /></div><div className="grid gap-5 xl:grid-cols-2"><ProgramPanel title="Treinamentos corporativos"><div className="divide-y divide-slate-100">{participations.map((item) => { const training = trainings.find((entry) => entry.id === item.treinamento_id); return <article key={item.id} className="p-4"><div className="flex items-center justify-between"><Pill tone={["presente", "aprovado"].includes(item.status) ? "emerald" : "slate"}>{item.status}</Pill>{item.certificado_valido_ate && <span className="text-[10px] text-slate-400">Validade {new Date(`${item.certificado_valido_ate}T12:00:00`).toLocaleDateString("pt-BR")}</span>}</div><p className="mt-2 text-xs font-black text-slate-800">{training?.titulo ?? "Treinamento"}</p><p className="mt-1 text-[10px] text-slate-500">{training ? `${training.carga_horaria}h · ${new Date(`${training.data_inicio}T12:00:00`).toLocaleDateString("pt-BR")}` : "Dados do treinamento indisponíveis"}</p></article>; })}{!participations.length && <p className="p-8 text-center text-xs text-slate-500">Nenhuma participação vinculada.</p>}</div></ProgramPanel><ProgramPanel title="Universidade Corporativa"><div className="divide-y divide-slate-100">{enrollments.map((item) => <article key={item.id} className="p-4"><div className="flex items-center justify-between"><p className="text-xs font-black text-slate-800">{courses.find((course) => course.id === item.curso_id)?.nome ?? "Curso online"}</p><Pill tone={item.status === "concluida" ? "emerald" : "blue"}>{item.status}</Pill></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-primary" style={{ width: `${item.progresso_percentual}%` }} /></div><p className="mt-1 text-right text-[10px] font-bold text-slate-400">{item.progresso_percentual.toFixed(0)}%</p></article>)}{!enrollments.length && <p className="p-8 text-center text-xs text-slate-500">Nenhuma matrícula vinculada.</p>}</div></ProgramPanel></div></div>;
}

function RumoTab({ records }: { records: RumoResult[] }) {
  const eligible = records.filter((item) => item.elegivel); const total = eligible.reduce((sum, item) => sum + item.valor_bonus, 0);
  return <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-3"><MetricCard label="Ciclos registrados" value={records.length} icon={Crown} tone="violet" /><MetricCard label="Ciclos elegíveis" value={eligible.length} icon={CheckCircle2} tone="emerald" /><MetricCard label="Reconhecimento acumulado" value={money.format(total)} icon={Award} tone="amber" /></div><ProgramPanel title="Histórico do programa"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="px-5 py-3">Registro</th><th className="px-5 py-3">Elegibilidade</th><th className="px-5 py-3">Faltas</th><th className="px-5 py-3">Atrasos</th><th className="px-5 py-3">Atestados</th><th className="px-5 py-3">Valor</th></tr></thead><tbody className="divide-y divide-slate-100">{records.map((item) => <tr key={item.id}><td className="px-5 py-4">{new Date(item.criado_em).toLocaleDateString("pt-BR")}</td><td className="px-5 py-4"><Pill tone={item.elegivel ? "emerald" : "red"}>{item.elegivel ? "Elegível" : "Não elegível"}</Pill></td><td className="px-5 py-4">{item.faltas}</td><td className="px-5 py-4">{item.atrasos}</td><td className="px-5 py-4">{item.atestados}</td><td className="px-5 py-4 font-black">{money.format(item.valor_bonus)}</td></tr>)}</tbody></table>{!records.length && <p className="p-8 text-center text-xs text-slate-500">Nenhum resultado vinculado.</p>}</div></ProgramPanel></div>;
}

function LinksTab({ candidates, saving, onLink }: { candidates: LinkCandidate[]; saving: boolean; onLink: (candidate: LinkCandidate) => void }) {
  return <div className="space-y-5"><div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs leading-5 text-blue-800"><strong>Conferência humana:</strong> as correspondências abaixo usam somente igualdade do nome normalizado. O sistema nunca confirma automaticamente que duas pessoas são a mesma. Verifique matrícula, setor ou contexto antes de vincular.</div><ProgramPanel title="Vínculos sugeridos" description={`${candidates.length} registro(s) com o mesmo nome e sem colaborador_id`}><div className="divide-y divide-slate-100">{candidates.map((candidate) => <article key={`${candidate.table}:${candidate.id}`} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Link2 className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="text-xs font-black text-slate-800">{candidate.title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{candidate.detail}</p></div><button type="button" disabled={saving} onClick={() => void onLink(candidate)} className="flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-[10px] font-black text-white disabled:opacity-50"><Link2 className="mr-1.5 h-4 w-4" />Confirmar vínculo</button></article>)}{!candidates.length && <div className="p-10 text-center"><CheckCircle2 className="mx-auto h-9 w-9 text-emerald-300" /><p className="mt-3 text-xs font-black text-slate-700">Nenhuma correspondência pendente para este colaborador</p></div>}</div></ProgramPanel></div>;
}

function EmployeeModal({ employee, roles, sectors, teams, branches, managers, formSector, setFormSector, saving, onClose, onSubmit }: { employee: Employee | null; roles: Lookup[]; sectors: Lookup[]; teams: Lookup[]; branches: Lookup[]; managers: Employee[]; formSector: string; setFormSector: (value: string) => void; saving: boolean; onClose: () => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm md:p-8"><div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-100 px-6 py-5"><div><h2 className="text-lg font-black text-slate-900">{employee ? "Editar colaborador" : "Novo colaborador"}</h2><p className="mt-1 text-xs text-slate-500">Cadastro profissional mestre; os módulos serão ligados por este identificador.</p></div><button type="button" onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button></div><form key={employee?.id ?? "new"} onSubmit={onSubmit} className="space-y-5 p-6"><div className="grid gap-5 md:grid-cols-2"><label className="text-xs font-bold md:col-span-2">Nome completo *<input name="nome" required minLength={3} maxLength={180} defaultValue={employee?.nome ?? ""} className={fieldClass} /></label><label className="text-xs font-bold">Nome social<input name="nome_social" maxLength={180} defaultValue={employee?.nome_social ?? ""} className={fieldClass} /></label><label className="text-xs font-bold">Matrícula<input name="matricula" maxLength={60} defaultValue={employee?.matricula ?? ""} className={fieldClass} /></label><label className="text-xs font-bold">CPF<input name="cpf" inputMode="numeric" pattern="[0-9.\- ]{11,18}" defaultValue={employee?.cpf ?? ""} className={fieldClass} /><span className="mt-1 block text-[9px] font-normal text-slate-400">Use apenas quando necessário para o processo de RH.</span></label><label className="text-xs font-bold">E-mail<input name="email" type="email" maxLength={180} defaultValue={employee?.email ?? ""} className={fieldClass} /></label><label className="text-xs font-bold">Telefone<input name="telefone" maxLength={30} defaultValue={employee?.telefone ?? ""} className={fieldClass} /></label><label className="text-xs font-bold">Filial<select name="filial_id" defaultValue={employee?.filial_id ?? ""} className={fieldClass}><option value="">Não informada</option>{branches.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label><label className="text-xs font-bold">Setor<select name="setor_id" value={formSector} onChange={(event) => setFormSector(event.target.value)} className={fieldClass}><option value="">Não informado</option>{sectors.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label><label className="text-xs font-bold">Equipe<select name="equipe_id" defaultValue={employee?.equipe_id ?? ""} className={fieldClass}><option value="">Não informada</option>{teams.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label><label className="text-xs font-bold">Cargo<select name="cargo_id" defaultValue={employee?.cargo_id ?? ""} className={fieldClass}><option value="">Não informado</option>{roles.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label><label className="text-xs font-bold">Gestor responsável<select name="gestor_id" defaultValue={employee?.gestor_id ?? ""} className={fieldClass}><option value="">Não informado</option>{managers.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label><label className="text-xs font-bold">Tipo de contrato<select name="tipo_contrato" defaultValue={employee?.tipo_contrato ?? ""} className={fieldClass}><option value="">Não informado</option>{Object.entries(contractLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-xs font-bold">Data de admissão<input name="data_admissao" type="date" defaultValue={employee?.data_admissao ?? ""} className={fieldClass} /></label><label className="text-xs font-bold">Fim da experiência<input name="data_experiencia_fim" type="date" min={employee?.data_admissao ?? undefined} defaultValue={employee?.data_experiencia_fim ?? ""} className={fieldClass} /></label><label className="text-xs font-bold">Centro de custo<input name="centro_custo" maxLength={100} defaultValue={employee?.centro_custo ?? ""} className={fieldClass} /></label><label className="text-xs font-bold">Jornada<input name="jornada" maxLength={120} placeholder="Ex.: 44h semanais" defaultValue={employee?.jornada ?? ""} className={fieldClass} /></label><label className="text-xs font-bold">Status<select name="status" defaultValue={employee?.status ?? "ativo"} className={fieldClass}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-xs font-bold md:col-span-2">Observações profissionais<textarea name="observacoes_profissionais" rows={3} maxLength={2000} defaultValue={employee?.observacoes_profissionais ?? ""} className={fieldClass} /></label></div><div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-[10px] leading-5 text-amber-800">Cadastre apenas informações necessárias à relação profissional. Dados médicos, documentos ou ocorrências disciplinares não devem ser incluídos em observações gerais.</div><div className="flex justify-end gap-3 border-t border-slate-100 pt-5"><button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-bold">Cancelar</button><button disabled={saving} className="flex items-center rounded-xl bg-primary px-5 py-2.5 text-xs font-black text-white disabled:opacity-50">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{employee ? "Salvar alterações" : "Cadastrar colaborador"}</button></div></form></div></div>;
}
