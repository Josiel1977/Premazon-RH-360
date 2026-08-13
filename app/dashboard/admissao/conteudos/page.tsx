"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, ArrowLeft, BookOpenCheck, CheckCircle2, FileText, Layers3,
  Loader2, Plus, Save, Settings2, ShieldCheck, Upload, X,
} from "lucide-react";
import { MetricCard, Pill, ProgramPanel, SectionTitle } from "@/app/dashboard/_components/program-widgets";
import { onboardingSlug, type OnboardingContentType, validateOnboardingVersion } from "@/lib/onboarding";
import { supabase } from "@/lib/supabase";

type Area = "rh" | "dp" | "qualidade" | "sesmt" | "gestor" | "ti";
type Content = { id: string; area: Area; titulo: string; slug: string; categoria: string | null; descricao: string | null; tipo: OnboardingContentType; nivel_acesso: string; curso_id: string | null; exige_ciencia: boolean; ativo: boolean };
type Version = { id: string; conteudo_id: string; versao: string; vigencia_inicio: string; vigencia_fim: string | null; status: string; documento_path: string | null; link_url: string | null; criado_em: string };
type Rule = { id: string; conteudo_id: string | null; escopo: string; filial_id: string | null; setor_id: string | null; cargo_id: string | null; incluir: boolean; obrigatoria: boolean; dias_relativos: number; ativo: boolean; aprovado_em: string | null };
type Named = { id: string; nome: string };
type Course = { id: string; titulo: string; publicado: boolean };
type AuthEmployee = { auth_user_id: string; nome: string };
type AreaOwner = { auth_user_id: string; area: Area; ativo: boolean };

const areaLabels: Record<Area, string> = { rh: "RH", dp: "Departamento Pessoal", qualidade: "Qualidade", sesmt: "SESMT", gestor: "Gestor", ti: "TI" };
const accessLabels: Record<string, string> = { publico_link: "Link individual", autenticado: "Usuário autenticado", interno: "Somente equipe interna" };
const typeLabels: Record<string, string> = { texto: "Texto", documento: "Documento", link: "Link", curso: "Curso em vídeo" };
const fieldClass = "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-100";

function today() { return new Date().toISOString().slice(0, 10); }
function formatDate(value: string | null) { return value ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`)) : "—"; }

export default function OnboardingContentPage() {
  const [contents, setContents] = useState<Content[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [branches, setBranches] = useState<Named[]>([]);
  const [sectors, setSectors] = useState<Named[]>([]);
  const [roles, setRoles] = useState<Named[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [authEmployees, setAuthEmployees] = useState<AuthEmployee[]>([]);
  const [areaOwners, setAreaOwners] = useState<AreaOwner[]>([]);
  const [profile, setProfile] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [contentModal, setContentModal] = useState<Content | "new" | null>(null);
  const [versionContent, setVersionContent] = useState<Content | null>(null);
  const [ruleContent, setRuleContent] = useState<Content | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const { data: auth } = await supabase.auth.getUser();
    const [contentResult, versionResult, ruleResult, branchResult, sectorResult, roleResult, courseResult, employeeResult, ownerResult, profileResult] = await Promise.all([
      supabase.from("adm_conteudos_onboarding").select("id,area,titulo,slug,categoria,descricao,tipo,nivel_acesso,curso_id,exige_ciencia,ativo").order("area").order("titulo"),
      supabase.from("adm_conteudo_versoes").select("id,conteudo_id,versao,vigencia_inicio,vigencia_fim,status,documento_path,link_url,criado_em").order("criado_em", { ascending: false }),
      supabase.from("adm_regras_onboarding").select("id,conteudo_id,escopo,filial_id,setor_id,cargo_id,incluir,obrigatoria,dias_relativos,ativo,aprovado_em").not("conteudo_id", "is", null),
      supabase.from("filiais").select("id,nome").order("nome"),
      supabase.from("setores").select("id,nome").order("nome"),
      supabase.from("cargos").select("id,nome").order("nome"),
      supabase.from("td_cursos").select("id,titulo,publicado").order("titulo"),
      supabase.from("colaboradores_v2").select("auth_user_id,nome").not("auth_user_id", "is", null).order("nome"),
      supabase.from("adm_responsaveis_area").select("auth_user_id,area,ativo").eq("ativo", true),
      auth.user ? supabase.from("perfis_usuario").select("perfil").eq("auth_user_id", auth.user.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    ]);
    const firstError = contentResult.error ?? versionResult.error ?? ruleResult.error;
    if (firstError) setError(firstError.message.includes("adm_conteudos_onboarding") ? "Execute a migração 009 para habilitar o Onboarding 360°." : firstError.message);
    setContents((contentResult.data ?? []) as Content[]); setVersions((versionResult.data ?? []) as Version[]); setRules((ruleResult.data ?? []) as Rule[]);
    setBranches((branchResult.data ?? []) as Named[]); setSectors((sectorResult.data ?? []) as Named[]); setRoles((roleResult.data ?? []) as Named[]); setCourses((courseResult.data ?? []) as Course[]);
    setAuthEmployees((employeeResult.data ?? []) as AuthEmployee[]); setAreaOwners((ownerResult.data ?? []) as AreaOwner[]);
    setProfile(String(profileResult.data?.perfil ?? "")); setLoading(false);
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  const canManage = ["administrador", "rh"].includes(profile);
  const publishedByContent = useMemo(() => { const reference = today(); return new Map(contents.map((content) => [content.id, versions.find((version) => version.conteudo_id === content.id && version.status === "publicado" && version.vigencia_inicio <= reference && (!version.vigencia_fim || version.vigencia_fim >= reference)) ?? null])); }, [contents, versions]);
  const published = [...publishedByContent.values()].filter(Boolean).length;

  async function saveContent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    const form = new FormData(event.currentTarget); const title = String(form.get("titulo") ?? "").trim();
    const payload = {
      titulo: title, slug: onboardingSlug(title), area: String(form.get("area")), categoria: String(form.get("categoria") ?? "").trim() || null,
      descricao: String(form.get("descricao") ?? "").trim() || null, tipo: String(form.get("tipo")), nivel_acesso: String(form.get("nivel_acesso")),
      exige_ciencia: form.get("exige_ciencia") === "sim", curso_id: form.get("curso_id") ? String(form.get("curso_id")) : null,
    };
    if (!payload.titulo || !payload.slug) { setError("Informe um título válido."); setSaving(false); return; }
    if (payload.tipo === "curso" && !payload.curso_id) { setError("Vincule o conteúdo a um curso existente."); setSaving(false); return; }
    const current = contentModal === "new" ? null : contentModal;
    const result = current ? await supabase.from("adm_conteudos_onboarding").update(payload).eq("id", current.id) : await supabase.from("adm_conteudos_onboarding").insert(payload);
    setSaving(false);
    if (result.error) setError(result.error.code === "23505" ? "Já existe um conteúdo com esse nome." : result.error.message);
    else { setContentModal(null); setMessage(current ? "Conteúdo atualizado antes da primeira publicação." : "Conteúdo criado como catálogo. Publique uma versão para liberá-lo."); await load(); }
  }

  async function createVersion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!versionContent) return; setSaving(true); setError(""); setMessage("");
    const form = new FormData(event.currentTarget); const file = form.get("documento"); let documentPath = "";
    if (versionContent.tipo === "documento" && file instanceof File && file.size) {
      if (file.size > 20 * 1024 * 1024 || !["application/pdf", "image/jpeg", "image/png"].includes(file.type)) { setError("Use PDF, JPG ou PNG com até 20 MB."); setSaving(false); return; }
      const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
      documentPath = `${versionContent.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("onboarding-conteudos").upload(documentPath, file, { upsert: false, contentType: file.type });
      if (uploadError) { setError(uploadError.message); setSaving(false); return; }
    }
    const text = String(form.get("conteudo_texto") ?? ""); const link = String(form.get("link_url") ?? "").trim();
    const validation = validateOnboardingVersion({ type: versionContent.tipo, text, link, documentPath, courseId: versionContent.curso_id ?? undefined });
    if (validation) { setError(validation); setSaving(false); return; }
    const status = String(form.get("status")); const { data: auth } = await supabase.auth.getUser();
    if (status === "publicado" && versionContent.tipo === "curso" && !courses.find((course) => course.id === versionContent.curso_id)?.publicado) { setError("Publique primeiro o curso vinculado na Universidade Corporativa."); setSaving(false); return; }
    let hash: string | null = null;
    if (file instanceof File && file.size) hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", await file.arrayBuffer()))].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    const { error: insertError } = await supabase.from("adm_conteudo_versoes").insert({
      conteudo_id: versionContent.id, versao: String(form.get("versao") ?? "").trim(), vigencia_inicio: String(form.get("vigencia_inicio")),
      vigencia_fim: form.get("vigencia_fim") ? String(form.get("vigencia_fim")) : null, status,
      conteudo_texto: versionContent.tipo === "texto" ? text.trim() : null, documento_path: documentPath || null,
      link_url: versionContent.tipo === "link" ? link : null, hash_sha256: hash,
      publicado_por: status === "publicado" ? auth.user?.id ?? null : null, publicado_em: status === "publicado" ? new Date().toISOString() : null,
    });
    if (!insertError && status === "publicado") await supabase.rpc("adm_sincronizar_onboardings_ativos");
    setSaving(false);
    if (insertError) setError(insertError.code === "23505" ? "Essa versão já existe para o conteúdo." : insertError.message);
    else { setVersionContent(null); setMessage(status === "publicado" ? "Versão publicada e jornadas ativas sincronizadas." : "Rascunho salvo com sucesso."); await load(); }
  }

  async function saveRule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!ruleContent) return; setSaving(true); setError(""); setMessage("");
    const form = new FormData(event.currentTarget); const scope = String(form.get("escopo")); const target = String(form.get("alvo") ?? "");
    if (scope !== "global" && !target) { setError("Selecione o cargo, setor ou filial."); setSaving(false); return; }
    const { data: auth } = await supabase.auth.getUser();
    const context = { filial_id: scope === "filial" ? target : null, setor_id: scope === "setor" ? target : null, cargo_id: scope === "cargo" ? target : null };
    const existing = rules.find((rule) => rule.conteudo_id === ruleContent.id && rule.escopo === scope && rule.filial_id === context.filial_id && rule.setor_id === context.setor_id && rule.cargo_id === context.cargo_id);
    const payload = { conteudo_id: ruleContent.id, escopo: scope, ...context, incluir: form.get("incluir") === "sim", obrigatoria: form.get("obrigatoria") === "sim", dias_relativos: Number(form.get("dias_relativos") ?? 0), ativo: true, aprovado_por: auth.user?.id ?? null, aprovado_em: new Date().toISOString() };
    const result = existing ? await supabase.from("adm_regras_onboarding").update(payload).eq("id", existing.id) : await supabase.from("adm_regras_onboarding").insert(payload);
    if (!result.error) await supabase.rpc("adm_sincronizar_onboardings_ativos");
    setSaving(false);
    if (result.error) setError(result.error.message); else { setRuleContent(null); setMessage("Regra aprovada. Novos processos usarão o novo escopo; jornadas ativas recebem itens ausentes, sem remover o histórico já apresentado."); await load(); }
  }

  async function saveAreaOwner(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setMessage(""); const form = new FormData(event.currentTarget);
    const authUserId = String(form.get("auth_user_id") ?? ""); const area = String(form.get("area") ?? "") as Area;
    if (!authUserId || !area) { setError("Selecione o responsável e a área."); setSaving(false); return; }
    const { error: saveError } = await supabase.from("adm_responsaveis_area").upsert({ auth_user_id: authUserId, area, ativo: true }, { onConflict: "auth_user_id,area" });
    setSaving(false); if (saveError) setError(saveError.message); else { setMessage("Responsabilidade de área atualizada."); await load(); }
  }

  async function disableAreaOwner(owner: AreaOwner) {
    setSaving(true); setError(""); const { error: updateError } = await supabase.from("adm_responsaveis_area").update({ ativo: false }).eq("auth_user_id", owner.auth_user_id).eq("area", owner.area);
    setSaving(false); if (updateError) setError(updateError.message); else { setMessage("Responsabilidade removida sem apagar o histórico."); await load(); }
  }

  if (loading) return <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-16 text-sm text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Carregando conteúdos e regras…</div>;
  return <div className="mx-auto max-w-7xl space-y-6">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><Link href="/dashboard/admissao" className="mb-3 inline-flex items-center text-xs font-black text-primary"><ArrowLeft className="mr-1.5 h-4 w-4" />Voltar ao módulo</Link><SectionTitle title="Conteúdos e Regras do Onboarding" description="Catálogo versionado, níveis de acesso e aplicação aprovada por cargo, setor ou filial." /></div>{canManage && <button type="button" onClick={() => setContentModal("new")} className="flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-xs font-black text-white"><Plus className="mr-2 h-4 w-4" />Novo conteúdo</button>}</div>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-800">{error}</div>}{message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800">{message}</div>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Conteúdos no catálogo" value={contents.length} icon={BookOpenCheck} tone="blue" /><MetricCard label="Versões publicadas" value={published} icon={CheckCircle2} tone="emerald" /><MetricCard label="Regras específicas" value={rules.filter((rule) => rule.escopo !== "global" && rule.ativo).length} icon={Settings2} tone="violet" /><MetricCard label="Áreas integradas" value={new Set(contents.map((item) => item.area)).size} icon={Layers3} tone="amber" /></div>
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-xs leading-5 text-amber-900"><p className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><span><strong>Governança:</strong> regras de riscos, NRs, EPIs e conteúdos de segurança devem ser validadas e aprovadas pelo SESMT. A automação organiza a jornada, mas não substitui avaliação técnica ou jurídica. Etilometria não integra esta versão.</span></p></div>
    <ProgramPanel title="Catálogo controlado" description="Nenhum item é liberado sem uma versão publicada e vigente."><div className="divide-y divide-slate-100">{contents.map((content) => { const current = publishedByContent.get(content.id); const ownVersions = versions.filter((version) => version.conteudo_id === content.id); const ownRules = rules.filter((rule) => rule.conteudo_id === content.id && rule.ativo); return <article key={content.id} className="grid gap-4 p-5 lg:grid-cols-[1.5fr_.75fr_.75fr_auto] lg:items-center"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-xs font-black text-slate-900">{content.titulo}</h3><Pill tone={content.ativo ? "emerald" : "slate"}>{areaLabels[content.area]}</Pill><span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black uppercase text-slate-600">{typeLabels[content.tipo]}</span></div><p className="mt-1 text-[10px] leading-4 text-slate-500">{content.descricao || "Sem descrição."}</p></div><div><p className="text-[9px] font-black uppercase text-slate-400">Acesso</p><p className="mt-1 text-xs font-bold text-slate-700">{accessLabels[content.nivel_acesso]}</p></div><div><p className="text-[9px] font-black uppercase text-slate-400">Versão vigente</p><p className={`mt-1 text-xs font-black ${current ? "text-emerald-700" : "text-amber-700"}`}>{current ? `${current.versao} · ${formatDate(current.vigencia_inicio)}` : "Não publicada"}</p><p className="mt-1 text-[9px] text-slate-400">{ownRules.length} regra(s)</p></div>{canManage && <div className="flex flex-wrap gap-2">{!ownVersions.length && <button type="button" onClick={() => setContentModal(content)} className="flex items-center rounded-xl border border-slate-300 px-3 py-2 text-[10px] font-black text-slate-700"><Settings2 className="mr-1.5 h-3.5 w-3.5" />Editar</button>}<button type="button" onClick={() => setVersionContent(content)} className="flex items-center rounded-xl border border-blue-200 px-3 py-2 text-[10px] font-black text-blue-800"><Upload className="mr-1.5 h-3.5 w-3.5" />Nova versão</button><button type="button" onClick={() => setRuleContent(content)} className="flex items-center rounded-xl border border-slate-300 px-3 py-2 text-[10px] font-black text-slate-700"><Settings2 className="mr-1.5 h-3.5 w-3.5" />Regra</button></div>}</article>; })}{!contents.length && <p className="p-10 text-center text-xs text-slate-500">Nenhum conteúdo cadastrado.</p>}</div></ProgramPanel>
    {canManage && <ProgramPanel title="Responsáveis por área" description="Usuários vinculados a um colaborador podem operar somente os itens da área atribuída."><div className="grid gap-6 p-5 lg:grid-cols-[1fr_.8fr]"><div className="space-y-3">{Object.entries(areaLabels).map(([area,label]) => { const owners = areaOwners.filter((item) => item.area === area); return <div key={area} className="rounded-xl border border-slate-200 p-4"><p className="text-[10px] font-black uppercase text-slate-500">{label}</p><div className="mt-2 flex flex-wrap gap-2">{owners.map((owner) => <span key={owner.auth_user_id} className="flex items-center rounded-full bg-blue-50 py-1 pl-3 pr-1 text-[10px] font-bold text-blue-900">{authEmployees.find((employee) => employee.auth_user_id === owner.auth_user_id)?.nome ?? "Usuário sem colaborador vinculado"}<button type="button" disabled={saving} onClick={() => void disableAreaOwner(owner)} title="Remover responsabilidade" className="ml-2 rounded-full p-1 hover:bg-blue-100"><X className="h-3 w-3" /></button></span>)}{!owners.length && <span className="text-xs font-bold text-slate-500">Nenhum responsável específico</span>}</div></div>; })}</div><form onSubmit={saveAreaOwner} className="space-y-4 rounded-2xl bg-slate-50 p-5"><h3 className="text-sm font-black text-slate-900">Atribuir responsabilidade</h3><label className="text-xs font-bold">Colaborador com acesso<select name="auth_user_id" required defaultValue="" className={fieldClass}><option value="">Selecione</option>{authEmployees.map((employee) => <option key={employee.auth_user_id} value={employee.auth_user_id}>{employee.nome}</option>)}</select></label><label className="text-xs font-bold">Área<select name="area" required defaultValue="" className={fieldClass}><option value="">Selecione</option>{Object.entries(areaLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><button disabled={saving || !authEmployees.length} className="flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-xs font-black text-white disabled:opacity-50">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Salvar responsável</button>{!authEmployees.length && <p className="text-[10px] leading-4 text-amber-700">Vincule primeiro o usuário ao cadastro do colaborador.</p>}</form></div></ProgramPanel>}
    {!canManage && <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs text-blue-900"><ShieldCheck className="mr-2 inline h-4 w-4" />Seu perfil possui acesso de consulta. Publicação e regras são restritas ao RH e administrador.</div>}
    {contentModal && <ContentForm content={contentModal === "new" ? null : contentModal} courses={courses} saving={saving} onClose={() => setContentModal(null)} onSubmit={saveContent} />}
    {versionContent && <VersionForm content={versionContent} saving={saving} onClose={() => setVersionContent(null)} onSubmit={createVersion} />}
    {ruleContent && <RuleForm content={ruleContent} branches={branches} sectors={sectors} roles={roles} saving={saving} onClose={() => setRuleContent(null)} onSubmit={saveRule} />}
  </div>;
}

function ModalShell({ title, description, onClose, children }: { title: string; description: string; onClose: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm md:p-8"><section className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl"><header className="flex items-start justify-between border-b border-slate-100 p-6"><div><h2 className="text-lg font-black text-slate-900">{title}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></div><button type="button" onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button></header>{children}</section></div>; }

function ContentForm({ content, courses, saving, onClose, onSubmit }: { content: Content | null; courses: Course[]; saving: boolean; onClose: () => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) { const [type, setType] = useState<OnboardingContentType>(content?.tipo ?? "texto"); return <ModalShell title={content ? `Editar · ${content.titulo}` : "Novo conteúdo"} description="O catálogo pode ser ajustado até receber sua primeira versão controlada." onClose={onClose}><form onSubmit={onSubmit} className="space-y-5 p-6"><div className="grid gap-5 md:grid-cols-2"><label className="text-xs font-bold md:col-span-2">Título *<input name="titulo" required maxLength={180} defaultValue={content?.titulo ?? ""} className={fieldClass} /></label><label className="text-xs font-bold">Área<select name="area" defaultValue={content?.area ?? "rh"} className={fieldClass}>{Object.entries(areaLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-xs font-bold">Categoria<input name="categoria" maxLength={100} defaultValue={content?.categoria ?? ""} className={fieldClass} /></label><label className="text-xs font-bold">Tipo<select name="tipo" value={type} onChange={(event) => setType(event.target.value as OnboardingContentType)} className={fieldClass}>{Object.entries(typeLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-xs font-bold">Nível de acesso<select key={`${type}-${content?.nivel_acesso ?? "novo"}`} name="nivel_acesso" defaultValue={type === "curso" && content?.nivel_acesso === "publico_link" ? "autenticado" : content?.nivel_acesso ?? "autenticado"} className={fieldClass}>{Object.entries(accessLabels).map(([value,label]) => <option key={value} value={value} disabled={type === "curso" && value === "publico_link"}>{label}</option>)}</select></label>{type === "curso" && <label className="text-xs font-bold md:col-span-2">Curso da Universidade Corporativa *<select name="curso_id" required defaultValue={content?.curso_id ?? ""} className={fieldClass}><option value="">Selecione</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.titulo}{course.publicado ? "" : " · não publicado"}</option>)}</select></label>}<label className="text-xs font-bold md:col-span-2">Descrição<textarea name="descricao" rows={3} maxLength={1000} defaultValue={content?.descricao ?? ""} className={fieldClass} /></label><label className="flex items-center gap-3 text-xs font-bold md:col-span-2"><input type="checkbox" name="exige_ciencia" value="sim" defaultChecked={content?.exige_ciencia ?? true} />Exigir registro de ciência simples</label></div><FormActions saving={saving} onClose={onClose} label={content ? "Salvar conteúdo" : "Criar conteúdo"} /></form></ModalShell>; }

function VersionForm({ content, saving, onClose, onSubmit }: { content: Content; saving: boolean; onClose: () => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) { return <ModalShell title={`Nova versão · ${content.titulo}`} description="A versão apresentada ao colaborador permanece vinculada à evidência de ciência." onClose={onClose}><form onSubmit={onSubmit} className="space-y-5 p-6"><div className="grid gap-5 md:grid-cols-3"><label className="text-xs font-bold">Versão *<input name="versao" required maxLength={30} placeholder="Ex.: 1.0" className={fieldClass} /></label><label className="text-xs font-bold">Início da vigência *<input name="vigencia_inicio" type="date" required defaultValue={today()} className={fieldClass} /></label><label className="text-xs font-bold">Fim da vigência<input name="vigencia_fim" type="date" min={today()} className={fieldClass} /></label></div>{content.tipo === "texto" && <label className="text-xs font-bold">Texto controlado *<textarea name="conteudo_texto" required rows={10} maxLength={30000} className={fieldClass} /></label>}{content.tipo === "documento" && <label className="block rounded-2xl border border-dashed border-blue-300 bg-blue-50 p-6 text-xs font-bold text-blue-900"><FileText className="mb-3 h-7 w-7" />Documento controlado *<input name="documento" type="file" required accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="mt-3 block w-full text-xs" /><span className="mt-2 block font-normal">PDF, JPG ou PNG · até 20 MB · hash SHA-256 registrado.</span></label>}{content.tipo === "link" && <label className="text-xs font-bold">Endereço HTTPS *<input name="link_url" type="url" required pattern="https://.*" placeholder="https://" className={fieldClass} /></label>}{content.tipo === "curso" && <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-xs text-blue-900"><BookOpenCheck className="mr-2 inline h-4 w-4" />Esta versão usará o curso já vinculado ao conteúdo. Aulas e vídeos continuam gerenciados na Universidade Corporativa.</div>}<label className="text-xs font-bold">Situação<select name="status" defaultValue="rascunho" className={fieldClass}><option value="rascunho">Salvar como rascunho</option><option value="publicado">Publicar e sincronizar jornadas</option></select></label><div className="rounded-xl bg-amber-50 p-4 text-[10px] leading-4 text-amber-900">Publicar torna a versão elegível para novas atribuições. Para corrigir um conteúdo já apresentado, crie uma nova versão; não altere a evidência histórica.</div><FormActions saving={saving} onClose={onClose} label="Salvar versão" /></form></ModalShell>; }

function RuleForm({ content, branches, sectors, roles, saving, onClose, onSubmit }: { content: Content; branches: Named[]; sectors: Named[]; roles: Named[]; saving: boolean; onClose: () => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) { const [scope, setScope] = useState("cargo"); const options = scope === "filial" ? branches : scope === "setor" ? sectors : roles; return <ModalShell title={`Regra de aplicação · ${content.titulo}`} description="A regra mais específica prevalece sobre a regra global." onClose={onClose}><form onSubmit={onSubmit} className="space-y-5 p-6"><div className="grid gap-5 md:grid-cols-2"><label className="text-xs font-bold">Escopo<select name="escopo" value={scope} onChange={(event) => setScope(event.target.value)} className={fieldClass}><option value="cargo">Cargo</option><option value="setor">Setor</option><option value="filial">Filial</option><option value="global">Todos os processos</option></select></label>{scope === "global" ? <input type="hidden" name="alvo" value="" /> : <label className="text-xs font-bold">Aplicar a *<select name="alvo" required defaultValue="" className={fieldClass}><option value="">Selecione</option>{options.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>}<label className="text-xs font-bold">Decisão<select name="incluir" defaultValue="sim" className={fieldClass}><option value="sim">Incluir na jornada</option><option value="nao">Excluir da jornada</option></select></label><label className="text-xs font-bold">Obrigatoriedade<select name="obrigatoria" defaultValue="sim" className={fieldClass}><option value="sim">Obrigatório</option><option value="nao">Opcional</option></select></label><label className="text-xs font-bold">Prazo relativo à admissão<input name="dias_relativos" type="number" min={-60} max={365} defaultValue={0} className={fieldClass} /><span className="mt-1 block text-[9px] font-normal text-slate-500">0 = dia da admissão; negativo = antes; positivo = depois.</span></label></div>{scope === "global" && <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs leading-5 text-blue-900">Use o escopo global somente para conteúdos realmente aplicáveis a todos. Cargos, setores e filiais podem criar inclusões ou exclusões mais específicas.</div>}{content.area === "sesmt" && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900"><AlertTriangle className="mr-2 inline h-4 w-4" />Confirme esta regra com o SESMT. Cargo semelhante não garante os mesmos riscos ocupacionais ou treinamentos normativos.</div>}<FormActions saving={saving} onClose={onClose} label="Aprovar regra" /></form></ModalShell>; }

function FormActions({ saving, onClose, label }: { saving: boolean; onClose: () => void; label: string }) { return <div className="flex justify-end gap-3 border-t border-slate-100 pt-5"><button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-bold">Cancelar</button><button disabled={saving} className="flex items-center rounded-xl bg-primary px-5 py-2.5 text-xs font-black text-white disabled:opacity-50">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{label}</button></div>; }
