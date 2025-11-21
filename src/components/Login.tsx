import React, { useState } from 'react';
import { User, Heart, ArrowRight } from 'lucide-react';
import ErrorModal from './ErrorModal';
import SuccessToast from './SuccessToast';
import { authAPI } from '../services/api';

interface LoginProps {
  onLogin: (role: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [step, setStep] = useState<'cedula' | 'password'>('cedula');
  const [documentType, setDocumentType] = useState('cedula');
  const [documentNumber, setDocumentNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentNumber.trim()) {
      setError('Por favor ingrese su número de identificación');
      setShowErrorModal(true);
      return;
    }
    setStep('password');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setShowErrorModal(false);

    try {
      const response = await authAPI.login({
        cedula: documentNumber,
        password
      });

      const data = response.data;
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      const hasShownWelcome = sessionStorage.getItem('hasShownWelcome');
      if (!hasShownWelcome) {
        setShowSuccessToast(true);
        sessionStorage.setItem('hasShownWelcome', 'true');
        setTimeout(() => {
          setShowSuccessToast(false);
          // Determinar el rol correcto para el dashboard
          const dashboardRole = data.user.role === 'doctor' ? 'doctor' : data.user.role;
          onLogin(dashboardRole);
        }, 70000);
      } else {
        const dashboardRole = data.user.role === 'doctor' ? 'doctor' : data.user.role;
        onLogin(dashboardRole);
      }
    } catch (error: any) {
      console.error('Error en autenticación:', error);

      let errorMessage = '';

      if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
        errorMessage = 'No se puede conectar con el servidor. Verifique que el backend esté funcionando.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Credenciales incorrectas. Verifique su número de identificación y contraseña.';
      } else if (error.response?.status === 400) {
        errorMessage = error.response?.data?.message || 'Datos inválidos. Verifique la información ingresada.';
      } else {
        errorMessage = error.response?.data?.message || 'Error de conexión. Intente nuevamente.';
      }

      setError(errorMessage);
      setShowErrorModal(true);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl flex items-center justify-between gap-8">
        {/* Left Side - Branding */}
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-6">
            <img
              src="/SAVISER copy.png"
              alt="SAVISER - Salud con calidad al servicio de todos"
              className="h-70 w-auto"
            />
          </div>
          <h2 className="text-2xl font-bold text-blue-900 leading-tight">
            Servicio De Apoyo a La Vida <br />
            Del Ser Humano
          </h2>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-80">
            <div className="bg-white rounded-xl shadow-xl p-6">
              {/* User Icon */}
              <div className="text-center mb-6">
                <div className="p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center bg-blue-100">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  {step === 'cedula' ? 'Identifícate' : 'Bienvenido'}
                </h2>
                <p className="text-gray-600 text-sm">
                  {step === 'cedula'
                    ? 'Ingresa tu identificación'
                    : 'Ingresa tu contraseña'
                  }
                </p>
              </div>

              {step === 'cedula' ? (
                <form onSubmit={handleContinue} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de documento
                    </label>
                    <select
                      value={documentType}
                      onChange={(e) => setDocumentType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="cedula">Cédula de ciudadanía</option>
                      <option value="tarjeta">Tarjeta de identidad</option>
                      <option value="pasaporte">Pasaporte</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número de Identificación
                    </label>
                    <input
                      type="text"
                      required
                      value={documentNumber}
                      onChange={(e) => setDocumentNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ingrese su número de identificación"
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-lg bg-cyan-400 hover:bg-cyan-500 text-white font-medium transition-colors flex items-center justify-center space-x-2"
                  >
                    <span>Continuar</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="bg-gray-50 p-3 rounded-lg mb-4">
                    <p className="text-xs text-gray-600">Documento</p>
                    <p className="text-sm font-medium text-gray-900">{documentNumber}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setStep('cedula');
                        setPassword('');
                        setError('');
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                    >
                      Cambiar
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contraseña
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ingrese su contraseña"
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-lg bg-cyan-400 hover:bg-cyan-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Verificando...</span>
                      </div>
                    ) : (
                      'Iniciar Sesión'
                    )}
                  </button>
                </form>
              )}
            </div>
        </div>
      </div>

      {/* Error Modal */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => {
          setShowErrorModal(false);
          setError('');
        }}
        title="¡Ups, parece que algo salió mal!"
        message={error || "Las credenciales proporcionadas no son válidas"}
        buttonText="Aceptar"
        persistent={false}
      />

      {/* Success Toast */}
      <SuccessToast
        isOpen={showSuccessToast}
        onClose={() => setShowSuccessToast(false)}
        message="¡Bienvenido! Has iniciado sesión exitosamente"
      />

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default Login;