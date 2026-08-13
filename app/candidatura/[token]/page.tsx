"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  FileText,
  Loader2,
  LockKeyhole,
  MapPin,
  Send,
  ShieldCheck,
} from "lucide-react";

type PublicVacancy = {
  codigo: string;
  cargo: string;
  departamento: string;
  localidade: string | null;
  modalidade: string;
  descricao: string;
  requisitos: string;
};

const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100";

export default function PublicApplicationPage() {
  const { token } = useParams<{ token: string }>();
  const [vacancy, setVacancy] = useState<PublicVacancy | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [protocol, setProtocol] = useState("");
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/candidaturas/${token}`, { signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as { vaga?: PublicVacancy; error?: string };
        if (!response.ok || !body.vaga) throw new Error(body.error ?? "Vaga indisponível.");
        setVacancy(body.vaga);
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "Não foi possível abrir esta vaga.");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [token]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError("");
    try {
      const response = await fetch(`/api/candidaturas/${token}`, {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      const body = (await response.json()) as { protocolo?: string; error?: string };
      if (!response.ok || !body.protocolo) throw new Error(body.error ?? "Não foi possível enviar a candidatura.");
      setProtocol(body.protocolo);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Não foi possível enviar a candidatura.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-600">
        <Loader2 className="mr-3 h-6 w-6 animate-spin text-blue-800" /> Carregando oportunidade…
      </main>
    );
  }

  if (!vacancy) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <BriefcaseBusiness className="mx-auto mb-4 h-12 w-12 text-slate-400" />
          <h1 className="text-xl font-bold text-slate-900">Oportunidade indisponível</h1>
          <p className="mt-2 text-sm text-slate-600">{error || "O link expirou ou a vaga foi encerrada."}</p>
          <p className="mt-5 text-xs text-slate-500">Confirme com o RH se existe um novo link para esta vaga.</p>
        </section>
      </main>
    );
  }

  if (protocol) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <section className="w-full max-w-xl rounded-3xl border border-emerald-200 bg-white p-10 text-center shadow-lg">
          <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" />
          <h1 className="mt-5 text-2xl font-bold text-slate-900">Candidatura enviada!</h1>
          <p className="mt-3 text-slate-600">
            Recebemos seus dados para a vaga de <strong>{vacancy.cargo}</strong>. O RH poderá entrar em contato pelos canais informados.
          </p>
          <div className="mt-6 rounded-xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Protocolo</p>
            <p className="mt-1 font-mono text-lg font-bold text-blue-900">{protocol}</p>
          </div>
          <p className="mt-5 text-xs text-slate-500">Guarde este protocolo. Não envie documentos pessoais adicionais por este formulário.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-blue-950 text-white">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="flex items-center gap-3 text-sm font-semibold text-blue-200">
            <ShieldCheck className="h-5 w-5" /> Premazon RH 360 · candidatura segura
          </div>
          <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-amber-400">{vacancy.codigo}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{vacancy.cargo}</h1>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm text-blue-100">
            <span className="flex items-center gap-2"><Building2 className="h-4 w-4" />{vacancy.departamento}</span>
            <span className="flex items-center gap-2"><MapPin className="h-4 w-4" />{vacancy.localidade || "Local a definir"}</span>
            <span className="flex items-center gap-2"><BriefcaseBusiness className="h-4 w-4" />{vacancy.modalidade}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-8 px-6 py-8 lg:grid-cols-[0.85fr_1.4fr]">
        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-bold text-slate-900">Sobre a oportunidade</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">{vacancy.descricao}</p>
            <h3 className="mt-6 font-bold text-slate-900">Requisitos</h3>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">{vacancy.requisitos}</p>
          </section>
          <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-sm text-blue-950">
            <div className="flex gap-3">
              <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0" />
              <p>Seus dados e seu currículo serão acessíveis apenas à equipe autorizada de recrutamento.</p>
            </div>
          </section>
        </aside>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-xl font-bold text-slate-900">Candidate-se a esta vaga</h2>
          <p className="mt-1 text-sm text-slate-500">Preencha os campos abaixo. Não é necessário criar senha.</p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
              <label>Website<input name="website" type="text" tabIndex={-1} autoComplete="off" /></label>
            </div>

            <div>
              <label htmlFor="nome" className="text-sm font-semibold text-slate-700">Nome completo *</label>
              <input id="nome" name="nome" required minLength={3} maxLength={160} autoComplete="name" className={inputClass} />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="cpf" className="text-sm font-semibold text-slate-700">CPF *</label>
                <input id="cpf" name="cpf" required inputMode="numeric" maxLength={18} placeholder="000.000.000-00" className={inputClass} />
              </div>
              <div>
                <label htmlFor="data_nascimento" className="text-sm font-semibold text-slate-700">Data de nascimento *</label>
                <input id="data_nascimento" name="data_nascimento" type="date" required min="1920-01-01" max={new Date().toISOString().slice(0, 10)} autoComplete="bday" className={inputClass} />
              </div>
            </div>
            <div>
              <label htmlFor="nome_mae" className="text-sm font-semibold text-slate-700">Nome completo da mãe *</label>
              <input id="nome_mae" name="nome_mae" required minLength={3} maxLength={180} autoComplete="off" className={inputClass} />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="email" className="text-sm font-semibold text-slate-700">E-mail *</label>
                <input id="email" name="email" type="email" required maxLength={254} autoComplete="email" className={inputClass} />
              </div>
              <div>
                <label htmlFor="telefone" className="text-sm font-semibold text-slate-700">Telefone / WhatsApp *</label>
                <input id="telefone" name="telefone" required maxLength={30} autoComplete="tel" placeholder="(92) 99999-0000" className={inputClass} />
              </div>
            </div>
            <div className="grid gap-5 md:grid-cols-[1fr_110px]">
              <div>
                <label htmlFor="cidade" className="text-sm font-semibold text-slate-700">Cidade *</label>
                <input id="cidade" name="cidade" required maxLength={100} autoComplete="address-level2" className={inputClass} />
              </div>
              <div>
                <label htmlFor="estado" className="text-sm font-semibold text-slate-700">UF *</label>
                <input id="estado" name="estado" required minLength={2} maxLength={2} autoComplete="address-level1" placeholder="AM" className={`${inputClass} uppercase`} />
              </div>
            </div>
            <div>
              <label htmlFor="escolaridade" className="text-sm font-semibold text-slate-700">Escolaridade *</label>
              <select id="escolaridade" name="escolaridade" required className={inputClass} defaultValue="">
                <option value="" disabled>Selecione…</option>
                <option>Ensino fundamental</option>
                <option>Ensino médio incompleto</option>
                <option>Ensino médio completo</option>
                <option>Ensino técnico</option>
                <option>Ensino superior incompleto</option>
                <option>Ensino superior completo</option>
                <option>Pós-graduação</option>
              </select>
            </div>
            <div>
              <label htmlFor="experiencia" className="text-sm font-semibold text-slate-700">Resumo da experiência profissional *</label>
              <textarea id="experiencia" name="experiencia" required minLength={20} maxLength={4000} rows={5} className={inputClass} placeholder="Conte suas principais experiências relacionadas à vaga." />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="linkedin" className="text-sm font-semibold text-slate-700">LinkedIn (opcional)</label>
                <input id="linkedin" name="linkedin" type="url" maxLength={300} placeholder="https://linkedin.com/in/…" className={inputClass} />
              </div>
              <div>
                <label htmlFor="pretensao_salarial" className="text-sm font-semibold text-slate-700">Pretensão salarial (opcional)</label>
                <input id="pretensao_salarial" name="pretensao_salarial" type="number" min="0" max="1000000" step="0.01" placeholder="R$" className={inputClass} />
              </div>
            </div>
            <div>
              <label htmlFor="curriculo" className="text-sm font-semibold text-slate-700">Currículo *</label>
              <label htmlFor="curriculo" className="mt-1.5 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600 transition hover:border-blue-600 hover:bg-blue-50">
                <FileText className="h-6 w-6 text-blue-800" />
                <span>{fileName || "Selecionar PDF, DOC ou DOCX (máximo 5 MB)"}</span>
              </label>
              <input id="curriculo" name="curriculo" type="file" required accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} />
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-5 text-slate-600">
              <input name="consentimento_lgpd" value="true" type="checkbox" required className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-800" />
              <span>Autorizo o tratamento dos dados enviados, incluindo CPF, nascimento e filiação materna, para minha identificação, participação nesta seleção e contato pelo RH. Sei que posso solicitar informações ou exclusão ao RH. *</span>
            </label>

            {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

            <button type="submit" disabled={sending} className="flex w-full items-center justify-center rounded-xl bg-blue-900 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">
              {sending ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Enviando candidatura…</> : <><Send className="mr-2 h-5 w-5" />Enviar candidatura</>}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
