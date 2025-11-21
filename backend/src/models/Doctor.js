const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
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
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  telefono: {
    type: String,
    required: true,
    trim: true
  },
  especialidadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Especialidad',
    required: true
  },
  especialidad: {
    type: String,
    required: true // Campo desnormalizado para consultas rápidas
  },
  consultorioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Consultorio',
    required: true
  },
  consultorio: {
    numero: String,
    nombre: String
  },
  numeroLicencia: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  fechaIngreso: {
    type: Date,
    default: Date.now
  },
  horarios: [{
    dia: {
      type: String,
      enum: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
    },
    horaInicio: String,
    horaFin: String,
    activo: {
      type: Boolean,
      default: true
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  // Estadísticas del doctor
  stats: {
    totalConsultas: {
      type: Number,
      default: 0
    },
    consultasEsteMes: {
      type: Number,
      default: 0
    },
    pacientesAsignados: {
      type: Number,
      default: 0
    },
    ultimaConsulta: Date
  }
}, {
  timestamps: true
});

// Índices
doctorSchema.index({ userId: 1 });
doctorSchema.index({ cedula: 1 });
doctorSchema.index({ especialidadId: 1 });
doctorSchema.index({ consultorioId: 1 });
doctorSchema.index({ isActive: 1 });

// Middleware para actualizar información en User cuando se modifica Doctor
doctorSchema.post('save', async function(doc) {
  try {
    await mongoose.model('User').findByIdAndUpdate(doc.userId, {
      'doctorInfo.especialidadId': doc.especialidadId,
      'doctorInfo.consultorioId': doc.consultorioId,
      'doctorInfo.numeroLicencia': doc.numeroLicencia,
      'doctorInfo.telefono': doc.telefono,
      'doctorInfo.especialidad': doc.especialidad
    });
  } catch (error) {
    console.error('Error updating user doctor info:', error);
  }
});

module.exports = mongoose.model('Doctor', doctorSchema);