const express = require('express');
const { body, validationResult, param } = require('express-validator');
const Patient = require('../models/Patient');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/patients
// @desc    Get all patients
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, search, isActive = true } = req.query;
    
    let query = { isActive };
    
    if (search) {
      query.$or = [
        { nombre: { $regex: search, $options: 'i' } },
        { apellido: { $regex: search, $options: 'i' } },
        { cedula: { $regex: search, $options: 'i' } }
      ];
    }

    const patients = await Patient.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Patient.countDocuments(query);

    res.json({
      patients,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/patients/search/:query
// @desc    Search patients
// @access  Private
router.get('/search/:query', auth, async (req, res) => {
  try {
    const { query } = req.params;
    
    const patients = await Patient.find({
      $and: [
        { isActive: true },
        {
          $or: [
            { nombre: { $regex: query, $options: 'i' } },
            { apellido: { $regex: query, $options: 'i' } },
            { cedula: { $regex: query, $options: 'i' } }
          ]
        }
      ]
    }).limit(20);

    res.json(patients);
  } catch (error) {
    console.error('Search patients error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/patients/:id
// @desc    Get patient by ID
// @access  Private
router.get('/:id', [
  auth,
  param('id').isMongoId().withMessage('Invalid patient ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const patient = await Patient.findById(req.params.id);
    
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    res.json(patient);
  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/patients
// @desc    Create new patient
// @access  Private (recepcion, empresa)
router.post('/', [
  auth,
  authorize('recepcion', 'empresa'),
  body('nombre').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('apellido').trim().isLength({ min: 2 }).withMessage('Last name must be at least 2 characters'),
  body('cedula').trim().isLength({ min: 6 }).withMessage('Cedula must be at least 6 characters'),
  body('fechaNacimiento').isISO8601().withMessage('Invalid birth date'),
  body('telefono').trim().isLength({ min: 10 }).withMessage('Phone must be at least 10 characters'),
  body('genero').isIn(['M', 'F']).withMessage('Gender must be M or F'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Invalid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { cedula } = req.body;

    // Check if patient already exists
    const existingPatient = await Patient.findOne({ cedula });
    if (existingPatient) {
      return res.status(400).json({ message: 'Patient already exists with this cedula' });
    }

    const patient = new Patient(req.body);
    await patient.save();

    res.status(201).json({
      message: 'Patient created successfully',
      patient
    });
  } catch (error) {
    console.error('Create patient error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/patients/:id
// @desc    Update patient
// @access  Private (recepcion, empresa)
router.put('/:id', [
  auth,
  authorize('recepcion', 'empresa'),
  param('id').isMongoId().withMessage('Invalid patient ID'),
  body('nombre').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('apellido').optional().trim().isLength({ min: 2 }).withMessage('Last name must be at least 2 characters'),
  body('telefono').optional().trim().isLength({ min: 10 }).withMessage('Phone must be at least 10 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Invalid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    res.json({
      message: 'Patient updated successfully',
      patient
    });
  } catch (error) {
    console.error('Update patient error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/patients/:id
// @desc    Soft delete patient
// @access  Private (empresa only)
router.delete('/:id', [
  auth,
  authorize('empresa'),
  param('id').isMongoId().withMessage('Invalid patient ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    res.json({ message: 'Patient deactivated successfully' });
  } catch (error) {
    console.error('Delete patient error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;