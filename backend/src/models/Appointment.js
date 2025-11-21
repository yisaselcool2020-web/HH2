const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
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
  fechaHora: {
    type: Date,
    required: true
  },
  duracionMinutos: {
    type: Number,
    default: 30
  },
  motivoConsulta: {
    type: String,
    required: true,
    trim: true
  },
  estado: {
    type: String,
    enum: ['programada', 'confirmada', 'en_curso', 'completada', 'cancelada', 'no_asistio'],
    default: 'programada'
  },
  tipoConsulta: {
    type: String,
    enum: ['primera_vez', 'control', 'urgencia', 'especializada'],
    default: 'primera_vez'
  },
  observaciones: {
    type: String,
    trim: true
  },
  // Información de pago
  pago: {
    monto: Number,
    metodoPago: {
      type: String,
      enum: ['efectivo', 'tarjeta', 'transferencia', 'seguro']
    },
    estado: {
      type: String,
      enum: ['pendiente', 'pagado', 'parcial'],
      default: 'pendiente'
    },
    fechaPago: Date,
    comprobante: String
  },
  // Recordatorios
  recordatorios: {
    enviado24h: {
      type: Boolean,
      default: false
    },
    enviado2h: {
      type: Boolean,
      default: false
    },
    fechaUltimoRecordatorio: Date
  },
  // Información de creación
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Índices para consultas eficientes
appointmentSchema.index({ pacienteId: 1 });
appointmentSchema.index({ medicoId: 1 });
appointmentSchema.index({ fechaHora: 1 });
appointmentSchema.index({ estado: 1 });
appointmentSchema.index({ fechaHora: 1, medicoId: 1 });

// Validación para evitar citas duplicadas
appointmentSchema.index({ 
  medicoId: 1, 
  fechaHora: 1 
}, { 
  unique: true,
  partialFilterExpression: { 
    estado: { $nin: ['cancelada', 'no_asistio'] } 
  }
});

// Virtual para verificar si la cita es hoy
appointmentSchema.virtual('esHoy').get(function() {
  const today = new Date();
  const appointmentDate = new Date(this.fechaHora);
  return today.toDateString() === appointmentDate.toDateString();
});

// Virtual para verificar si la cita ya pasó
appointmentSchema.virtual('yaPaso').get(function() {
  return new Date() > new Date(this.fechaHora);
});

// Incluir virtuals en JSON
appointmentSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Appointment', appointmentSchema);