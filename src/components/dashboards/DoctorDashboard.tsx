import React, { useState, useEffect } from 'react';
import { Menu, X, Users, Stethoscope, FileText, Calendar, Clock, Heart, Activity, Plus, Eye, CreditCard as Edit, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { useAPI } from '../../hooks/useAPI';
import { PDFGenerator } from '../../utils/pdfGenerator';

const DoctorDashboard: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pacientes');
  const [assignments, setAssignments] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [stats, setStats] = useState({});
  const [showNewConsultationModal, setShowNewConsultationModal] = useState(false);

  const api = useAPI();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    loadData();
    // Polling para nuevas asignaciones
    const interval = setInterval(checkNewAssignments, 30000); // cada 30 segundos
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [assignmentsData, consultationsData, statsData] = await Promise.all([
        api.patientAssignments.getDoctorAssignments(),
        api.consultations.getAll(),
        api.patientAssignments.getStats()
      ]);
      
      setAssignments(assignmentsData || []);
      setConsultations(consultationsData || []);
      setStats(statsData || {});
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const checkNewAssignments = async () => {
    try {
      const lastCheck = localStorage.getItem('lastAssignmentCheck');
      const newAssignments = await api.patientAssignments.getNewAssignments(lastCheck);
      
      if (newAssignments && newAssignments.length > 0) {
        // Mostrar notificación de nuevas asignaciones
        console.log('Nuevas asignaciones:', newAssignments);
        loadData(); // Recargar datos
      }
      
      localStorage.setItem('lastAssignmentCheck', new Date().toISOString());
    } catch (error) {
      console.error('Error checking new assignments:', error);
    }
  };

  const menuItems = [
    { id: 'pacientes', label: 'Pacientes Asignados', icon: Users },
    { id: 'consultas', label: 'Consultas del Día', icon: Stethoscope },
    { id: 'nueva-consulta', label: 'Nueva Consulta', icon: Plus },
    { id: 'historial', label: 'Historial', icon: FileText },
    { id: 'estadisticas', label: 'Mis Estadísticas', icon: Activity }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'pacientes':
        return <PacientesAsignadosContent assignments={assignments} onRefresh={loadData} />;
      case 'consultas':
        return <ConsultasDelDiaContent consultations={consultations} onRefresh={loadData} />;
      case 'nueva-consulta':
        return <NuevaConsultaForm assignments={assignments} onSuccess={loadData} />;
      case 'historial':
        return <HistorialContent consultations={consultations} />;
      case 'estadisticas':
        return <EstadisticasContent stats={stats} consultations={consultations} />;
      default:
        return <PacientesAsignadosContent assignments={assignments} onRefresh={loadData} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Dr. {user.name}</h2>
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
                activeTab === item.id ? 'bg-teal-50 text-teal-700 border-r-2 border-teal-500' : 'text-gray-700'
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
                {user.doctorInfo?.especialidad && (
                  <span className="bg-teal-100 text-teal-800 px-2 py-1 rounded-full text-xs">
                    {user.doctorInfo.especialidad}
                  </span>
                )}
              </div>
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

// Componente para pacientes asignados
const PacientesAsignadosContent: React.FC<{ 
  assignments: any[], 
  onRefresh: () => void 
}> = ({ assignments, onRefresh }) => {
  const pendingAssignments = assignments.filter(a => a.estado === 'pendiente');
  const inProgressAssignments = assignments.filter(a => a.estado === 'en_proceso');

  const updateAssignmentStatus = async (id: string, status: string) => {
    try {
      const api = useAPI();
      await api.patientAssignments.update(id, { estado: status });
      onRefresh();
    } catch (error) {
      console.error('Error updating assignment:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Pacientes Asignados</h2>
        <div className="flex space-x-4 text-sm">
          <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
            Pendientes: {pendingAssignments.length}
          </span>
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
            En Proceso: {inProgressAssignments.length}
          </span>
        </div>
      </div>

      {/* Asignaciones pendientes */}
      {pendingAssignments.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-yellow-800 mb-4 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            Nuevas Asignaciones Pendientes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingAssignments.map((assignment) => (
              <div key={assignment._id} className="bg-white rounded-lg shadow-md p-4 border-l-4 border-yellow-500">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-semibold text-gray-900">
                    {assignment.pacienteId?.nombre} {assignment.pacienteId?.apellido}
                  </h4>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                    Nuevo
                  </span>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    C.I: {assignment.pacienteId?.cedula}
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    {new Date(assignment.fechaAsignacion).toLocaleString('es-ES')}
                  </div>
                  <div className="text-xs">
                    <strong>Motivo:</strong> {assignment.motivoConsulta}
                  </div>
                  {assignment.prioridad && (
                    <div className="flex items-center">
                      <Heart className="w-4 h-4 mr-2" />
                      Prioridad: <span className={`ml-1 font-medium ${
                        assignment.prioridad === 'alta' ? 'text-red-600' :
                        assignment.prioridad === 'media' ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>{assignment.prioridad}</span>
                    </div>
                  )}
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => updateAssignmentStatus(assignment._id, 'en_proceso')}
                    className="flex-1 bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700"
                  >
                    Aceptar
                  </button>
                  <button className="flex-1 bg-gray-200 text-gray-700 py-2 px-3 rounded text-sm hover:bg-gray-300">
                    Ver Detalles
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Asignaciones en proceso */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {inProgressAssignments.map((assignment) => (
          <div key={assignment._id} className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-semibold text-gray-900">
                {assignment.pacienteId?.nombre} {assignment.pacienteId?.apellido}
              </h4>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                En Proceso
              </span>
            </div>
            
            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-2" />
                C.I: {assignment.pacienteId?.cedula}
              </div>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                Edad: {assignment.pacienteId?.fechaNacimiento ? 
                  Math.floor((Date.now() - new Date(assignment.pacienteId.fechaNacimiento).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) 
                  : 'N/A'} años
              </div>
              <div className="text-xs">
                <strong>Motivo:</strong> {assignment.motivoConsulta}
              </div>
            </div>

            <div className="flex space-x-2">
              <button className="flex-1 bg-green-50 text-green-600 py-2 px-3 rounded text-sm hover:bg-green-100">
                <Stethoscope className="w-4 h-4 inline mr-1" />
                Consultar
              </button>
              <button className="flex-1 bg-blue-50 text-blue-600 py-2 px-3 rounded text-sm hover:bg-blue-100">
                <Eye className="w-4 h-4 inline mr-1" />
                Ver
              </button>
            </div>
          </div>
        ))}
      </div>

      {assignments.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay pacientes asignados</h3>
          <p className="text-gray-600">Los pacientes asignados aparecerán aquí.</p>
        </div>
      )}
    </div>
  );
};

// Componente para consultas del día
const ConsultasDelDiaContent: React.FC<{ 
  consultations: any[], 
  onRefresh: () => void 
}> = ({ consultations, onRefresh }) => {
  const todayConsultations = consultations.filter(consultation => {
    const today = new Date().toDateString();
    return new Date(consultation.fechaHora).toDateString() === today;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Consultas del Día</h2>
        <div className="text-sm text-gray-600">
          Total: {todayConsultations.length} consultas
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {todayConsultations.map((consultation) => (
          <div key={consultation._id} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-teal-500">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {consultation.pacienteId?.nombre} {consultation.pacienteId?.apellido}
              </h3>
              <span className="px-2 py-1 bg-teal-100 text-teal-800 rounded-full text-xs">
                {new Date(consultation.fechaHora).toLocaleTimeString('es-ES', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Motivo de Consulta:</p>
                <p className="text-sm text-gray-600">{consultation.motivoConsulta}</p>
              </div>
              
              {consultation.diagnostico && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Diagnóstico:</p>
                  <p className="text-sm text-gray-600">{consultation.diagnostico}</p>
                </div>
              )}
            </div>

            <div className="flex space-x-2">
              <button className="flex-1 bg-teal-50 text-teal-600 py-2 px-3 rounded text-sm hover:bg-teal-100">
                <Eye className="w-4 h-4 inline mr-1" />
                Ver Completa
              </button>
              <button className="flex-1 bg-blue-50 text-blue-600 py-2 px-3 rounded text-sm hover:bg-blue-100">
                <Edit className="w-4 h-4 inline mr-1" />
                Editar
              </button>
              <button className="bg-gray-50 text-gray-600 py-2 px-3 rounded text-sm hover:bg-gray-100">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {todayConsultations.length === 0 && (
        <div className="text-center py-12">
          <Stethoscope className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay consultas programadas</h3>
          <p className="text-gray-600">Las consultas del día aparecerán aquí.</p>
        </div>
      )}
    </div>
  );
};

// Componente para nueva consulta
const NuevaConsultaForm: React.FC<{ 
  assignments: any[], 
  onSuccess: () => void 
}> = ({ assignments, onSuccess }) => {
  const [formData, setFormData] = useState({
    pacienteId: '',
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
  const availablePatients = assignments.filter(a => a.estado === 'en_proceso');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.consultations.create(formData);
      onSuccess();
      // Reset form
      setFormData({
        pacienteId: '',
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

  const addMedicamento = () => {
    setFormData({
      ...formData,
      medicamentos: [...formData.medicamentos, { nombre: '', dosis: '', frecuencia: '', duracion: '' }]
    });
  };

  const addExamen = () => {
    setFormData({
      ...formData,
      examenes: [...formData.examenes, { tipo: '', descripcion: '', urgente: false }]
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Nueva Consulta Médica</h2>
        
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="">Seleccionar paciente</option>
                {availablePatients.map((assignment) => (
                  <option key={assignment._id} value={assignment.pacienteId._id}>
                    {assignment.pacienteId.nombre} {assignment.pacienteId.apellido} - {assignment.pacienteId.cedula}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo de Consulta *
              </label>
              <input
                type="text"
                required
                value={formData.motivoConsulta}
                onChange={(e) => setFormData({ ...formData, motivoConsulta: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Diagnóstico médico..."
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Plan de tratamiento..."
              />
            </div>
          </div>

          {/* Medicamentos */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Medicamentos</h3>
              <button
                type="button"
                onClick={addMedicamento}
                className="bg-teal-600 text-white px-3 py-1 rounded text-sm hover:bg-teal-700"
              >
                <Plus className="w-4 h-4 inline mr-1" />
                Agregar
              </button>
            </div>
            
            {formData.medicamentos.map((med, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Nombre del medicamento"
                  value={med.nombre}
                  onChange={(e) => {
                    const newMeds = [...formData.medicamentos];
                    newMeds[index].nombre = e.target.value;
                    setFormData({ ...formData, medicamentos: newMeds });
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Dosis"
                  value={med.dosis}
                  onChange={(e) => {
                    const newMeds = [...formData.medicamentos];
                    newMeds[index].dosis = e.target.value;
                    setFormData({ ...formData, medicamentos: newMeds });
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Frecuencia"
                  value={med.frecuencia}
                  onChange={(e) => {
                    const newMeds = [...formData.medicamentos];
                    newMeds[index].frecuencia = e.target.value;
                    setFormData({ ...formData, medicamentos: newMeds });
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Duración"
                  value={med.duracion}
                  onChange={(e) => {
                    const newMeds = [...formData.medicamentos];
                    newMeds[index].duracion = e.target.value;
                    setFormData({ ...formData, medicamentos: newMeds });
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            ))}
          </div>

          {/* Exámenes */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Exámenes Solicitados</h3>
              <button
                type="button"
                onClick={addExamen}
                className="bg-teal-600 text-white px-3 py-1 rounded text-sm hover:bg-teal-700"
              >
                <Plus className="w-4 h-4 inline mr-1" />
                Agregar
              </button>
            </div>
            
            {formData.examenes.map((exam, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 items-end">
                <input
                  type="text"
                  placeholder="Tipo de examen"
                  value={exam.tipo}
                  onChange={(e) => {
                    const newExams = [...formData.examenes];
                    newExams[index].tipo = e.target.value;
                    setFormData({ ...formData, examenes: newExams });
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Descripción"
                  value={exam.descripcion}
                  onChange={(e) => {
                    const newExams = [...formData.examenes];
                    newExams[index].descripcion = e.target.value;
                    setFormData({ ...formData, examenes: newExams });
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exam.urgente}
                    onChange={(e) => {
                      const newExams = [...formData.examenes];
                      newExams[index].urgente = e.target.checked;
                      setFormData({ ...formData, examenes: newExams });
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Urgente</span>
                </label>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observaciones
            </label>
            <textarea
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Observaciones adicionales..."
            />
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
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
                    <button className="text-teal-600 hover:text-teal-900">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="text-blue-600 hover:text-blue-900">
                      <Download className="w-4 h-4" />
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

// Componente para estadísticas
const EstadisticasContent: React.FC<{ 
  stats: any, 
  consultations: any[] 
}> = ({ stats, consultations }) => {
  const thisMonth = consultations.filter(c => {
    const consultationDate = new Date(c.fechaHora);
    const now = new Date();
    return consultationDate.getMonth() === now.getMonth() && 
           consultationDate.getFullYear() === now.getFullYear();
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Mis Estadísticas</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-teal-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pacientes Asignados</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalAssignments || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <Stethoscope className="w-8 h-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Consultas del Mes</p>
              <p className="text-2xl font-bold text-gray-900">{thisMonth.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pendientes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingAssignments || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completadas</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completedAssignments || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Actividad Reciente</h3>
        <div className="space-y-4">
          {consultations.slice(0, 5).map((consultation) => (
            <div key={consultation._id} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {consultation.pacienteId?.nombre} {consultation.pacienteId?.apellido}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(consultation.fechaHora).toLocaleDateString('es-ES')}
                </p>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                Completada
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;