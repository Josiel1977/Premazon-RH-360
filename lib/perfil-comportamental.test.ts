import assert from "node:assert/strict";
import test from "node:test";
import { DISC_QUESTIONS, publicDiscQuestions, scoreDiscAnswers } from "./perfil-comportamental";

function answersFor(dimension: "D" | "I" | "S" | "C") {
  return Object.fromEntries(DISC_QUESTIONS.map((question) => [question.id, question.options.find((option) => option.dimension === dimension)!.id]));
}

test("calcula o perfil com as 24 respostas válidas", () => {
  const result = scoreDiscAnswers(answersFor("D"));
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.score.counts, { D: 24, I: 0, S: 0, C: 0 });
    assert.deepEqual(result.score.percentages, { D: 100, I: 0, S: 0, C: 0 });
    assert.deepEqual(result.score.dominantDimensions, ["D"]);
  }
});

test("não aceita formulário incompleto nem opção adulterada", () => {
  assert.equal(scoreDiscAnswers({ q01: "q01-1" }).ok, false);
  const tampered = answersFor("S");
  tampered.q05 = "opcao-inexistente";
  assert.equal(scoreDiscAnswers(tampered).ok, false);
});

test("expõe perguntas públicas sem revelar a dimensão pontuada", () => {
  const publicQuestions = publicDiscQuestions("convite-123");
  assert.equal(publicQuestions.length, 24);
  assert.equal("dimension" in publicQuestions[0].options[0], false);
});

test("representa empate sem escolher um perfil arbitrariamente", () => {
  const answers = Object.fromEntries(DISC_QUESTIONS.map((question, index) => {
    const dimension = (["D", "I", "S", "C"] as const)[index % 4];
    return [question.id, question.options.find((option) => option.dimension === dimension)!.id];
  }));
  const result = scoreDiscAnswers(answers);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.score.percentages, { D: 25, I: 25, S: 25, C: 25 });
    assert.deepEqual(result.score.dominantDimensions, ["D", "I", "S", "C"]);
    assert.equal(result.score.label, "Perfil equilibrado D/I/S/C");
  }
});
