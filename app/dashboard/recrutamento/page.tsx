"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness, Check, ChevronDown, CirclePause, ClipboardCopy,
  ExternalLink, FileText, Loader2, Mail, MessageCircle, Plus, RefreshCw,
  Search, Send, Timer, UserRoundCheck, Users, X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { linkPublicoCandidatura, textoCompartilhamento } from "@/lib/recrutamento";

type Vacancy = {
  id: string; codigo: string; cargo: string; departamento: string; solicitante: string;
  tipo_contratacao: string; quantidade: number; data_abertura: string; data_fechamento: string | null;
  sla_dias: number; localidade: string | null; modalidade: string; status: string;
  public_token: string; link_ativo: boolean; link_expira_em: string | null;
};

type Application = {
  id: string; vaga_id: string; protocolo: string; nome: string; email: string;
  telefone: string; cidade: string; estado: string; etapa: string; status: string;
  curriculo_path: string; curriculo_nome: string; criado_em: string;
};

const stageLabels: Record<string, string> = {
  triagem: "Triagem", entrevista_rh: "Entrevista RH", teste_tecnico: "Teste técnico",
  entrevista_gestor: "Entrevista gestor", proposta: "Proposta", admissao: "Admissão", encerrado: "Encerrado",
};

const typeLabels: Record<string, string> = {
  aumento_quadro: "Aumento de quadro", substituicao: "Substituição",
  sem_substituicao: "Sem substituição", cota: "Cota", temporario: "Temporário",
};

const fieldClass = "mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T12:00:00`));
}

function vacancyDays(opening: string, referenceTime: number) {
  return Math.max(0, Math.floor((referenceTime - new Date(`${opening}T12:00:00`).getTime()) / 86_400_000));
}

export default function RecrutamentoPage() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedToken, setCopiedToken] = useState("");
  const [hiringType, setHiringType] = useState("aumento_quadro");
  const [referenceTime] = useState(() => Date.now());

  const loadData = useCallback(async () => {
    setLoading(true);
    const [vacanciesResult, applicationsResult] = await Promise.all([
      supabase.from("rs_vagas")
        .select("id,codigo,cargo,departamento,solicitante,tipo_contratacao,quantidade,data_abertura,data_fechamento,sla_dias,localidade,modalidade,status,public_token,link_ativo,link_expira_em")
        .order("data_abertura", { ascending: false }),
      supabase.from("rs_candidaturas")
        .select("id,vaga_id,protocolo,nome,email,telefone,cidade,estado,etapa,status,curriculo_path,curriculo_nome,criado_em")
        .order("criado_em", { ascending: false }),
    ]);
    if (vacanciesResult.error || applicationsResult.error) {
      const detail = vacanciesResult.error?.message ?? applicationsResult.error?.message ?? "Erro desconhecido";
      setMessage({ type: "error", text: detail.includes("rs_vagas")
        ? "O banco do módulo ainda não foi preparado. Execute a migração 20260812_002 no Supabase."
        : `Não foi possível carregar o módulo: ${detail}` });
    } else {
      setVacancies((vacanciesResult.data ?? []) as Vacancy[]);
      setApplications((applicationsResult.data ?? []) as Application[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadData]);

  const candidatesByVacancy = useMemo(() => {
    const result = new Map<string, number>();
    applications.forEach((item) => result.set(item.vaga_id, (result.get(item.vaga_id) ?? 0) + 1));
    return result;
  }, [applications]);

  const filteredVacancies = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    if (!term) return vacancies;
    return vacancies.filter((item) => [item.codigo, item.cargo, item.departamento, item.solicitante]
      .some((value) => value.toLocaleLowerCase("pt-BR").includes(term)));
  }, [search, vacancies]);

  const openVacancies = vacancies.filter((item) => item.status === "aberta");
  const averageSla = openVacancies.length
    ? Math.round(openVacancies.reduce((sum, item) => sum + vacancyDays(item.data_abertura, referenceTime), 0) / openVacancies.length)
    : 0;

  async function createVacancy(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const expiration = String(form.get("link_expira_em") ?? "");
    const { data, error } = await supabase.from("rs_vagas").insert({
      cargo: String(form.get("cargo") ?? "").trim(),
      departamento: String(form.get("departamento") ?? "").trim(),
      solicitante: String(form.get("solicitante") ?? "").trim(),
      tipo_contratacao: String(form.get("tipo_contratacao") ?? "aumento_quadro"),
      colaborador_substituido: String(form.get("colaborador_substituido") ?? "").trim() || null,
      quantidade: Number(form.get("quantidade") ?? 1),
      data_abertura: String(form.get("data_abertura") ?? ""),
      sla_dias: Number(form.get("sla_dias") ?? 30),
      custo_colaborador: form.get("custo_colaborador") ? Number(form.get("custo_colaborador")) : null,
      localidade: String(form.get("localidade") ?? "").trim() || null,
      modalidade: String(form.get("modalidade") ?? "presencial"),
      descricao: String(form.get("descricao") ?? "").trim(),
      requisitos: String(form.get("requisitos") ?? "").trim(),
      status: "aberta", link_ativo: true,
      link_expira_em: expiration ? new Date(`${expiration}T23:59:59`).toISOString() : null,
    }).select("public_token,cargo").single();
    if (error) setMessage({ type: "error", text: `Não foi possível criar a vaga: ${error.message}` });
    else {
      setShowForm(false);
      setHiringType("aumento_quadro");
      setMessage({ type: "success", text: `Vaga ${data.cargo} criada. O link público já pode ser compartilhado.` });
      await loadData();
    }
    setSaving(false);
  }

  function vacancyLink(vacancy: Vacancy) {
    return linkPublicoCandidatura(window.location.origin, vacancy.public_token);
  }

  async function copyLink(vacancy: Vacancy) {
    try {
      await navigator.clipboard.writeText(vacancyLink(vacancy));
      setCopiedToken(vacancy.public_token);
      window.setTimeout(() => setCopiedToken(""), 2000);
    } catch {
      setMessage({ type: "error", text: "Não foi possível copiar automaticamente. Abra o link e copie pela barra do navegador." });
    }
  }

  function shareWhatsApp(vacancy: Vacancy) {
    const link = vacancyLink(vacancy);
    window.open(`https://wa.me/?text=${encodeURIComponent(textoCompartilhamento(vacancy.cargo, link))}`, "_blank", "noopener,noreferrer");
  }

  function shareEmail(vacancy: Vacancy) {
    const link = vacancyLink(vacancy);
    window.location.href = `mailto:?subject=${encodeURIComponent(`Oportunidade: ${vacancy.cargo}`)}&body=${encodeURIComponent(textoCompartilhamento(vacancy.cargo, link))}`;
  }

  async function toggleVacancy(vacancy: Vacancy) {
    const closing = vacancy.status === "aberta";
    const { error } = await supabase.from("rs_vagas").update({
      status: closing ? "fechada" : "aberta", link_ativo: !closing,
      data_fechamento: closing ? new Date().toISOString().slice(0, 10) : null,
    }).eq("id", vacancy.id);
    if (error) setMessage({ type: "error", text: `Não foi possível alterar a vaga: ${error.message}` });
    else await loadData();
  }

  async function updateStage(applicationId: string, stage: string) {
    const { error } = await supabase.from("rs_candidaturas").update({ etapa: stage }).eq("id", applicationId);
    if (error) setMessage({ type: "error", text: `Não foi possível mudar a etapa: ${error.message}` });
    else setApplications((current) => current.map((item) => item.id === applicationId ? { ...item, etapa: stage } : item));
  }

  async function openResume(application: Application) {
    const { data, error } = await supabase.storage.from("curriculos-candidatos")
      .createSignedUrl(application.curriculo_path, 60, { download: application.curriculo_nome });
    if (error || !data?.signedUrl) {
      setMessage({ type: "error", text: "Não foi possível abrir o currículo. Confira sua permissão de acesso." });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div><p className="text-sm font-semibold text-secondary">Recrutamento & Seleção</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">Vagas e candidaturas</h2><p className="mt-1 text-sm text-gray-500">Crie a vaga, compartilhe o link e acompanhe o processo em um só lugar.</p></div>
        <button type="button" onClick={() => setShowForm(true)} className="flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-dark"><Plus className="mr-2 h-4 w-4" /> Nova vaga</button>
      </div>

      {message && <div role="alert" className={`flex items-start justify-between rounded-xl border px-4 py-3 text-sm ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}><span>{message.text}</span><button aria-label="Fechar aviso" type="button" onClick={() => setMessage(null)}><X className="h-4 w-4" /></button></div>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Vagas abertas", value: openVacancies.length, icon: BriefcaseBusiness, color: "text-blue-700 bg-blue-50" },
          { label: "Candidaturas", value: applications.length, icon: Users, color: "text-violet-700 bg-violet-50" },
          { label: "Em entrevistas", value: applications.filter((item) => item.etapa.includes("entrevista")).length, icon: UserRoundCheck, color: "text-emerald-700 bg-emerald-50" },
          { label: "Tempo médio aberto", value: `${averageSla} dias`, icon: Timer, color: "text-amber-700 bg-amber-50" },
        ].map(({ label, value, icon: Icon, color }) => <div key={label} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p><p className="mt-2 text-2xl font-bold text-gray-900">{value}</p></div><div className={`rounded-xl p-3 ${color}`}><Icon className="h-5 w-5" /></div></div></div>)}
      </section>

      <section className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-5 md:flex-row md:items-center md:justify-between"><div><h3 className="font-bold text-gray-900">Vagas</h3><p className="mt-1 text-xs text-gray-500">Os links deixam de aceitar respostas quando a vaga é fechada.</p></div><div className="relative w-full md:w-80"><Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar vaga, setor ou solicitante" className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary" /></div></div>
        {loading ? <div className="flex items-center justify-center p-12 text-sm text-gray-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Carregando dados…</div>
          : filteredVacancies.length === 0 ? <div className="p-12 text-center"><BriefcaseBusiness className="mx-auto h-10 w-10 text-gray-300" /><p className="mt-3 text-sm font-semibold text-gray-700">Nenhuma vaga encontrada</p><p className="mt-1 text-xs text-gray-500">Crie a primeira vaga para gerar um link de candidatura.</p></div>
          : <div className="divide-y divide-gray-100">{filteredVacancies.map((vacancy) => {
            const isOpen = vacancy.status === "aberta";
            const expired = vacancy.link_expira_em && new Date(vacancy.link_expira_em).getTime() < referenceTime;
            return <article key={vacancy.id} className="p-5"><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${isOpen ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>{isOpen ? "Aberta" : "Fechada"}</span><span className="font-mono text-xs text-gray-500">{vacancy.codigo}</span>{expired && <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">Link expirado</span>}</div><h4 className="mt-2 truncate font-bold text-gray-900">{vacancy.cargo}</h4><p className="mt-1 text-sm text-gray-500">{vacancy.departamento} · {typeLabels[vacancy.tipo_contratacao] ?? vacancy.tipo_contratacao} · {vacancy.quantidade} vaga(s)</p><p className="mt-1 text-xs text-gray-400">Aberta em {formatDate(vacancy.data_abertura)} · {vacancyDays(vacancy.data_abertura, referenceTime)} de {vacancy.sla_dias} dias de SLA · {candidatesByVacancy.get(vacancy.id) ?? 0} candidatura(s)</p></div>
              <div className="flex flex-wrap gap-2">{isOpen && !expired && <><button type="button" onClick={() => void copyLink(vacancy)} className="flex items-center rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">{copiedToken === vacancy.public_token ? <Check className="mr-1.5 h-4 w-4 text-emerald-600" /> : <ClipboardCopy className="mr-1.5 h-4 w-4" />}{copiedToken === vacancy.public_token ? "Copiado" : "Copiar link"}</button><button type="button" onClick={() => shareWhatsApp(vacancy)} className="flex items-center rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"><MessageCircle className="mr-1.5 h-4 w-4" />WhatsApp</button><button type="button" onClick={() => shareEmail(vacancy)} className="flex items-center rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800"><Mail className="mr-1.5 h-4 w-4" />E-mail</button><a href={`/candidatura/${vacancy.public_token}`} target="_blank" rel="noreferrer" className="flex items-center rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"><ExternalLink className="mr-1.5 h-4 w-4" />Abrir</a></>}
                <button type="button" onClick={() => void toggleVacancy(vacancy)} className="flex items-center rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">{isOpen ? <CirclePause className="mr-1.5 h-4 w-4" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}{isOpen ? "Fechar" : "Reabrir"}</button></div></div></article>;
          })}</div>}
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-5"><h3 className="font-bold text-gray-900">Candidaturas recentes</h3><p className="mt-1 text-xs text-gray-500">Currículos são abertos por um link privado válido por 60 segundos.</p></div>
        {applications.length === 0 ? <div className="p-10 text-center text-sm text-gray-500">As candidaturas enviadas pelo formulário aparecerão aqui.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-5 py-3">Candidato</th><th className="px-5 py-3">Vaga</th><th className="px-5 py-3">Contato</th><th className="px-5 py-3">Recebida</th><th className="px-5 py-3">Etapa</th><th className="px-5 py-3">Currículo</th></tr></thead><tbody className="divide-y divide-gray-100">{applications.map((application) => {
          const vacancy = vacancies.find((item) => item.id === application.vaga_id);
          return <tr key={application.id} className="hover:bg-gray-50/60"><td className="px-5 py-4"><p className="font-semibold text-gray-900">{application.nome}</p><p className="mt-1 font-mono text-xs text-gray-400">{application.protocolo}</p></td><td className="px-5 py-4"><p className="font-medium text-gray-700">{vacancy?.cargo ?? "Vaga"}</p><p className="mt-1 text-xs text-gray-400">{vacancy?.codigo}</p></td><td className="px-5 py-4"><a href={`mailto:${application.email}`} className="text-blue-700 hover:underline">{application.email}</a><p className="mt-1 text-xs text-gray-500">{application.telefone} · {application.cidade}/{application.estado}</p></td><td className="px-5 py-4 text-gray-600">{new Date(application.criado_em).toLocaleDateString("pt-BR")}</td><td className="px-5 py-4"><div className="relative"><select value={application.etapa} onChange={(event) => void updateStage(application.id, event.target.value)} className="appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-xs font-semibold text-gray-700 outline-none focus:border-primary">{Object.entries(stageLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-3.5 w-3.5 text-gray-400" /></div></td><td className="px-5 py-4"><button type="button" onClick={() => void openResume(application)} className="flex items-center text-xs font-bold text-blue-700 hover:text-blue-900"><FileText className="mr-1.5 h-4 w-4" />Abrir arquivo</button></td></tr>;
        })}</tbody></table></div>}
      </section>

      {showForm && <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-gray-950/50 p-4 backdrop-blur-sm md:p-8"><div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-gray-100 px-6 py-5"><div><h3 className="text-lg font-bold text-gray-900">Criar nova vaga</h3><p className="mt-1 text-xs text-gray-500">Ao salvar, o sistema gera automaticamente um link exclusivo.</p></div><button aria-label="Fechar" type="button" onClick={() => setShowForm(false)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><X className="h-5 w-5" /></button></div>
        <form onSubmit={createVacancy} className="space-y-5 p-6"><div className="grid gap-5 md:grid-cols-2">
          <label className="text-sm font-semibold text-gray-700">Cargo *<input name="cargo" required maxLength={160} className={fieldClass} /></label><label className="text-sm font-semibold text-gray-700">Departamento *<input name="departamento" required maxLength={120} className={fieldClass} /></label><label className="text-sm font-semibold text-gray-700">Solicitante da vaga *<input name="solicitante" required maxLength={160} className={fieldClass} /></label><label className="text-sm font-semibold text-gray-700">Tipo de contratação *<select name="tipo_contratacao" value={hiringType} onChange={(event) => setHiringType(event.target.value)} className={fieldClass}>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          {hiringType === "substituicao" && <label className="text-sm font-semibold text-gray-700 md:col-span-2">Colaborador substituído<input name="colaborador_substituido" maxLength={160} className={fieldClass} /></label>}
          <label className="text-sm font-semibold text-gray-700">Data de abertura *<input name="data_abertura" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className={fieldClass} /></label><label className="text-sm font-semibold text-gray-700">Quantidade *<input name="quantidade" type="number" required min="1" max="100" defaultValue="1" className={fieldClass} /></label><label className="text-sm font-semibold text-gray-700">SLA em dias *<input name="sla_dias" type="number" required min="1" max="365" defaultValue="30" className={fieldClass} /></label><label className="text-sm font-semibold text-gray-700">Custo mensal estimado<input name="custo_colaborador" type="number" min="0" step="0.01" className={fieldClass} /></label><label className="text-sm font-semibold text-gray-700">Localidade<input name="localidade" maxLength={160} placeholder="Ex.: Manaus/AM" className={fieldClass} /></label><label className="text-sm font-semibold text-gray-700">Modalidade *<select name="modalidade" defaultValue="presencial" className={fieldClass}><option value="presencial">Presencial</option><option value="hibrido">Híbrido</option><option value="remoto">Remoto</option></select></label>
          <label className="text-sm font-semibold text-gray-700 md:col-span-2">Descrição da oportunidade *<textarea name="descricao" required minLength={20} maxLength={5000} rows={4} className={fieldClass} /></label><label className="text-sm font-semibold text-gray-700 md:col-span-2">Requisitos *<textarea name="requisitos" required minLength={10} maxLength={5000} rows={4} className={fieldClass} placeholder="Uma exigência por linha facilita a leitura." /></label><label className="text-sm font-semibold text-gray-700">Data de expiração do link (opcional)<input name="link_expira_em" type="date" min={new Date().toISOString().slice(0, 10)} className={fieldClass} /><span className="mt-1 block text-xs font-normal text-gray-400">Sem data, o link vale até a vaga ser fechada.</span></label>
        </div><div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancelar</button><button type="submit" disabled={saving} className="flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-dark disabled:opacity-60">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}{saving ? "Criando…" : "Criar vaga e gerar link"}</button></div></form>
      </div></div>}
    </div>
  );
}
