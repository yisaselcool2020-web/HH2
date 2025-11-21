const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  apellido: {
    type: String,
    required: true,
    trim: true
  },
  cedula: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  fechaNacimiento: {
    type: Date,
    required: true
  },
  telefono: {
    type: String,
    required: true,
    trim: true
  },
  genero: {
    type: String,
    enum: ['M', 'F'],
    required: true
  },
  direccion: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  contactoEmergencia: {
    nombre: String,
    telefono: String,
    relacion: String
  },
  seguroMedico: {
    nombre: String,
    numero: String,
    vigencia: Date
  },
  alergias: [String],
  enfermedadesCronicas: [String],
  medicamentosActuales: [String],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices para búsquedas eficientes
patientSchema.index({ cedula: 1 });
patientSchema.index({ nombre: 1, apellido: 1 });
patientSchema.index({ telefono: 1 });

// Virtual para edad
patientSchema.virtual('edad').get(function() {
  if (!this.fechaNacimiento) return null;
  const today = new Date();
  const birthDate = new Date(this.fechaNacimiento);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Incluir virtuals en JSON
patientSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Patient', patientSchema);