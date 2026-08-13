import assert from "node:assert/strict";
import test from "node:test";
import {
  linkPublicoCandidatura,
  nomeSeguroArquivo,
  textoCompartilhamento,
  validarCandidatura,
  validarCurriculo,
} from "./recrutamento";

function candidaturaValida() {
  const form = new FormData();
  form.set("nome", "Maria da Silva");
  form.set("email", "Maria@Example.com");
  form.set("telefone", "(92) 99999-0000");
  form.set("cidade", "Manaus");
  form.set("estado", "am");
  form.set("escolaridade", "Ensino médio completo");
  form.set("experiencia", "Atendimento ao público e rotinas administrativas por três anos.");
  form.set("consentimento_lgpd", "true");
  return form;
}

test("normaliza e valida os dados públicos da candidatura", () => {
  const result = validarCandidatura(candidaturaValida());
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data.email, "maria@example.com");
    assert.equal(result.data.estado, "AM");
    assert.equal(result.data.pretensao_salarial, null);
  }
});

test("rejeita honeypot, ausência de consentimento e telefone inválido", () => {
  const bot = candidaturaValida();
  bot.set("website", "https://spam.example");
  assert.equal(validarCandidatura(bot).ok, false);

  const semConsentimento = candidaturaValida();
  semConsentimento.delete("consentimento_lgpd");
  assert.equal(validarCandidatura(semConsentimento).ok, false);

  const telefoneInvalido = candidaturaValida();
  telefoneInvalido.set("telefone", "123");
  assert.equal(validarCandidatura(telefoneInvalido).ok, false);
});

test("valida tamanho e extensão do currículo", () => {
  const pdf = new File(["%PDF-1.7"], "curriculo.pdf", { type: "application/pdf" });
  const executavel = new File(["MZ"], "arquivo.exe", { type: "application/octet-stream" });
  assert.equal(validarCurriculo(pdf), null);
  assert.match(validarCurriculo(executavel) ?? "", /PDF, DOC ou DOCX/);
});

test("gera nome seguro e mensagem de compartilhamento", () => {
  assert.equal(nomeSeguroArquivo("Currículo João da Silva.pdf"), "Curriculo-Joao-da-Silva.pdf");
  const link = linkPublicoCandidatura("https://rh.example.com", "token");
  assert.equal(link, "https://rh.example.com/candidatura/token");
  assert.match(textoCompartilhamento("Analista de RH", link), /Analista de RH/);
});
