import assert from "node:assert/strict";
import test from "node:test";
import {
  parseLntRows,
  parsePerformanceRows,
  scoreTdRating,
  summarizeLnt,
  summarizePerformance,
} from "./treinamento-desenvolvimento";

test("converte corretamente a escala textual de desempenho", () => {
  assert.equal(scoreTdRating("Sempre"), 10);
  assert.equal(scoreTdRating("Frequentemente"), 8);
  assert.equal(scoreTdRating("Ás vezes"), 6);
  assert.equal(scoreTdRating("Raramente"), 4);
  assert.equal(scoreTdRating("Nunca"), 2);
  assert.equal(scoreTdRating("sem resposta"), null);
});

test("interpreta uma planilha LNT e preserva listas auditáveis", () => {
  const rows = [
    ["Carimbo de data/hora", "Nome do Gestor Responsável:", "Setor", "Colaborador:", "Cargo", "Quais competências TÉCNICAS o colaborador precisa desenvolver?", "Quais temas comportamentais devem ser desenvolvidos?", "Caso tenha marcado Outro, descreva:", "Existe algum treinamento específico que você recomenda?"],
    [46030, "Gestor A", "Manutenção", "Colaborador A", "Eletricista", "NR-10; Automação", "Comunicação Assertiva", "", "CLP básico"],
  ];
  const result = parseLntRows(rows);
  assert.equal(result.registros.length, 1);
  assert.deepEqual(result.registros[0].necessidades_tecnicas, ["NR-10", "Automação"]);
  assert.equal(summarizeLnt(result.registros).necessidadesTecnicas, 2);
});

test("avalia as 15 competências sem criar nota para campos vazios", () => {
  const questions = [
    "expressa suas ideias", "segurança em suas decisões", "influenciar positivamente", "inspira, orienta e motiva",
    "cumpre prazos, assume responsabilidades", "autoria de suas ações", "horários e prazos", "planeja e executa",
    "agilidade e precisão", "políticas, regras e procedimentos", "equilíbrio emocional", "vontade constante de evoluir",
    "persiste diante dos obstáculos", "integridade, honestidade e respeito", "colabora com os colegas",
  ];
  const headers: string[] = ["Colaborador", "Setor", "Cargo:", "Gestor Imediato:", "Data:"];
  const values: (string | number)[] = ["Colaborador A", "Manutenção", "Eletricista", "Gestor A", 46000];
  questions.forEach((question, index) => {
    headers.push(`O colaborador ${question}?`, `Comentários / Evidências: ${index}`);
    values.push(index === 14 ? "" : "Frequentemente", `Evidência ${index}`);
  });
  headers.push("Pontos Fortes:", "Pontos a Desenvolver:", "Pontuação");
  values.push("Ética", "Comunicação", "");

  const result = parsePerformanceRows([headers, values]);
  assert.equal(result.registros.length, 1);
  assert.equal(result.registros[0].competencias_avaliadas, 14);
  assert.equal(result.registros[0].media_geral, 8);
  assert.equal(summarizePerformance(result.registros).competenciasAvaliadas, 14);
});

test("rejeita avaliação sem nenhuma nota em vez de atribuir média artificial", () => {
  const questions = [
    "expressa suas ideias", "segurança em suas decisões", "influenciar positivamente", "inspira, orienta e motiva",
    "cumpre prazos, assume responsabilidades", "autoria de suas ações", "horários e prazos", "planeja e executa",
    "agilidade e precisão", "políticas, regras e procedimentos", "equilíbrio emocional", "vontade constante de evoluir",
    "persiste diante dos obstáculos", "integridade, honestidade e respeito", "colabora com os colegas",
  ];
  const headers: string[] = ["Colaborador", "Setor", "Cargo:", "Gestor Imediato:", "Data:"];
  const values: string[] = ["Colaborador A", "Setor", "Cargo", "Gestor", ""];
  questions.forEach((question) => {
    headers.push(question, "Comentários / Evidências:");
    values.push("", "");
  });
  headers.push("Pontos Fortes:", "Pontos a Desenvolver:");
  values.push("", "");
  const result = parsePerformanceRows([headers, values]);
  assert.equal(result.registros.length, 0);
  assert.equal(result.linhasRejeitadas, 1);
});
