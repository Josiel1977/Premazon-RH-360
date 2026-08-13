import assert from "node:assert/strict";
import test from "node:test";
import { onboardingProgress, onboardingSlug, validateOnboardingVersion } from "./onboarding";

test("gera slug estável em português", () => {
  assert.equal(onboardingSlug("Política da Qualidade & Segurança"), "politica-da-qualidade-seguranca");
});

test("exige conteúdo coerente com o tipo", () => {
  assert.match(validateOnboardingVersion({ type: "link", link: "http://inseguro" }) ?? "", /https/);
  assert.equal(validateOnboardingVersion({ type: "texto", text: "Conteúdo vigente" }), null);
});

test("calcula progresso com concluídos e dispensados", () => {
  assert.equal(onboardingProgress(["concluida", "dispensada", "pendente", "em_andamento"]), 50);
});
