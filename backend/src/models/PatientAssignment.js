const mongoose = require('mongoose');

const patientAssignmentSchema = new mongoose.Schema({
  pacienteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  medicoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  triageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Triage'
  },
  fechaAsignacion: {
    type: Date,
    default: Date.now
  },
  motivoConsulta: {
    type: String,
    required: true,
    trim: true
  },
  prioridad: {
    type: String,
    enum: ['baja', 'media', 'alta'],
    default: 'media'
  },
  estado: {
    type: String,
    enum: ['pendiente', 'en_proceso', 'completado', 'cancelado'],
    default: 'pendiente'
  },
  observaciones: {
    type: String,
    trim: true
  },
  // Información del triaje asociado (desnormalizada para consultas rápidas)
  triageInfo: {
    sintomas: String,
    signosVitales: {
      presionArterial: String,
      temperatura: Number,
      pulso: Number,
      saturacionOxigeno: Number
    },
    fechaTriaje: Date
  },
  // Seguimiento
  fechaAceptacion: Date,
  fechaCompletado: Date,
  tiempoRespuesta: Number, // en minutos
  consultaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Consultation'
  },
  // Información de quien asignó
  asignadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  tipoAsignacion: {
    type: String,
    enum: ['manual', 'automatica'],
    default: 'manual'
  }
}, {
  timestamps: true
});

// Índices
patientAssignmentSchema.index({ pacienteId: 1 });
patientAssignmentSchema.index({ medicoId: 1 });
patientAssignmentSchema.index({ fechaAsignacion: 1 });
patientAssignmentSchema.index({ estado: 1 });
patientAssignmentSchema.index({ prioridad: 1 });
patientAssignmentSchema.index({ medicoId: 1, estado: 1 });
patientAssignmentSchema.index({ fechaAsignacion: 1, medicoId: 1 });

// Virtual para verificar si es asignación de hoy
patientAssignmentSchema.virtual('esHoy').get(function() {
  const today = new Date();
  const assignmentDate = new Date(this.fechaAsignacion);
  return today.toDateString() === assignmentDate.toDateString();
});

// Virtual para calcular tiempo transcurrido
patientAssignmentSchema.virtual('tiempoTranscurrido').get(function() {
  const now = new Date();
  const assignmentDate = new Date(this.fechaAsignacion);
  return Math.floor((now - assignmentDate) / (1000 * 60)); // en minutos
});

// Middleware para calcular tiempo de respuesta
patientAssignmentSchema.pre('save', function(next) {
  if (this.isModified('estado') && this.estado === 'en_proceso' && !this.fechaAceptacion) {
    this.fechaAceptacion = new Date();
    this.tiempoRespuesta = Math.floor((this.fechaAceptacion - this.fechaAsignacion) / (1000 * 60));
  }
  
  if (this.isModified('estado') && this.estado === 'completado' && !this.fechaCompletado) {
    this.fechaCompletado = new Date();
  }
  
  next();
});

// Incluir virtuals en JSON
patientAssignmentSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('PatientAssignment', patientAssignmentSchema);