import React, { useState, useEffect } from 'react';
import { Menu, X, Stethoscope, Activity, FileText, Users, Plus, Eye, CreditCard as Edit, Clock, Heart, AlertTriangle } from 'lucide-react';
import { useAPI } from '../../hooks/useAPI';

const ConsultorioDashboard: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('triajes-pendientes');
  const [triages, setTriages] = useState([]);
  const [consultations, setConsultations] = useState([]);

  const api = useAPI();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [triagesData, consultationsData] = await Promise.all([
        api.consultations.getPendingTriages(),
        api.consultations.getAll()
      ]);
      
      setTriages(triagesData || []);
      setConsultations(consultationsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const menuItems = [
    { id: 'triajes-pendientes', label: 'Triajes Pendientes', icon: Activity },
    { id: 'nueva-consulta', label: 'Nueva Consulta', icon: Stethoscope },
    { id: 'historial', label: 'Historial', icon: FileText },
    { id: 'pacientes', label: 'Pacientes', icon: Users }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'triajes-pendientes':
        return <TriagesPendientesContent triages={triages} onRefresh={loadData} />;
      case 'nueva-consulta':
        return <NuevaConsultaContent triages={triages} onSuccess={loadData} />;
      case 'historial':
        return <HistorialContent consultations={consultations} />;
      case 'pacientes':
        return <PacientesContent />;
      default:
        return <TriagesPendientesContent triages={triages} onRefresh={loadData} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Consultorio</h2>
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
                activeTab === item.id ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-500' : 'text-gray-700'
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

// Componente para triajes pendientes
const TriagesPendientesContent: React.FC<{ 
  triages: any[], 
  onRefresh: () => void 
}> = ({ triages, onRefresh }) => {
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
      case 'baja': return <Activity className="w-5 h-5 text-green-500" />;
      default: return <Activity className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Triajes Pendientes</h2>
        <div className="text-sm text-gray-600">
          Total: {triages.length} triajes pendientes
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {triages.map((triage) => (
          <div key={triage._id} className={`bg-white rounded-lg shadow-md p-4 border-l-4 ${getPriorityColor(triage.prioridad)}`}>
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center space-x-2">
                {getPriorityIcon(triage.prioridad)}
                <h3 className="font-semibold text-gray-900">
                  {triage.pacienteId?.nombre} {triage.pacienteId?.apellido}
                </h3>
              </div>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                Pendiente
              </span>
            </div>
            
            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                {new Date(triage.fechaHora).toLocaleString('es-ES')}
              </div>
              <div className="text-xs">
                <strong>Síntomas:</strong> {triage.sintomas}
              </div>
              <div className="text-xs">
                <strong>C.I:</strong> {triage.pacienteId?.cedula}
              </div>
            </div>

            {/* Signos Vitales Resumidos */}
            <div className="bg-gray-50 rounded-lg p-2 mb-4">
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div>PA: {triage.signosVitales?.presionArterial}</div>
                <div>T: {triage.signosVitales?.temperatura}°C</div>
                <div>FC: {triage.signosVitales?.pulso} bpm</div>
                <div>SpO2: {triage.signosVitales?.saturacionOxigeno}%</div>
              </div>
            </div>

            <div className="flex space-x-2">
              <button className="flex-1 bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700">
                <Stethoscope className="w-4 h-4 inline mr-1" />
                Consultar
              </button>
              <button className="bg-gray-200 text-gray-700 py-2 px-3 rounded text-sm hover:bg-gray-300">
                <Eye className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {triages.length === 0 && (
        <div className="text-center py-12">
          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay triajes pendientes</h3>
          <p className="text-gray-600">Todos los triajes han sido procesados.</p>
        </div>
      )}
    </div>
  );
};

// Componente para nueva consulta
const NuevaConsultaContent: React.FC<{ 
  triages: any[], 
  onSuccess: () => void 
}> = ({ triages, onSuccess }) => {
  const [selectedTriage, setSelectedTriage] = useState<any>(null);
  const [formData, setFormData] = useState({
    motivoConsulta: '',
    anamnesis: '',
    examenFisico: '',
    diagnostico: '',
    tratamiento: '',
    medicamentos: [{ nombre: '', dosis: '', frecuencia: '', duracion: '' }],
    examenes: [{ tipo: '', descripcion: '', urgente: false }],
    observaciones: ''
  });

  const api = useAPI();

  const handleTriageSelect = (triage: any) => {
    setSelectedTriage(triage);
    setFormData({
      ...formData,
      motivoConsulta: triage.sintomas || ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTriage) return;

    try {
      await api.consultations.create({
        ...formData,
        pacienteId: selectedTriage.pacienteId._id,
        triageId: selectedTriage._id
      });
      
      onSuccess();
      setSelectedTriage(null);
      setFormData({
        motivoConsulta: '',
        anamnesis: '',
        examenFisico: '',
        diagnostico: '',
        tratamiento: '',
        medicamentos: [{ nombre: '', dosis: '', frecuencia: '', duracion: '' }],
        examenes: [{ tipo: '', descripcion: '', urgente: false }],
        observaciones: ''
      });
    } catch (error) {
      console.error('Error creating consultation:', error);
    }
  };

  if (!selectedTriage) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Seleccionar Paciente para Consulta</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {triages.map((triage) => (
            <div key={triage._id} className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
              <h3 className="font-semibold text-gray-900 mb-2">
                {triage.pacienteId?.nombre} {triage.pacienteId?.apellido}
              </h3>
              
              <div className="space-y-1 text-sm text-gray-600 mb-4">
                <div>C.I: {triage.pacienteId?.cedula}</div>
                <div>Prioridad: <span className={`font-medium ${
                  triage.prioridad === 'alta' ? 'text-red-600' :
                  triage.prioridad === 'media' ? 'text-yellow-600' :
                  'text-green-600'
                }`}>{triage.prioridad}</span></div>
                <div className="text-xs">Síntomas: {triage.sintomas}</div>
              </div>

              <button
                onClick={() => handleTriageSelect(triage)}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
              >
                Iniciar Consulta
              </button>
            </div>
          ))}
        </div>

        {triages.length === 0 && (
          <div className="text-center py-12">
            <Stethoscope className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay triajes disponibles</h3>
            <p className="text-gray-600">No hay pacientes pendientes para consulta.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Consulta - {selectedTriage.pacienteId.nombre} {selectedTriage.pacienteId.apellido}
          </h2>
          <button
            onClick={() => setSelectedTriage(null)}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Información del triaje */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-gray-900 mb-2">Información del Triaje</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Prioridad:</strong> <span className={`${
                selectedTriage.prioridad === 'alta' ? 'text-red-600' :
                selectedTriage.prioridad === 'media' ? 'text-yellow-600' :
                'text-green-600'
              }`}>{selectedTriage.prioridad}</span>
            </div>
            <div><strong>Fecha:</strong> {new Date(selectedTriage.fechaHora).toLocaleString('es-ES')}</div>
            <div className="md:col-span-2"><strong>Síntomas:</strong> {selectedTriage.sintomas}</div>
          </div>
          
          <div className="mt-3">
            <strong className="text-sm">Signos Vitales:</strong>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1 text-sm">
              <div>PA: {selectedTriage.signosVitales?.presionArterial}</div>
              <div>T: {selectedTriage.signosVitales?.temperatura}°C</div>
              <div>FC: {selectedTriage.signosVitales?.pulso} bpm</div>
              <div>SpO2: {selectedTriage.signosVitales?.saturacionOxigeno}%</div>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motivo de Consulta *
            </label>
            <textarea
              required
              value={formData.motivoConsulta}
              onChange={(e) => setFormData({ ...formData, motivoConsulta: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Anamnesis *
            </label>
            <textarea
              required
              value={formData.anamnesis}
              onChange={(e) => setFormData({ ...formData, anamnesis: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Historia clínica del paciente, síntomas actuales..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Examen Físico *
            </label>
            <textarea
              required
              value={formData.examenFisico}
              onChange={(e) => setFormData({ ...formData, examenFisico: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Hallazgos del examen físico..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Diagnóstico *
              </label>
              <textarea
                required
                value={formData.diagnostico}
                onChange={(e) => setFormData({ ...formData, diagnostico: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tratamiento *
              </label>
              <textarea
                required
                value={formData.tratamiento}
                onChange={(e) => setFormData({ ...formData, tratamiento: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => setSelectedTriage(null)}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Guardar Consulta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Componente para historial
const HistorialContent: React.FC<{ consultations: any[] }> = ({ consultations }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Historial de Consultas</h2>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paciente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Diagnóstico
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {consultations.map((consultation) => (
                <tr key={consultation._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(consultation.fechaHora).toLocaleDateString('es-ES')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {consultation.pacienteId?.nombre} {consultation.pacienteId?.apellido}
                    </div>
                    <div className="text-sm text-gray-500">
                      {consultation.pacienteId?.cedula}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-xs truncate">
                      {consultation.diagnostico}
                    </div>
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
    </div>
  );
};

// Componente para pacientes
const PacientesContent: React.FC = () => {
  const [patients, setPatients] = useState([]);
  const api = useAPI();

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      const patientsData = await api.patients.getAll();
      setPatients(patientsData || []);
    } catch (error) {
      console.error('Error loading patients:', error);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Pacientes</h2>
      
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
              {patients.map((patient: any) => (
                <tr key={patient._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button className="text-blue-600 hover:text-blue-900">
                      <Eye className="w-4 h-4" />
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

export default ConsultorioDashboard;