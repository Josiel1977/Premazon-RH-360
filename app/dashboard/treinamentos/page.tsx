"use client";
import { Save, X, Paperclip, Plus, Edit2, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";

const initialTreinamentos = [
  { id: 1, nome: "NR-35 Trabalho em Altura", categoria: "nr35", ch: 8, obrigatorio: true, instrutor: "Instrutor Exemplo A", status: "ativo" },
  { id: 2, nome: "NR-10 Básico", categoria: "nr10", ch: 40, obrigatorio: true, instrutor: "Instrutor Exemplo A", status: "ativo" },
  { id: 3, nome: "Integração de Novos Colaboradores", categoria: "integracao", ch: 4, obrigatorio: true, instrutor: "Instrutor Exemplo B", status: "ativo" },
];

export default function TreinamentosPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [treinamentos] = useState(initialTreinamentos);

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Treinamentos e NRs</h2>
          <p className="text-sm text-gray-500 mt-1">Gerencie os cursos, normas regulamentadoras e exigências.</p>
        </div>
        {!isFormOpen && (
          <button 
            onClick={() => setIsFormOpen(true)}
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Treinamento
          </button>
        )}
      </div>

      {isFormOpen ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
            <h3 className="text-lg font-bold text-gray-800">Cadastrar Novo Treinamento</h3>
            <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); setIsFormOpen(false); }}>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Treinamento</label>
                <input type="text" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all" placeholder="Ex: NR-10 Básico" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria (Normas e Áreas)</label>
                <select required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-white">
                  <option value="">Selecione uma categoria...</option>
                  <option value="integracao">Integração</option>
                  <option value="nr01">NR 01 - Disposições Gerais e GRO</option>
                  <option value="nr05">NR 05 - CIPA</option>
                  <option value="nr06">NR 06 - EPI</option>
                  <option value="nr07">NR 07 - PCMSO</option>
                  <option value="nr09">NR 09 - Avaliação e Controle de Exposições Ocupacionais</option>
                  <option value="nr10">NR 10 - Segurança em Instalações e Serviços em Eletricidade</option>
                  <option value="nr11">NR 11 - Transporte, Movimentação, Armazenagem e Manuseio de Materiais</option>
                  <option value="nr12">NR 12 - Segurança no Trabalho em Máquinas e Equipamentos</option>
                  <option value="nr13">NR 13 - Caldeiras, Vasos de Pressão e Tubulações</option>
                  <option value="nr17">NR 17 - Ergonomia</option>
                  <option value="nr18">NR 18 - Segurança e Saúde no Trabalho na Indústria da Construção</option>
                  <option value="nr20">NR 20 - Líquidos Combustíveis e Inflamáveis</option>
                  <option value="nr23">NR 23 - Proteção Contra Incêndios</option>
                  <option value="nr24">NR 24 - Condições Sanitárias e de Conforto</option>
                  <option value="nr26">NR 26 - Sinalização de Segurança</option>
                  <option value="nr33">NR 33 - Segurança e Saúde nos Trabalhos em Espaços Confinados</option>
                  <option value="nr35">NR 35 - Trabalho em Altura</option>
                  <option value="nr38">NR 38 - Segurança e Saúde no Trabalho nas Atividades de Limpeza Urbana e Manejo de Resíduos Sólidos</option>
                  <option value="outros">Outros / Administrativo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Carga Horária (horas)</label>
                <input type="number" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all" placeholder="Ex: 40" />
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all resize-none" placeholder="Descreva o conteúdo programático..."></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frequência (Validade)</label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-white">
                  <option value="">Selecione a validade...</option>
                  <option value="12">Anual (12 meses)</option>
                  <option value="24">Bienal (24 meses)</option>
                  <option value="36">Trienal (36 meses)</option>
                  <option value="unico">Sem validade (Único)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instrutor Responsável</label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-white">
                  <option value="">Selecione...</option>
                  <option value="demo-instrutor">Instrutor Exemplo A (Segurança)</option>
                  <option value="demo-rh">Instrutor Exemplo B (RH)</option>
                  <option value="ext">Profissional Externo / Terceirizado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link do Vídeo (Opcional)</label>
                <input type="url" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all" placeholder="https://..." />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nota Mínima (Aprovação)</label>
                <input type="number" defaultValue="70" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all" placeholder="Ex: 70" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Material Anexo (PDF)</label>
                <div className="flex items-center">
                  <input type="text" className="flex-1 px-4 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-gray-50" disabled placeholder="Anexar apostila..." />
                  <button type="button" className="px-4 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-gray-600 hover:bg-gray-200 transition-colors flex items-center">
                    <Paperclip className="w-4 h-4 mr-2" />
                    Buscar
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modelo de Certificado (PDF)</label>
                <div className="flex items-center">
                  <input type="text" className="flex-1 px-4 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-gray-50" disabled placeholder="Anexar template..." />
                  <button type="button" className="px-4 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-gray-600 hover:bg-gray-200 transition-colors flex items-center">
                    <Paperclip className="w-4 h-4 mr-2" />
                    Buscar
                  </button>
                </div>
              </div>

              <div className="col-span-1 md:col-span-2 flex items-center space-x-6 mt-2">
                <label className="flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-5 h-5 text-primary rounded border-gray-300 focus:ring-primary" />
                  <span className="ml-2 text-sm font-medium text-gray-700">Treinamento Obrigatório</span>
                </label>
                
                <div className="flex items-center space-x-4 border-l border-gray-300 pl-6">
                  <span className="text-sm font-medium text-gray-700">Status:</span>
                  <label className="flex items-center cursor-pointer">
                    <input type="radio" name="status" value="ativo" defaultChecked className="w-4 h-4 text-primary border-gray-300 focus:ring-primary" />
                    <span className="ml-2 text-sm text-gray-700">Ativo</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input type="radio" name="status" value="inativo" className="w-4 h-4 text-primary border-gray-300 focus:ring-primary" />
                    <span className="ml-2 text-sm text-gray-700">Inativo</span>
                  </label>
                </div>
              </div>

            </div>

            <div className="pt-6 flex items-center justify-end space-x-4 border-t border-gray-100">
              <button type="button" onClick={() => setIsFormOpen(false)} className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center">
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </button>
              <button type="submit" className="px-6 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors flex items-center">
                <Save className="w-4 h-4 mr-2" />
                Salvar Treinamento
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Nome</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">CH</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Obrigatório</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Instrutor</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {treinamentos.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-500">#{t.id}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{t.nome}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{t.ch}h</td>
                    <td className="px-6 py-4">
                      {t.obrigatorio ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Sim
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Não
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{t.instrutor}</td>
                    <td className="px-6 py-4">
                      {t.status === 'ativo' ? (
                        <span className="flex items-center text-green-600 text-sm font-medium">
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Ativo
                        </span>
                      ) : (
                        <span className="flex items-center text-red-600 text-sm font-medium">
                          <XCircle className="w-4 h-4 mr-1" /> Inativo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button className="text-gray-400 hover:text-primary transition-colors">
                        <Edit2 className="w-4 h-4 inline" />
                      </button>
                      <button className="text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
