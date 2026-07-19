"use client";
import { Save, X, Plus } from "lucide-react";

export default function AvaliacoesPage() {
  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Cadastro de Avaliações</h2>
        <p className="text-sm text-gray-500 mt-1">Crie perguntas e alternativas para as provas dos treinamentos.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Treinamento Vinculado</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-white">
                <option value="">Selecione o treinamento...</option>
                <option value="1">NR-10 Básico - Segurança em Instalações</option>
                <option value="2">Liderança Efetiva</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pergunta</label>
              <textarea rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all resize-none" placeholder="Digite a pergunta da avaliação..."></textarea>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">Alternativas</label>
              
              <div className="flex items-center space-x-3">
                <span className="font-bold text-gray-500 w-6">A)</span>
                <input type="text" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all" placeholder="Alternativa A" />
                <label className="flex items-center space-x-2 cursor-pointer bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                  <input type="radio" name="correta" value="A" className="w-4 h-4 text-primary bg-white border-gray-300 focus:ring-primary" />
                  <span className="text-sm font-medium text-gray-600">Correta</span>
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <span className="font-bold text-gray-500 w-6">B)</span>
                <input type="text" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all" placeholder="Alternativa B" />
                <label className="flex items-center space-x-2 cursor-pointer bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                  <input type="radio" name="correta" value="B" className="w-4 h-4 text-primary bg-white border-gray-300 focus:ring-primary" />
                  <span className="text-sm font-medium text-gray-600">Correta</span>
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <span className="font-bold text-gray-500 w-6">C)</span>
                <input type="text" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all" placeholder="Alternativa C" />
                <label className="flex items-center space-x-2 cursor-pointer bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                  <input type="radio" name="correta" value="C" className="w-4 h-4 text-primary bg-white border-gray-300 focus:ring-primary" />
                  <span className="text-sm font-medium text-gray-600">Correta</span>
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <span className="font-bold text-gray-500 w-6">D)</span>
                <input type="text" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all" placeholder="Alternativa D" />
                <label className="flex items-center space-x-2 cursor-pointer bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                  <input type="radio" name="correta" value="D" className="w-4 h-4 text-primary bg-white border-gray-300 focus:ring-primary" />
                  <span className="text-sm font-medium text-gray-600">Correta</span>
                </label>
              </div>
            </div>
            
            <div>
              <button type="button" className="text-primary text-sm font-medium hover:text-primary-dark transition-colors flex items-center">
                <Plus className="w-4 h-4 mr-1" /> Adicionar Pergunta Extra nesta Avaliação
              </button>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end space-x-4 border-t border-gray-100">
            <button type="button" className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center">
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </button>
            <button type="submit" className="px-6 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors flex items-center">
              <Save className="w-4 h-4 mr-2" />
              Salvar Pergunta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
