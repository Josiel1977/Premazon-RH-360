"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Brain, CheckCircle2, Loader2, LockKeyhole, Printer, Send, ShieldCheck } from "lucide-react";

type Question = { id: string; text: string; options: { id: string; text: string }[] };
type Questionnaire = {
  status: "pendente"; colaborador: string; finalidade: string; expira_em: string;
  instrumento: { versao: string; titulo: string; referencia: string; perguntas: Question[] };
};
type Result = {
  label: string;
  percentuais: Record<"D" | "I" | "S" | "C", number>;
  dimensoes_predominantes: string[];
  dimensao_secundaria: string | null;
  combinado: boolean;
  orientacoes: { descriptions: string[]; strengths: string[]; attention: string[]; developmentThemes: string[] };
};

const dimensionLabels = { D: "Dominância", I: "Influência", S: "Estabilidade", C: "Conformidade" };
const dimensionColors = { D: "bg-red-600", I: "bg-amber-500", S: "bg-emerald-600", C: "bg-blue-600" };

export default function BehavioralProfileQuestionnairePage() {
  const { token } = useParams<{ token: string }>();
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [current, setCurrent] = useState(0);
  const [awareness, setAwareness] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [completedMessage, setCompletedMessage] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [startedAt] = useState(() => new Date().toISOString());
  const answered = Object.keys(answers).length;
  const questions = useMemo(() => questionnaire?.instrumento.perguntas ?? [], [questionnaire]);
  const question = questions[current];

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/perfil/${token}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const body = await response.json() as Partial<Omit<Questionnaire, "status">> & { message?: string; error?: string; status?: "pendente" | "concluido" };
        if (response.ok && body.status === "concluido") { setCompletedMessage(body.message ?? "Este questionário já foi respondido."); return; }
        if (!response.ok || body.status !== "pendente" || !body.instrumento || !body.colaborador || !body.finalidade || !body.expira_em) throw new Error(body.error ?? "Questionário indisponível.");
        setQuestionnaire(body as Questionnaire);
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "Não foi possível abrir o questionário.");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [token]);

  function choose(questionId: string, optionId: string) {
    setAnswers((previous) => ({ ...previous, [questionId]: optionId }));
    setError("");
  }

  function next() {
    if (!question || !answers[question.id]) { setError("Escolha a alternativa que mais representa seu comportamento habitual."); return; }
    setCurrent((value) => Math.min(questions.length - 1, value + 1));
    setError(""); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    if (answered !== questions.length) { setError("Responda todas as 24 perguntas antes de finalizar."); return; }
    if (!awareness) { setError("Confirme a ciência sobre a finalidade deste questionário."); return; }
    setSending(true); setError("");
    try {
      const response = await fetch(`/api/perfil/${token}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, awareness, started_at: startedAt, website: "" }),
      });
      const body = await response.json() as { resultado?: Result; error?: string };
      if (!response.ok || !body.resultado) throw new Error(body.error ?? "Não foi possível concluir o questionário.");
      setResult(body.resultado); window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Não foi possível concluir o questionário.");
    } finally { setSending(false); }
  }

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600"><Loader2 className="mr-3 h-6 w-6 animate-spin text-violet-700" />Abrindo questionário seguro…</main>;
  if (!questionnaire && !result) return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><section className="max-w-lg rounded-3xl border border-slate-200 bg-white p-9 text-center shadow-sm"><LockKeyhole className="mx-auto h-12 w-12 text-slate-400" /><h1 className="mt-4 text-xl font-black">{completedMessage ? "Questionário concluído" : "Link indisponível"}</h1><p className="mt-2 text-sm leading-6 text-slate-600">{completedMessage || error || "O link expirou ou foi revogado."}</p><p className="mt-5 text-xs text-slate-500">Em caso de dúvida, fale com o RH.</p></section></main>;

  if (result) return <ResultView result={result} />;

  const isLast = current === questions.length - 1;
  const progress = questions.length ? Math.round((answered / questions.length) * 100) : 0;
  return <main className="min-h-screen bg-slate-50">
    <header className="bg-gradient-to-r from-violet-950 via-indigo-950 to-blue-900 text-white"><div className="mx-auto max-w-4xl px-6 py-9"><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-violet-200"><Brain className="h-5 w-5" />Premazon RH 360 · Desenvolvimento</p><h1 className="mt-5 text-3xl font-black tracking-tight">Olá, {questionnaire?.colaborador}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">Responda considerando seu comportamento habitual no ambiente de trabalho. Não existem respostas certas ou erradas.</p></div></header>
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-xs leading-5 text-blue-900"><p className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" /><span><strong>Finalidade:</strong> {questionnaire?.finalidade}. Este é um questionário de autopercepção baseado no modelo D/I/S/C fornecido pelo RH. Não é teste psicológico, diagnóstico, prova de aptidão ou decisão automática sobre emprego, promoção ou punição.</span></p></section>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-violet-700">Pergunta {current + 1} de {questions.length}</p><p className="mt-1 text-xs text-slate-500">{answered} respondida(s) · {progress}% concluído</p></div><span className="text-lg font-black text-violet-800">{progress}%</span></div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-600 transition-all" style={{ width: `${progress}%` }} /></div>
        {question && <div className="mt-8"><h2 className="text-xl font-black leading-8 text-slate-900">{question.text}</h2><div className="mt-6 space-y-3">{question.options.map((option) => { const selected = answers[question.id] === option.id; return <label key={option.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-sm leading-6 transition ${selected ? "border-violet-500 bg-violet-50 text-violet-950 ring-2 ring-violet-100" : "border-slate-200 text-slate-700 hover:border-violet-300 hover:bg-slate-50"}`}><input type="radio" name={question.id} checked={selected} onChange={() => choose(question.id, option.id)} className="mt-1 h-4 w-4 border-slate-300 text-violet-700" /><span>{option.text}</span></label>; })}</div></div>}
        {isLast && <label className="mt-7 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-950"><input type="checkbox" checked={awareness} onChange={(event) => setAwareness(event.target.checked)} className="mt-1 h-4 w-4 rounded border-amber-400" /><span>Li e estou ciente da finalidade de desenvolvimento, do caráter de autopercepção e de que o resultado não constitui avaliação psicológica nem deve ser usado isoladamente para decidir sobre minha vida profissional.</span></label>}
        {error && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
        <div className="mt-7 flex items-center justify-between gap-3"><button type="button" disabled={current === 0 || sending} onClick={() => { setCurrent((value) => Math.max(0, value - 1)); setError(""); }} className="flex items-center rounded-xl border border-slate-300 px-4 py-3 text-xs font-black text-slate-700 disabled:opacity-40"><ArrowLeft className="mr-2 h-4 w-4" />Anterior</button>{isLast ? <button type="button" disabled={sending} onClick={() => void submit()} className="flex items-center rounded-xl bg-violet-800 px-5 py-3 text-xs font-black text-white shadow-lg disabled:opacity-50">{sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Finalizar</button> : <button type="button" onClick={next} className="flex items-center rounded-xl bg-violet-800 px-5 py-3 text-xs font-black text-white">Próxima<ArrowRight className="ml-2 h-4 w-4" /></button>}</div>
      </section>
      <p className="text-center text-[10px] leading-4 text-slate-500">Link individual e temporário. Suas respostas ficam disponíveis somente para você e para os perfis de RH autorizados.</p>
    </div>
  </main>;
}

function ResultView({ result }: { result: Result }) {
  return <main className="min-h-screen bg-slate-50 p-6 print:bg-white print:p-0"><div className="mx-auto max-w-4xl space-y-6 py-6"><section className="rounded-3xl bg-gradient-to-br from-violet-950 via-indigo-950 to-blue-900 p-8 text-white shadow-xl print:shadow-none"><CheckCircle2 className="h-12 w-12 text-emerald-300" /><p className="mt-5 text-xs font-black uppercase tracking-[.16em] text-violet-200">Questionário concluído</p><h1 className="mt-2 text-3xl font-black">{result.label}</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-indigo-100">{result.orientacoes.descriptions.join(" ")}</p></section>
    <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-lg font-black text-slate-900">Distribuição D/I/S/C</h2><p className="mt-1 text-xs text-slate-500">Percentuais calculados sobre as 24 escolhas.</p></div><button type="button" onClick={() => window.print()} className="flex items-center rounded-xl border border-slate-300 px-3 py-2 text-xs font-black text-slate-700 print:hidden"><Printer className="mr-2 h-4 w-4" />Imprimir</button></div><div className="mt-6 space-y-5">{(["D", "I", "S", "C"] as const).map((dimension) => <div key={dimension}><div className="mb-2 flex items-center justify-between text-xs font-black text-slate-700"><span>{dimension} — {dimensionLabels[dimension]}</span><span>{result.percentuais[dimension]}%</span></div><div className="h-4 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${dimensionColors[dimension]}`} style={{ width: `${result.percentuais[dimension]}%` }} /></div></div>)}</div></section>
    <div className="grid gap-5 md:grid-cols-3"><ResultList title="Pontos fortes para explorar" items={result.orientacoes.strengths} tone="emerald" /><ResultList title="Pontos para observar" items={result.orientacoes.attention} tone="amber" /><ResultList title="Temas para validar no PDI" items={result.orientacoes.developmentThemes} tone="blue" /></div>
    <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-xs leading-5 text-blue-900"><strong>Próximo passo:</strong> converse com o RH ou com seu gestor para contextualizar o resultado. Nenhuma recomendação de treinamento ou decisão profissional deve ser feita somente a partir deste questionário.</section>
  </div></main>;
}

function ResultList({ title, items, tone }: { title: string; items: string[]; tone: "emerald" | "amber" | "blue" }) {
  const classes = { emerald: "border-emerald-200 bg-emerald-50 text-emerald-950", amber: "border-amber-200 bg-amber-50 text-amber-950", blue: "border-blue-200 bg-blue-50 text-blue-950" };
  return <section className={`rounded-2xl border p-5 ${classes[tone]}`}><h2 className="text-sm font-black">{title}</h2><ul className="mt-4 space-y-2 text-xs leading-5">{items.map((item) => <li key={item}>• {item}</li>)}</ul></section>;
}
