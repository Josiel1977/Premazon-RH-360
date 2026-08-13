import assert from "node:assert/strict";
import test from "node:test";
import { groupCount, parseRecruitmentHistory } from "./recrutamento-analytics";

test("interpreta a base histórica de recrutamento sem fabricar custos", () => {
  const csv = [
    "Cargo a ser Preenchido;Departamento;Solicitante da Vaga;Abertura da Vaga;Tipos de Contratação;Substituição;Colaborador;Data Admissão;Data Demissão;Tipo de Desligamento;Motivo Desligamento;Data de Fechamento da Vaga;SLA;Custo Colaborador;Tam. Calça;Tam. Camisa;Bota",
    "Função de Teste;Setor Teste;Gestor Teste A;20/06/2099;Aumento de Quadro;;Pessoa Fictícia A;04/08/2099;22/10/2099;Pedido Demissão;Motivo de Teste;21/07/2099;31;150;;;",
  ].join("\n");
  const result = parseRecruitmentHistory(csv);
  assert.equal(result.registros.length, 1);
  assert.equal(result.registros[0].data_abertura, "2099-06-20");
  assert.equal(result.registros[0].custo_colaborador, 150);
  assert.equal(result.registros[0].custo_epi, null);
  assert.equal(result.registros[0].custo_uniforme, null);
});

test("sinaliza SLA negativo como pendência", () => {
  const csv = "Cargo;Departamento;Gestor;SLA\nFunção Teste;Setor Teste;Gestor Teste B;-11";
  const result = parseRecruitmentHistory(csv);
  assert.equal(result.registros[0].sla_dias, null);
  assert.match(result.avisos[0], /SLA negativo/);
});

test("agrupa contagens para os painéis", () => {
  assert.deepEqual(groupCount([{ setor: "Poste" }, { setor: "Estrutura" }, { setor: "Poste" }], (item) => item.setor), [
    { name: "Poste", value: 2 }, { name: "Estrutura", value: 1 },
  ]);
});
