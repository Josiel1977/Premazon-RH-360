import assert from "node:assert/strict";
import test from "node:test";
import { groupByLabel, isPendingOverdue, normalizePersonName, pendingUrgency } from "./rh360";

test("normaliza nomes sem decidir vínculo automaticamente", () => {
  assert.equal(normalizePersonName("  Pessoa Fictícia da Silva  "), "pessoa ficticia da silva");
});

test("identifica prazo vencido somente em tarefas abertas", () => {
  const today = new Date("2099-08-15T12:00:00Z");
  assert.equal(isPendingOverdue("2099-08-14", "aberta", today), true);
  assert.equal(isPendingOverdue("2099-08-14", "concluida", today), false);
});

test("prazo vencido recebe maior urgência", () => {
  const today = new Date("2099-08-15T12:00:00Z");
  assert.equal(pendingUrgency("baixa", "2099-08-14", "aberta", today), 5);
  assert.equal(pendingUrgency("critica", null, "aberta", today), 4);
});

test("agrupa indicadores sem criar categorias inexistentes", () => {
  assert.deepEqual(groupByLabel([{ status: "Ativo" }, { status: "Ativo" }, { status: "Férias" }], (item) => item.status), [
    { name: "Ativo", value: 2 }, { name: "Férias", value: 1 },
  ]);
});
