const express = require('express');
const { body, validationResult, param } = require('express-validator');
const Consultation = require('../models/Consultation');
const Triage = require('../models/Triage');
const Patient = require('../models/Patient');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/consultations
// @desc    Get all consultations
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      fecha, 
      medicoId, 
      pacienteId,
      estado 
    } = req.query;
    
    let query = {};
    
    // If user is a doctor, only show their consultations
    if (req.user.role === 'doctor') {
      query.medicoId = req.user._id;
    }
    
    // Filter by date
    if (fecha) {
      const startDate = new Date(fecha);
      const endDate = new Date(fecha);
      endDate.setDate(endDate.getDate() + 1);
      
      query.fechaHora = {
        $gte: startDate,
        $lt: endDate
      };
    }
    
    // Filter by doctor
    if (medicoId) {
      query.medicoId = medicoId;
    }
    
    // Filter by patient
    if (pacienteId) {
      query.pacienteId = pacienteId;
    }
    
    // Filter by status
    if (estado) {
      query.estado = estado;
    }

    const consultations = await Consultation.find(query)
      .populate('pacienteId', 'nombre apellido cedula telefono fechaNacimiento genero')
      .populate('medicoId', 'name')
      .populate('triageId')
      .sort({ fechaHora: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Consultation.countDocuments(query);

    res.json({
      consultations,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get consultations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/consultations/pending-triages
// @desc    Get pending triages for consultation
// @access  Private (consultorio, doctor)
router.get('/pending-triages', [
  auth,
  authorize('consultorio', 'doctor')
], async (req, res) => {
  try {
    const triages = await Triage.find({
      estado: { $in: ['pendiente', 'en_proceso'] },
      consultaId: { $exists: false }
    })
    .populate('pacienteId', 'nombre apellido cedula telefono fechaNacimiento genero')
    .populate('enfermeroId', 'name')
    .sort({ prioridad: 1, fechaHora: 1 }); // Alta prioridad primero

    res.json(triages);
  } catch (error) {
    console.error('Get pending triages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/consultations/:id
// @desc    Get consultation by ID
// @access  Private
router.get('/:id', [
  auth,
  param('id').isMongoId().withMessage('Invalid consultation ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const consultation = await Consultation.findById(req.params.i)
      .populate('pacienteId')
      .populate('medicoId', 'name')
      .populate('triageId')
      .populate('appointmentId');
    
    if (!consultation) {
      return res.status(404).json({ message: 'Consultation not found' });
    }

    // Check permissions
    const canView = req.user.role === 'empresa' || 
                   req.user.role === 'consultorio' ||
                   consultation.medicoId._id.toString() === req.user._id.toString();

    if (!canView) {
      return res.status(403).json({ message: 'Not authorized to view this consultation' });
    }

    res.json(consultation);
  } catch (error) {
    console.error('Get consultation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/consultations
// @desc    Create new consultation
// @access  Private (consultorio, doctor)
router.post('/', [
  auth,
  authorize('consultorio', 'doctor'),
  body('pacienteId').isMongoId().withMessage('Invalid patient ID'),
  body('motivoConsulta').trim().isLength({ min: 10 }).withMessage('Reason must be at least 10 characters'),
  body('anamnesis').trim().isLength({ min: 20 }).withMessage('Anamnesis must be at least 20 characters'),
  body('examenFisico').trim().isLength({ min: 20 }).withMessage('Physical exam must be at least 20 characters'),
  body('diagnostico').trim().isLength({ min: 10 }).withMessage('Diagnosis must be at least 10 characters'),
  body('tratamiento').trim().isLength({ min: 10 }).withMessage('Treatment must be at least 10 characters'),
  body('triageId').optional().isMongoId().withMessage('Invalid triage ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { pacienteId, triageId } = req.body;

    // Verify patient exists
    const patient = await Patient.findById(pacienteId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // If triage is provided, verify it exists and update it
    if (triageId) {
      const triage = await Triage.findById(triageId);
      if (!triage) {
        return res.status(404).json({ message: 'Triage not found' });
      }

      if (triage.consultaId) {
        return res.status(400).json({ 
          message: 'Triage already has an associated consultation' 
        });
      }
    }

    const consultation = new Consultation({
      ...req.body,
      medicoId: req.user._id,
      estado: 'completada' // Mark as completed when created
    });

    await consultation.save();

    // Update triage if provided
    if (triageId) {
      await Triage.findByIdAndUpdate(triageId, {
        consultaId: consultation._id,
        estado: 'completado'
      });
    }

    const populatedConsultation = await Consultation.findById(consultation._id)
      .populate('pacienteId', 'nombre apellido cedula telefono fechaNacimiento genero')
      .populate('medicoId', 'name')
      .populate('triageId');

    res.status(201).json({
      message: 'Consultation created successfully',
      consultation: populatedConsultation
    });
  } catch (error) {
    console.error('Create consultation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/consultations/:id
// @desc    Update consultation
// @access  Private (consultorio, doctor - only own consultations)
router.put('/:id', [
  auth,
  authorize('consultorio', 'doctor'),
  param('id').isMongoId().withMessage('Invalid consultation ID'),
  body('motivoConsulta').optional().trim().isLength({ min: 10 }).withMessage('Reason must be at least 10 characters'),
  body('anamnesis').optional().trim().isLength({ min: 20 }).withMessage('Anamnesis must be at least 20 characters'),
  body('examenFisico').optional().trim().isLength({ min: 20 }).withMessage('Physical exam must be at least 20 characters'),
  body('diagnostico').optional().trim().isLength({ min: 10 }).withMessage('Diagnosis must be at least 10 characters'),
  body('tratamiento').optional().trim().isLength({ min: 10 }).withMessage('Treatment must be at least 10 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) {
      return res.status(404).json({ message: 'Consultation not found' });
    }

    // Check permissions - only the doctor who created it can edit
    if (consultation.medicoId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this consultation' });
    }

    const updatedConsultation = await Consultation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('pacienteId', 'nombre apellido cedula telefono fechaNacimiento genero')
     .populate('medicoId', 'name')
     .populate('triageId');

    res.json({
      message: 'Consultation updated successfully',
      consultation: updatedConsultation
    });
  } catch (error) {
    console.error('Update consultation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/consultations/:id/complete
// @desc    Mark consultation as completed
// @access  Private (consultorio, doctor)
router.put('/:id/complete', [
  auth,
  authorize('consultorio', 'doctor'),
  param('id').isMongoId().withMessage('Invalid consultation ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) {
      return res.status(404).json({ message: 'Consultation not found' });
    }

    // Check permissions
    if (consultation.medicoId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to complete this consultation' });
    }

    if (consultation.estado === 'completada') {
      return res.status(400).json({ message: 'Consultation is already completed' });
    }

    consultation.estado = 'completada';
    consultation.duracionMinutos = Math.floor((new Date() - consultation.fechaHora) / (1000 * 60));
    await consultation.save();

    res.json({
      message: 'Consultation completed successfully',
      consultation
    });
  } catch (error) {
    console.error('Complete consultation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/consultations/:id
// @desc    Delete consultation (only if in progress)
// @access  Private (empresa only)
router.delete('/:id', [
  auth,
  authorize('empresa'),
  param('id').isMongoId().withMessage('Invalid consultation ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) {
      return res.status(404).json({ message: 'Consultation not found' });
    }

    if (consultation.estado === 'completada') {
      return res.status(400).json({ 
        message: 'Cannot delete completed consultation' 
      });
    }

    // If consultation has associated triage, update triage status
    if (consultation.triageId) {
      await Triage.findByIdAndUpdate(consultation.triageId, {
        consultaId: null,
        estado: 'pendiente'
      });
    }

    await Consultation.findByIdAndDelete(req.params.id);

    res.json({ message: 'Consultation deleted successfully' });
  } catch (error) {
    console.error('Delete consultation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;