import assert from "node:assert/strict";
import test from "node:test";
import { estimatedPotential, nineBoxPosition, performanceBand } from "./td-analytics";

test("classifica faixas de desempenho", () => {
  assert.equal(performanceBand(9.1), "Excelente");
  assert.equal(performanceBand(5), "Atenção");
});

test("classifica a matriz 9-box por desempenho e potencial", () => {
  assert.equal(nineBoxPosition(8.5, 8.2), "Estrela");
  assert.equal(nineBoxPosition(5, 5), "Risco");
  assert.equal(nineBoxPosition(7, 7), "Mantenedor");
});

test("estima potencial somente com competências disponíveis", () => {
  assert.equal(estimatedPotential({ lideranca: { nota: 8 }, resiliencia: { nota: 6 } }), 7);
  assert.equal(estimatedPotential({ comunicacao: { nota: 9 } }), null);
});
