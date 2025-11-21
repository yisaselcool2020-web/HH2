const mongoose = require('mongoose');

const consultorioSchema = new mongoose.Schema({
  numero: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  ubicacion: {
    type: String,
    trim: true
  },
  equipamiento: [String],
  capacidad: {
    type: Number,
    default: 1
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Configuración del consultorio
  configuracion: {
    tipoConsultorio: {
      type: String,
      enum: ['general', 'especializado', 'procedimientos', 'emergencia'],
      default: 'general'
    },
    requiereReservacion: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// Índices
consultorioSchema.index({ numero: 1 });
consultorioSchema.index({ isActive: 1 });

module.exports = mongoose.model('Consultorio', consultorioSchema);