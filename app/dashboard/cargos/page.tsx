"use client";
import { Save, X } from "lucide-react";

export default function CargosPage() {
  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Cadastro de Cargos</h2>
        <p className="text-sm text-gray-500 mt-1">Defina a estrutura de cargos e funções da empresa.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Cargo</label>
              <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all" placeholder="Ex: Analista de Recursos Humanos" />
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <textarea rows={4} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all resize-none" placeholder="Descreva as responsabilidades principais..."></textarea>
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Competências Associadas</label>
              <textarea rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all resize-none" placeholder="Ex: Comunicação, Liderança, Conhecimento em Excel..."></textarea>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Escolaridade Mínima</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-white">
                <option value="">Selecione...</option>
                <option value="fundamental">Ensino Fundamental</option>
                <option value="medio">Ensino Médio</option>
                <option value="superior_incompleto">Ensino Superior Incompleto</option>
                <option value="superior_completo">Ensino Superior Completo</option>
                <option value="pos_graduacao">Pós-graduação</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nível</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-white">
                <option value="">Selecione...</option>
                <option value="operacional">Operacional</option>
                <option value="tecnico">Técnico</option>
                <option value="analista">Analista</option>
                <option value="coordenacao">Coordenação</option>
                <option value="gerencial">Gerencial</option>
                <option value="diretoria">Diretoria</option>
              </select>
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Experiência Necessária</label>
              <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all" placeholder="Ex: 2 anos na área de atuação" />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end space-x-4 border-t border-gray-100">
            <button type="button" className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center">
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </button>
            <button type="submit" className="px-6 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors flex items-center">
              <Save className="w-4 h-4 mr-2" />
              Salvar Cargo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
