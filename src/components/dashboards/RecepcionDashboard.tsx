import React, { useState, useEffect } from 'react';
import { Menu, X, Calendar, Users, UserPlus, Search, Clock, Phone, MapPin, Filter, Plus, Eye, CreditCard as Edit, Trash2 } from 'lucide-react';
import { useAPI } from '../../hooks/useAPI';

const RecepcionDashboard: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('citas');
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);

  const api = useAPI();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [patientsData, appointmentsData, doctorsData] = await Promise.all([
        api.patients.getAll(),
        api.appointments.getAll(),
        api.doctors.getAll()
      ]);
      
      setPatients(patientsData || []);
      setAppointments(appointmentsData || []);
      setDoctors(doctorsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const menuItems = [
    { id: 'citas', label: 'Gestión de Citas', icon: Calendar },
    { id: 'pacientes', label: 'Pacientes', icon: Users },
    { id: 'nuevo-paciente', label: 'Nuevo Paciente', icon: UserPlus },
    { id: 'buscar', label: 'Buscar', icon: Search }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'citas':
        return <CitasContent appointments={appointments} doctors={doctors} onRefresh={loadData} />;
      case 'pacientes':
        return <PacientesContent patients={patients} searchTerm={searchTerm} onRefresh={loadData} />;
      case 'nuevo-paciente':
        return <NuevoPacienteForm onSuccess={loadData} />;
      case 'buscar':
        return <BuscarContent patients={patients} setSearchTerm={setSearchTerm} />;
      default:
        return <CitasContent appointments={appointments} doctors={doctors} onRefresh={loadData} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Recepción</h2>
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
                activeTab === item.id ? 'bg-green-50 text-green-700 border-r-2 border-green-500' : 'text-gray-700'
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

// Componente para gestión de citas
const CitasContent: React.FC<{ appointments: any[], doctors: any[], onRefresh: () => void }> = ({ 
  appointments, doctors, onRefresh 
}) => {
  const [showNewModal, setShowNewModal] = useState(false);
  const api = useAPI();

  const todayAppointments = appointments.filter(apt => {
    const today = new Date().toDateString();
    return new Date(apt.fechaHora).toDateString() === today;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Citas del Día</h2>
        <button
          onClick={() => setShowNewModal(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Cita</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {todayAppointments.map((appointment) => (
          <div key={appointment._id} className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-gray-900">
                {appointment.pacienteId?.nombre} {appointment.pacienteId?.apellido}
              </h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                appointment.estado === 'programada' ? 'bg-blue-100 text-blue-800' :
                appointment.estado === 'confirmada' ? 'bg-green-100 text-green-800' :
                appointment.estado === 'completada' ? 'bg-gray-100 text-gray-800' :
                'bg-red-100 text-red-800'
              }`}>
                {appointment.estado}
              </span>
            </div>
            
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                {new Date(appointment.fechaHora).toLocaleTimeString('es-ES', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Dr. {appointment.medicoId?.nombre} {appointment.medicoId?.apellido}
              </div>
              <div className="flex items-center">
                <Phone className="w-4 h-4 mr-2" />
                {appointment.pacienteId?.telefono}
              </div>
            </div>

            <div className="mt-4 flex space-x-2">
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

      {todayAppointments.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay citas programadas</h3>
          <p className="text-gray-600">No hay citas programadas para hoy.</p>
        </div>
      )}

      {showNewModal && (
        <NuevaCitaModal 
          doctors={doctors}
          onClose={() => setShowNewModal(false)}
          onSuccess={() => {
            setShowNewModal(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
};

// Componente para gestión de pacientes
const PacientesContent: React.FC<{ 
  patients: any[], 
  searchTerm: string, 
  onRefresh: () => void 
}> = ({ patients, searchTerm, onRefresh }) => {
  const filteredPatients = patients.filter(patient =>
    patient.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.apellido?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.cedula?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Pacientes Registrados</h2>
        <div className="text-sm text-gray-600">
          Total: {filteredPatients.length} pacientes
        </div>
      </div>

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
                  Teléfono
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Edad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPatients.map((patient) => (
                <tr key={patient._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-gray-500" />
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
                    {patient.telefono}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {patient.fechaNacimiento ? 
                      Math.floor((Date.now() - new Date(patient.fechaNacimiento).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) 
                      : 'N/A'} años
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button className="text-blue-600 hover:text-blue-900">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="text-green-600 hover:text-green-900">
                      <Edit className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredPatients.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron pacientes</h3>
          <p className="text-gray-600">
            {searchTerm ? 'No hay pacientes que coincidan con la búsqueda.' : 'No hay pacientes registrados.'}
          </p>
        </div>
      )}
    </div>
  );
};

// Componente para nuevo paciente
const NuevoPacienteForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    cedula: '',
    fechaNacimiento: '',
    telefono: '',
    genero: 'M',
    direccion: '',
    email: ''
  });

  const api = useAPI();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.patients.create(formData);
      onSuccess();
      setFormData({
        nombre: '',
        apellido: '',
        cedula: '',
        fechaNacimiento: '',
        telefono: '',
        genero: 'M',
        direccion: '',
        email: ''
      });
    } catch (error) {
      console.error('Error creating patient:', error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Registrar Nuevo Paciente</h2>
        
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Nacimiento *
              </label>
              <input
                type="date"
                required
                value={formData.fechaNacimiento}
                onChange={(e) => setFormData({ ...formData, fechaNacimiento: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Género *
              </label>
              <select
                value={formData.genero}
                onChange={(e) => setFormData({ ...formData, genero: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dirección
            </label>
            <input
              type="text"
              value={formData.direccion}
              onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => setFormData({
                nombre: '',
                apellido: '',
                cedula: '',
                fechaNacimiento: '',
                telefono: '',
                genero: 'M',
                direccion: '',
                email: ''
              })}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Limpiar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Registrar Paciente
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Componente para búsqueda
const BuscarContent: React.FC<{ 
  patients: any[], 
  setSearchTerm: (term: string) => void 
}> = ({ patients, setSearchTerm }) => {
  const [localSearchTerm, setLocalSearchTerm] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(localSearchTerm);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Buscar Pacientes</h2>
        
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar por nombre, apellido o cédula
            </label>
            <div className="flex space-x-4">
              <input
                type="text"
                value={localSearchTerm}
                onChange={(e) => setLocalSearchTerm(e.target.value)}
                placeholder="Ingrese nombre, apellido o cédula..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
              >
                <Search className="w-4 h-4" />
                <span>Buscar</span>
              </button>
            </div>
          </div>
        </form>

        <div className="mt-6 text-sm text-gray-600">
          <p>Total de pacientes registrados: {patients.length}</p>
        </div>
      </div>
    </div>
  );
};

// Modal para nueva cita
const NuevaCitaModal: React.FC<{
  doctors: any[];
  onClose: () => void;
  onSuccess: () => void;
}> = ({ doctors, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    pacienteId: '',
    medicoId: '',
    fechaHora: '',
    motivoConsulta: '',
    observaciones: ''
  });

  const api = useAPI();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.appointments.create(formData);
      onSuccess();
    } catch (error) {
      console.error('Error creating appointment:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Nueva Cita</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Médico *
            </label>
            <select
              required
              value={formData.medicoId}
              onChange={(e) => setFormData({ ...formData, medicoId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">Seleccionar médico</option>
              {doctors.map((doctor) => (
                <option key={doctor._id} value={doctor.userId}>
                  Dr. {doctor.nombre} {doctor.apellido} - {doctor.especialidad}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha y Hora *
            </label>
            <input
              type="datetime-local"
              required
              value={formData.fechaHora}
              onChange={(e) => setFormData({ ...formData, fechaHora: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motivo de Consulta *
            </label>
            <textarea
              required
              value={formData.motivoConsulta}
              onChange={(e) => setFormData({ ...formData, motivoConsulta: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Crear Cita
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecepcionDashboard;