const mongoose = require('mongoose');

const especialidadSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  descripcion: {
    type: String,
    trim: true
  },
  codigo: {
    type: String,
    unique: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Configuración de la especialidad
  configuracion: {
    duracionConsultaMinutos: {
      type: Number,
      default: 30
    },
    requiereTriaje: {
      type: Boolean,
      default: true
    },
    color: {
      type: String,
      default: '#3B82F6'
    }
  }
}, {
  timestamps: true
});

// Índices
especialidadSchema.index({ nombre: 1 });
especialidadSchema.index({ codigo: 1 });
especialidadSchema.index({ isActive: 1 });

module.exports = mongoose.model('Especialidad', especialidadSchema);