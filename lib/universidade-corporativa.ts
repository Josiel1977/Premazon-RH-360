export function slugifyCourseName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function sanitizeVideoFileName(value: string) {
  const lastDot = value.lastIndexOf(".");
  const rawBase = lastDot > 0 ? value.slice(0, lastDot) : value;
  const rawExtension = lastDot > 0 ? value.slice(lastDot + 1) : "mp4";
  const base = slugifyCourseName(rawBase) || "video-aula";
  const extension = rawExtension.toLocaleLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "mp4";
  return `${base}.${extension}`;
}

export function getSupabaseProjectId(supabaseUrl: string) {
  const hostname = new URL(supabaseUrl).hostname;
  const suffix = ".supabase.co";
  if (!hostname.endsWith(suffix)) {
    throw new Error("A URL pública do Supabase precisa usar o domínio padrão *.supabase.co para o upload de vídeos.");
  }
  const projectId = hostname.slice(0, -suffix.length);
  if (!projectId || projectId.includes(".")) throw new Error("Não foi possível identificar o projeto Supabase.");
  return projectId;
}

export function formatVideoDuration(seconds: number | null | undefined) {
  if (!seconds || seconds < 1) return "Duração não informada";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = Math.round(seconds % 60);
  if (hours) return `${hours}h ${minutes.toString().padStart(2, "0")}min`;
  return `${minutes}min ${remaining.toString().padStart(2, "0")}s`;
}
