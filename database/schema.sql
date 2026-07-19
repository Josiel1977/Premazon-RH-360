-- Schema for PREMAZON RH 360

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. cargos
CREATE TABLE cargos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cargo VARCHAR(255) NOT NULL,
  descricao TEXT,
  competencias TEXT,
  escolaridade VARCHAR(255),
  experiencia TEXT,
  nivel VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. colaboradores
CREATE TABLE colaboradores (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  cpf VARCHAR(14) UNIQUE NOT NULL,
  matricula VARCHAR(50) UNIQUE NOT NULL,
  cargo_id UUID REFERENCES cargos(id),
  setor VARCHAR(255),
  unidade VARCHAR(255),
  gestor_id UUID REFERENCES colaboradores(id),
  data_admissao DATE,
  email VARCHAR(255) UNIQUE NOT NULL,
  telefone VARCHAR(20),
  status VARCHAR(50) DEFAULT 'Ativo',
  foto TEXT,
  perfil_acesso VARCHAR(50) DEFAULT 'Colaborador', -- Colaborador, Instrutor, Gestor, RH, Diretoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. categorias
CREATE TABLE categorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  categoria VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. normas_regulamentadoras
CREATE TABLE normas_regulamentadoras (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nr VARCHAR(50) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  obrigatoria BOOLEAN DEFAULT TRUE,
  reciclagem BOOLEAN DEFAULT FALSE,
  periodicidade_meses INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. treinamentos
CREATE TABLE treinamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  categoria_id UUID REFERENCES categorias(id),
  descricao TEXT,
  carga_horaria INT,
  obrigatorio BOOLEAN DEFAULT FALSE,
  frequencia_meses INT,
  instrutor_id UUID REFERENCES colaboradores(id),
  link_video TEXT,
  arquivo_pdf TEXT,
  modelo_certificado TEXT,
  nota_minima DECIMAL(5,2),
  status VARCHAR(50) DEFAULT 'Ativo',
  nr_id UUID REFERENCES normas_regulamentadoras(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. aulas
CREATE TABLE aulas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  treinamento_id UUID REFERENCES treinamentos(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  video TEXT,
  pdf TEXT,
  ordem INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. avaliacoes
CREATE TABLE avaliacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  treinamento_id UUID REFERENCES treinamentos(id) ON DELETE CASCADE,
  pergunta TEXT NOT NULL,
  alternativa_a TEXT NOT NULL,
  alternativa_b TEXT NOT NULL,
  alternativa_c TEXT NOT NULL,
  alternativa_d TEXT NOT NULL,
  resposta_correta CHAR(1) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. certificados
CREATE TABLE certificados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  colaborador_id UUID REFERENCES colaboradores(id) ON DELETE CASCADE,
  treinamento_id UUID REFERENCES treinamentos(id) ON DELETE CASCADE,
  data_emissao DATE NOT NULL,
  validade DATE,
  codigo VARCHAR(100) UNIQUE NOT NULL,
  qr_code TEXT,
  nota_final DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. presencas
CREATE TABLE presencas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  colaborador_id UUID REFERENCES colaboradores(id) ON DELETE CASCADE,
  treinamento_id UUID REFERENCES treinamentos(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  presente BOOLEAN DEFAULT FALSE,
  assinatura TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. trilhas
CREATE TABLE trilhas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  ordem INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. pdi
CREATE TABLE pdi (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  colaborador_id UUID REFERENCES colaboradores(id) ON DELETE CASCADE,
  competencia TEXT NOT NULL,
  meta TEXT NOT NULL,
  acao TEXT,
  prazo DATE,
  gestor_id UUID REFERENCES colaboradores(id),
  status VARCHAR(50) DEFAULT 'Em Andamento',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. avaliacao_desempenho
CREATE TABLE avaliacao_desempenho (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  colaborador_id UUID REFERENCES colaboradores(id) ON DELETE CASCADE,
  competencia TEXT NOT NULL,
  nota INT NOT NULL,
  gestor_id UUID REFERENCES colaboradores(id),
  comentarios TEXT,
  data DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. perfil_disc
CREATE TABLE perfil_disc (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  colaborador_id UUID REFERENCES colaboradores(id) ON DELETE CASCADE,
  dominancia DECIMAL(5,2),
  influencia DECIMAL(5,2),
  estabilidade DECIMAL(5,2),
  conformidade DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. candidatos
CREATE TABLE candidatos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  cpf VARCHAR(14) UNIQUE NOT NULL,
  telefone VARCHAR(20),
  cidade VARCHAR(255),
  curriculo TEXT,
  vaga VARCHAR(255),
  etapa VARCHAR(100) DEFAULT 'Triagem',
  entrevista TEXT,
  perfil_disc TEXT,
  status VARCHAR(50) DEFAULT 'Ativo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. indicadores
CREATE TABLE indicadores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  valor DECIMAL(10,2),
  data DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. setores
CREATE TABLE setores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 17. lideranca
CREATE TABLE lideranca (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  curso VARCHAR(255) NOT NULL,
  descricao TEXT,
  carga_horaria INT,
  status VARCHAR(50) DEFAULT 'Ativo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 18. comunicacao
CREATE TABLE comunicacao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  curso VARCHAR(255) NOT NULL,
  descricao TEXT,
  carga_horaria INT,
  status VARCHAR(50) DEFAULT 'Ativo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 19. competencias
CREATE TABLE competencias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  tipo VARCHAR(100), -- Tecnica, Comportamental, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 20. feedbacks
CREATE TABLE feedbacks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  colaborador_id UUID REFERENCES colaboradores(id) ON DELETE CASCADE,
  gestor_id UUID REFERENCES colaboradores(id),
  comentarios TEXT NOT NULL,
  data DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 21. integracao
CREATE TABLE integracao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  colaborador_id UUID REFERENCES colaboradores(id) ON DELETE CASCADE,
  etapa VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'Pendente',
  data_conclusao DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 22. documentos
CREATE TABLE documentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  colaborador_id UUID REFERENCES colaboradores(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(100), -- ASO, Prontuario, Contrato
  arquivo_url TEXT NOT NULL,
  confidencial BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 23. biblioteca
CREATE TABLE biblioteca (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo VARCHAR(255) NOT NULL,
  categoria VARCHAR(100),
  descricao TEXT,
  arquivo_url TEXT,
  tipo VARCHAR(50), -- Livro, Manual, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 24. videos
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  descricao TEXT,
  categoria VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 25. pdfs
CREATE TABLE pdfs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  descricao TEXT,
  categoria VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 26. checklists
CREATE TABLE checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  setor_id UUID REFERENCES setores(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 27. auditorias
CREATE TABLE auditorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo VARCHAR(255) NOT NULL,
  data DATE NOT NULL,
  responsavel_id UUID REFERENCES colaboradores(id),
  resultado TEXT,
  status VARCHAR(50) DEFAULT 'Agendada',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE cargos ENABLE ROW LEVEL SECURITY;
ALTER TABLE colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE normas_regulamentadoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE treinamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE aulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificados ENABLE ROW LEVEL SECURITY;
ALTER TABLE presencas ENABLE ROW LEVEL SECURITY;
ALTER TABLE trilhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdi ENABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacao_desempenho ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfil_disc ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE setores ENABLE ROW LEVEL SECURITY;
ALTER TABLE lideranca ENABLE ROW LEVEL SECURITY;
ALTER TABLE comunicacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE competencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE integracao ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE biblioteca ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdfs ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditorias ENABLE ROW LEVEL SECURITY;

-- Helper Function to get user profile access level
CREATE OR REPLACE FUNCTION get_user_perfil()
RETURNS VARCHAR AS $$
  SELECT perfil_acesso FROM colaboradores WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 1. Colaboradores Policies
-- A user can read their own data, or RH/Diretoria can read all
CREATE POLICY "Colaborador pode ver seu próprio perfil" ON colaboradores
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "RH e Diretoria podem ver todos os colaboradores" ON colaboradores
  FOR SELECT USING (get_user_perfil() IN ('RH', 'Diretoria', 'Administrador'));

CREATE POLICY "Gestor pode ver sua equipe" ON colaboradores
  FOR SELECT USING (gestor_id = auth.uid());

-- 2. Certificados Policies
CREATE POLICY "Colaborador pode ver seus certificados" ON certificados
  FOR SELECT USING (colaborador_id = auth.uid());

CREATE POLICY "RH pode gerenciar certificados" ON certificados
  FOR ALL USING (get_user_perfil() IN ('RH', 'Administrador'));

-- 3. Treinamentos Policies
CREATE POLICY "Todos podem ver treinamentos ativos" ON treinamentos
  FOR SELECT USING (status = 'Ativo');

CREATE POLICY "RH e Instrutores podem gerenciar treinamentos" ON treinamentos
  FOR ALL USING (get_user_perfil() IN ('RH', 'Administrador', 'Instrutor'));

-- (Add more policies as needed following the same pattern)
