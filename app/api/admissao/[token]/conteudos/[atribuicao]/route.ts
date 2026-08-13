import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/recrutamento";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ token: string; atribuicao: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { token, atribuicao } = await context.params; const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "Conteúdo temporariamente indisponível." }, { status: 503 });
  if (!isUuid(token) || !isUuid(atribuicao)) return NextResponse.json({ error: "Conteúdo inválido." }, { status: 404 });
  const { data: process } = await supabase.from("adm_processos").select("id,status,link_ativo,link_expira_em").eq("public_token", token).eq("link_ativo", true).maybeSingle();
  if (!process || ["cancelado", "concluido"].includes(process.status) || (process.link_expira_em && new Date(process.link_expira_em).getTime() < Date.now())) return NextResponse.json({ error: "Este link não está disponível." }, { status: 404 });
  const { data: preAdmission } = await supabase.from("adm_dados_preadmissao").select("id").eq("processo_id", process.id).maybeSingle();
  if (!preAdmission) return NextResponse.json({ error: "Conclua primeiro o envio da pré-admissão." }, { status: 409 });
  const { data: assignment } = await supabase.from("adm_atribuicoes_conteudo").select("id,conteudo_id,versao_id,status").eq("id", atribuicao).eq("processo_id", process.id).maybeSingle();
  if (!assignment) return NextResponse.json({ error: "Conteúdo não atribuído." }, { status: 404 });
  const [{ data: content }, { data: version }] = await Promise.all([
    supabase.from("adm_conteudos_onboarding").select("id,titulo,tipo,nivel_acesso,exige_ciencia").eq("id", assignment.conteudo_id).maybeSingle(),
    supabase.from("adm_conteudo_versoes").select("id,versao,status,conteudo_texto,documento_path,link_url").eq("id", assignment.versao_id).maybeSingle(),
  ]);
  if (!content || !version || content.nivel_acesso !== "publico_link" || version.status !== "publicado") return NextResponse.json({ error: "Conteúdo restrito ao ambiente autenticado." }, { status: 403 });
  let url: string | null = null;
  if (content.tipo === "documento" && version.documento_path) {
    const { data } = await supabase.storage.from("onboarding-conteudos").createSignedUrl(version.documento_path, 300);
    url = data?.signedUrl ?? null;
  } else if (content.tipo === "link" && version.link_url?.startsWith("https://")) url = version.link_url;
  if (assignment.status === "pendente") await supabase.from("adm_atribuicoes_conteudo").update({ status: "em_andamento", iniciado_em: new Date().toISOString() }).eq("id", assignment.id);
  return NextResponse.json({ titulo: content.titulo, tipo: content.tipo, versao: version.versao, conteudo_texto: version.conteudo_texto, url }, { headers: { "Cache-Control": "private, no-store" } });
}
