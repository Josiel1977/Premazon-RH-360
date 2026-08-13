// Um documento por requisição mantém cada envio abaixo do limite de funções serverless.
export const MAX_ADMISSION_FILE_BYTES = 3 * 1024 * 1024;
export const ADMISSION_DOCUMENTS = [
  { key: "identidade", label: "Documento de identidade", required: true },
  { key: "cpf", label: "Comprovante de CPF", required: true },
  { key: "residencia", label: "Comprovante de residência", required: true },
  { key: "ctps", label: "CTPS Digital", required: true },
  { key: "banco", label: "Comprovante bancário", required: false },
  { key: "escolaridade", label: "Comprovante de escolaridade", required: false },
] as const;

export type AdmissionDocumentType = typeof ADMISSION_DOCUMENTS[number]["key"];

const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
const allowedExtensions = new Set(["pdf", "jpg", "jpeg", "png"]);

export function normalizeCpf(value: string) {
  return value.replace(/\D/g, "");
}

export function isCpfValid(value: string) {
  const cpf = normalizeCpf(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (length: number) => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) sum += Number(cpf[index]) * (length + 1 - index);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

function text(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export function validatePreAdmission(form: FormData) {
  if (text(form, "website")) return { ok: false as const, error: "Envio inválido." };
  const nome = text(form, "nome_completo");
  const cpf = normalizeCpf(text(form, "cpf"));
  const email = text(form, "email").toLowerCase();
  const telefone = text(form, "telefone").replace(/\D/g, "");
  const nascimento = text(form, "data_nascimento");
  const emergencyPhone = text(form, "contato_emergencia_telefone").replace(/\D/g, "");
  if (nome.length < 3 || nome.length > 180) return { ok: false as const, error: "Informe o nome completo." };
  if (!isCpfValid(cpf)) return { ok: false as const, error: "Informe um CPF válido." };
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 180) return { ok: false as const, error: "Informe um e-mail válido." };
  if (telefone.length < 10 || telefone.length > 13) return { ok: false as const, error: "Informe um telefone válido." };
  const birthDate = new Date(`${nascimento}T12:00:00Z`);
  const age = Math.floor((Date.now() - birthDate.getTime()) / 31557600000);
  if (!nascimento || !Number.isFinite(age) || age < 14 || age > 100) return { ok: false as const, error: "Informe uma data de nascimento válida." };
  if (text(form, "cep").replace(/\D/g, "").length !== 8) return { ok: false as const, error: "Informe um CEP válido." };
  if (text(form, "logradouro").length < 3 || text(form, "cidade").length < 2 || !/^[A-Za-z]{2}$/.test(text(form, "estado"))) return { ok: false as const, error: "Complete o endereço residencial." };
  if (text(form, "contato_emergencia_nome").length < 3 || emergencyPhone.length < 10) return { ok: false as const, error: "Complete o contato de emergência." };
  if (form.get("consentimento_lgpd") !== "sim") return { ok: false as const, error: "É necessário aceitar o aviso de privacidade." };
  return { ok: true as const, data: {
    nome, nome_social: text(form, "nome_social") || null, cpf, email, telefone, data_nascimento: nascimento,
    endereco: { cep: text(form, "cep").replace(/\D/g, ""), logradouro: text(form, "logradouro"), numero: text(form, "numero"), complemento: text(form, "complemento") || null, bairro: text(form, "bairro"), cidade: text(form, "cidade"), estado: text(form, "estado").toUpperCase() },
    contato_emergencia_nome: text(form, "contato_emergencia_nome"), contato_emergencia_telefone: emergencyPhone,
    tamanho_camisa: text(form, "tamanho_camisa") || null, tamanho_calca: text(form, "tamanho_calca") || null, tamanho_calcado: text(form, "tamanho_calcado") || null,
  } };
}

export function validateAdmissionFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!allowedExtensions.has(extension) || !allowedTypes.has(file.type)) return "Use somente PDF, JPG ou PNG.";
  if (!file.size || file.size > MAX_ADMISSION_FILE_BYTES) return "Cada documento deve possuir no máximo 3 MB.";
  return null;
}

export async function admissionFileSignatureValid(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (file.type === "application/pdf") return String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
  if (file.type === "image/png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (file.type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return false;
}

export function safeAdmissionFileName(value: string) {
  const parts = value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(".");
  const extension = parts.pop()?.replace(/[^a-z0-9]/g, "") || "bin";
  const base = parts.join("-").replace(/[^a-z0-9_-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "documento";
  return `${base}.${extension}`;
}

export function preAdmissionUrl(origin: string, token: string) {
  return `${origin.replace(/\/$/, "")}/admissao/${token}`;
}
