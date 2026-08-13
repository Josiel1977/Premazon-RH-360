import test from "node:test";
import assert from "node:assert/strict";
import { parseColaboradoresRows } from "./colaboradores-importacao";

test("reconhece colaboradores após linhas vazias e preserva estrutura organizacional", () => {
  const result = parseColaboradoresRows([
    [null, null],
    ["Colaborador", "Setor", "Equipe", "Função"],
    ["Maria da Silva", "Estrutura", "Painel", "Soldadora I"],
    ["João Souza", "Poste", null, "Operador III"],
  ]);

  assert.equal(result.registros.length, 2);
  assert.deepEqual(result.registros[0], {
    linha_original: 3,
    nome: "Maria da Silva",
    setor: "Estrutura",
    equipe: "Painel",
    funcao: "Soldadora I",
    status: "ativo",
  });
});

test("rejeita rodapés e duplicidades sem transformar resumos em pessoas", () => {
  const result = parseColaboradoresRows([
    ["Nome", "Área", "Cargo"],
    ["Ana Costa", "RH", "Analista"],
    ["  ANA   COSTA ", "RH", "Analista"],
    ["Total de empregados:", null, 339],
    ["Colaboradores contemplados", null, null],
    ["Nome de rodapé", 100, null],
  ]);

  assert.equal(result.registros.length, 1);
  assert.equal(result.duplicadosNoArquivo, 1);
  assert.equal(result.linhasRejeitadas, 3);
});

test("exige nome e uma coluna organizacional", () => {
  assert.throws(() => parseColaboradoresRows([["Nome", "E-mail"], ["Ana", "ana@example.com"]]), /Setor\/Área ou Função\/Cargo/);
});
