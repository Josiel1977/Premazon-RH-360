import assert from "node:assert/strict";
import test from "node:test";
import {
  formatVideoDuration,
  getSupabaseProjectId,
  sanitizeVideoFileName,
  slugifyCourseName,
} from "./universidade-corporativa";

test("gera slug estável para o nome do curso", () => {
  assert.equal(slugifyCourseName("Liderança & Gestão de Pessoas"), "lideranca-gestao-de-pessoas");
});

test("normaliza o nome do vídeo e preserva uma extensão segura", () => {
  assert.equal(sanitizeVideoFileName("Aula 01 – Introdução.MP4"), "aula-01-introducao.mp4");
});

test("extrai o identificador do projeto Supabase", () => {
  assert.equal(getSupabaseProjectId("https://abcxyz.supabase.co"), "abcxyz");
  assert.throws(() => getSupabaseProjectId("https://storage.exemplo.com"), /domínio padrão/);
});

test("formata duração de uma aula", () => {
  assert.equal(formatVideoDuration(1234), "20min 34s");
  assert.equal(formatVideoDuration(3720), "1h 02min");
});
