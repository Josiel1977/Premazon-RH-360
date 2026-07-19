"use client";
import { Save, X, FileText } from "lucide-react";

export default function CandidatosPage() {
  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Cadastro de Candidatos</h2>
        <p className="text-sm text-gray-500 mt-1">Recrutamento e Seleção</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
              <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all" placeholder="Nome do Candidato" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
              <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all" placeholder="000.000.000-00" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all" placeholder="(11) 99999-9999" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cidade / Estado</label>
              <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all" placeholder="Ex: São Paulo / SP" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vaga Pretendida</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-white">
                <option value="">Selecione a vaga...</option>
                <option value="1">Vaga A</option>
                <option value="2">Vaga B</option>
              </select>
            </div>
            
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Upload de Currículo</label>
              <div className="flex items-center">
                <input type="text" className="flex-1 px-4 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-gray-50" disabled placeholder="Nenhum arquivo selecionado" />
                <button type="button" className="px-4 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-gray-600 hover:bg-gray-200 transition-colors flex items-center">
                  <FileText className="w-4 h-4 mr-2" />
                  Buscar PDF/Word
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Etapa do Processo</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-white">
                <option value="triagem">Triagem de Currículos</option>
                <option value="entrevista_rh">Entrevista RH</option>
                <option value="teste_tecnico">Teste Técnico</option>
                <option value="entrevista_gestor">Entrevista Gestor</option>
                <option value="aprovado">Aprovado</option>
                <option value="reprovado">Reprovado</option>
                <option value="banco_talentos">Banco de Talentos</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Perfil DISC</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-white">
                <option value="">Não avaliado</option>
                <option value="D">Dominante (D)</option>
                <option value="I">Influente (I)</option>
                <option value="S">Estável (S)</option>
                <option value="C">Conforme (C)</option>
              </select>
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Observações da Entrevista</label>
              <textarea rows={4} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all resize-none" placeholder="Anotações sobre a entrevista, pontos fortes, pontos a melhorar..."></textarea>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status Final</label>
              <div className="flex items-center space-x-6 h-10">
                <label className="flex items-center">
                  <input type="radio" name="status_candidato" className="w-4 h-4 text-primary bg-gray-100 border-gray-300 focus:ring-primary" defaultChecked />
                  <span className="ml-2 text-sm text-gray-700">Ativo no Processo</span>
                </label>
                <label className="flex items-center">
                  <input type="radio" name="status_candidato" className="w-4 h-4 text-primary bg-gray-100 border-gray-300 focus:ring-primary" />
                  <span className="ml-2 text-sm text-gray-700">Encerrado</span>
                </label>
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end space-x-4 border-t border-gray-100">
            <button type="button" className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center">
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </button>
            <button type="submit" className="px-6 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors flex items-center">
              <Save className="w-4 h-4 mr-2" />
              Salvar Candidato
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
