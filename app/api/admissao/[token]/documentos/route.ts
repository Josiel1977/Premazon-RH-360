import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMISSION_DOCUMENTS, admissionFileSignatureValid, safeAdmissionFileName, validateAdmissionFile } from "@/lib/admissao";
import { isUuid } from "@/lib/recrutamento";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ token: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params; const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "Envio temporariamente indisponível. Avise o RH." }, { status: 503 });
  if (!isUuid(token)) return NextResponse.json({ error: "Link inválido." }, { status: 404 });
  const { data: process } = await supabase.from("adm_processos").select("id,status,link_ativo,link_expira_em").eq("public_token", token).eq("link_ativo", true).maybeSingle();
  if (!process || ["cancelado", "concluido"].includes(process.status) || (process.link_expira_em && new Date(process.link_expira_em).getTime() < Date.now())) return NextResponse.json({ error: "Este link não está disponível ou expirou." }, { status: 404 });
  let form: FormData;
  try { form = await request.formData(); } catch { return NextResponse.json({ error: "Não foi possível ler o documento." }, { status: 400 }); }
  const type = String(form.get("tipo_documento") ?? ""); const definition = ADMISSION_DOCUMENTS.find((item) => item.key === type); const file = form.get("arquivo");
  if (!definition || !(file instanceof File)) return NextResponse.json({ error: "Documento inválido." }, { status: 400 });
  const fileError = validateAdmissionFile(file);
  if (fileError) return NextResponse.json({ error: `${definition.label}: ${fileError}` }, { status: 400 });
  if (!(await admissionFileSignatureValid(file))) return NextResponse.json({ error: `${definition.label}: o conteúdo não corresponde ao formato informado.` }, { status: 400 });

  const { data: old } = await supabase.from("adm_documentos").select("arquivo_path").eq("processo_id", process.id).eq("tipo_documento", type).maybeSingle();
  const safeName = safeAdmissionFileName(file.name); const path = `${process.id}/${type}/${randomUUID()}-${safeName}`;
  const { error: uploadError } = await supabase.storage.from("admissao-documentos").upload(path, new Uint8Array(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (uploadError) return NextResponse.json({ error: "Não foi possível guardar o documento. Tente novamente." }, { status: 500 });
  const { error: metadataError } = await supabase.from("adm_documentos").upsert({
    processo_id: process.id, tipo_documento: type, arquivo_path: path, arquivo_nome: safeName,
    arquivo_tipo: file.type, arquivo_tamanho: file.size, status: "recebido",
    observacao_revisao: null, revisado_por: null, revisado_em: null,
  }, { onConflict: "processo_id,tipo_documento" });
  if (metadataError) { await supabase.storage.from("admissao-documentos").remove([path]); return NextResponse.json({ error: "Não foi possível registrar o documento." }, { status: 500 }); }
  if (old?.arquivo_path && old.arquivo_path !== path) await supabase.storage.from("admissao-documentos").remove([old.arquivo_path]);
  return NextResponse.json({ tipo_documento: type, status: "recebido" }, { status: 201 });
}
