"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  BookOpen, 
  CheckSquare, 
  Award, 
  Target, 
  UserPlus,
  LogOut,
  Bell,
  Search,
  ShieldCheck
} from "lucide-react";

const menuItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Colaboradores", href: "/dashboard/colaboradores", icon: Users },
  { name: "Candidatos", href: "/dashboard/candidatos", icon: UserPlus },
  { name: "Treinamentos", href: "/dashboard/treinamentos", icon: BookOpen },
  { name: "Avaliações", href: "/dashboard/avaliacoes", icon: CheckSquare },
  { name: "Certificados", href: "/dashboard/certificados", icon: Award },
  { name: "PDIs", href: "/dashboard/pdis", icon: Target },
  { name: "Cargos", href: "/dashboard/cargos", icon: Briefcase },
  { name: "Acessos & Permissões", href: "/dashboard/acessos", icon: ShieldCheck },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-primary text-white flex flex-col fixed h-full z-10 shadow-lg">
        <div className="p-6 border-b border-primary-dark/30 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-white text-primary flex items-center justify-center shadow-sm">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Premazon RH 360</h1>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                      isActive 
                        ? "bg-white/10 text-secondary border-r-4 border-secondary" 
                        : "text-blue-100 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Icon className={`w-5 h-5 mr-3 ${isActive ? "text-secondary" : "text-blue-200"}`} />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        
        <div className="p-4 border-t border-primary-dark/30">
          <div className="flex items-center text-sm text-blue-200 hover:text-white cursor-pointer px-2 py-2 rounded-md hover:bg-white/5 transition-colors">
            <LogOut className="w-5 h-5 mr-3" />
            Sair do sistema
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="h-16 bg-white shadow-sm border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center text-gray-500">
            <Search className="w-5 h-5 mr-2" />
            <input 
              type="text" 
              placeholder="Buscar..." 
              className="bg-transparent border-none focus:outline-none text-sm w-64"
            />
          </div>
          
          <div className="flex items-center space-x-6">
            <button className="text-gray-400 hover:text-gray-600 relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="flex items-center border-l pl-6 border-gray-200">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold mr-3">
                GR
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-700 leading-tight">Maria Silva</span>
                <span className="text-xs font-medium text-secondary leading-tight">Gerente de RH</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
