const express = require('express');
const { body, validationResult, param } = require('express-validator');
const Triage = require('../models/Triage');
const Patient = require('../models/Patient');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/triage
// @desc    Get all triages
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      fecha, 
      prioridad, 
      estado,
      enfermeroId 
    } = req.query;
    
    let query = {};
    
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
    
    // Filter by priority
    if (prioridad) {
      query.prioridad = prioridad;
    }
    
    // Filter by status
    if (estado) {
      query.estado = estado;
    }
    
    // Filter by nurse
    if (enfermeroId) {
      query.enfermeroId = enfermeroId;
    }

    const triages = await Triage.find(query)
      .populate('pacienteId', 'nombre apellido cedula telefono fechaNacimiento genero')
      .populate('enfermeroId', 'name')
      .populate('asignadoA', 'name')
      .sort({ fechaHora: -1, prioridad: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Triage.countDocuments(query);

    res.json({
      triages,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get triages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/triage/:id
// @desc    Get triage by ID
// @access  Private
router.get('/:id', [
  auth,
  param('id').isMongoId().withMessage('Invalid triage ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const triage = await Triage.findById(req.params.id)
      .populate('pacienteId')
      .populate('enfermeroId', 'name')
      .populate('asignadoA', 'name')
      .populate('consultaId');
    
    if (!triage) {
      return res.status(404).json({ message: 'Triage not found' });
    }

    res.json(triage);
  } catch (error) {
    console.error('Get triage error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/triage
// @desc    Create new triage
// @access  Private (enfermeria)
router.post('/', [
  auth,
  authorize('enfermeria'),
  body('pacienteId').isMongoId().withMessage('Invalid patient ID'),
  body('sintomas').trim().isLength({ min: 10 }).withMessage('Symptoms must be at least 10 characters'),
  body('prioridad').isIn(['baja', 'media', 'alta']).withMessage('Invalid priority'),
  body('signosVitales.presionArterial').notEmpty().withMessage('Blood pressure is required'),
  body('signosVitales.temperatura').isFloat({ min: 30, max: 45 }).withMessage('Temperature must be between 30 and 45°C'),
  body('signosVitales.pulso').isInt({ min: 40, max: 200 }).withMessage('Pulse must be between 40 and 200 bpm'),
  body('signosVitales.saturacionOxigeno').isInt({ min: 70, max: 100 }).withMessage('Oxygen saturation must be between 70 and 100%'),
  body('signosVitales.frecuenciaRespiratoria').optional().isInt({ min: 8, max: 40 }).withMessage('Respiratory rate must be between 8 and 40 rpm')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { pacienteId } = req.body;

    // Verify patient exists
    const patient = await Patient.findById(pacienteId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Check if patient already has a pending triage today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingTriage = await Triage.findOne({
      pacienteId,
      fechaHora: { $gte: today, $lt: tomorrow },
      estado: { $in: ['pendiente', 'en_proceso'] }
    });

    if (existingTriage) {
      return res.status(400).json({ 
        message: 'Patient already has a pending triage today' 
      });
    }

    const triage = new Triage({
      ...req.body,
      enfermeroId: req.user._id
    });

    await triage.save();

    const populatedTriage = await Triage.findById(triage._id)
      .populate('pacienteId', 'nombre apellido cedula telefono fechaNacimiento genero')
      .populate('enfermeroId', 'name');

    res.status(201).json({
      message: 'Triage created successfully',
      triage: populatedTriage
    });
  } catch (error) {
    console.error('Create triage error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/triage/:id
// @desc    Update triage
// @access  Private
router.put('/:id', [
  auth,
  param('id').isMongoId().withMessage('Invalid triage ID'),
  body('sintomas').optional().trim().isLength({ min: 10 }).withMessage('Symptoms must be at least 10 characters'),
  body('prioridad').optional().isIn(['baja', 'media', 'alta']).withMessage('Invalid priority'),
  body('estado').optional().isIn(['pendiente', 'en_proceso', 'completado']).withMessage('Invalid status'),
  body('signosVitales.temperatura').optional().isFloat({ min: 30, max: 45 }).withMessage('Temperature must be between 30 and 45°C'),
  body('signosVitales.pulso').optional().isInt({ min: 40, max: 200 }).withMessage('Pulse must be between 40 and 200 bpm'),
  body('signosVitales.saturacionOxigeno').optional().isInt({ min: 70, max: 100 }).withMessage('Oxygen saturation must be between 70 and 100%')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const triage = await Triage.findById(req.params.id);
    if (!triage) {
      return res.status(404).json({ message: 'Triage not found' });
    }

    // Check permissions
    const canEdit = req.user.role === 'enfermeria' || 
                   req.user.role === 'empresa' ||
                   triage.enfermeroId.toString() === req.user._id.toString();

    if (!canEdit) {
      return res.status(403).json({ message: 'Not authorized to edit this triage' });
    }

    const updatedTriage = await Triage.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('pacienteId', 'nombre apellido cedula telefono fechaNacimiento genero')
     .populate('enfermeroId', 'name')
     .populate('asignadoA', 'name');

    res.json({
      message: 'Triage updated successfully',
      triage: updatedTriage
    });
  } catch (error) {
    console.error('Update triage error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/triage/:id/assign
// @desc    Assign triage to doctor
// @access  Private (consultorio, empresa)
router.put('/:id/assign', [
  auth,
  authorize('consultorio', 'empresa'),
  param('id').isMongoId().withMessage('Invalid triage ID'),
  body('asignadoA').isMongoId().withMessage('Invalid doctor ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const triage = await Triage.findById(req.params.id);
    if (!triage) {
      return res.status(404).json({ message: 'Triage not found' });
    }

    if (triage.estado === 'completado') {
      return res.status(400).json({ message: 'Cannot assign completed triage' });
    }

    const updatedTriage = await Triage.findByIdAndUpdate(
      req.params.id,
      {
        asignadoA: req.body.asignadoA,
        fechaAsignacion: new Date(),
        estado: 'en_proceso'
      },
      { new: true, runValidators: true }
    ).populate('pacienteId', 'nombre apellido cedula telefono fechaNacimiento genero')
     .populate('enfermeroId', 'name')
     .populate('asignadoA', 'name');

    res.json({
      message: 'Triage assigned successfully',
      triage: updatedTriage
    });
  } catch (error) {
    console.error('Assign triage error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/triage/:id
// @desc    Delete triage (only if pending)
// @access  Private (enfermeria, empresa)
router.delete('/:id', [
  auth,
  authorize('enfermeria', 'empresa'),
  param('id').isMongoId().withMessage('Invalid triage ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const triage = await Triage.findById(req.params.id);
    if (!triage) {
      return res.status(404).json({ message: 'Triage not found' });
    }

    if (triage.estado !== 'pendiente') {
      return res.status(400).json({ 
        message: 'Can only delete pending triages' 
      });
    }

    // Check permissions
    const canDelete = req.user.role === 'empresa' ||
                     triage.enfermeroId.toString() === req.user._id.toString();

    if (!canDelete) {
      return res.status(403).json({ message: 'Not authorized to delete this triage' });
    }

    await Triage.findByIdAndDelete(req.params.id);

    res.json({ message: 'Triage deleted successfully' });
  } catch (error) {
    console.error('Delete triage error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;