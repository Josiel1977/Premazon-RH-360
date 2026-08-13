import assert from "node:assert/strict";
import test from "node:test";
import { isCpfValid, preAdmissionUrl, safeAdmissionFileName, validateAdmissionFile, validatePreAdmission } from "./admissao";

test("valida CPF e rejeita sequência repetida", () => {
  assert.equal(isCpfValid("529.982.247-25"), true);
  assert.equal(isCpfValid("111.111.111-11"), false);
});

test("normaliza o nome do documento e valida seu limite", () => {
  assert.equal(safeAdmissionFileName("Comprovante Bancário.PDF"), "comprovante-bancario.pdf");
  assert.equal(validateAdmissionFile(new File([new Uint8Array([1, 2])], "doc.exe", { type: "application/octet-stream" })), "Use somente PDF, JPG ou PNG.");
  assert.equal(validateAdmissionFile(new File([new Uint8Array(3 * 1024 * 1024 + 1)], "doc.pdf", { type: "application/pdf" })), "Cada documento deve possuir no máximo 3 MB.");
});

test("rejeita formulário sem consentimento", () => {
  const form = new FormData();
  form.set("nome_completo", "Pessoa de Teste"); form.set("cpf", "52998224725"); form.set("email", "teste@example.com");
  form.set("telefone", "91999999999"); form.set("data_nascimento", "1990-01-01"); form.set("cep", "66000000");
  form.set("logradouro", "Rua de Teste"); form.set("cidade", "Belém"); form.set("estado", "PA");
  form.set("contato_emergencia_nome", "Contato de Teste"); form.set("contato_emergencia_telefone", "91988888888");
  assert.equal(validatePreAdmission(form).ok, false);
});

test("gera link de pré-admissão", () => {
  assert.equal(preAdmissionUrl("https://rh.exemplo.com/", "token"), "https://rh.exemplo.com/admissao/token");
});
