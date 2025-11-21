const mongoose = require('mongoose');

const consultationSchema = new mongoose.Schema({
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
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  fechaHora: {
    type: Date,
    default: Date.now
  },
  motivoConsulta: {
    type: String,
    required: true,
    trim: true
  },
  anamnesis: {
    type: String,
    required: true,
    trim: true
  },
  examenFisico: {
    type: String,
    required: true,
    trim: true
  },
  diagnostico: {
    type: String,
    required: true,
    trim: true
  },
  tratamiento: {
    type: String,
    required: true,
    trim: true
  },
  // Medicamentos prescritos
  medicamentos: [{
    nombre: {
      type: String,
      required: true,
      trim: true
    },
    dosis: {
      type: String,
      required: true,
      trim: true
    },
    frecuencia: {
      type: String,
      required: true,
      trim: true
    },
    duracion: {
      type: String,
      required: true,
      trim: true
    },
    indicaciones: {
      type: String,
      trim: true
    }
  }],
  // Exámenes solicitados
  examenes: [{
    tipo: {
      type: String,
      required: true,
      trim: true
    },
    descripcion: {
      type: String,
      trim: true
    },
    urgente: {
      type: Boolean,
      default: false
    },
    estado: {
      type: String,
      enum: ['solicitado', 'programado', 'realizado', 'cancelado'],
      default: 'solicitado'
    },
    fechaSolicitud: {
      type: Date,
      default: Date.now
    },
    fechaRealizacion: Date,
    resultados: String
  }],
  // Signos vitales durante la consulta
  signosVitales: {
    presionArterial: String,
    temperatura: Number,
    pulso: Number,
    saturacionOxigeno: Number,
    frecuenciaRespiratoria: Number,
    peso: Number,
    talla: Number
  },
  observaciones: {
    type: String,
    trim: true
  },
  // Seguimiento
  proximaCita: {
    fecha: Date,
    motivo: String,
    programada: {
      type: Boolean,
      default: false
    }
  },
  estado: {
    type: String,
    enum: ['en_curso', 'completada', 'cancelada'],
    default: 'en_curso'
  },
  duracionMinutos: Number,
  // Información de facturación
  facturacion: {
    monto: Number,
    conceptos: [String],
    estado: {
      type: String,
      enum: ['pendiente', 'pagado', 'parcial'],
      default: 'pendiente'
    }
  }
}, {
  timestamps: true
});

// Índices
consultationSchema.index({ pacienteId: 1 });
consultationSchema.index({ medicoId: 1 });
consultationSchema.index({ fechaHora: 1 });
consultationSchema.index({ estado: 1 });
consultationSchema.index({ triageId: 1 });
consultationSchema.index({ appointmentId: 1 });

// Virtual para verificar si es consulta de hoy
consultationSchema.virtual('esHoy').get(function() {
  const today = new Date();
  const consultationDate = new Date(this.fechaHora);
  return today.toDateString() === consultationDate.toDateString();
});

// Incluir virtuals en JSON
consultationSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Consultation', consultationSchema);