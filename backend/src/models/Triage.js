const mongoose = require('mongoose');

const triageSchema = new mongoose.Schema({
  pacienteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  enfermeroId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fechaHora: {
    type: Date,
    default: Date.now
  },
  sintomas: {
    type: String,
    required: true,
    trim: true
  },
  prioridad: {
    type: String,
    enum: ['baja', 'media', 'alta'],
    required: true
  },
  signosVitales: {
    presionArterial: {
      type: String,
      required: true
    },
    temperatura: {
      type: Number,
      required: true,
      min: 30,
      max: 45
    },
    pulso: {
      type: Number,
      required: true,
      min: 40,
      max: 200
    },
    saturacionOxigeno: {
      type: Number,
      required: true,
      min: 70,
      max: 100
    },
    frecuenciaRespiratoria: {
      type: Number,
      min: 8,
      max: 40
    },
    peso: Number,
    talla: Number
  },
  estado: {
    type: String,
    enum: ['pendiente', 'en_proceso', 'completado'],
    default: 'pendiente'
  },
  observaciones: {
    type: String,
    trim: true
  },
  // Escalas de evaluación
  escalas: {
    dolor: {
      type: Number,
      min: 0,
      max: 10
    },
    glasgow: {
      type: Number,
      min: 3,
      max: 15
    }
  },
  // Información de seguimiento
  tiempoEspera: Number, // en minutos
  asignadoA: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  fechaAsignacion: Date,
  consultaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Consultation'
  }
}, {
  timestamps: true
});

// Índices
triageSchema.index({ pacienteId: 1 });
triageSchema.index({ enfermeroId: 1 });
triageSchema.index({ fechaHora: 1 });
triageSchema.index({ prioridad: 1 });
triageSchema.index({ estado: 1 });
triageSchema.index({ prioridad: 1, estado: 1 });

// Virtual para calcular IMC
triageSchema.virtual('imc').get(function() {
  if (!this.signosVitales.peso || !this.signosVitales.talla) return null;
  const tallaMetros = this.signosVitales.talla / 100;
  return (this.signosVitales.peso / (tallaMetros * tallaMetros)).toFixed(2);
});

// Virtual para clasificación de riesgo
triageSchema.virtual('clasificacionRiesgo').get(function() {
  const { temperatura, pulso, saturacionOxigeno, presionArterial } = this.signosVitales;
  
  let riesgo = 'bajo';
  
  // Criterios de riesgo alto
  if (temperatura > 39 || temperatura < 35) riesgo = 'alto';
  if (pulso > 120 || pulso < 50) riesgo = 'alto';
  if (saturacionOxigeno < 90) riesgo = 'alto';
  if (this.prioridad === 'alta') riesgo = 'alto';
  
  // Criterios de riesgo medio
  if (temperatura > 38 || pulso > 100 || saturacionOxigeno < 95) {
    if (riesgo !== 'alto') riesgo = 'medio';
  }
  
  return riesgo;
});

// Incluir virtuals en JSON
triageSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Triage', triageSchema);