import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DISC_ALGORITHM_VERSION,
  DISC_INSTRUMENT_VERSION,
  DISC_PRIVACY_NOTICE_VERSION,
  publicDiscQuestions,
  resultGuidance,
  scoreDiscAnswers,
} from "@/lib/perfil-comportamental";
import { isUuid } from "@/lib/recrutamento";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ token: string }> };

function unavailable() {
  return NextResponse.json({ error: "O questionário está temporariamente indisponível. Avise o RH." }, { status: 503 });
}

async function findInvitation(token: string) {
  if (!isUuid(token)) return null;
  const supabase = createAdminClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("td_perfil_convites")
    .select("id,colaborador_id,instrumento_versao,finalidade,status,expira_em,criado_em")
    .eq("public_token", token).maybeSingle();
  if (error || !data) return null;
  return data;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "Colaborador(a)";
}

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const supabase = createAdminClient();
  if (!supabase) return unavailable();
  const invitation = await findInvitation(token);
  if (!invitation || invitation.status === "revogado") {
    return NextResponse.json({ error: "Este link não está disponível." }, { status: 404 });
  }
  if (invitation.status === "concluido") {
    return NextResponse.json({ status: "concluido", message: "Este questionário já foi respondido." });
  }
  if (new Date(invitation.expira_em).getTime() < Date.now()) {
    return NextResponse.json({ error: "Este link expirou. Solicite um novo convite ao RH." }, { status: 410 });
  }
  if (invitation.instrumento_versao !== DISC_INSTRUMENT_VERSION) {
    return NextResponse.json({ error: "A versão deste questionário não está mais disponível. Solicite um novo link ao RH." }, { status: 409 });
  }
  const { data: collaborator } = await supabase.from("colaboradores_v2").select("nome").eq("id", invitation.colaborador_id).maybeSingle();
  return NextResponse.json({
    status: "pendente",
    colaborador: firstName(collaborator?.nome ?? "Colaborador(a)"),
    finalidade: invitation.finalidade,
    expira_em: invitation.expira_em,
    instrumento: {
      versao: DISC_INSTRUMENT_VERSION,
      titulo: "Questionário de Autopercepção Comportamental",
      referencia: "Modelo D/I/S/C fornecido pelo RH",
      perguntas: publicDiscQuestions(token),
    },
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, context: RouteContext) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 100_000) return NextResponse.json({ error: "O formulário enviado excede o limite permitido." }, { status: 413 });
  const { token } = await context.params;
  const supabase = createAdminClient();
  if (!supabase) return unavailable();
  const invitation = await findInvitation(token);
  if (!invitation || invitation.status === "revogado") return NextResponse.json({ error: "Este link não está disponível." }, { status: 404 });
  if (invitation.status === "concluido") return NextResponse.json({ error: "Este questionário já foi respondido." }, { status: 409 });
  if (new Date(invitation.expira_em).getTime() < Date.now()) return NextResponse.json({ error: "Este link expirou. Solicite um novo convite ao RH." }, { status: 410 });
  if (invitation.instrumento_versao !== DISC_INSTRUMENT_VERSION) return NextResponse.json({ error: "A versão deste questionário não está mais disponível." }, { status: 409 });

  let body: { answers?: unknown; awareness?: unknown; started_at?: unknown; website?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Não foi possível ler as respostas." }, { status: 400 }); }
  if (typeof body.website === "string" && body.website.trim()) return NextResponse.json({ error: "Não foi possível concluir o questionário." }, { status: 400 });
  if (body.awareness !== true) return NextResponse.json({ error: "Confirme a ciência sobre a finalidade e o uso do resultado." }, { status: 400 });
  const validation = scoreDiscAnswers(body.answers);
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

  const now = new Date();
  const startedAt = typeof body.started_at === "string" ? new Date(body.started_at) : null;
  const validStartedAt = startedAt && Number.isFinite(startedAt.getTime()) && startedAt <= now ? startedAt : null;
  const durationSeconds = validStartedAt ? Math.min(86_400, Math.max(0, Math.round((now.getTime() - validStartedAt.getTime()) / 1000))) : null;
  const { score } = validation;
  const { data: result, error: resultError } = await supabase.from("td_perfil_resultados").insert({
    convite_id: invitation.id,
    colaborador_id: invitation.colaborador_id,
    instrumento_versao: DISC_INSTRUMENT_VERSION,
    algoritmo_versao: DISC_ALGORITHM_VERSION,
    respostas: validation.answers,
    pontuacoes: score.counts,
    percentuais: score.percentages,
    dimensoes_predominantes: score.dominantDimensions,
    dimensao_secundaria: score.secondaryDimension,
    perfil_combinado: score.combined,
    ciencia_privacidade: true,
    aviso_privacidade_versao: DISC_PRIVACY_NOTICE_VERSION,
    iniciado_em: validStartedAt?.toISOString() ?? null,
    concluido_em: now.toISOString(),
    duracao_segundos: durationSeconds,
  }).select("id").single();

  if (resultError) {
    if (resultError.code === "23505") return NextResponse.json({ error: "Este questionário já foi respondido." }, { status: 409 });
    return NextResponse.json({ error: "Não foi possível guardar o resultado. Tente novamente." }, { status: 500 });
  }

  const { error: invitationError } = await supabase.from("td_perfil_convites").update({ status: "concluido", concluido_em: now.toISOString() }).eq("id", invitation.id).eq("status", "pendente");
  if (invitationError) {
    await supabase.from("td_perfil_resultados").delete().eq("id", result.id);
    return NextResponse.json({ error: "O resultado não pôde ser confirmado. Tente novamente." }, { status: 500 });
  }

  return NextResponse.json({
    message: "Questionário concluído com sucesso.",
    resultado: {
      label: score.label,
      percentuais: score.percentages,
      dimensoes_predominantes: score.dominantDimensions,
      dimensao_secundaria: score.secondaryDimension,
      combinado: score.combined,
      orientacoes: resultGuidance(score),
    },
  }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
