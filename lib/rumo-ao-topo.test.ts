import assert from "node:assert/strict";
import test from "node:test";
import { parseDelimitedText, parseRumoAoTopoRows, summarizeRumoAoTopo } from "./rumo-ao-topo";

test("reconhece cabeçalho após linhas de título e recalcula a premiação", () => {
  const result = parseRumoAoTopoRows([
    ["PREMAZON - Rumo ao Topo"],
    ["Colaborador", "Setor", "Equipe", "Função", "Bonus", "Falta", "Atraso ", "Atestado", "Férias"],
    ["Pessoa Teste A", "Produção", "A", "Operadora", "SIM", 0, "", "", ""],
    ["Pessoa Teste B", "Produção", "B", "Eletricista", "SIM", 0, "", "", "FÉRIAS"],
    ["Pessoa Teste C", "Logística", "A", "Motorista", "NÃO", 2, "00:15", "1 dia", ""],
  ], 100);

  assert.equal(result.registros.length, 3);
  assert.equal(result.registros[0].valor_bonus, 100);
  assert.equal(result.registros[1].elegivel, false);
  assert.equal(result.registros[1].motivo_ineligibilidade, "Férias no período");
  assert.equal(result.registros[2].faltas, 2);
  assert.equal(result.registros[2].atrasos, 1);
  assert.deepEqual(summarizeRumoAoTopo(result.registros), {
    total: 3,
    elegiveis: 1,
    ferias: 1,
    faltas: 2,
    atrasos: 1,
    atestados: 1,
    valorTotal: 100,
  });
});

test("interpreta CSV separado por ponto e vírgula e respeita campos entre aspas", () => {
  const rows = parseDelimitedText('Relatório, agosto\nColaborador;Setor;Bonus;OBS\n"Pessoa, Teste";Qualidade;SIM;"Texto; completo"');
  assert.equal(rows[2][0], "Pessoa, Teste");
  assert.equal(rows[2][3], "Texto; completo");
});

test("detecta vírgula quando o cabeçalho vem depois de uma linha de título", () => {
  const rows = parseDelimitedText('Rumo ao Topo\nColaborador,Setor,Bonus\nPessoa Teste D,Produção,SIM');
  const result = parseRumoAoTopoRows(rows, 150);
  assert.equal(result.registros[0].valor_bonus, 150);
});

test("recusa planilha sem coluna de bônus", () => {
  assert.throws(
    () => parseRumoAoTopoRows([["Colaborador", "Setor"], ["Pessoa Teste E", "Produção"]]),
    /coluna Bonus/,
  );
});
