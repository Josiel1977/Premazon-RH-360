"use client";
import { Users, AlertTriangle, BookOpen, Clock, FileText, Target, TrendingUp } from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

const treinamentosPorSetor = [
  { name: 'Operação', value: 45 },
  { name: 'Administrativo', value: 25 },
  { name: 'Comercial', value: 15 },
  { name: 'Logística', value: 30 },
  { name: 'TI', value: 10 },
];

const statusAvaliacoes = [
  { name: 'Aprovados', value: 65 },
  { name: 'Reprovados', value: 15 },
  { name: 'Pendentes', value: 20 },
];

const COLORS = ['#1e3a8a', '#eab308', '#ef4444', '#10b981', '#6b7280'];
const PIE_COLORS = ['#10b981', '#ef4444', '#f59e0b'];

export default function DashboardPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Painel de Indicadores</h2>
          <p className="text-sm text-gray-500 mt-1">Visão geral e métricas de RH</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Horas de Treinamento</p>
              <h3 className="text-3xl font-bold text-gray-800">1.240h</h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-primary">
              <Clock className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="w-4 h-4 text-emerald-500 mr-1" />
            <span className="text-emerald-500 font-medium">+12%</span>
            <span className="text-gray-400 ml-2">este mês</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">% de Conclusão</p>
              <h3 className="text-3xl font-bold text-gray-800">85%</h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
              <Target className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 w-full bg-gray-100 rounded-full h-2">
            <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '85%' }}></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">NRs Vencidas</p>
              <h3 className="text-3xl font-bold text-gray-800">3</h3>
            </div>
            <div className="p-3 bg-red-50 rounded-lg text-red-500">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 text-sm text-red-500 font-medium">
            Ação imediata requerida
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">PDIs Concluídos</p>
              <h3 className="text-3xl font-bold text-gray-800">15</h3>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg text-secondary">
              <FileText className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500">De 45 planejados</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Bar Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Treinamentos por Setor (Horas)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={treinamentosPorSetor}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f9fafb'}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="value" fill="#1e3a8a" radius={[4, 4, 0, 0]}>
                  {treinamentosPorSetor.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart & Metrics */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
          <h3 className="text-lg font-bold text-gray-800 mb-2">Status das Avaliações</h3>
          <div className="h-48 my-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusAvaliacoes}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusAvaliacoes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-auto border-t border-gray-100 pt-4">
            <h4 className="text-sm font-medium text-gray-500 mb-1">Custos com Treinamentos</h4>
            <div className="text-2xl font-bold text-gray-800">R$ 12.500,00</div>
            <p className="text-xs text-gray-400 mt-1">Acumulado do ano</p>
          </div>
        </div>

      </div>

      {/* Lists Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ranking */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Ranking de Engajamento</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 rounded-t-lg">
                <tr>
                  <th className="px-4 py-3 font-medium">Colaborador</th>
                  <th className="px-4 py-3 font-medium">Unidade</th>
                  <th className="px-4 py-3 font-medium text-right">Horas</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800 flex items-center">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-primary flex items-center justify-center text-xs mr-2">1</div>
                    Carlos Silva
                  </td>
                  <td className="px-4 py-3 text-gray-500">Matriz</td>
                  <td className="px-4 py-3 font-bold text-primary text-right">45h</td>
                </tr>
                <tr className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800 flex items-center">
                    <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs mr-2">2</div>
                    Ana Souza
                  </td>
                  <td className="px-4 py-3 text-gray-500">Filial Sul</td>
                  <td className="px-4 py-3 font-bold text-primary text-right">38h</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800 flex items-center">
                    <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs mr-2">3</div>
                    Marcos Mendes
                  </td>
                  <td className="px-4 py-3 text-gray-500">Logística</td>
                  <td className="px-4 py-3 font-bold text-primary text-right">32h</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Média de Avaliações */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Média das Avaliações</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1 text-sm">
                <span className="font-medium text-gray-700">NR-10 Básico</span>
                <span className="font-bold text-primary">9.2</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: '92%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1 text-sm">
                <span className="font-medium text-gray-700">Liderança Efetiva</span>
                <span className="font-bold text-primary">8.8</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: '88%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1 text-sm">
                <span className="font-medium text-gray-700">Integração de Novos</span>
                <span className="font-bold text-primary">9.5</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: '95%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
