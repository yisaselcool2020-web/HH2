const express = require('express');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Triage = require('../models/Triage');
const Consultation = require('../models/Consultation');
const Doctor = require('../models/Doctor');
const PatientAssignment = require('../models/PatientAssignment');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/dashboard/stats
// @desc    Get dashboard statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Basic counts
    const totalPatients = await Patient.countDocuments({ isActive: true });
    const totalDoctors = await Doctor.countDocuments({ isActive: true });

    // Today's statistics
    const todayAppointments = await Appointment.countDocuments({
      fechaHora: { $gte: today, $lt: tomorrow }
    });

    const todayConsultations = await Consultation.countDocuments({
      fechaHora: { $gte: today, $lt: tomorrow }
    });

    const pendingTriages = await Triage.countDocuments({
      estado: { $in: ['pendiente', 'en_proceso'] }
    });

    // Monthly statistics
    const monthlyAppointments = await Appointment.countDocuments({
      fechaHora: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const monthlyConsultations = await Consultation.countDocuments({
      fechaHora: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const newPatientsThisMonth = await Patient.countDocuments({
      createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    });

    // Role-specific statistics
    let roleSpecificStats = {};

    if (req.user.role === 'doctor') {
      const doctorAssignments = await PatientAssignment.countDocuments({
        medicoId: req.user._id,
        estado: { $in: ['pendiente', 'en_proceso'] }
      });

      const doctorConsultationsToday = await Consultation.countDocuments({
        medicoId: req.user._id,
        fechaHora: { $gte: today, $lt: tomorrow }
      });

      roleSpecificStats = {
        myAssignments: doctorAssignments,
        myConsultationsToday: doctorConsultationsToday
      };
    }

    if (req.user.role === 'enfermeria') {
      const myTriagesToday = await Triage.countDocuments({
        enfermeroId: req.user._id,
        fechaHora: { $gte: today, $lt: tomorrow }
      });

      roleSpecificStats = {
        myTriagesToday
      };
    }

    const stats = {
      totalPatients,
      totalDoctors,
      todayAppointments,
      todayConsultations,
      pendingTriages,
      monthlyAppointments,
      monthlyConsultations,
      newPatientsThisMonth,
      ...roleSpecificStats
    };

    res.json(stats);
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/dashboard/recent-activities
// @desc    Get recent activities
// @access  Private
router.get('/recent-activities', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    let activities = [];

    // Recent appointments
    const recentAppointments = await Appointment.find({})
      .populate('pacienteId', 'nombre apellido')
      .populate('medicoId', 'name')
      .sort({ createdAt: -1 })
      .limit(limit / 2);

    recentAppointments.forEach(appointment => {
      activities.push({
        type: 'appointment',
        title: 'Nueva cita programada',
        description: `${appointment.pacienteId.nombre} ${appointment.pacienteId.apellido} - Dr. ${appointment.medicoId.name}`,
        timestamp: appointment.createdAt,
        data: appointment
      });
    });

    // Recent consultations
    const recentConsultations = await Consultation.find({})
      .populate('pacienteId', 'nombre apellido')
      .populate('medicoId', 'name')
      .sort({ createdAt: -1 })
      .limit(limit / 2);

    recentConsultations.forEach(consultation => {
      activities.push({
        type: 'consultation',
        title: 'Consulta completada',
        description: `${consultation.pacienteId.nombre} ${consultation.pacienteId.apellido} - Dr. ${consultation.medicoId.name}`,
        timestamp: consultation.createdAt,
        data: consultation
      });
    });

    // Sort all activities by timestamp
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    activities = activities.slice(0, limit);

    res.json(activities);
  } catch (error) {
    console.error('Get recent activities error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/dashboard/appointments-by-status
// @desc    Get appointments grouped by status
// @access  Private
router.get('/appointments-by-status', auth, async (req, res) => {
  try {
    const appointmentsByStatus = await Appointment.aggregate([
      {
        $group: {
          _id: '$estado',
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      programada: 0,
      confirmada: 0,
      en_curso: 0,
      completada: 0,
      cancelada: 0,
      no_asistio: 0
    };

    appointmentsByStatus.forEach(item => {
      if (result.hasOwnProperty(item._id)) {
        result[item._id] = item.count;
      }
    });

    res.json(result);
  } catch (error) {
    console.error('Get appointments by status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/dashboard/triages-by-priority
// @desc    Get triages grouped by priority
// @access  Private
router.get('/triages-by-priority', auth, async (req, res) => {
  try {
    const triagesByPriority = await Triage.aggregate([
      {
        $group: {
          _id: '$prioridad',
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      alta: 0,
      media: 0,
      baja: 0
    };

    triagesByPriority.forEach(item => {
      if (result.hasOwnProperty(item._id)) {
        result[item._id] = item.count;
      }
    });

    res.json(result);
  } catch (error) {
    console.error('Get triages by priority error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/dashboard/monthly-trends
// @desc    Get monthly trends for appointments and consultations
// @access  Private
router.get('/monthly-trends', auth, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    
    const appointmentTrends = await Appointment.aggregate([
      {
        $match: {
          fechaHora: {
            $gte: new Date(currentYear, 0, 1),
            $lt: new Date(currentYear + 1, 0, 1)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$fechaHora' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    const consultationTrends = await Consultation.aggregate([
      {
        $match: {
          fechaHora: {
            $gte: new Date(currentYear, 0, 1),
            $lt: new Date(currentYear + 1, 0, 1)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$fechaHora' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const result = months.map((month, index) => {
      const appointmentData = appointmentTrends.find(item => item._id === index + 1);
      const consultationData = consultationTrends.find(item => item._id === index + 1);
      
      return {
        month,
        appointments: appointmentData ? appointmentData.count : 0,
        consultations: consultationData ? consultationData.count : 0
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Get monthly trends error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;