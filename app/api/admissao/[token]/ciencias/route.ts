import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/recrutamento";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ token: string }> };
const CONFIRMATION = "Declaro que acessei o conteúdo e estou ciente da versão apresentada.";

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params; const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "Registro temporariamente indisponível." }, { status: 503 });
  if (!isUuid(token)) return NextResponse.json({ error: "Link inválido." }, { status: 404 });
  let body: { atribuicao_id?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Solicitação inválida." }, { status: 400 }); }
  if (!body.atribuicao_id || !isUuid(body.atribuicao_id)) return NextResponse.json({ error: "Conteúdo inválido." }, { status: 400 });
  const { data: process } = await supabase.from("adm_processos").select("id,status,link_ativo,link_expira_em").eq("public_token", token).eq("link_ativo", true).maybeSingle();
  if (!process || ["cancelado", "concluido"].includes(process.status) || (process.link_expira_em && new Date(process.link_expira_em).getTime() < Date.now())) return NextResponse.json({ error: "Este link não está disponível." }, { status: 404 });
  const { data: preAdmission } = await supabase.from("adm_dados_preadmissao").select("id").eq("processo_id", process.id).maybeSingle();
  if (!preAdmission) return NextResponse.json({ error: "Conclua primeiro o envio da pré-admissão." }, { status: 409 });
  const { data: assignment } = await supabase.from("adm_atribuicoes_conteudo").select("id,conteudo_id,versao_id,status").eq("id", body.atribuicao_id).eq("processo_id", process.id).maybeSingle();
  if (!assignment) return NextResponse.json({ error: "Conteúdo não atribuído." }, { status: 404 });
  if (assignment.status === "pendente") return NextResponse.json({ error: "Acesse o conteúdo antes de registrar a ciência." }, { status: 409 });
  const [{ data: content }, { data: version }] = await Promise.all([
    supabase.from("adm_conteudos_onboarding").select("nivel_acesso").eq("id", assignment.conteudo_id).maybeSingle(),
    supabase.from("adm_conteudo_versoes").select("status").eq("id", assignment.versao_id).maybeSingle(),
  ]);
  if (!content || !version || content.nivel_acesso !== "publico_link" || version.status !== "publicado") return NextResponse.json({ error: "Conteúdo restrito." }, { status: 403 });
  const { error: evidenceError } = await supabase.from("adm_ciencias_conteudo").upsert({
    atribuicao_id: assignment.id, processo_id: process.id, versao_id: assignment.versao_id,
    metodo: "link_individual", texto_confirmacao: CONFIRMATION,
    metadados: { tipo: "ciencia_simples", assinatura_eletronica: false },
  }, { onConflict: "atribuicao_id" });
  if (evidenceError) return NextResponse.json({ error: "Não foi possível registrar a ciência." }, { status: 500 });
  const { error: progressError } = await supabase.from("adm_atribuicoes_conteudo").update({ status: "concluida", progresso_percentual: 100, concluido_em: new Date().toISOString() }).eq("id", assignment.id);
  if (progressError) return NextResponse.json({ error: "A ciência foi registrada, mas o RH precisa revisar o progresso." }, { status: 500 });
  return NextResponse.json({ message: "Ciência registrada.", texto_confirmacao: CONFIRMATION });
}
