import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronDown, 
  User, 
  Settings, 
  LogOut, 
  Calendar,
  Users,
  FileText,
  Activity,
  Stethoscope,
  UserPlus,
  Building2,
  BarChart3,
  Shield,
  Clock,
  Heart
} from 'lucide-react';

interface UserMenuProps {
  userRole: string;
  onLogout: () => void;
  notificationCount?: number;
  onShowNotifications?: () => void;
  onMenuAction: (action: string, data?: any) => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ 
  userRole, 
  onLogout, 
  notificationCount = 0,
  onShowNotifications,
  onMenuAction 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveSubmenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'empresa': return 'from-purple-500 to-purple-700';
      case 'recepcion': return 'from-green-500 to-green-700';
      case 'consultorio': return 'from-blue-500 to-blue-700';
      case 'enfermeria': return 'from-red-500 to-red-700';
      case 'doctor': return 'from-teal-500 to-teal-700';
      default: return 'from-gray-500 to-gray-700';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'empresa': return 'Dirección General';
      case 'recepcion': return 'Recepción';
      case 'consultorio': return 'Consultorio Médico';
      case 'enfermeria': return 'Enfermería - Triaje';
      case 'doctor': return 'Médico Especialista';
      default: return role;
    }
  };

  const getMenuItems = (role: string) => {
    switch (role) {
      case 'empresa':
        return [
          {
            title: 'Gestión',
            icon: Building2,
            items: [
              { title: 'Nuevo Doctor', icon: UserPlus, action: () => onMenuAction('nuevo-doctor') },
              { title: 'Gestión de Doctores', icon: Stethoscope, action: () => onMenuAction('gestion-doctores') },
              { title: 'Configuración', icon: Settings, action: () => onMenuAction('configuracion') }
            ]
          },
          {
            title: 'Reportes',
            icon: BarChart3,
            items: [
              { title: 'Estadísticas', icon: BarChart3, action: () => onMenuAction('estadisticas') },
              { title: 'Generar Reporte', icon: FileText, action: () => onMenuAction('generar-reporte') }
            ]
          }
        ];
      case 'recepcion':
        return [
          {
            title: 'Pacientes',
            icon: Users,
            items: [
              { title: 'Nuevo Paciente', icon: UserPlus, action: () => onMenuAction('nuevo-paciente') },
              { title: 'Buscar Pacientes', icon: Users, action: () => onMenuAction('buscar-pacientes') },
            ]
          },
          {
            title: 'Citas',
            icon: Calendar,
            items: [
              { title: 'Nueva Cita', icon: Calendar, action: () => onMenuAction('nueva-cita') },
              { title: 'Gestionar Citas', icon: Clock, action: () => onMenuAction('gestionar-citas') }
            ]
          }
        ];
      case 'consultorio':
        return [
          {
            title: 'Consultas',
            icon: Stethoscope,
            items: [
              { title: 'Nueva Consulta', icon: Stethoscope, action: () => onMenuAction('nueva-consulta') },
              { title: 'Triajes Pendientes', icon: Activity, action: () => onMenuAction('triajes-pendientes') },
              { title: 'Historial', icon: FileText, action: () => onMenuAction('historial-consultas') }
            ]
          }
        ];
      case 'enfermeria':
        return [
          {
            title: 'Triaje',
            icon: Shield,
            items: [
              { title: 'Nuevo Triaje', icon: Heart, action: () => onMenuAction('nuevo-triaje') },
              { title: 'Triajes del Día', icon: Activity, action: () => onMenuAction('triajes-dia') }
            ]
          }
        ];
      case 'doctor':
        return [
          {
            title: 'Pacientes',
            icon: Users,
            items: [
              { title: 'Pacientes Asignados', icon: Users, action: () => onMenuAction('pacientes-asignados') },
              { title: 'Consultas del Día', icon: Stethoscope, action: () => onMenuAction('consultas-dia') }
            ]
          },
          {
            title: 'Consultas',
            icon: FileText,
            items: [
              { title: 'Historial', icon: FileText, action: () => onMenuAction('historial-consultas') },
              { title: 'Generar Reportes', icon: BarChart3, action: () => onMenuAction('generar-reportes') }
            ]
          }
        ];
      default:
        return [];
    }
  };

  const menuItems = getMenuItems(userRole);

  return (
    <div className="relative" ref={menuRef}>
      <div className="flex items-center space-x-3">
        {/* User Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center space-x-3 px-4 py-2 rounded-lg bg-gradient-to-r ${getRoleColor(userRole)} text-white hover:shadow-lg transform hover:scale-105 transition-all duration-300`}
        >
          <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium">{user.name || 'Usuario'}</p>
            <p className="text-xs opacity-75">{getRoleDisplayName(userRole)}</p>
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 animate-dropdown">
          {/* User Profile Section */}
          <div className={`p-4 bg-gradient-to-r ${getRoleColor(userRole)} text-white rounded-t-xl`}>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold">{user.name || 'Usuario'}</h3>
                <p className="text-sm opacity-75">{getRoleDisplayName(userRole)}</p>
                <p className="text-xs opacity-60">
                  {user.doctorInfo?.cedula || user.id || user.documentNumber}
                </p>
                {user.doctorInfo?.especialidad && (
                  <p className="text-xs opacity-60">{user.doctorInfo.especialidad}</p>
                )}
              </div>
            </div>
          </div>

          {/* Automation Status */}

          {/* Menu Items */}
          <div className="py-2">
            {menuItems.map((section, index) => (
              <div key={index} className="border-b border-gray-100 last:border-b-0">
                <button
                  onClick={() => setActiveSubmenu(activeSubmenu === section.title ? null : section.title)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
                >
                  <div className="flex items-center space-x-3">
                    <section.icon className="w-5 h-5 text-gray-600" />
                    <span className="font-medium text-gray-900">{section.title}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                    activeSubmenu === section.title ? 'rotate-180' : ''
                  }`} />
                </button>
                
                {activeSubmenu === section.title && (
                  <div className="bg-gray-50 animate-submenu">
                    {section.items.map((item, itemIndex) => (
                      <button
                        key={itemIndex}
                        onClick={item.action}
                        className="w-full px-8 py-2 flex items-center space-x-3 hover:bg-gray-100 transition-colors duration-200 text-left"
                      >
                        <item.icon className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700">{item.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Profile and Logout */}
            <div className="border-t border-gray-200 mt-2 pt-2">
              <button
                onClick={() => onMenuAction('ver-perfil')}
                className="w-full px-4 py-3 flex items-center space-x-3 hover:bg-gray-50 transition-colors duration-200"
              >
                <Settings className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-900">Mi Perfil</span>
              </button>
              
              <button
                onClick={onLogout}
                className="w-full px-4 py-3 flex items-center space-x-3 hover:bg-red-50 text-red-600 transition-colors duration-200"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 animate-dropdown">
          {/* User Profile Section */}
          <div className={`p-4 bg-gradient-to-r ${getRoleColor(userRole)} text-white rounded-t-xl`}>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold">{user.name || 'Usuario'}</h3>
                <p className="text-sm opacity-75">{getRoleDisplayName(userRole)}</p>
                <p className="text-xs opacity-60">
                  {user.doctorInfo?.cedula || user.id || user.documentNumber}
                </p>
                {user.doctorInfo?.especialidad && (
                  <p className="text-xs opacity-60">{user.doctorInfo.especialidad}</p>
                )}
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            {menuItems.map((section, index) => (
              <div key={index} className="border-b border-gray-100 last:border-b-0">
                <button
                  onClick={() => setActiveSubmenu(activeSubmenu === section.title ? null : section.title)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
                >
                  <div className="flex items-center space-x-3">
                    <section.icon className="w-5 h-5 text-gray-600" />
                    <span className="font-medium text-gray-900">{section.title}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                    activeSubmenu === section.title ? 'rotate-180' : ''
                  }`} />
                </button>
                
                {activeSubmenu === section.title && (
                  <div className="bg-gray-50 animate-submenu">
                    {section.items.map((item, itemIndex) => (
                      <button
                        key={itemIndex}
                        onClick={item.action}
                        className="w-full px-8 py-2 flex items-center space-x-3 hover:bg-gray-100 transition-colors duration-200 text-left"
                      >
                        <item.icon className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700">{item.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Profile and Logout */}
            <div className="border-t border-gray-200 mt-2 pt-2">
              <button
                onClick={() => onMenuAction('ver-perfil')}
                className="w-full px-4 py-3 flex items-center space-x-3 hover:bg-gray-50 transition-colors duration-200"
              >
                <Settings className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-900">Mi Perfil</span>
              </button>
              
              <button
                onClick={onLogout}
                className="w-full px-4 py-3 flex items-center space-x-3 hover:bg-red-50 text-red-600 transition-colors duration-200"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}
      

      <style jsx>{`
        @keyframes dropdown {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes submenu {
          from {
            opacity: 0;
            max-height: 0;
          }
          to {
            opacity: 1;
            max-height: 200px;
          }
        }
        
        .animate-dropdown {
          animation: dropdown 0.2s ease-out;
        }
        
        .animate-submenu {
          animation: submenu 0.3s ease-out;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default UserMenu;