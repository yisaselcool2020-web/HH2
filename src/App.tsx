import { useState } from 'react';
import { useEffect } from 'react';
import { automationService } from './services/automationService';
import NotificationCenter from './components/NotificationCenter';
import UserMenu from './components/UserMenu';
import EmpresaDashboard from './components/dashboards/EmpresaDashboard';
import RecepcionDashboard from './components/dashboards/RecepcionDashboard';
import ConsultorioDashboard from './components/dashboards/ConsultorioDashboard';
import EnfermeriaDashboard from './components/dashboards/EnfermeriaDashboard';
import DoctorDashboard from './components/dashboards/DoctorDashboard';
import Login from './components/Login';

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

function App() {
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    // Verificar si hay una sesión activa al cargar la aplicación
    const checkExistingSession = () => {
      try {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        
        if (token && user) {
          const userData = JSON.parse(user);
          console.log('Existing session found:', userData);
          setUserRole(userData.role);
        }
      } catch (error) {
        console.error('Error checking existing session:', error);
        // Limpiar datos corruptos
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };

    checkExistingSession();
    
    // Inicializar sistema de automatización
    console.log('🚀 Iniciando sistema de automatización SAVISER...');
    
    // Listener para notificaciones del sistema
    const handleSystemNotification = () => {
      setNotificationCount(prev => prev + 1);
    };
    
    window.addEventListener('system_notification', handleSystemNotification);
    
    // Cleanup al desmontar
    return () => {
      window.removeEventListener('system_notification', handleSystemNotification);
      automationService.cleanup();
    };
  }, []);

  const handleLogin = (role) => {
    console.log('Login successful, setting role:', role);
    
    // Verificar si es un doctor y redirigir al dashboard correcto
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role === 'doctor') {
      setUserRole('doctor');
    } else if (user.role === 'consultorio') {
      // Mantener compatibilidad con el rol consultorio existente
      setUserRole('consultorio');
    } else {
      setUserRole(role);
    }
  };

  const handleLogout = () => {
    console.log('Logging out user');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('hasShownWelcome');
    setUserRole(null);
  };

  const handleNotificationRead = (id: string) => {
    setNotificationCount(prev => Math.max(0, prev - 1));
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  const renderDashboard = () => {
    switch (userRole) {
      case 'empresa':
        return <EmpresaDashboard />;
      case 'recepcion':
        return <RecepcionDashboard />;
      case 'consultorio':
        return <ConsultorioDashboard />;
      case 'enfermeria':
        return <EnfermeriaDashboard />;
      case 'doctor':
        return <DoctorDashboard />;
      default:
        return <Login onLogin={handleLogin} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {userRole && (
        <div className={`bg-gradient-to-r ${getRoleColor(userRole)} shadow-lg`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div>
                <span className="text-xl font-semibold text-white">
                  Sistema de Gestión Médica
                </span>
              </div>
              <UserMenu 
                userRole={userRole} 
                onLogout={handleLogout}
                notificationCount={notificationCount}
                onShowNotifications={() => setShowNotifications(true)}
                onMenuAction={(action, data) => {
                  // Pasar la acción al dashboard correspondiente
                  const event = new CustomEvent('menuAction', { detail: { action, data } });
                  window.dispatchEvent(event);
                }}
              />
            </div>
          </div>
        </div>
      )}
      {renderDashboard()}
      
      {/* Centro de Notificaciones */}
      <NotificationCenter
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onNotificationRead={handleNotificationRead}
      />
    </div>
  );
}

export default App;