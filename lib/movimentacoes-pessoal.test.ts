import assert from "node:assert/strict";
import test from "node:test";
import {
  canApproveMovement,
  movementDocumentCode,
  movementProgress,
  nextMovementStage,
} from "./movimentacoes-pessoal";

test("vincula somente o desligamento ao RQ usado na solicitação do gestor", () => {
  assert.equal(movementDocumentCode("desligamento"), "RQ.04.09");
  assert.equal(movementDocumentCode("aumento_quadro"), null);
  assert.equal(movementDocumentCode("substituicao"), null);
});

test("encaminha desligamento à diretoria somente com aviso indenizado", () => {
  assert.equal(nextMovementStage("desligamento", "gestor"), "rh");
  assert.equal(nextMovementStage("desligamento", "rh"), "dp");
  assert.equal(nextMovementStage("desligamento", "dp", "indenizado"), "diretoria");
  assert.equal(nextMovementStage("desligamento", "dp", "trabalhado"), "conclusao");
  assert.equal(nextMovementStage("desligamento", "diretoria"), "conclusao");
});

test("integra a solicitação de contratação ao recrutamento e à admissão", () => {
  assert.equal(nextMovementStage("aumento_quadro", "rh"), "recrutamento");
  assert.equal(nextMovementStage("substituicao", "recrutamento"), "admissao");
  assert.equal(nextMovementStage("substituicao", "admissao"), "conclusao");
  assert.equal(nextMovementStage("aumento_quadro", "conclusao"), null);
});

test("segrega a aprovação por etapa e permite supervisão administrativa", () => {
  assert.equal(canApproveMovement("rh", "rh"), true);
  assert.equal(canApproveMovement("rh", "dp"), false);
  assert.equal(canApproveMovement("dp", "diretoria"), false);
  assert.equal(canApproveMovement("administrador", "diretoria"), true);
  assert.equal(canApproveMovement("gestor", "rh"), false);
  assert.equal(canApproveMovement("rh", "recrutamento"), false);
});

test("calcula o avanço sem tratar rejeição como conclusão", () => {
  assert.equal(movementProgress("rh", "em_fluxo"), 30);
  assert.equal(movementProgress("recrutamento", "em_fluxo"), 60);
  assert.equal(movementProgress("admissao", "em_fluxo"), 85);
  assert.equal(movementProgress("conclusao", "concluida"), 100);
  assert.equal(movementProgress("diretoria", "rejeitada"), 0);
});
