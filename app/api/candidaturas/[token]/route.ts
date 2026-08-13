import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  assinaturaCurriculoValida,
  isUuid,
  nomeSeguroArquivo,
  validarCandidatura,
  validarCurriculo,
} from "@/lib/recrutamento";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ token: string }> };

function unavailable() {
  return NextResponse.json(
    { error: "O formulário está temporariamente indisponível. Avise o RH." },
    { status: 503 },
  );
}

async function findPublicVacancy(token: string) {
  if (!isUuid(token)) return null;
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("rs_vagas")
    .select("id,codigo,cargo,departamento,localidade,modalidade,descricao,requisitos,status,link_ativo,link_expira_em")
    .eq("public_token", token)
    .eq("status", "aberta")
    .eq("link_ativo", true)
    .maybeSingle();

  if (error || !data) return null;
  if (data.link_expira_em && new Date(data.link_expira_em).getTime() < Date.now()) return null;
  return data;
}

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  if (!createAdminClient()) return unavailable();

  const vacancy = await findPublicVacancy(token);
  if (!vacancy) {
    return NextResponse.json({ error: "Esta vaga não está disponível ou o link expirou." }, { status: 404 });
  }

  return NextResponse.json({
    vaga: {
      codigo: vacancy.codigo,
      cargo: vacancy.cargo,
      departamento: vacancy.departamento,
      localidade: vacancy.localidade,
      modalidade: vacancy.modalidade,
      descricao: vacancy.descricao,
      requisitos: vacancy.requisitos,
    },
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const supabase = createAdminClient();
  if (!supabase) return unavailable();

  const vacancy = await findPublicVacancy(token);
  if (!vacancy) {
    return NextResponse.json({ error: "Esta vaga não está disponível ou o link expirou." }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Não foi possível ler o formulário enviado." }, { status: 400 });
  }

  const validation = validarCandidatura(formData);
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

  const fileValue = formData.get("curriculo");
  if (!(fileValue instanceof File)) {
    return NextResponse.json({ error: "Anexe seu currículo." }, { status: 400 });
  }
  const fileError = validarCurriculo(fileValue);
  if (fileError) return NextResponse.json({ error: fileError }, { status: 400 });
  if (!(await assinaturaCurriculoValida(fileValue))) {
    return NextResponse.json({ error: "O conteúdo do currículo não corresponde a um PDF, DOC ou DOCX válido." }, { status: 400 });
  }

  const candidateId = crypto.randomUUID();
  const safeFileName = nomeSeguroArquivo(fileValue.name);
  const storagePath = `${vacancy.id}/${candidateId}/${safeFileName}`;
  const bytes = new Uint8Array(await fileValue.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("curriculos-candidatos")
    .upload(storagePath, bytes, {
      contentType: fileValue.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: "Não foi possível guardar o currículo. Tente novamente." }, { status: 500 });
  }

  const { data: candidatura, error: insertError } = await supabase
    .from("rs_candidaturas")
    .insert({
      id: candidateId,
      vaga_id: vacancy.id,
      nome: validation.data.nome,
      email: validation.data.email,
      telefone: validation.data.telefone,
      cidade: validation.data.cidade,
      estado: validation.data.estado,
      linkedin: validation.data.linkedin,
      escolaridade: validation.data.escolaridade,
      pretensao_salarial: validation.data.pretensao_salarial,
      experiencia: validation.data.experiencia,
      consentimento_lgpd: validation.data.consentimento_lgpd,
      curriculo_path: storagePath,
      curriculo_nome: safeFileName,
      curriculo_tipo: fileValue.type || "application/octet-stream",
      curriculo_tamanho: fileValue.size,
      fonte: "link_publico",
      etapa: "triagem",
      status: "ativa",
    })
    .select("protocolo")
    .single();

  if (insertError) {
    await supabase.storage.from("curriculos-candidatos").remove([storagePath]);
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "Já existe uma candidatura deste e-mail para esta vaga. Em caso de dúvida, fale com o RH." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Não foi possível concluir a candidatura. Tente novamente." }, { status: 500 });
  }

  const { error: identificationError } = await supabase
    .from("rs_candidatos_identificacao")
    .insert({
      candidatura_id: candidateId,
      vaga_id: vacancy.id,
      cpf_hash: createHash("sha256").update(validation.data.cpf).digest("hex"),
      cpf_final: validation.data.cpf.slice(-4),
      nome_mae: validation.data.nome_mae,
      data_nascimento: validation.data.data_nascimento,
    });

  if (identificationError) {
    await supabase.from("rs_candidaturas").delete().eq("id", candidateId);
    await supabase.storage.from("curriculos-candidatos").remove([storagePath]);
    if (identificationError.code === "23505") {
      return NextResponse.json(
        { error: "Já existe uma candidatura deste CPF para esta vaga. Em caso de dúvida, fale com o RH." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Não foi possível proteger os dados de identificação. Tente novamente." }, { status: 500 });
  }

  return NextResponse.json(
    {
      protocolo: candidatura.protocolo,
      message: "Candidatura enviada com sucesso.",
    },
    { status: 201 },
  );
}
