const express = require('express');
const { body, validationResult, param } = require('express-validator');
const PatientAssignment = require('../models/PatientAssignment');
const Patient = require('../models/Patient');
const User = require('../models/User');
const Triage = require('../models/Triage');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/patient-assignments
// @desc    Get all patient assignments
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      fecha, 
      medicoId, 
      estado,
      prioridad 
    } = req.query;
    
    let query = {};
    
    // Filter by date
    if (fecha) {
      const startDate = new Date(fecha);
      const endDate = new Date(fecha);
      endDate.setDate(endDate.getDate() + 1);
      
      query.fechaAsignacion = {
        $gte: startDate,
        $lt: endDate
      };
    }
    
    // Filter by doctor
    if (medicoId) {
      query.medicoId = medicoId;
    }
    
    // Filter by status
    if (estado) {
      query.estado = estado;
    }
    
    // Filter by priority
    if (prioridad) {
      query.prioridad = prioridad;
    }

    const assignments = await PatientAssignment.find(query)
      .populate('pacienteId', 'nombre apellido cedula telefono fechaNacimiento genero')
      .populate('medicoId', 'name')
      .populate('triageId')
      .populate('asignadoPor', 'name')
      .sort({ fechaAsignacion: -1, prioridad: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await PatientAssignment.countDocuments(query);

    res.json({
      assignments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get patient assignments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/patient-assignments/doctor
// @desc    Get current doctor's patient assignments
// @access  Private (doctor)
router.get('/doctor', [
  auth,
  authorize('doctor')
], async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      estado,
      prioridad 
    } = req.query;
    
    let query = { medicoId: req.user._id };
    
    // Filter by status
    if (estado) {
      query.estado = estado;
    }
    
    // Filter by priority
    if (prioridad) {
      query.prioridad = prioridad;
    }

    const assignments = await PatientAssignment.find(query)
      .populate('pacienteId', 'nombre apellido cedula telefono fechaNacimiento genero')
      .populate('triageId')
      .populate('asignadoPor', 'name')
      .sort({ fechaAsignacion: -1, prioridad: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await PatientAssignment.countDocuments(query);

    res.json({
      assignments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get doctor assignments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/patient-assignments/doctor/new
// @desc    Get new assignments since last check
// @access  Private (doctor)
router.get('/doctor/new', [
  auth,
  authorize('doctor')
], async (req, res) => {
  try {
    const { lastCheck } = req.query;
    
    let query = { 
      medicoId: req.user._id,
      estado: 'pendiente'
    };
    
    if (lastCheck) {
      query.fechaAsignacion = { $gt: new Date(lastCheck) };
    }

    const newAssignments = await PatientAssignment.find(query)
      .populate('pacienteId', 'nombre apellido cedula telefono fechaNacimiento genero')
      .populate('triageId')
      .populate('asignadoPor', 'name')
      .sort({ fechaAsignacion: -1, prioridad: 1 });

    res.json(newAssignments);
  } catch (error) {
    console.error('Get new assignments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/patient-assignments/stats/doctor
// @desc    Get doctor assignment statistics
// @access  Private (doctor)
router.get('/stats/doctor', [
  auth,
  authorize('doctor')
], async (req, res) => {
  try {
    const doctorId = req.user._id;
    
    const stats = await PatientAssignment.aggregate([
      { $match: { medicoId: doctorId } },
      {
        $group: {
          _id: '$estado',
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      totalAssignments: 0,
      pendingAssignments: 0,
      inProgressAssignments: 0,
      completedAssignments: 0
    };

    stats.forEach(stat => {
      result.totalAssignments += stat.count;
      switch (stat._id) {
        case 'pendiente':
          result.pendingAssignments = stat.count;
          break;
        case 'en_proceso':
          result.inProgressAssignments = stat.count;
          break;
        case 'completado':
          result.completedAssignments = stat.count;
          break;
      }
    });

    res.json(result);
  } catch (error) {
    console.error('Get doctor stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/patient-assignments
// @desc    Create new patient assignment
// @access  Private (consultorio, empresa)
router.post('/', [
  auth,
  authorize('consultorio', 'empresa'),
  body('pacienteId').isMongoId().withMessage('Invalid patient ID'),
  body('medicoId').isMongoId().withMessage('Invalid doctor ID'),
  body('motivoConsulta').trim().isLength({ min: 10 }).withMessage('Reason must be at least 10 characters'),
  body('prioridad').optional().isIn(['baja', 'media', 'alta']).withMessage('Invalid priority'),
  body('triageId').optional().isMongoId().withMessage('Invalid triage ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { pacienteId, medicoId, triageId } = req.body;

    // Verify patient exists
    const patient = await Patient.findById(pacienteId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Verify doctor exists
    const doctor = await User.findById(medicoId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // If triage is provided, verify it exists and get info
    let triageInfo = null;
    if (triageId) {
      const triage = await Triage.findById(triageId);
      if (!triage) {
        return res.status(404).json({ message: 'Triage not found' });
      }

      triageInfo = {
        sintomas: triage.sintomas,
        signosVitales: {
          presionArterial: triage.signosVitales.presionArterial,
          temperatura: triage.signosVitales.temperatura,
          pulso: triage.signosVitales.pulso,
          saturacionOxigeno: triage.signosVitales.saturacionOxigeno
        },
        fechaTriaje: triage.fechaHora
      };

      // Update triage to mark as assigned
      await Triage.findByIdAndUpdate(triageId, {
        asignadoA: medicoId,
        fechaAsignacion: new Date(),
        estado: 'en_proceso'
      });
    }

    const assignment = new PatientAssignment({
      ...req.body,
      triageInfo,
      asignadoPor: req.user._id,
      tipoAsignacion: 'manual'
    });

    await assignment.save();

    const populatedAssignment = await PatientAssignment.findById(assignment._id)
      .populate('pacienteId', 'nombre apellido cedula telefono fechaNacimiento genero')
      .populate('medicoId', 'name')
      .populate('triageId')
      .populate('asignadoPor', 'name');

    res.status(201).json({
      message: 'Patient assignment created successfully',
      assignment: populatedAssignment
    });
  } catch (error) {
    console.error('Create patient assignment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/patient-assignments/:id
// @desc    Update patient assignment
// @access  Private
router.put('/:id', [
  auth,
  param('id').isMongoId().withMessage('Invalid assignment ID'),
  body('estado').optional().isIn(['pendiente', 'en_proceso', 'completado', 'cancelado']).withMessage('Invalid status'),
  body('observaciones').optional().trim().isLength({ max: 500 }).withMessage('Observations too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const assignment = await PatientAssignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Check permissions
    const canEdit = req.user.role === 'empresa' || 
                   req.user.role === 'consultorio' ||
                   assignment.medicoId.toString() === req.user._id.toString();

    if (!canEdit) {
      return res.status(403).json({ message: 'Not authorized to edit this assignment' });
    }

    const updatedAssignment = await PatientAssignment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('pacienteId', 'nombre apellido cedula telefono fechaNacimiento genero')
     .populate('medicoId', 'name')
     .populate('triageId')
     .populate('asignadoPor', 'name');

    res.json({
      message: 'Assignment updated successfully',
      assignment: updatedAssignment
    });
  } catch (error) {
    console.error('Update assignment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/patient-assignments/:id
// @desc    Cancel patient assignment
// @access  Private (consultorio, empresa)
router.delete('/:id', [
  auth,
  authorize('consultorio', 'empresa'),
  param('id').isMongoId().withMessage('Invalid assignment ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const assignment = await PatientAssignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (assignment.estado === 'completado') {
      return res.status(400).json({ 
        message: 'Cannot cancel completed assignment' 
      });
    }

    // Update assignment status
    assignment.estado = 'cancelado';
    await assignment.save();

    // If assignment has associated triage, update triage status
    if (assignment.triageId) {
      await Triage.findByIdAndUpdate(assignment.triageId, {
        asignadoA: null,
        fechaAsignacion: null,
        estado: 'pendiente'
      });
    }

    res.json({ message: 'Assignment cancelled successfully' });
  } catch (error) {
    console.error('Cancel assignment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;