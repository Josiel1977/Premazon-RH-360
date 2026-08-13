import assert from "node:assert/strict";
import test from "node:test";
import { createCsvText, formatBytes, publicReportUrl } from "./relatorios";

test("gera CSV compatível com Excel e separador brasileiro", () => {
  const csv = createCsvText(["Indicador", "Valor"], [["Colaboradores", 12], ["Observação; revisada", "ok"]]);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.match(csv, /"Colaboradores";"12"/);
  assert.match(csv, /"Observação; revisada";"ok"/);
});

test("protege células contra fórmula ao exportar CSV", () => {
  const csv = createCsvText(["Valor"], [["=IMPORTXML(\"x\")"], ["+1+1"]]);
  assert.match(csv, /"'=IMPORTXML/);
  assert.match(csv, /"'\+1\+1"/);
});

test("monta link público e formata tamanho do arquivo", () => {
  assert.equal(publicReportUrl("https://rh.exemplo.com/", "token"), "https://rh.exemplo.com/relatorio/token");
  assert.equal(formatBytes(1536), "1.5 KB");
});
