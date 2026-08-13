"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Award,
  BookOpenCheck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  CloudUpload,
  Film,
  Gauge,
  GraduationCap,
  Layers3,
  LoaderCircle,
  LockKeyhole,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Video,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  formatVideoDuration,
  getSupabaseProjectId,
  sanitizeVideoFileName,
  slugifyCourseName,
} from "@/lib/universidade-corporativa";

type Course = {
  id: string;
  nome: string;
  categoria: string;
  resumo: string | null;
  descricao: string | null;
  carga_horaria: number;
  nivel: string;
  status_publicacao: "rascunho" | "publicado" | "arquivado";
  autor_nome: string | null;
  destaque: boolean;
  permite_autoinscricao: boolean;
};

type CourseModule = {
  id: string;
  curso_id: string;
  titulo: string;
  descricao: string | null;
  ordem: number;
  ativo: boolean;
};

type Lesson = {
  id: string;
  modulo_id: string;
  titulo: string;
  descricao: string | null;
  ordem: number;
  tipo: "video" | "texto" | "material";
  duracao_segundos: number | null;
  video_provider: string | null;
  video_path: string | null;
  video_url: string | null;
  publicada: boolean;
};

type Enrollment = {
  id: string;
  curso_id: string;
  status: string;
  progresso_percentual: number;
};

type ProgressRecord = {
  aula_id: string;
  progresso_segundos: number;
  concluida: boolean;
};

type PlayerState = { lesson: Lesson; signedUrl: string };
type View = "catalogo" | "construtor";
type UploadHandle = { abort: (shouldTerminate?: boolean) => Promise<void> };

const inputClass = "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-blue-100";
const categoryLabels: Record<string, string> = {
  tecnico: "Técnico",
  comportamental: "Comportamental",
  nr_legal: "NR / Legal",
  integracao: "Integração",
  qualidade: "Qualidade",
  gestao: "Gestão",
  outro: "Outro",
};
const levelLabels: Record<string, string> = {
  todos: "Todos os níveis",
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

function videoDuration(file: File) {
  return new Promise<number | null>((resolve) => {
    const element = document.createElement("video");
    const url = URL.createObjectURL(file);
    element.preload = "metadata";
    element.onloadedmetadata = () => {
      const value = Number.isFinite(element.duration) ? Math.round(element.duration) : null;
      URL.revokeObjectURL(url);
      resolve(value);
    };
    element.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    element.src = url;
  });
}

export default function VideoCoursesPage() {
  const [view, setView] = useState<View>("catalogo");
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [progress, setProgress] = useState<ProgressRecord[]>([]);
  const [manager, setManager] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadModuleId, setUploadModuleId] = useState("");
  const [courseFormOpen, setCourseFormOpen] = useState(false);
  const [moduleFormOpen, setModuleFormOpen] = useState(false);
  const [lessonFormOpen, setLessonFormOpen] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const uploadRef = useRef<UploadHandle | null>(null);
  const lastSavedSecond = useRef(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error("Sua sessão expirou. Entre novamente para acessar os cursos.");

      const { data: profile } = await supabase
        .from("perfis_usuario")
        .select("perfil")
        .eq("auth_user_id", authData.user.id)
        .eq("ativo", true)
        .maybeSingle();
      const canManage = profile?.perfil === "administrador" || profile?.perfil === "rh";
      setManager(canManage);

      let coursesQuery = supabase
        .from("td_cursos")
        .select("id,nome,categoria,resumo,descricao,carga_horaria,nivel,status_publicacao,autor_nome,destaque,permite_autoinscricao")
        .eq("ativo", true)
        .order("destaque", { ascending: false })
        .order("nome");
      if (!canManage) coursesQuery = coursesQuery.eq("status_publicacao", "publicado");
      const coursesResult = await coursesQuery;
      if (coursesResult.error) throw coursesResult.error;

      const normalizedCourses = (coursesResult.data ?? []).map((item) => ({ ...item, carga_horaria: Number(item.carga_horaria) })) as Course[];
      const courseIds = normalizedCourses.map((item) => item.id);
      const modulesResult = courseIds.length
        ? await supabase.from("td_curso_modulos").select("id,curso_id,titulo,descricao,ordem,ativo").in("curso_id", courseIds).eq("ativo", true).order("ordem")
        : { data: [], error: null };
      if (modulesResult.error) throw modulesResult.error;
      const normalizedModules = (modulesResult.data ?? []) as CourseModule[];
      const moduleIds = normalizedModules.map((item) => item.id);
      const lessonsResult = moduleIds.length
        ? await supabase.from("td_curso_aulas").select("id,modulo_id,titulo,descricao,ordem,tipo,duracao_segundos,video_provider,video_path,video_url,publicada").in("modulo_id", moduleIds).order("ordem")
        : { data: [], error: null };
      if (lessonsResult.error) throw lessonsResult.error;

      const enrollmentsResult = await supabase
        .from("td_matriculas_cursos")
        .select("id,curso_id,status,progresso_percentual")
        .eq("auth_user_id", authData.user.id);
      if (enrollmentsResult.error) throw enrollmentsResult.error;
      const normalizedEnrollments = (enrollmentsResult.data ?? []).map((item) => ({ ...item, progresso_percentual: Number(item.progresso_percentual) })) as Enrollment[];
      const enrollmentIds = normalizedEnrollments.map((item) => item.id);
      const progressResult = enrollmentIds.length
        ? await supabase.from("td_progresso_aulas").select("aula_id,progresso_segundos,concluida").in("matricula_id", enrollmentIds)
        : { data: [], error: null };
      if (progressResult.error) throw progressResult.error;

      setCourses(normalizedCourses);
      setModules(normalizedModules);
      setLessons((lessonsResult.data ?? []) as Lesson[]);
      setEnrollments(normalizedEnrollments);
      setProgress((progressResult.data ?? []) as ProgressRecord[]);
      setSelectedCourseId((current) => current && courseIds.includes(current) ? current : courseIds[0] ?? null);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Não foi possível carregar a Universidade Corporativa.";
      setMessage({
        type: "error",
        text: text.includes("td_curso") || text.includes("status_publicacao")
          ? "A Universidade Corporativa ainda não foi preparada no banco. Execute a migração 20260813_004 no Supabase."
          : text,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const selectedCourse = courses.find((course) => course.id === selectedCourseId) ?? null;
  const selectedModules = useMemo(
    () => modules.filter((item) => item.curso_id === selectedCourseId).sort((a, b) => a.ordem - b.ordem),
    [modules, selectedCourseId],
  );
  const selectedEnrollment = enrollments.find((item) => item.curso_id === selectedCourseId) ?? null;
  const filteredCourses = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    if (!term) return courses;
    return courses.filter((item) => [item.nome, item.resumo ?? "", item.autor_nome ?? "", categoryLabels[item.categoria] ?? item.categoria]
      .some((value) => value.toLocaleLowerCase("pt-BR").includes(term)));
  }, [courses, search]);

  async function createCourse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const name = String(form.get("nome") ?? "").trim();
    const { data, error } = await supabase.from("td_cursos").insert({
      nome: name,
      slug: `${slugifyCourseName(name)}-${crypto.randomUUID().slice(0, 6)}`,
      resumo: String(form.get("resumo") ?? "").trim() || null,
      descricao: String(form.get("resumo") ?? "").trim() || null,
      categoria: String(form.get("categoria") ?? "outro"),
      modalidade: "ead",
      carga_horaria: Number(form.get("carga_horaria") ?? 1),
      nivel: String(form.get("nivel") ?? "todos"),
      autor_nome: String(form.get("autor_nome") ?? "").trim() || null,
      status_publicacao: "rascunho",
      ativo: true,
    }).select("id").single();
    if (error) setMessage({ type: "error", text: `Não foi possível criar o curso: ${error.message}` });
    else {
      setCourseFormOpen(false);
      setSelectedCourseId(data.id);
      setView("construtor");
      setMessage({ type: "success", text: "Curso criado como rascunho. Agora adicione módulos e videoaulas." });
      await loadData();
      setSelectedCourseId(data.id);
    }
    setSaving(false);
  }

  async function createModule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCourseId) return;
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const nextOrder = selectedModules.reduce((max, item) => Math.max(max, item.ordem), -1) + 1;
    const { data, error } = await supabase.from("td_curso_modulos").insert({
      curso_id: selectedCourseId,
      titulo: String(form.get("titulo") ?? "").trim(),
      descricao: String(form.get("descricao") ?? "").trim() || null,
      ordem: nextOrder,
    }).select("id").single();
    if (error) setMessage({ type: "error", text: `Não foi possível criar o módulo: ${error.message}` });
    else {
      setModuleFormOpen(false);
      setUploadModuleId(data.id);
      setMessage({ type: "success", text: "Módulo adicionado à trilha do curso." });
      await loadData();
      setSelectedCourseId(selectedCourseId);
    }
    setSaving(false);
  }

  async function uploadLesson(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCourseId) return;
    const form = new FormData(event.currentTarget);
    const file = form.get("video");
    const moduleId = String(form.get("modulo_id") ?? "");
    if (!(file instanceof File) || !file.size) {
      setMessage({ type: "error", text: "Selecione um arquivo de vídeo para a aula." });
      return;
    }
    if (!moduleId) {
      setMessage({ type: "error", text: "Escolha o módulo onde a aula será adicionada." });
      return;
    }
    if (!["video/mp4", "video/webm", "video/quicktime"].includes(file.type)) {
      setMessage({ type: "error", text: "Formato não aceito. Use MP4, WebM ou MOV." });
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      setMessage({ type: "error", text: "O vídeo ultrapassa o limite configurado de 500 MB." });
      return;
    }

    setUploading(true);
    setUploadPercent(0);
    setMessage(null);
    const lessonId = crypto.randomUUID();
    const path = `${selectedCourseId}/${moduleId}/${lessonId}-${sanitizeVideoFileName(file.name)}`;
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) throw new Error("A URL pública do Supabase não está configurada.");
      const projectId = getSupabaseProjectId(supabaseUrl);
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.access_token) throw new Error("Sua sessão expirou. Entre novamente antes de enviar o vídeo.");
      const { Upload } = await import("tus-js-client");

      await new Promise<void>((resolve, reject) => {
        const upload = new Upload(file, {
          endpoint: `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          headers: { authorization: `Bearer ${sessionData.session.access_token}` },
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          metadata: {
            bucketName: "td-videos",
            objectName: path,
            contentType: file.type,
            cacheControl: "3600",
          },
          chunkSize: 6 * 1024 * 1024,
          onError: reject,
          onProgress: (uploaded, total) => setUploadPercent(Math.round((uploaded / total) * 100)),
          onSuccess: () => resolve(),
        });
        uploadRef.current = upload;
        void upload.findPreviousUploads().then((previous) => {
          if (previous.length) upload.resumeFromPreviousUpload(previous[0]);
          upload.start();
        }).catch(reject);
      });

      const moduleLessons = lessons.filter((item) => item.modulo_id === moduleId);
      const nextOrder = moduleLessons.reduce((max, item) => Math.max(max, item.ordem), -1) + 1;
      const duration = await videoDuration(file);
      const { error } = await supabase.from("td_curso_aulas").insert({
        id: lessonId,
        modulo_id: moduleId,
        titulo: String(form.get("titulo") ?? "").trim(),
        descricao: String(form.get("descricao") ?? "").trim() || null,
        ordem: nextOrder,
        tipo: "video",
        duracao_segundos: duration,
        video_provider: "supabase",
        video_path: path,
        publicada: true,
      });
      if (error) {
        await supabase.storage.from("td-videos").remove([path]);
        throw new Error(`O vídeo foi enviado, mas a aula não pôde ser criada: ${error.message}`);
      }

      setLessonFormOpen(false);
      setMessage({ type: "success", text: "Videoaula enviada com segurança e adicionada ao curso." });
      await loadData();
      setSelectedCourseId(selectedCourseId);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "O upload do vídeo falhou." });
    } finally {
      uploadRef.current = null;
      setUploading(false);
    }
  }

  async function cancelUpload() {
    await uploadRef.current?.abort(true);
    uploadRef.current = null;
    setUploading(false);
    setUploadPercent(0);
    setMessage({ type: "error", text: "Envio cancelado. Você pode selecionar o arquivo novamente quando desejar." });
  }

  async function publishCourse() {
    if (!selectedCourseId) return;
    const publishedLessons = lessons.filter((lesson) => selectedModules.some((module) => module.id === lesson.modulo_id) && lesson.publicada);
    if (!selectedModules.length || !publishedLessons.length) {
      setMessage({ type: "error", text: "Adicione pelo menos um módulo e uma videoaula antes de publicar o curso." });
      return;
    }
    setSaving(true);
    const nextStatus = selectedCourse?.status_publicacao === "publicado" ? "rascunho" : "publicado";
    const { error } = await supabase.from("td_cursos").update({
      status_publicacao: nextStatus,
      publicado_em: nextStatus === "publicado" ? new Date().toISOString() : null,
    }).eq("id", selectedCourseId);
    if (error) setMessage({ type: "error", text: `Não foi possível alterar a publicação: ${error.message}` });
    else {
      setMessage({ type: "success", text: nextStatus === "publicado" ? "Curso publicado e disponível para matrícula." : "Curso retirado do catálogo e mantido como rascunho." });
      await loadData();
      setSelectedCourseId(selectedCourseId);
    }
    setSaving(false);
  }

  async function enroll(courseId: string) {
    setSaving(true);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setMessage({ type: "error", text: "Sua sessão expirou. Entre novamente para iniciar o curso." });
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("td_matriculas_cursos").insert({ curso_id: courseId, auth_user_id: authData.user.id });
    if (error && error.code !== "23505") setMessage({ type: "error", text: `Não foi possível realizar a matrícula: ${error.message}` });
    else {
      setMessage({ type: "success", text: "Matrícula realizada. Seu progresso será salvo automaticamente." });
      await loadData();
      setSelectedCourseId(courseId);
    }
    setSaving(false);
  }

  async function playLesson(lesson: Lesson) {
    if (!manager && !selectedEnrollment) {
      setMessage({ type: "error", text: "Clique em Começar curso para liberar as aulas e salvar seu progresso." });
      return;
    }
    if (!lesson.video_path) {
      setMessage({ type: "error", text: "Esta aula ainda não possui um vídeo disponível." });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.storage.from("td-videos").createSignedUrl(lesson.video_path, 3600);
    if (error) setMessage({ type: "error", text: `Não foi possível liberar o vídeo: ${error.message}` });
    else {
      lastSavedSecond.current = progress.find((item) => item.aula_id === lesson.id)?.progresso_segundos ?? 0;
      setPlayer({ lesson, signedUrl: data.signedUrl });
    }
    setSaving(false);
  }

  async function saveProgress(lesson: Lesson, currentSeconds: number, durationSeconds: number, force = false) {
    if (!selectedEnrollment || !durationSeconds) return;
    const current = Math.max(0, Math.floor(currentSeconds));
    if (!force && Math.abs(current - lastSavedSecond.current) < 10) return;
    lastSavedSecond.current = current;
    const concluded = force || current / durationSeconds >= 0.9;
    const { error } = await supabase.from("td_progresso_aulas").upsert({
      matricula_id: selectedEnrollment.id,
      aula_id: lesson.id,
      progresso_segundos: concluded ? Math.floor(durationSeconds) : current,
      duracao_segundos: Math.floor(durationSeconds),
      concluida: concluded,
      concluida_em: concluded ? new Date().toISOString() : null,
      ultimo_acesso_em: new Date().toISOString(),
    }, { onConflict: "matricula_id,aula_id" });
    if (!error && concluded) {
      setProgress((items) => [...items.filter((item) => item.aula_id !== lesson.id), { aula_id: lesson.id, progresso_segundos: Math.floor(durationSeconds), concluida: true }]);
      void loadData();
    }
  }

  const publishedCourses = courses.filter((item) => item.status_publicacao === "publicado").length;
  const totalLessons = lessons.filter((item) => item.publicada).length;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <section className="relative overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_85%_15%,rgba(250,204,21,.28),transparent_27%),linear-gradient(125deg,#0f2557_0%,#1d4d91_62%,#2463ae_100%)] px-6 py-8 text-white shadow-xl sm:px-9 sm:py-10">
        <div className="relative grid items-end gap-8 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-amber-300 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#102b60]"><Sparkles className="h-3 w-3" /> Universidade Corporativa</span>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-100">Aprendizagem contínua</span>
            </div>
            <h1 className="mt-5 max-w-3xl text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl">Conhecimento que vira competência e resultado.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">Crie trilhas, publique videoaulas, acompanhe a conclusão e conecte o desenvolvimento à estratégia de pessoas.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {manager && <button type="button" onClick={() => { setCourseFormOpen(true); setView("construtor"); }} className="flex items-center gap-2 rounded-xl bg-amber-300 px-5 py-3 text-sm font-black text-[#102b60] shadow-lg transition hover:bg-amber-200"><Plus className="h-4 w-4" /> Criar curso</button>}
              <button type="button" onClick={() => setView("catalogo")} className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20"><Play className="h-4 w-4" /> Explorar catálogo</button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[{ label: "Cursos", value: courses.length, icon: GraduationCap }, { label: "Publicados", value: publishedCourses, icon: Rocket }, { label: "Videoaulas", value: totalLessons, icon: Film }].map((item) => {
              const Icon = item.icon;
              return <div key={item.label} className="rounded-2xl border border-white/15 bg-white/10 p-3 text-center backdrop-blur-sm sm:p-4"><Icon className="mx-auto h-5 w-5 text-amber-300" /><p className="mt-2 text-2xl font-black">{item.value}</p><p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-200">{item.label}</p></div>;
            })}
          </div>
        </div>
      </section>

      {message && <div className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>{message.type === "success" ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /> : <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />}<span className="flex-1 font-medium">{message.text}</span><button type="button" aria-label="Fechar aviso" onClick={() => setMessage(null)}><X className="h-4 w-4" /></button></div>}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="inline-flex w-fit rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <button type="button" onClick={() => setView("catalogo")} className={`rounded-lg px-4 py-2 text-sm font-bold transition ${view === "catalogo" ? "bg-primary text-white shadow" : "text-slate-500 hover:text-slate-900"}`}>Catálogo e meus cursos</button>
          {manager && <button type="button" onClick={() => setView("construtor")} className={`rounded-lg px-4 py-2 text-sm font-bold transition ${view === "construtor" ? "bg-primary text-white shadow" : "text-slate-500 hover:text-slate-900"}`}>Construtor de cursos</button>}
        </div>
        <button type="button" onClick={() => void loadData()} className="flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50"><RefreshCw className="h-3.5 w-3.5" /> Atualizar</button>
      </div>

      {loading ? (
        <div className="flex min-h-80 items-center justify-center rounded-3xl border border-slate-200 bg-white"><LoaderCircle className="h-8 w-8 animate-spin text-primary" /></div>
      ) : view === "catalogo" ? (
        <div className="space-y-6">
          <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"><Search className="mr-3 h-5 w-5 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por curso, tema, categoria ou instrutor..." className="w-full bg-transparent text-sm outline-none" /></div>

          {!filteredCourses.length ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center"><BookOpenCheck className="mx-auto h-10 w-10 text-slate-300" /><h2 className="mt-4 text-lg font-black text-slate-800">Nenhum curso encontrado</h2><p className="mt-2 text-sm text-slate-500">{manager ? "Crie o primeiro curso em vídeo para iniciar a Universidade Corporativa." : "O RH ainda não publicou cursos para o seu perfil."}</p></div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredCourses.map((course, index) => {
                const courseModules = modules.filter((item) => item.curso_id === course.id);
                const courseLessons = lessons.filter((lesson) => courseModules.some((item) => item.id === lesson.modulo_id));
                const enrollment = enrollments.find((item) => item.curso_id === course.id);
                return (
                  <article key={course.id} className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                    <div className={`relative h-36 bg-gradient-to-br ${index % 3 === 0 ? "from-blue-950 to-blue-600" : index % 3 === 1 ? "from-violet-950 to-indigo-500" : "from-emerald-950 to-teal-500"} p-5 text-white`}>
                      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
                      <div className="relative flex items-start justify-between"><span className="rounded-full bg-white/15 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider backdrop-blur-sm">{categoryLabels[course.categoria] ?? course.categoria}</span>{course.status_publicacao !== "publicado" && <span className="rounded-full bg-amber-300 px-2.5 py-1 text-[9px] font-black uppercase text-amber-950">Rascunho</span>}</div>
                      <Film className="absolute bottom-5 right-5 h-9 w-9 text-white/25" />
                    </div>
                    <div className="p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-primary">{levelLabels[course.nivel] ?? course.nivel}</p>
                      <h2 className="mt-2 line-clamp-2 text-lg font-black leading-6 text-slate-900">{course.nome}</h2>
                      <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-slate-500">{course.resumo ?? "Curso estruturado para o desenvolvimento contínuo das equipes."}</p>
                      <div className="mt-4 flex items-center gap-4 border-y border-slate-100 py-3 text-[11px] font-semibold text-slate-500"><span className="flex items-center gap-1"><Layers3 className="h-3.5 w-3.5" />{courseModules.length} módulos</span><span className="flex items-center gap-1"><Video className="h-3.5 w-3.5" />{courseLessons.length} aulas</span><span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{course.carga_horaria}h</span></div>
                      {enrollment && <div className="mt-4"><div className="mb-1.5 flex justify-between text-[10px] font-bold text-slate-500"><span>Seu progresso</span><span>{Math.round(enrollment.progresso_percentual)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-400" style={{ width: `${enrollment.progresso_percentual}%` }} /></div></div>}
                      <button type="button" onClick={() => { setSelectedCourseId(course.id); setPlayer(null); }} className="mt-5 flex w-full items-center justify-between rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition group-hover:bg-primary">{enrollment ? "Continuar curso" : manager ? "Visualizar curso" : "Conhecer curso"}<ChevronRight className="h-4 w-4" /></button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {selectedCourse && <CourseViewer course={selectedCourse} modules={selectedModules} lessons={lessons} enrollment={selectedEnrollment} progress={progress} manager={manager} player={player} saving={saving} onEnroll={() => void enroll(selectedCourse.id)} onPlay={(lesson) => void playLesson(lesson)} onClosePlayer={() => setPlayer(null)} onTimeUpdate={(event) => void saveProgress(player!.lesson, event.currentTarget.currentTime, event.currentTarget.duration)} onEnded={(event) => void saveProgress(player!.lesson, event.currentTarget.duration, event.currentTarget.duration, true)} />}
        </div>
      ) : manager ? (
        <div className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-primary">Biblioteca</p><h2 className="mt-1 text-xl font-black text-slate-900">Seus cursos</h2></div><button type="button" onClick={() => setCourseFormOpen(true)} className="rounded-xl bg-primary p-2.5 text-white hover:bg-blue-800" aria-label="Criar curso"><Plus className="h-4 w-4" /></button></div>
            <div className="mt-5 space-y-2">
              {courses.map((course) => <button type="button" key={course.id} onClick={() => { setSelectedCourseId(course.id); setPlayer(null); }} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${selectedCourseId === course.id ? "border-blue-200 bg-blue-50" : "border-slate-100 hover:bg-slate-50"}`}><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${course.status_publicacao === "publicado" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}><GraduationCap className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-800">{course.nome}</span><span className="mt-0.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">{course.status_publicacao === "publicado" ? "Publicado" : "Rascunho"}</span></span><ChevronRight className="h-4 w-4 text-slate-300" /></button>)}
              {!courses.length && <p className="rounded-2xl bg-slate-50 p-5 text-center text-sm text-slate-500">Crie seu primeiro curso.</p>}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            {selectedCourse ? <><div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-start"><div><div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide ${selectedCourse.status_publicacao === "publicado" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{selectedCourse.status_publicacao}</span><span className="text-xs font-semibold text-slate-400">{categoryLabels[selectedCourse.categoria]}</span></div><h2 className="mt-3 text-2xl font-black text-slate-900">{selectedCourse.nome}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{selectedCourse.resumo ?? "Adicione uma apresentação para o curso."}</p></div><button type="button" disabled={saving} onClick={() => void publishCourse()} className={`flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black text-white ${selectedCourse.status_publicacao === "publicado" ? "bg-slate-600 hover:bg-slate-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>{selectedCourse.status_publicacao === "publicado" ? <Pause className="h-4 w-4" /> : <Rocket className="h-4 w-4" />}{selectedCourse.status_publicacao === "publicado" ? "Voltar a rascunho" : "Publicar curso"}</button></div>
              <div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={() => setModuleFormOpen(true)} className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"><Plus className="h-4 w-4 text-primary" /> Novo módulo</button><button type="button" disabled={!selectedModules.length} onClick={() => { setUploadModuleId(selectedModules[0]?.id ?? ""); setLessonFormOpen(true); }} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"><UploadCloud className="h-4 w-4" /> Enviar videoaula</button></div>
              <div className="mt-6 space-y-3">{selectedModules.map((module) => { const moduleLessons = lessons.filter((item) => item.modulo_id === module.id).sort((a, b) => a.ordem - b.ordem); return <div key={module.id} className="overflow-hidden rounded-2xl border border-slate-200"><div className="flex items-center gap-3 bg-slate-50 px-4 py-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-xs font-black text-primary shadow-sm">{module.ordem + 1}</span><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-black text-slate-800">{module.titulo}</h3><p className="text-[10px] font-semibold text-slate-400">{moduleLessons.length} videoaula(s)</p></div><ChevronDown className="h-4 w-4 text-slate-400" /></div><div className="divide-y divide-slate-100">{moduleLessons.map((lesson, index) => <button type="button" key={lesson.id} onClick={() => void playLesson(lesson)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-blue-50/50"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-primary"><Play className="h-3.5 w-3.5 fill-current" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-700">{index + 1}. {lesson.titulo}</span><span className="text-[10px] text-slate-400">{formatVideoDuration(lesson.duracao_segundos)}</span></span><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase text-emerald-700">Publicada</span></button>)}{!moduleLessons.length && <div className="px-4 py-5 text-center text-xs text-slate-400">Nenhuma aula neste módulo.</div>}</div></div>; })}{!selectedModules.length && <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center"><Layers3 className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-600">Comece criando o primeiro módulo</p><p className="mt-1 text-xs text-slate-400">Exemplo: Módulo 1 — Fundamentos</p></div>}</div>
              {player && <div className="mt-6"><SecurePlayer player={player} onClose={() => setPlayer(null)} /></div>}
            </> : <div className="flex min-h-96 flex-col items-center justify-center text-center"><GraduationCap className="h-12 w-12 text-slate-300" /><h2 className="mt-4 text-lg font-black text-slate-800">Selecione ou crie um curso</h2></div>}
          </section>
        </div>
      ) : null}

      {courseFormOpen && <Modal title="Criar curso em vídeo" subtitle="Comece pelo propósito do curso. Os módulos e aulas serão adicionados em seguida." onClose={() => setCourseFormOpen(false)}><form onSubmit={createCourse} className="space-y-4"><label className="block text-xs font-bold text-slate-600">Nome do curso<input name="nome" required minLength={3} className={inputClass} placeholder="Ex.: Liderança para novos gestores" /></label><label className="block text-xs font-bold text-slate-600">Apresentação<textarea name="resumo" required rows={3} className={inputClass} placeholder="O que a pessoa aprenderá e por que esse conteúdo importa?" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-xs font-bold text-slate-600">Categoria<select name="categoria" className={inputClass}>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="block text-xs font-bold text-slate-600">Nível<select name="nivel" className={inputClass}>{Object.entries(levelLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div><div className="grid gap-4 sm:grid-cols-2"><label className="block text-xs font-bold text-slate-600">Carga horária estimada<input name="carga_horaria" type="number" min="0.25" max="1000" step="0.25" defaultValue="1" required className={inputClass} /></label><label className="block text-xs font-bold text-slate-600">Instrutor ou autor<input name="autor_nome" className={inputClass} placeholder="Nome do especialista" /></label></div><button disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:opacity-60">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Criar curso</button></form></Modal>}
      {moduleFormOpen && <Modal title="Novo módulo" subtitle={selectedCourse?.nome ?? "Organize a trilha de aprendizagem."} onClose={() => setModuleFormOpen(false)}><form onSubmit={createModule} className="space-y-4"><label className="block text-xs font-bold text-slate-600">Título do módulo<input name="titulo" required minLength={3} className={inputClass} placeholder="Ex.: Fundamentos e contexto" /></label><label className="block text-xs font-bold text-slate-600">Descrição<textarea name="descricao" rows={3} className={inputClass} placeholder="Resultado esperado ao concluir este módulo" /></label><button disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:opacity-60">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Layers3 className="h-4 w-4" />} Adicionar módulo</button></form></Modal>}
      {lessonFormOpen && <Modal title="Enviar videoaula" subtitle="Upload privado e retomável para vídeos MP4, WebM ou MOV de até 500 MB." onClose={() => !uploading && setLessonFormOpen(false)}><form onSubmit={uploadLesson} className="space-y-4"><label className="block text-xs font-bold text-slate-600">Módulo<select name="modulo_id" value={uploadModuleId} onChange={(event) => setUploadModuleId(event.target.value)} required disabled={uploading} className={inputClass}><option value="">Selecione...</option>{selectedModules.map((module) => <option key={module.id} value={module.id}>{module.ordem + 1}. {module.titulo}</option>)}</select></label><label className="block text-xs font-bold text-slate-600">Título da aula<input name="titulo" required minLength={3} disabled={uploading} className={inputClass} placeholder="Ex.: Como dar feedback com clareza" /></label><label className="block text-xs font-bold text-slate-600">Descrição<textarea name="descricao" rows={2} disabled={uploading} className={inputClass} placeholder="Resumo do conteúdo desta aula" /></label><label className="block rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/60 p-6 text-center transition hover:border-primary"><CloudUpload className="mx-auto h-9 w-9 text-primary" /><span className="mt-3 block text-sm font-black text-slate-700">Selecione o arquivo da videoaula</span><span className="mt-1 block text-xs text-slate-500">MP4 é recomendado para maior compatibilidade</span><input name="video" type="file" accept="video/mp4,video/webm,video/quicktime" required disabled={uploading} className="mt-4 block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:font-bold file:text-white" /></label>{uploading && <div><div className="mb-2 flex justify-between text-xs font-bold text-slate-600"><span>Enviando com proteção e retomada automática...</span><span>{uploadPercent}%</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-400 transition-all" style={{ width: `${uploadPercent}%` }} /></div><button type="button" onClick={() => void cancelUpload()} className="mt-3 flex items-center gap-1.5 text-xs font-bold text-red-600"><X className="h-3.5 w-3.5" /> Cancelar envio</button></div>}<button disabled={uploading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:opacity-60">{uploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />} {uploading ? `Enviando ${uploadPercent}%` : "Enviar e publicar aula"}</button><div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-[11px] leading-5 text-amber-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />Para aulas de aproximadamente 20 minutos, o plano gratuito do Supabase pode ser insuficiente. A plataforma avisará se o limite do projeto bloquear o arquivo.</div></form></Modal>}
    </div>
  );
}

function CourseViewer({ course, modules, lessons, enrollment, progress, manager, player, saving, onEnroll, onPlay, onClosePlayer, onTimeUpdate, onEnded }: { course: Course; modules: CourseModule[]; lessons: Lesson[]; enrollment: Enrollment | null; progress: ProgressRecord[]; manager: boolean; player: PlayerState | null; saving: boolean; onEnroll: () => void; onPlay: (lesson: Lesson) => void; onClosePlayer: () => void; onTimeUpdate: (event: React.SyntheticEvent<HTMLVideoElement>) => void; onEnded: (event: React.SyntheticEvent<HTMLVideoElement>) => void }) {
  return <section className="scroll-mt-24 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg"><div className="grid lg:grid-cols-[0.9fr_1.1fr]"><div className="bg-slate-950 p-6 text-white sm:p-8"><span className="rounded-full bg-amber-300 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-amber-950">Trilha selecionada</span><h2 className="mt-5 text-2xl font-black leading-tight">{course.nome}</h2><p className="mt-3 text-sm leading-6 text-slate-300">{course.resumo}</p><div className="mt-6 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-white/10 p-3"><Layers3 className="mx-auto h-4 w-4 text-blue-300" /><p className="mt-1 text-lg font-black">{modules.length}</p><p className="text-[9px] uppercase text-slate-400">Módulos</p></div><div className="rounded-xl bg-white/10 p-3"><Video className="mx-auto h-4 w-4 text-blue-300" /><p className="mt-1 text-lg font-black">{lessons.filter((lesson) => modules.some((module) => module.id === lesson.modulo_id)).length}</p><p className="text-[9px] uppercase text-slate-400">Aulas</p></div><div className="rounded-xl bg-white/10 p-3"><Award className="mx-auto h-4 w-4 text-amber-300" /><p className="mt-1 text-lg font-black">100%</p><p className="text-[9px] uppercase text-slate-400">Certificação</p></div></div>{!manager && !enrollment && <button type="button" disabled={saving} onClick={onEnroll} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-3 text-sm font-black text-[#102b60] disabled:opacity-60"><Rocket className="h-4 w-4" /> Começar curso</button>}{enrollment && <div className="mt-6"><div className="mb-2 flex justify-between text-xs font-bold text-slate-300"><span>Progresso da trilha</span><span>{Math.round(enrollment.progresso_percentual)}%</span></div><div className="h-2.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-gradient-to-r from-amber-300 to-emerald-400" style={{ width: `${enrollment.progresso_percentual}%` }} /></div></div>}<div className="mt-5 flex items-center gap-2 text-[10px] text-slate-400"><LockKeyhole className="h-3.5 w-3.5 text-emerald-400" /> Vídeos privados e acesso controlado</div></div><div className="p-5 sm:p-7">{player ? <div><SecurePlayer player={player} onClose={onClosePlayer} onTimeUpdate={onTimeUpdate} onEnded={onEnded} /><h3 className="mt-4 text-lg font-black text-slate-900">{player.lesson.titulo}</h3><p className="mt-1 text-sm text-slate-500">{player.lesson.descricao}</p></div> : <div><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-primary">Conteúdo programático</p><h3 className="mt-1 text-xl font-black text-slate-900">Módulos e aulas</h3></div><Gauge className="h-6 w-6 text-slate-300" /></div><div className="mt-5 space-y-3">{modules.map((module) => <div key={module.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-xs font-black text-primary">{module.ordem + 1}</span><h4 className="text-sm font-black text-slate-800">{module.titulo}</h4></div><div className="mt-3 space-y-1">{lessons.filter((lesson) => lesson.modulo_id === module.id).sort((a, b) => a.ordem - b.ordem).map((lesson) => { const completed = progress.find((item) => item.aula_id === lesson.id)?.concluida; return <button key={lesson.id} type="button" onClick={() => onPlay(lesson)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-blue-50"><span className={`flex h-8 w-8 items-center justify-center rounded-full ${completed ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{completed ? <CheckCircle2 className="h-4 w-4" /> : <Play className="h-3.5 w-3.5 fill-current" />}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-700">{lesson.titulo}</span><span className="text-[10px] text-slate-400">{formatVideoDuration(lesson.duracao_segundos)}</span></span>{!manager && !enrollment && <LockKeyhole className="h-3.5 w-3.5 text-slate-300" />}</button>; })}</div></div>)}</div></div>}</div></div></section>;
}

function SecurePlayer({ player, onClose, onTimeUpdate, onEnded }: { player: PlayerState; onClose: () => void; onTimeUpdate?: (event: React.SyntheticEvent<HTMLVideoElement>) => void; onEnded?: (event: React.SyntheticEvent<HTMLVideoElement>) => void }) {
  return <div className="overflow-hidden rounded-2xl bg-black shadow-xl"><div className="flex items-center justify-between bg-slate-900 px-4 py-2 text-white"><span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-300"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Reprodução protegida</span><button type="button" aria-label="Fechar vídeo" onClick={onClose}><X className="h-4 w-4" /></button></div><video key={player.signedUrl} controls controlsList="nodownload" preload="metadata" className="aspect-video w-full bg-black" src={player.signedUrl} onTimeUpdate={onTimeUpdate} onEnded={onEnded}>Seu navegador não suporta reprodução de vídeo.</video></div>;
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"><button type="button" aria-label="Fechar" className="absolute inset-0" onClick={onClose} /><div role="dialog" aria-modal="true" className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-7"><div className="mb-6 flex items-start justify-between gap-4"><div><h2 className="text-xl font-black text-slate-900">{title}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p></div><button type="button" onClick={onClose} className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"><X className="h-4 w-4" /></button></div>{children}</div></div>;
}
