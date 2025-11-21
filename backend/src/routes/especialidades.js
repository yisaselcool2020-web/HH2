const express = require('express');
const { body, validationResult, param } = require('express-validator');
const Especialidad = require('../models/Especialidad');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/especialidades
// @desc    Get all specialties
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, isActive = true } = req.query;
    
    let query = { isActive };

    const especialidades = await Especialidad.find(query)
      .sort({ nombre: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Especialidad.countDocuments(query);

    res.json({
      especialidades,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get especialidades error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/especialidades/:id
// @desc    Get specialty by ID
// @access  Private
router.get('/:id', [
  auth,
  param('id').isMongoId().withMessage('Invalid specialty ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const especialidad = await Especialidad.findById(req.params.id);
    
    if (!especialidad) {
      return res.status(404).json({ message: 'Specialty not found' });
    }

    res.json(especialidad);
  } catch (error) {
    console.error('Get especialidad error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/especialidades
// @desc    Create new specialty
// @access  Private (empresa only)
router.post('/', [
  auth,
  authorize('empresa'),
  body('nombre').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('descripcion').optional().trim().isLength({ max: 500 }).withMessage('Description too long'),
  body('codigo').optional().trim().isLength({ min: 2, max: 10 }).withMessage('Code must be between 2 and 10 characters'),
  body('configuracion.duracionConsultaMinutos').optional().isInt({ min: 15, max: 180 }).withMessage('Duration must be between 15 and 180 minutes'),
  body('configuracion.requiereTriaje').optional().isBoolean().withMessage('Requires triage must be boolean'),
  body('configuracion.color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid color format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nombre, codigo } = req.body;

    // Check if specialty already exists
    const existingEspecialidad = await Especialidad.findOne({ 
      $or: [{ nombre }, ...(codigo ? [{ codigo }] : [])]
    });

    if (existingEspecialidad) {
      return res.status(400).json({ 
        message: 'Specialty already exists with this name or code' 
      });
    }

    const especialidad = new Especialidad(req.body);
    await especialidad.save();

    res.status(201).json({
      message: 'Specialty created successfully',
      especialidad
    });
  } catch (error) {
    console.error('Create especialidad error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/especialidades/:id
// @desc    Update specialty
// @access  Private (empresa only)
router.put('/:id', [
  auth,
  authorize('empresa'),
  param('id').isMongoId().withMessage('Invalid specialty ID'),
  body('nombre').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('descripcion').optional().trim().isLength({ max: 500 }).withMessage('Description too long'),
  body('codigo').optional().trim().isLength({ min: 2, max: 10 }).withMessage('Code must be between 2 and 10 characters'),
  body('configuracion.duracionConsultaMinutos').optional().isInt({ min: 15, max: 180 }).withMessage('Duration must be between 15 and 180 minutes'),
  body('configuracion.requiereTriaje').optional().isBoolean().withMessage('Requires triage must be boolean'),
  body('configuracion.color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid color format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const especialidad = await Especialidad.findById(req.params.id);
    if (!especialidad) {
      return res.status(404).json({ message: 'Specialty not found' });
    }

    // Check for duplicate name or code (excluding current record)
    if (req.body.nombre || req.body.codigo) {
      const duplicateQuery = {
        _id: { $ne: req.params.id },
        $or: []
      };

      if (req.body.nombre) {
        duplicateQuery.$or.push({ nombre: req.body.nombre });
      }

      if (req.body.codigo) {
        duplicateQuery.$or.push({ codigo: req.body.codigo });
      }

      const existingEspecialidad = await Especialidad.findOne(duplicateQuery);
      if (existingEspecialidad) {
        return res.status(400).json({ 
          message: 'Specialty already exists with this name or code' 
        });
      }
    }

    const updatedEspecialidad = await Especialidad.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Specialty updated successfully',
      especialidad: updatedEspecialidad
    });
  } catch (error) {
    console.error('Update especialidad error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/especialidades/:id
// @desc    Deactivate specialty
// @access  Private (empresa only)
router.delete('/:id', [
  auth,
  authorize('empresa'),
  param('id').isMongoId().withMessage('Invalid specialty ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const especialidad = await Especialidad.findById(req.params.id);
    if (!especialidad) {
      return res.status(404).json({ message: 'Specialty not found' });
    }

    // Check if specialty is being used by any doctor
    const Doctor = require('../models/Doctor');
    const doctorsUsingSpecialty = await Doctor.countDocuments({ 
      especialidadId: req.params.id,
      isActive: true 
    });

    if (doctorsUsingSpecialty > 0) {
      return res.status(400).json({ 
        message: `Cannot deactivate specialty. ${doctorsUsingSpecialty} active doctor(s) are using this specialty.` 
      });
    }

    especialidad.isActive = false;
    await especialidad.save();

    res.json({ message: 'Specialty deactivated successfully' });
  } catch (error) {
    console.error('Delete especialidad error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;