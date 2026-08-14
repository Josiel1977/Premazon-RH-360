import assert from "node:assert/strict";
import test from "node:test";
import {
  canApproveMovement,
  movementDocumentCode,
  movementProgress,
  nextMovementStage,
} from "./movimentacoes-pessoal";

test("vincula cada tipo ao RQ oficial sem trocar sua identidade", () => {
  assert.equal(movementDocumentCode("desligamento"), "RQ.04.09");
  assert.equal(movementDocumentCode("aumento_quadro"), "RQ.04.10");
  assert.equal(movementDocumentCode("substituicao"), "RQ.04.10");
});

test("mantém a sequência Gestor, RH, DP, Diretoria e Conclusão", () => {
  assert.equal(nextMovementStage("gestor"), "rh");
  assert.equal(nextMovementStage("rh"), "dp");
  assert.equal(nextMovementStage("dp"), "diretoria");
  assert.equal(nextMovementStage("diretoria"), "conclusao");
  assert.equal(nextMovementStage("conclusao"), null);
});

test("segrega a aprovação por etapa e permite supervisão administrativa", () => {
  assert.equal(canApproveMovement("rh", "rh"), true);
  assert.equal(canApproveMovement("rh", "dp"), false);
  assert.equal(canApproveMovement("dp", "diretoria"), false);
  assert.equal(canApproveMovement("administrador", "diretoria"), true);
  assert.equal(canApproveMovement("gestor", "rh"), false);
});

test("calcula o avanço sem tratar rejeição como conclusão", () => {
  assert.equal(movementProgress("rh", "em_fluxo"), 40);
  assert.equal(movementProgress("conclusao", "concluida"), 100);
  assert.equal(movementProgress("diretoria", "rejeitada"), 0);
});
