import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMISSION_DOCUMENTS, validatePreAdmission } from "@/lib/admissao";
import { isUuid } from "@/lib/recrutamento";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ token: string }> };

function unavailable() {
  return NextResponse.json({ error: "A pré-admissão está temporariamente indisponível. Avise o RH." }, { status: 503 });
}

async function findProcess(token: string) {
  if (!isUuid(token)) return null;
  const supabase = createAdminClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("adm_processos")
    .select("id,nome_candidato,cargo,departamento,data_admissao_prevista,etapa,status,link_ativo,link_expira_em")
    .eq("public_token", token).eq("link_ativo", true).maybeSingle();
  if (error || !data || ["cancelado", "concluido"].includes(data.status)) return null;
  if (data.link_expira_em && new Date(data.link_expira_em).getTime() < Date.now()) return null;
  return data;
}

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  if (!createAdminClient()) return unavailable();
  const process = await findProcess(token);
  if (!process) return NextResponse.json({ error: "Este link não está disponível ou expirou." }, { status: 404 });
  const supabase = createAdminClient()!;
  const [{ data: documents }, { data: preAdmission }] = await Promise.all([
    supabase.from("adm_documentos").select("tipo_documento,status").eq("processo_id", process.id),
    supabase.from("adm_dados_preadmissao").select("id").eq("processo_id", process.id).maybeSingle(),
  ]);
  return NextResponse.json({ processo: {
    nome_candidato: process.nome_candidato, cargo: process.cargo, departamento: process.departamento,
    data_admissao_prevista: process.data_admissao_prevista, etapa: process.etapa,
    enviado: Boolean(preAdmission), documentos: documents ?? [],
  } });
}

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params; const supabase = createAdminClient();
  if (!supabase) return unavailable();
  const process = await findProcess(token);
  if (!process) return NextResponse.json({ error: "Este link não está disponível ou expirou." }, { status: 404 });
  let form: FormData;
  try { form = await request.formData(); } catch { return NextResponse.json({ error: "Não foi possível ler o formulário enviado." }, { status: 400 }); }
  const validation = validatePreAdmission(form);
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });
  const { data: currentDocuments, error: documentError } = await supabase.from("adm_documentos").select("tipo_documento").eq("processo_id", process.id);
  if (documentError) return NextResponse.json({ error: "Não foi possível conferir os documentos enviados." }, { status: 500 });
  const existing = new Set(currentDocuments?.map((item) => item.tipo_documento) ?? []);
  for (const document of ADMISSION_DOCUMENTS) {
    if (document.required && !existing.has(document.key)) return NextResponse.json({ error: `Anexe: ${document.label}.` }, { status: 400 });
  }

  const cpfHash = createHash("sha256").update(validation.data.cpf).digest("hex");
  const { error: dataError } = await supabase.from("adm_dados_preadmissao").upsert({
    processo_id: process.id, nome_social: validation.data.nome_social,
    data_nascimento: validation.data.data_nascimento, cpf_hash: cpfHash, cpf_final: validation.data.cpf.slice(-4),
    email: validation.data.email, telefone: validation.data.telefone, endereco: validation.data.endereco,
    contato_emergencia_nome: validation.data.contato_emergencia_nome,
    contato_emergencia_telefone: validation.data.contato_emergencia_telefone,
    tamanho_camisa: validation.data.tamanho_camisa, tamanho_calca: validation.data.tamanho_calca,
    tamanho_calcado: validation.data.tamanho_calcado, consentimento_lgpd: true,
    consentimento_em: new Date().toISOString(), enviado_em: new Date().toISOString(),
  }, { onConflict: "processo_id" });
  if (dataError) return NextResponse.json({ error: "Não foi possível guardar os dados. Tente novamente." }, { status: 500 });
  const { error: processError } = await supabase.from("adm_processos").update({
    nome_candidato: validation.data.nome, email_candidato: validation.data.email,
    telefone_candidato: validation.data.telefone, etapa: "documentos", status: "em_andamento",
  }).eq("id", process.id);
  if (processError) return NextResponse.json({ error: "Os dados foram recebidos, mas o RH precisa revisar o processo." }, { status: 500 });
  return NextResponse.json({ message: "Pré-admissão enviada com sucesso." }, { status: 201 });
}
