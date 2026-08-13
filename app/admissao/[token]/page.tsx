"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  Building2, CalendarDays, CheckCircle2, FileCheck2, FileUp,
  Loader2, LockKeyhole, Send, ShieldCheck, UserRoundCheck,
} from "lucide-react";
import { ADMISSION_DOCUMENTS } from "@/lib/admissao";

type PublicProcess = {
  nome_candidato: string; cargo: string; departamento: string;
  data_admissao_prevista: string; etapa: string; enviado: boolean;
  documentos: { tipo_documento: string; status: string }[];
};

const inputClass = "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100";
const statusLabel: Record<string, string> = { recebido: "Recebido", em_analise: "Em análise", aprovado: "Aprovado", rejeitado: "Reenviar", substituido: "Substituído" };

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}

export default function PreAdmissionPage() {
  const { token } = useParams<{ token: string }>();
  const [process, setProcess] = useState<PublicProcess | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [files, setFiles] = useState<Record<string, string>>({});
  const [uploadProgress, setUploadProgress] = useState("");
  const existing = useMemo(() => new Map(process?.documentos.map((item) => [item.tipo_documento, item.status]) ?? []), [process]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/admissao/${token}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const body = await response.json() as { processo?: PublicProcess; error?: string };
        if (!response.ok || !body.processo) throw new Error(body.error ?? "Pré-admissão indisponível.");
        setProcess(body.processo);
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "Não foi possível abrir a pré-admissão.");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [token]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSending(true); setError("");
    try {
      const form = new FormData(event.currentTarget);
      const newDocuments = ADMISSION_DOCUMENTS.flatMap((document) => {
        const value = form.get(`arquivo_${document.key}`);
        return value instanceof File && value.size > 0 ? [{ document, file: value }] : [];
      });
      for (let index = 0; index < newDocuments.length; index += 1) {
        const { document, file } = newDocuments[index];
        setUploadProgress(`Enviando documento ${index + 1} de ${newDocuments.length}…`);
        const upload = new FormData();
        upload.set("tipo_documento", document.key); upload.set("arquivo", file);
        const uploadResponse = await fetch(`/api/admissao/${token}/documentos`, { method: "POST", body: upload });
        const uploadBody = await uploadResponse.json() as { error?: string };
        if (!uploadResponse.ok) throw new Error(uploadBody.error ?? `Não foi possível enviar: ${document.label}.`);
      }
      for (const document of ADMISSION_DOCUMENTS) form.delete(`arquivo_${document.key}`);
      setUploadProgress("Validando dados da pré-admissão…");
      const response = await fetch(`/api/admissao/${token}`, { method: "POST", body: form });
      const body = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Não foi possível enviar a pré-admissão.");
      setSent(true); window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Não foi possível enviar a pré-admissão.");
    } finally { setSending(false); setUploadProgress(""); }
  }

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600"><Loader2 className="mr-3 h-6 w-6 animate-spin text-blue-800" />Abrindo pré-admissão segura…</main>;
  if (!process) return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><section className="max-w-lg rounded-3xl border border-slate-200 bg-white p-9 text-center shadow-sm"><LockKeyhole className="mx-auto h-12 w-12 text-slate-400" /><h1 className="mt-4 text-xl font-black">Link indisponível</h1><p className="mt-2 text-sm text-slate-600">{error || "O link expirou ou o processo foi encerrado."}</p><p className="mt-5 text-xs text-slate-500">Solicite um novo link ao RH.</p></section></main>;
  if (sent) return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><section className="max-w-xl rounded-3xl border border-emerald-200 bg-white p-10 text-center shadow-lg"><CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" /><h1 className="mt-5 text-2xl font-black">Documentos enviados!</h1><p className="mt-3 text-slate-600">O RH recebeu sua pré-admissão para o cargo de <strong>{process.cargo}</strong> e fará a conferência.</p><p className="mt-5 rounded-xl bg-blue-50 p-4 text-xs leading-5 text-blue-900">Se algum documento precisar de correção, o RH poderá pedir que você use este mesmo link para reenviá-lo.</p></section></main>;

  return <main className="min-h-screen bg-slate-50">
    <header className="bg-gradient-to-r from-blue-950 via-blue-900 to-cyan-800 text-white"><div className="mx-auto max-w-6xl px-6 py-10"><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-cyan-200"><ShieldCheck className="h-5 w-5" />Premazon RH 360 · pré-admissão segura</p><h1 className="mt-6 text-3xl font-black tracking-tight md:text-4xl">Bem-vindo(a), {process.nome_candidato.split(" ")[0]}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">Envie seus dados e documentos para prepararmos sua chegada. Você não precisa criar senha.</p><div className="mt-6 flex flex-wrap gap-5 text-sm text-blue-50"><span className="flex items-center gap-2"><UserRoundCheck className="h-4 w-4" />{process.cargo}</span><span className="flex items-center gap-2"><Building2 className="h-4 w-4" />{process.departamento}</span><span className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />Previsão: {dateLabel(process.data_admissao_prevista)}</span></div></div></header>
    <div className="mx-auto grid max-w-6xl gap-7 px-6 py-8 lg:grid-cols-[.72fr_1.5fr]">
      <aside className="space-y-5"><section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-black text-slate-900">Antes de começar</h2><ol className="mt-4 space-y-4 text-sm leading-5 text-slate-600"><li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-800">1</span>Separe documentos legíveis em PDF, JPG ou PNG.</li><li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-800">2</span>Confirme seus dados antes de enviar.</li><li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-800">3</span>Cada arquivo pode ter até 3 MB.</li></ol></section><section className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-xs leading-5 text-blue-900"><p className="flex items-start gap-3"><LockKeyhole className="mt-0.5 h-5 w-5 shrink-0" />Seus documentos ficam em armazenamento privado e são acessados somente por profissionais autorizados de RH.</p></section>{process.enviado && <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-xs leading-5 text-emerald-900"><strong>Envio anterior localizado.</strong> Você pode atualizar os dados e anexar apenas os documentos solicitados novamente.</section>}</aside>
      <form onSubmit={submit} className="space-y-6">
        <div aria-hidden="true" className="absolute -left-[9999px]"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
        <FormSection title="Dados pessoais" description="Use os mesmos dados dos documentos oficiais."><div className="grid gap-5 md:grid-cols-2"><Field label="Nome completo" name="nome_completo" required defaultValue={process.nome_candidato} autoComplete="name" className="md:col-span-2" /><Field label="Nome social (opcional)" name="nome_social" autoComplete="nickname" /><Field label="Data de nascimento" name="data_nascimento" type="date" required /><Field label="CPF" name="cpf" required inputMode="numeric" placeholder="000.000.000-00" /><Field label="E-mail" name="email" type="email" required autoComplete="email" /><Field label="Telefone / WhatsApp" name="telefone" required autoComplete="tel" placeholder="(92) 99999-0000" /></div></FormSection>
        <FormSection title="Endereço residencial" description="Informe o endereço atual."><div className="grid gap-5 md:grid-cols-6"><Field label="CEP" name="cep" required inputMode="numeric" className="md:col-span-2" /><Field label="Logradouro" name="logradouro" required autoComplete="street-address" className="md:col-span-4" /><Field label="Número" name="numero" required className="md:col-span-2" /><Field label="Complemento" name="complemento" className="md:col-span-4" /><Field label="Bairro" name="bairro" required className="md:col-span-2" /><Field label="Cidade" name="cidade" required className="md:col-span-3" /><Field label="UF" name="estado" required minLength={2} maxLength={2} className="md:col-span-1" /></div></FormSection>
        <FormSection title="Contato de emergência" description="Pessoa que podemos contatar em caso de necessidade."><div className="grid gap-5 md:grid-cols-2"><Field label="Nome do contato" name="contato_emergencia_nome" required /><Field label="Telefone do contato" name="contato_emergencia_telefone" required /></div></FormSection>
        <FormSection title="Uniforme e equipamentos" description="Informações opcionais para preparação do primeiro dia."><div className="grid gap-5 sm:grid-cols-3"><Field label="Tamanho da camisa" name="tamanho_camisa" placeholder="P, M, G…" /><Field label="Tamanho da calça" name="tamanho_calca" /><Field label="Número do calçado" name="tamanho_calcado" inputMode="numeric" /></div></FormSection>
        <FormSection title="Documentos" description="Itens já recebidos aparecem identificados; anexe novamente apenas se desejar substituir."><div className="grid gap-4 md:grid-cols-2">{ADMISSION_DOCUMENTS.map((document) => { const status = existing.get(document.key); const required = document.required && !status; return <label key={document.key} className={`cursor-pointer rounded-2xl border p-4 transition hover:border-blue-500 ${status === "aprovado" ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}><span className="flex items-center justify-between gap-3"><span className="text-xs font-black text-slate-800">{document.label}{required ? " *" : ""}</span>{status && <span className="rounded-full bg-white px-2 py-1 text-[9px] font-black uppercase text-slate-600">{statusLabel[status] ?? status}</span>}</span><span className="mt-3 flex items-center gap-2 text-xs text-slate-500">{files[document.key] ? <FileCheck2 className="h-5 w-5 text-emerald-600" /> : <FileUp className="h-5 w-5 text-blue-700" />}{files[document.key] || (status ? "Selecionar outro arquivo" : "PDF, JPG ou PNG · até 3 MB")}</span><input name={`arquivo_${document.key}`} type="file" required={required} accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="sr-only" onChange={(event) => setFiles((current) => ({ ...current, [document.key]: event.target.files?.[0]?.name ?? "" }))} /></label>; })}</div></FormSection>
        <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-xs leading-5 text-slate-600 shadow-sm"><input name="consentimento_lgpd" value="sim" type="checkbox" required className="mt-1 h-4 w-4 rounded border-slate-300" /><span>Autorizo o tratamento dos dados e documentos enviados para as atividades de admissão, obrigações legais e preparação do vínculo. Posso solicitar informações ao RH. *</span></label>
        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
        <button disabled={sending} className="flex w-full items-center justify-center rounded-xl bg-blue-900 px-5 py-4 text-sm font-black text-white shadow-lg disabled:opacity-60">{sending ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />{uploadProgress || "Enviando com segurança…"}</> : <><Send className="mr-2 h-5 w-5" />Enviar pré-admissão</>}</button>
      </form>
    </div>
  </main>;
}

function FormSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-base font-black text-slate-900">{title}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p><div className="mt-5">{children}</div></section>;
}

function Field({ label, className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className={`text-xs font-bold text-slate-700 ${className}`}>{label}{props.required ? " *" : ""}<input {...props} className={inputClass} /></label>;
}
