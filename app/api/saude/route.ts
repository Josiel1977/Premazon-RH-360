import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });

  const { data: profile } = await supabase
    .from("perfis_usuario")
    .select("perfil,ativo")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();
  if (!profile?.ativo || !["administrador", "rh"].includes(profile.perfil)) {
    return NextResponse.json({ error: "Acesso restrito ao administrador e RH." }, { status: 403 });
  }

  const checks = [
    {
      chave: "env_publica",
      titulo: "Conexão pública do Supabase",
      categoria: "Ambiente",
      status: process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? "ok" : "erro",
      detalhe: "URL e chave publicável usadas pelo navegador.",
      acao: "Cadastre NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY na Vercel.",
      criticidade: "critica",
      ordem: 2,
    },
    {
      chave: "env_servidor",
      titulo: "Chave secreta do servidor",
      categoria: "Ambiente",
      status: process.env.SUPABASE_SECRET_KEY ? "ok" : "erro",
      detalhe: "Necessária para receber candidaturas e guardar currículos. O valor nunca é exibido.",
      acao: "Cadastre SUPABASE_SECRET_KEY somente no ambiente do servidor.",
      criticidade: "critica",
      ordem: 3,
    },
    {
      chave: "runtime",
      titulo: "Runtime de produção",
      categoria: "Aplicação",
      status: process.version.startsWith("v22.") ? "ok" : "aviso",
      detalhe: `PremazonRH360 0.9.0 · Node ${process.version}${process.env.VERCEL ? " · Vercel" : " · ambiente local"}`,
      acao: "Mantenha o projeto configurado para Node.js 22.",
      criticidade: "media",
      ordem: 4,
    },
  ];

  return NextResponse.json({ checks, checkedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
