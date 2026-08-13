import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/recrutamento";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  if (!isUuid(token)) return NextResponse.json({ error: "Link de relatório inválido." }, { status: 404 });

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "Relatórios temporariamente indisponíveis." }, { status: 503 });

  const { data, error } = await supabase
    .from("rh360_compartilhamentos")
    .select("id,titulo,snapshot,expira_em,ativo")
    .eq("token", token)
    .eq("ativo", true)
    .gt("expira_em", new Date().toISOString())
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Este relatório não está disponível ou o link expirou." }, { status: 404 });
  }

  await supabase.rpc("rh360_registrar_acesso_compartilhamento", { p_id: data.id });
  return NextResponse.json(
    { titulo: data.titulo, snapshot: data.snapshot, expira_em: data.expira_em },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
