"use client";
import { Save, X, ShieldAlert } from "lucide-react";

export default function AcessosPage() {
  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Acessos e Permissões</h2>
        <p className="text-sm text-gray-500 mt-1">Gerencie os níveis de acesso dos usuários à plataforma Premazon RH.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        
        <div className="mb-8 p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-start">
          <ShieldAlert className="w-5 h-5 text-primary mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <span className="font-bold">Aviso de Segurança:</span> A emissão e validação de certificados é restrita exclusivamente ao nível <strong>"Gerente de RH"</strong>. Instrutores podem apenas registrar presenças e lançar notas de avaliações.
          </div>
        </div>

        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Colaborador / Usuário</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-white">
                <option value="">Selecione o usuário...</option>
                <option value="1">Maria Silva - Matrícula: 001001</option>
                <option value="2">Carlos Mendes (Instrutor) - Matrícula: 002304</option>
                <option value="3">João da Silva - Matrícula: 001234</option>
              </select>
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Nível de Acesso (Perfil)</label>
              
              <div className="space-y-3">
                <label className="flex items-start p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors has-[:checked]:border-primary has-[:checked]:bg-blue-50">
                  <div className="flex items-center h-5">
                    <input type="radio" name="role" value="gerente_rh" className="w-4 h-4 text-primary bg-white border-gray-300 focus:ring-primary" defaultChecked />
                  </div>
                  <div className="ml-3 text-sm">
                    <span className="font-bold text-gray-900 block">Gerente de RH</span>
                    <span className="text-gray-500">Acesso total. Pode cadastrar treinamentos, aprovar PDIs, cadastrar usuários e Emitir Certificados oficiais.</span>
                  </div>
                </label>

                <label className="flex items-start p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors has-[:checked]:border-primary has-[:checked]:bg-blue-50">
                  <div className="flex items-center h-5">
                    <input type="radio" name="role" value="instrutor" className="w-4 h-4 text-primary bg-white border-gray-300 focus:ring-primary" />
                  </div>
                  <div className="ml-3 text-sm">
                    <span className="font-bold text-gray-900 block">Instrutor / Facilitador</span>
                    <span className="text-gray-500">Acesso a turmas, registro de presenças e inserção de notas das avaliações. Não pode emitir certificados.</span>
                  </div>
                </label>

                <label className="flex items-start p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors has-[:checked]:border-primary has-[:checked]:bg-blue-50">
                  <div className="flex items-center h-5">
                    <input type="radio" name="role" value="colaborador" className="w-4 h-4 text-primary bg-white border-gray-300 focus:ring-primary" />
                  </div>
                  <div className="ml-3 text-sm">
                    <span className="font-bold text-gray-900 block">Colaborador Padrão</span>
                    <span className="text-gray-500">Pode apenas visualizar seus próprios PDIs, acessar os treinamentos alocados e baixar seus próprios certificados emitidos.</span>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status do Acesso</label>
              <div className="flex items-center space-x-6 h-10">
                <label className="flex items-center">
                  <input type="radio" name="status_acesso" className="w-4 h-4 text-primary bg-gray-100 border-gray-300 focus:ring-primary" defaultChecked />
                  <span className="ml-2 text-sm text-gray-700">Ativo</span>
                </label>
                <label className="flex items-center">
                  <input type="radio" name="status_acesso" className="w-4 h-4 text-primary bg-gray-100 border-gray-300 focus:ring-primary" />
                  <span className="ml-2 text-sm text-gray-700">Bloqueado</span>
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
              Salvar Permissões
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
