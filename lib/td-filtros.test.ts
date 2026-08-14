import assert from "node:assert/strict";
import test from "node:test";
import { buildTdSectorOptions, filterTdCollaborators, matchesTdSector } from "./td-filtros";

const collaborators = [
  { id: "1", nome: "Ana Souza", matricula: "101", setor_nome: "Almoxarifado", cargo_nome: "Auxiliar" },
  { id: "2", nome: "Bruno Lima", matricula: "102", setor_nome: "Estrutura", cargo_nome: "Soldador" },
  { id: "3", nome: "Carla Reis", matricula: "103", setor_nome: "Almoxarifado", cargo_nome: "Estoquista" },
];

test("monta setores a partir do cadastro mestre e inclui RH sem duplicar grafias", () => {
  const sectors = buildTdSectorOptions({
    collaborators,
    signalSectors: ["ALMOXARIFADO", "Poste"],
    needSectors: ["Estrutura"],
  });

  assert.deepEqual(sectors, ["Almoxarifado", "Estrutura", "Poste", "RH"]);
});

test("seleciona somente os colaboradores ativos do setor escolhido", () => {
  assert.deepEqual(
    filterTdCollaborators(collaborators, "almoxarifado", "").map((item) => item.nome),
    ["Ana Souza", "Carla Reis"],
  );
});

test("combina setor e busca por nome, matrícula ou cargo", () => {
  assert.deepEqual(
    filterTdCollaborators(collaborators, "Almoxarifado", "estoquista").map((item) => item.nome),
    ["Carla Reis"],
  );
  assert.equal(matchesTdSector("Recursos Humanos", "RH"), false);
});
