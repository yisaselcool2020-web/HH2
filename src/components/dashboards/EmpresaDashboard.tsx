import React, { useState, useEffect } from 'react';
import { Menu, X, Building2, Users, Stethoscope, BarChart3, UserPlus, Settings, FileText, Activity, Calendar, TrendingUp, Plus, Eye, CreditCard as Edit, Trash2, Download } from 'lucide-react';
import { useAPI } from '../../hooks/useAPI';
import { PDFGenerator } from '../../utils/pdfGenerator';

const EmpresaDashboard: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [doctors, setDoctors] = useState([]);
  const [stats, setStats] = useState({});
  const [showNewDoctorModal, setShowNewDoctorModal] = useState(false);
  const [especialidades, setEspecialidades] = useState([]);
  const [consultorios, setConsultorios] = useState([]);

  const api = useAPI();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [doctorsData, statsData, especialidadesData, consultoriosData] = await Promise.all([
        api.doctors.getAll(),
        api.dashboard.getStats(),
        api.especialidades.getAll(),
        api.consultorios.getAll()
      ]);
      
      setDoctors(doctorsData || []);
      setStats(statsData || {});
      setEspecialidades(especialidadesData || []);
      setConsultorios(consultoriosData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const menuItems = [
    { id: 'overview', label: 'Resumen General', icon: BarChart3 },
    { id: 'doctores', label: 'Gestión de Doctores', icon: Stethoscope },
    { id: 'nuevo-doctor', label: 'Nuevo Doctor', icon: UserPlus },
    { id: 'reportes', label: 'Reportes', icon: FileText },
    { id: 'configuracion', label: 'Configuración', icon: Settings }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewContent stats={stats} />;
      case 'doctores':
        return <DoctoresContent doctors={doctors} onRefresh={loadData} />;
      case 'nuevo-doctor':
        return <NuevoDoctorForm especialidades={especialidades} consultorios={consultorios} onSuccess={loadData} />;
      case 'reportes':
        return <ReportesContent stats={stats} doctors={doctors} />;
      case 'configuracion':
        return <ConfiguracionContent especialidades={especialidades} consultorios={consultorios} onRefresh={loadData} />;
      default:
        return <OverviewContent stats={stats} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Dirección</h2>
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
                activeTab === item.id ? 'bg-purple-50 text-purple-700 border-r-2 border-purple-500' : 'text-gray-700'
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

// Componente de resumen general
const OverviewContent: React.FC<{ stats: any }> = ({ stats }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Resumen General</h2>
      
      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Pacientes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalPatients || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Citas Hoy</p>
              <p className="text-2xl font-bold text-gray-900">{stats.todayAppointments || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <Activity className="w-8 h-8 text-red-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Triajes Pendientes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingTriages || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <Stethoscope className="w-8 h-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Consultas Hoy</p>
              <p className="text-2xl font-bold text-gray-900">{stats.todayConsultations || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos y métricas adicionales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Actividad Mensual</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Citas del Mes</span>
              <span className="text-lg font-bold text-blue-600">{stats.monthlyAppointments || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Consultas del Mes</span>
              <span className="text-lg font-bold text-green-600">{stats.monthlyConsultations || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Nuevos Pacientes</span>
              <span className="text-lg font-bold text-purple-600">{stats.newPatientsThisMonth || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Estado del Sistema</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Doctores Activos</span>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm text-green-600">En línea</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Sistema de Automatización</span>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                <span className="text-sm text-green-600">Activo</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Base de Datos</span>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm text-green-600">Conectada</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente para gestión de doctores
const DoctoresContent: React.FC<{ doctors: any[], onRefresh: () => void }> = ({ 
  doctors, onRefresh 
}) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Gestión de Doctores</h2>
        <div className="text-sm text-gray-600">
          Total: {doctors.length} doctores
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Doctor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Especialidad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Licencia
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Consultorio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {doctors.map((doctor) => (
                <tr key={doctor._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <Stethoscope className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          Dr. {doctor.nombre} {doctor.apellido}
                        </div>
                        <div className="text-sm text-gray-500">
                          {doctor.cedula}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {doctor.especialidad}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {doctor.numeroLicencia}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {doctor.consultorio?.numero} - {doctor.consultorio?.nombre}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      doctor.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {doctor.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button className="text-blue-600 hover:text-blue-900">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="text-green-600 hover:text-green-900">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="text-red-600 hover:text-red-900">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {doctors.length === 0 && (
        <div className="text-center py-12">
          <Stethoscope className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay doctores registrados</h3>
          <p className="text-gray-600">Comience agregando doctores al sistema.</p>
        </div>
      )}
    </div>
  );
};

// Componente para nuevo doctor
const NuevoDoctorForm: React.FC<{ 
  especialidades: any[], 
  consultorios: any[], 
  onSuccess: () => void 
}> = ({ especialidades, consultorios, onSuccess }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    cedula: '',
    email: '',
    telefono: '',
    especialidadId: '',
    consultorioId: '',
    numeroLicencia: '',
    password: ''
  });

  const api = useAPI();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.doctors.create(formData);
      onSuccess();
      setFormData({
        nombre: '',
        apellido: '',
        cedula: '',
        email: '',
        telefono: '',
        especialidadId: '',
        consultorioId: '',
        numeroLicencia: '',
        password: ''
      });
    } catch (error) {
      console.error('Error creating doctor:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Registrar Nuevo Doctor</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre *
              </label>
              <input
                type="text"
                required
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Apellido *
              </label>
              <input
                type="text"
                required
                value={formData.apellido}
                onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cédula *
              </label>
              <input
                type="text"
                required
                value={formData.cedula}
                onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono *
              </label>
              <input
                type="tel"
                required
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de Licencia *
              </label>
              <input
                type="text"
                required
                value={formData.numeroLicencia}
                onChange={(e) => setFormData({ ...formData, numeroLicencia: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Especialidad *
              </label>
              <select
                required
                value={formData.especialidadId}
                onChange={(e) => setFormData({ ...formData, especialidadId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Seleccionar especialidad</option>
                {especialidades.map((esp) => (
                  <option key={esp._id} value={esp._id}>
                    {esp.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Consultorio *
              </label>
              <select
                required
                value={formData.consultorioId}
                onChange={(e) => setFormData({ ...formData, consultorioId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Seleccionar consultorio</option>
                {consultorios.map((cons) => (
                  <option key={cons._id} value={cons._id}>
                    {cons.numero} - {cons.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña *
            </label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Contraseña para acceso al sistema"
            />
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => setFormData({
                nombre: '',
                apellido: '',
                cedula: '',
                email: '',
                telefono: '',
                especialidadId: '',
                consultorioId: '',
                numeroLicencia: '',
                password: ''
              })}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Limpiar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Registrar Doctor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Componente para reportes
const ReportesContent: React.FC<{ stats: any, doctors: any[] }> = ({ stats, doctors }) => {
  const generateReport = async () => {
    try {
      const blob = await PDFGenerator.generateCompanyReportPDF(stats, doctors);
      PDFGenerator.downloadPDF(blob, `reporte-empresa-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Reportes y Análisis</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <FileText className="w-8 h-8 text-blue-500" />
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Reporte General</h3>
              <p className="text-sm text-gray-600">Estadísticas completas del sistema</p>
            </div>
          </div>
          <button
            onClick={generateReport}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Generar PDF</span>
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <TrendingUp className="w-8 h-8 text-green-500" />
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Análisis Mensual</h3>
              <p className="text-sm text-gray-600">Tendencias y métricas del mes</p>
            </div>
          </div>
          <button className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Generar PDF</span>
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <BarChart3 className="w-8 h-8 text-purple-500" />
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Dashboard Ejecutivo</h3>
              <p className="text-sm text-gray-600">Resumen para directivos</p>
            </div>
          </div>
          <button className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 flex items-center justify-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Generar PDF</span>
          </button>
        </div>
      </div>

      {/* Métricas detalladas */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Métricas Detalladas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.totalPatients || 0}</p>
            <p className="text-sm text-gray-600">Total Pacientes</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{stats.monthlyAppointments || 0}</p>
            <p className="text-sm text-gray-600">Citas del Mes</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{doctors.length}</p>
            <p className="text-sm text-gray-600">Doctores Activos</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{stats.monthlyConsultations || 0}</p>
            <p className="text-sm text-gray-600">Consultas del Mes</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente para configuración
const ConfiguracionContent: React.FC<{ 
  especialidades: any[], 
  consultorios: any[], 
  onRefresh: () => void 
}> = ({ especialidades, consultorios, onRefresh }) => {
  const [showNewEspecialidadModal, setShowNewEspecialidadModal] = useState(false);
  const [showNewConsultorioModal, setShowNewConsultorioModal] = useState(false);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Configuración del Sistema</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Especialidades */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Especialidades</h3>
            <button
              onClick={() => setShowNewEspecialidadModal(true)}
              className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
            >
              <Plus className="w-4 h-4 inline mr-1" />
              Agregar
            </button>
          </div>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {especialidades.map((esp) => (
              <div key={esp._id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm">{esp.nombre}</span>
                <div className="space-x-2">
                  <button className="text-blue-600 hover:text-blue-800">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="text-red-600 hover:text-red-800">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Consultorios */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Consultorios</h3>
            <button
              onClick={() => setShowNewConsultorioModal(true)}
              className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
            >
              <Plus className="w-4 h-4 inline mr-1" />
              Agregar
            </button>
          </div>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {consultorios.map((cons) => (
              <div key={cons._id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div>
                  <span className="text-sm font-medium">{cons.numero}</span>
                  <span className="text-sm text-gray-600 ml-2">{cons.nombre}</span>
                </div>
                <div className="space-x-2">
                  <button className="text-blue-600 hover:text-blue-800">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="text-red-600 hover:text-red-800">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Configuración del sistema */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Configuración General</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Sistema de Automatización</p>
              <p className="text-sm text-gray-600">Activar notificaciones automáticas</p>
            </div>
            <button className="bg-green-500 relative inline-flex h-6 w-11 items-center rounded-full">
              <span className="translate-x-6 inline-block h-4 w-4 transform rounded-full bg-white transition"></span>
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Recordatorios de Citas</p>
              <p className="text-sm text-gray-600">Enviar recordatorios 24h antes</p>
            </div>
            <button className="bg-green-500 relative inline-flex h-6 w-11 items-center rounded-full">
              <span className="translate-x-6 inline-block h-4 w-4 transform rounded-full bg-white transition"></span>
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Asignación Automática</p>
              <p className="text-sm text-gray-600">Asignar pacientes automáticamente</p>
            </div>
            <button className="bg-gray-200 relative inline-flex h-6 w-11 items-center rounded-full">
              <span className="translate-x-1 inline-block h-4 w-4 transform rounded-full bg-white transition"></span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmpresaDashboard;