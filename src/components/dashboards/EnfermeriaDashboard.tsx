import React, { useState, useEffect } from 'react';
import { Menu, X, Heart, Activity, Shield, Users, Plus, Eye, CreditCard as Edit, AlertTriangle, Clock, Thermometer, Zap, Droplets } from 'lucide-react';
import { useAPI } from '../../hooks/useAPI';

const EnfermeriaDashboard: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('triajes');
  const [triages, setTriages] = useState([]);
  const [patients, setPatients] = useState([]);
  const [showNewTriageModal, setShowNewTriageModal] = useState(false);

  const api = useAPI();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [triagesData, patientsData] = await Promise.all([
        api.triage.getAll(),
        api.patients.getAll()
      ]);
      
      setTriages(triagesData || []);
      setPatients(patientsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const menuItems = [
    { id: 'triajes', label: 'Triajes del Día', icon: Activity },
    { id: 'nuevo-triaje', label: 'Nuevo Triaje', icon: Heart },
    { id: 'estadisticas', label: 'Estadísticas', icon: Shield },
    { id: 'pacientes', label: 'Pacientes', icon: Users }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'triajes':
        return <TriagesContent triages={triages} onRefresh={loadData} />;
      case 'nuevo-triaje':
        return <NuevoTriageForm patients={patients} onSuccess={loadData} />;
      case 'estadisticas':
        return <EstadisticasContent triages={triages} />;
      case 'pacientes':
        return <PacientesTriageContent patients={patients} />;
      default:
        return <TriagesContent triages={triages} onRefresh={loadData} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Enfermería</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="mt-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center px-4 py-3 text-left hover:bg-gray-100 transition-colors ${
                activeTab === item.id ? 'bg-red-50 text-red-700 border-r-2 border-red-500' : 'text-gray-700'
              }`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 mr-2"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                {menuItems.find(item => item.id === activeTab)?.label || 'Dashboard'}
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                {new Date().toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

// Componente para triajes del día
const TriagesContent: React.FC<{ triages: any[], onRefresh: () => void }> = ({ 
  triages, onRefresh 
}) => {
  const todayTriages = triages.filter(triage => {
    const today = new Date().toDateString();
    return new Date(triage.fechaHora).toDateString() === today;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta': return 'border-red-500 bg-red-50';
      case 'media': return 'border-yellow-500 bg-yellow-50';
      case 'baja': return 'border-green-500 bg-green-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'alta': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'media': return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'baja': return <Shield className="w-5 h-5 text-green-500" />;
      default: return <Activity className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Triajes del Día</h2>
        <div className="text-sm text-gray-600">
          Total: {todayTriages.length} triajes
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {todayTriages.map((triage) => (
          <div key={triage._id} className={`bg-white rounded-lg shadow-md p-4 border-l-4 ${getPriorityColor(triage.prioridad)}`}>
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center space-x-2">
                {getPriorityIcon(triage.prioridad)}
                <h3 className="font-semibold text-gray-900">
                  {triage.pacienteId?.nombre} {triage.pacienteId?.apellido}
                </h3>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                triage.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                triage.estado === 'en_proceso' ? 'bg-blue-100 text-blue-800' :
                'bg-green-100 text-green-800'
              }`}>
                {triage.estado.replace('_', ' ')}
              </span>
            </div>
            
            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                {new Date(triage.fechaHora).toLocaleTimeString('es-ES', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
              <div className="text-xs">
                <strong>Síntomas:</strong> {triage.sintomas}
              </div>
            </div>

            {/* Signos Vitales */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <h4 className="text-xs font-medium text-gray-700 mb-2">Signos Vitales</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center">
                  <Droplets className="w-3 h-3 mr-1 text-red-500" />
                  PA: {triage.signosVitales?.presionArterial}
                </div>
                <div className="flex items-center">
                  <Thermometer className="w-3 h-3 mr-1 text-orange-500" />
                  T: {triage.signosVitales?.temperatura}°C
                </div>
                <div className="flex items-center">
                  <Heart className="w-3 h-3 mr-1 text-pink-500" />
                  FC: {triage.signosVitales?.pulso} bpm
                </div>
                <div className="flex items-center">
                  <Zap className="w-3 h-3 mr-1 text-blue-500" />
                  SpO2: {triage.signosVitales?.saturacionOxigeno}%
                </div>
              </div>
            </div>

            <div className="flex space-x-2">
              <button className="flex-1 bg-blue-50 text-blue-600 py-2 px-3 rounded text-sm hover:bg-blue-100">
                <Eye className="w-4 h-4 inline mr-1" />
                Ver
              </button>
              <button className="flex-1 bg-green-50 text-green-600 py-2 px-3 rounded text-sm hover:bg-green-100">
                <Edit className="w-4 h-4 inline mr-1" />
                Editar
              </button>
            </div>
          </div>
        ))}
      </div>

      {todayTriages.length === 0 && (
        <div className="text-center py-12">
          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay triajes registrados</h3>
          <p className="text-gray-600">No hay triajes registrados para hoy.</p>
        </div>
      )}
    </div>
  );
};

// Componente para nuevo triaje
const NuevoTriageForm: React.FC<{ patients: any[], onSuccess: () => void }> = ({ 
  patients, onSuccess 
}) => {
  const [formData, setFormData] = useState({
    pacienteId: '',
    sintomas: '',
    prioridad: 'media',
    signosVitales: {
      presionArterial: '',
      temperatura: '',
      pulso: '',
      saturacionOxigeno: '',
      frecuenciaRespiratoria: ''
    },
    observaciones: ''
  });

  const api = useAPI();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.triage.create({
        ...formData,
        signosVitales: {
          ...formData.signosVitales,
          temperatura: parseFloat(formData.signosVitales.temperatura),
          pulso: parseInt(formData.signosVitales.pulso),
          saturacionOxigeno: parseInt(formData.signosVitales.saturacionOxigeno),
          frecuenciaRespiratoria: formData.signosVitales.frecuenciaRespiratoria ? 
            parseInt(formData.signosVitales.frecuenciaRespiratoria) : undefined
        }
      });
      onSuccess();
      // Reset form
      setFormData({
        pacienteId: '',
        sintomas: '',
        prioridad: 'media',
        signosVitales: {
          presionArterial: '',
          temperatura: '',
          pulso: '',
          saturacionOxigeno: '',
          frecuenciaRespiratoria: ''
        },
        observaciones: ''
      });
    } catch (error) {
      console.error('Error creating triage:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Nuevo Triaje</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paciente *
              </label>
              <select
                required
                value={formData.pacienteId}
                onChange={(e) => setFormData({ ...formData, pacienteId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="">Seleccionar paciente</option>
                {patients.map((patient) => (
                  <option key={patient._id} value={patient._id}>
                    {patient.nombre} {patient.apellido} - {patient.cedula}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prioridad *
              </label>
              <select
                value={formData.prioridad}
                onChange={(e) => setFormData({ ...formData, prioridad: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Síntomas *
            </label>
            <textarea
              required
              value={formData.sintomas}
              onChange={(e) => setFormData({ ...formData, sintomas: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Describa los síntomas del paciente..."
            />
          </div>

          {/* Signos Vitales */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Signos Vitales</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Presión Arterial *
                </label>
                <input
                  type="text"
                  required
                  value={formData.signosVitales.presionArterial}
                  onChange={(e) => setFormData({
                    ...formData,
                    signosVitales: { ...formData.signosVitales, presionArterial: e.target.value }
                  })}
                  placeholder="120/80"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temperatura (°C) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={formData.signosVitales.temperatura}
                  onChange={(e) => setFormData({
                    ...formData,
                    signosVitales: { ...formData.signosVitales, temperatura: e.target.value }
                  })}
                  placeholder="36.5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pulso (bpm) *
                </label>
                <input
                  type="number"
                  required
                  value={formData.signosVitales.pulso}
                  onChange={(e) => setFormData({
                    ...formData,
                    signosVitales: { ...formData.signosVitales, pulso: e.target.value }
                  })}
                  placeholder="72"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Saturación O2 (%) *
                </label>
                <input
                  type="number"
                  required
                  value={formData.signosVitales.saturacionOxigeno}
                  onChange={(e) => setFormData({
                    ...formData,
                    signosVitales: { ...formData.signosVitales, saturacionOxigeno: e.target.value }
                  })}
                  placeholder="98"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Frecuencia Respiratoria (rpm)
                </label>
                <input
                  type="number"
                  value={formData.signosVitales.frecuenciaRespiratoria}
                  onChange={(e) => setFormData({
                    ...formData,
                    signosVitales: { ...formData.signosVitales, frecuenciaRespiratoria: e.target.value }
                  })}
                  placeholder="16"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observaciones
            </label>
            <textarea
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Observaciones adicionales..."
            />
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => setFormData({
                pacienteId: '',
                sintomas: '',
                prioridad: 'media',
                signosVitales: {
                  presionArterial: '',
                  temperatura: '',
                  pulso: '',
                  saturacionOxigeno: '',
                  frecuenciaRespiratoria: ''
                },
                observaciones: ''
              })}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Limpiar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Registrar Triaje
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Componente para estadísticas
const EstadisticasContent: React.FC<{ triages: any[] }> = ({ triages }) => {
  const todayTriages = triages.filter(triage => {
    const today = new Date().toDateString();
    return new Date(triage.fechaHora).toDateString() === today;
  });

  const stats = {
    total: todayTriages.length,
    alta: todayTriages.filter(t => t.prioridad === 'alta').length,
    media: todayTriages.filter(t => t.prioridad === 'media').length,
    baja: todayTriages.filter(t => t.prioridad === 'baja').length,
    pendientes: todayTriages.filter(t => t.estado === 'pendiente').length,
    enProceso: todayTriages.filter(t => t.estado === 'en_proceso').length,
    completados: todayTriages.filter(t => t.estado === 'completado').length
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Estadísticas de Triaje</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <Activity className="w-8 h-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Triajes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Prioridad Alta</p>
              <p className="text-2xl font-bold text-red-600">{stats.alta}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pendientes</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pendientes}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <Shield className="w-8 h-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completados</p>
              <p className="text-2xl font-bold text-green-600">{stats.completados}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Distribución por prioridad */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Distribución por Prioridad</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-red-600">Alta</span>
            <div className="flex-1 mx-4 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-red-500 h-2 rounded-full" 
                style={{ width: `${stats.total > 0 ? (stats.alta / stats.total) * 100 : 0}%` }}
              ></div>
            </div>
            <span className="text-sm text-gray-600">{stats.alta}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-yellow-600">Media</span>
            <div className="flex-1 mx-4 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-yellow-500 h-2 rounded-full" 
                style={{ width: `${stats.total > 0 ? (stats.media / stats.total) * 100 : 0}%` }}
              ></div>
            </div>
            <span className="text-sm text-gray-600">{stats.media}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-green-600">Baja</span>
            <div className="flex-1 mx-4 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full" 
                style={{ width: `${stats.total > 0 ? (stats.baja / stats.total) * 100 : 0}%` }}
              ></div>
            </div>
            <span className="text-sm text-gray-600">{stats.baja}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente para pacientes en triaje
const PacientesTriageContent: React.FC<{ patients: any[] }> = ({ patients }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Pacientes Registrados</h2>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paciente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cédula
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Edad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teléfono
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {patients.map((patient) => (
                <tr key={patient._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {patient.nombre} {patient.apellido}
                        </div>
                        <div className="text-sm text-gray-500">
                          {patient.genero === 'M' ? 'Masculino' : 'Femenino'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {patient.cedula}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {patient.fechaNacimiento ? 
                      Math.floor((Date.now() - new Date(patient.fechaNacimiento).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) 
                      : 'N/A'} años
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {patient.telefono}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-red-600 hover:text-red-900 mr-3">
                      <Heart className="w-4 h-4 inline mr-1" />
                      Triaje
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EnfermeriaDashboard;