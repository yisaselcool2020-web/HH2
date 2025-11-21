const express = require('express');
const { body, validationResult, param } = require('express-validator');
const Consultorio = require('../models/Consultorio');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/consultorios
// @desc    Get all offices
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, isActive = true } = req.query;
    
    let query = { isActive };

    const consultorios = await Consultorio.find(query)
      .sort({ numero: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Consultorio.countDocuments(query);

    res.json({
      consultorios,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get consultorios error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/consultorios/:id
// @desc    Get office by ID
// @access  Private
router.get('/:id', [
  auth,
  param('id').isMongoId().withMessage('Invalid office ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const consultorio = await Consultorio.findById(req.params.id);
    
    if (!consultorio) {
      return res.status(404).json({ message: 'Office not found' });
    }

    res.json(consultorio);
  } catch (error) {
    console.error('Get consultorio error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/consultorios
// @desc    Create new office
// @access  Private (empresa only)
router.post('/', [
  auth,
  authorize('empresa'),
  body('numero').trim().isLength({ min: 1 }).withMessage('Number is required'),
  body('nombre').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('ubicacion').optional().trim().isLength({ max: 200 }).withMessage('Location too long'),
  body('equipamiento').optional().isArray().withMessage('Equipment must be an array'),
  body('capacidad').optional().isInt({ min: 1, max: 20 }).withMessage('Capacity must be between 1 and 20'),
  body('configuracion.tipoConsultorio').optional().isIn(['general', 'especializado', 'procedimientos', 'emergencia']).withMessage('Invalid office type'),
  body('configuracion.requiereReservacion').optional().isBoolean().withMessage('Requires reservation must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { numero } = req.body;

    // Check if office already exists
    const existingConsultorio = await Consultorio.findOne({ numero });

    if (existingConsultorio) {
      return res.status(400).json({ 
        message: 'Office already exists with this number' 
      });
    }

    const consultorio = new Consultorio(req.body);
    await consultorio.save();

    res.status(201).json({
      message: 'Office created successfully',
      consultorio
    });
  } catch (error) {
    console.error('Create consultorio error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/consultorios/:id
// @desc    Update office
// @access  Private (empresa only)
router.put('/:id', [
  auth,
  authorize('empresa'),
  param('id').isMongoId().withMessage('Invalid office ID'),
  body('numero').optional().trim().isLength({ min: 1 }).withMessage('Number is required'),
  body('nombre').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('ubicacion').optional().trim().isLength({ max: 200 }).withMessage('Location too long'),
  body('equipamiento').optional().isArray().withMessage('Equipment must be an array'),
  body('capacidad').optional().isInt({ min: 1, max: 20 }).withMessage('Capacity must be between 1 and 20'),
  body('configuracion.tipoConsultorio').optional().isIn(['general', 'especializado', 'procedimientos', 'emergencia']).withMessage('Invalid office type'),
  body('configuracion.requiereReservacion').optional().isBoolean().withMessage('Requires reservation must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const consultorio = await Consultorio.findById(req.params.id);
    if (!consultorio) {
      return res.status(404).json({ message: 'Office not found' });
    }

    // Check for duplicate number (excluding current record)
    if (req.body.numero) {
      const existingConsultorio = await Consultorio.findOne({
        _id: { $ne: req.params.id },
        numero: req.body.numero
      });

      if (existingConsultorio) {
        return res.status(400).json({ 
          message: 'Office already exists with this number' 
        });
      }
    }

    const updatedConsultorio = await Consultorio.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Office updated successfully',
      consultorio: updatedConsultorio
    });
  } catch (error) {
    console.error('Update consultorio error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/consultorios/:id
// @desc    Deactivate office
// @access  Private (empresa only)
router.delete('/:id', [
  auth,
  authorize('empresa'),
  param('id').isMongoId().withMessage('Invalid office ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const consultorio = await Consultorio.findById(req.params.id);
    if (!consultorio) {
      return res.status(404).json({ message: 'Office not found' });
    }

    // Check if office is being used by any doctor
    const Doctor = require('../models/Doctor');
    const doctorsUsingOffice = await Doctor.countDocuments({ 
      consultorioId: req.params.id,
      isActive: true 
    });

    if (doctorsUsingOffice > 0) {
      return res.status(400).json({ 
        message: `Cannot deactivate office. ${doctorsUsingOffice} active doctor(s) are using this office.` 
      });
    }

    consultorio.isActive = false;
    await consultorio.save();

    res.json({ message: 'Office deactivated successfully' });
  } catch (error) {
    console.error('Delete consultorio error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;