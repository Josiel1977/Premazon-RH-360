"use client";
import { Download, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function CertificadosPage() {
  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Emissão de Certificados</h2>
          <p className="text-sm text-gray-500 mt-1">Valide e emita certificados oficiais dos treinamentos concluídos.</p>
        </div>
        <div className="flex items-center space-x-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg border border-green-200">
          <ShieldCheck className="w-5 h-5" />
          <span className="text-sm font-bold">Acesso Autorizado (Gerente de RH)</span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <h3 className="font-bold text-gray-800">Turmas Concluídas Aguardando Emissão</h3>
        </div>

        <div className="divide-y divide-gray-100">
          
          {/* Turma 1 */}
          <div className="p-6 hover:bg-gray-50 transition-colors">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-bold text-primary">NR-10 Básico - Segurança em Instalações e Serviços em Eletricidade</h4>
                <p className="text-sm text-gray-500 mt-1">Concluído em: 15/07/2026 • 40 Horas • 12 Participantes Aprovados</p>
                <div className="flex items-center space-x-4 mt-3">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium text-gray-800">Instrutor Responsável:</span> Instrutor Exemplo A
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
              <h5 className="text-sm font-bold text-blue-900 mb-2">Assinaturas e Validações Requeridas</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-700">Assinatura do Instrutor Confirmada</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-700">Sua Assinatura (Gerente de RH) Pendente</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-4">
              <button className="px-4 py-2 text-sm font-medium text-primary bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                Ver Lista de Aprovados
              </button>
              <button className="px-6 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors flex items-center">
                <Download className="w-4 h-4 mr-2" />
                Assinar e Emitir Lote (12)
              </button>
            </div>
          </div>

          {/* Turma 2 */}
          <div className="p-6 hover:bg-gray-50 transition-colors">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-bold text-primary">NR-35 Trabalho em Altura</h4>
                <p className="text-sm text-gray-500 mt-1">Concluído em: 12/07/2026 • 8 Horas • 8 Participantes Aprovados</p>
                <div className="flex items-center space-x-4 mt-3">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium text-gray-800">Instrutor Responsável:</span> Instrutor Exemplo B
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
              <h5 className="text-sm font-bold text-blue-900 mb-2">Assinaturas e Validações Requeridas</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-700">Assinatura do Instrutor Confirmada</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-700">Sua Assinatura (Gerente de RH) Pendente</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-4">
              <button className="px-4 py-2 text-sm font-medium text-primary bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                Ver Lista de Aprovados
              </button>
              <button className="px-6 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors flex items-center">
                <Download className="w-4 h-4 mr-2" />
                Assinar e Emitir Lote (8)
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
