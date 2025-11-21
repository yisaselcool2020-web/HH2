const express = require('express');
const { body, validationResult, param } = require('express-validator');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const Especialidad = require('../models/Especialidad');
const Consultorio = require('../models/Consultorio');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/doctors
// @desc    Get all doctors
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, especialidad, isActive = true } = req.query;
    
    let query = { isActive };
    
    if (especialidad) {
      query.especialidad = { $regex: especialidad, $options: 'i' };
    }

    const doctors = await Doctor.find(query)
      .populate('especialidadId', 'nombre')
      .populate('consultorioId', 'numero nombre')
      .populate('userId', 'name email isActive')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Doctor.countDocuments(query);

    res.json({
      doctors,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get doctors error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/doctors/:id
// @desc    Get doctor by ID
// @access  Private
router.get('/:id', [
  auth,
  param('id').isMongoId().withMessage('Invalid doctor ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const doctor = await Doctor.findById(req.params.id)
      .populate('especialidadId', 'nombre descripcion')
      .populate('consultorioId', 'numero nombre ubicacion')
      .populate('userId', 'name email isActive lastLogin');
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    res.json(doctor);
  } catch (error) {
    console.error('Get doctor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/doctors/available/:fecha/:hora
// @desc    Get available doctors for specific date and time
// @access  Private
router.get('/available/:fecha/:hora', [
  auth,
  param('fecha').isISO8601().withMessage('Invalid date format'),
  param('hora').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid time format (HH:MM)')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fecha, hora } = req.params;
    const requestedDate = new Date(`${fecha}T${hora}:00`);
    const dayOfWeek = requestedDate.toLocaleDateString('es-ES', { weekday: 'long' }).toLowerCase();

    // Get doctors who are available on this day and time
    const availableDoctors = await Doctor.find({
      isActive: true,
      'horarios.dia': dayOfWeek,
      'horarios.activo': true
    }).populate('especialidadId', 'nombre')
      .populate('consultorioId', 'numero nombre');

    // Filter by time availability
    const doctorsInTime = availableDoctors.filter(doctor => {
      const schedule = doctor.horarios.find(h => 
        h.dia === dayOfWeek && h.activo
      );
      
      if (!schedule) return false;
      
      const startTime = schedule.horaInicio;
      const endTime = schedule.horaFin;
      
      return hora >= startTime && hora <= endTime;
    });

    res.json(doctorsInTime);
  } catch (error) {
    console.error('Get available doctors error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/doctors/:id/horarios/:fecha
// @desc    Get doctor schedule for specific date
// @access  Private
router.get('/:id/horarios/:fecha', [
  auth,
  param('id').isMongoId().withMessage('Invalid doctor ID'),
  param('fecha').isISO8601().withMessage('Invalid date format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const fecha = new Date(req.params.fecha);
    const dayOfWeek = fecha.toLocaleDateString('es-ES', { weekday: 'long' }).toLowerCase();

    const schedule = doctor.horarios.find(h => 
      h.dia === dayOfWeek && h.activo
    );

    if (!schedule) {
      return res.json({ 
        available: false, 
        message: 'Doctor not available on this day' 
      });
    }

    res.json({
      available: true,
      schedule: {
        dia: schedule.dia,
        horaInicio: schedule.horaInicio,
        horaFin: schedule.horaFin
      }
    });
  } catch (error) {
    console.error('Get doctor schedule error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/doctors
// @desc    Create new doctor
// @access  Private (empresa only)
router.post('/', [
  auth,
  authorize('empresa'),
  body('nombre').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('apellido').trim().isLength({ min: 2 }).withMessage('Last name must be at least 2 characters'),
  body('cedula').trim().isLength({ min: 6 }).withMessage('Cedula must be at least 6 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('telefono').trim().isLength({ min: 10 }).withMessage('Phone must be at least 10 characters'),
  body('especialidadId').isMongoId().withMessage('Invalid specialty ID'),
  body('consultorioId').isMongoId().withMessage('Invalid office ID'),
  body('numeroLicencia').trim().isLength({ min: 5 }).withMessage('License number must be at least 5 characters'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      nombre, apellido, cedula, email, telefono, 
      especialidadId, consultorioId, numeroLicencia, password 
    } = req.body;

    // Check if doctor already exists
    const existingDoctor = await Doctor.findOne({ 
      $or: [{ cedula }, { email }, { numeroLicencia }] 
    });

    if (existingDoctor) {
      return res.status(400).json({ 
        message: 'Doctor already exists with this cedula, email, or license number' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { cedula }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: 'User already exists with this email or cedula' 
      });
    }

    // Verify specialty exists
    const especialidad = await Especialidad.findById(especialidadId);
    if (!especialidad) {
      return res.status(404).json({ message: 'Specialty not found' });
    }

    // Verify office exists
    const consultorio = await Consultorio.findById(consultorioId);
    if (!consultorio) {
      return res.status(404).json({ message: 'Office not found' });
    }

    // Create user first
    const user = new User({
      name: `${nombre} ${apellido}`,
      email,
      cedula,
      password,
      role: 'doctor'
    });

    await user.save();

    // Create doctor
    const doctor = new Doctor({
      userId: user._id,
      nombre,
      apellido,
      cedula,
      email,
      telefono,
      especialidadId,
      especialidad: especialidad.nombre,
      consultorioId,
      consultorio: {
        numero: consultorio.numero,
        nombre: consultorio.nombre
      },
      numeroLicencia,
      // Default schedule (can be updated later)
      horarios: [
        { dia: 'lunes', horaInicio: '08:00', horaFin: '17:00', activo: true },
        { dia: 'martes', horaInicio: '08:00', horaFin: '17:00', activo: true },
        { dia: 'miercoles', horaInicio: '08:00', horaFin: '17:00', activo: true },
        { dia: 'jueves', horaInicio: '08:00', horaFin: '17:00', activo: true },
        { dia: 'viernes', horaInicio: '08:00', horaFin: '17:00', activo: true }
      ]
    });

    await doctor.save();

    const populatedDoctor = await Doctor.findById(doctor._id)
      .populate('especialidadId', 'nombre')
      .populate('consultorioId', 'numero nombre')
      .populate('userId', 'name email');

    res.status(201).json({
      message: 'Doctor created successfully',
      doctor: populatedDoctor
    });
  } catch (error) {
    console.error('Create doctor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/doctors/:id
// @desc    Update doctor
// @access  Private (empresa only)
router.put('/:id', [
  auth,
  authorize('empresa'),
  param('id').isMongoId().withMessage('Invalid doctor ID'),
  body('nombre').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('apellido').optional().trim().isLength({ min: 2 }).withMessage('Last name must be at least 2 characters'),
  body('telefono').optional().trim().isLength({ min: 10 }).withMessage('Phone must be at least 10 characters'),
  body('especialidadId').optional().isMongoId().withMessage('Invalid specialty ID'),
  body('consultorioId').optional().isMongoId().withMessage('Invalid office ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // If updating specialty, get the name
    if (req.body.especialidadId) {
      const especialidad = await Especialidad.findById(req.body.especialidadId);
      if (!especialidad) {
        return res.status(404).json({ message: 'Specialty not found' });
      }
      req.body.especialidad = especialidad.nombre;
    }

    // If updating office, get the info
    if (req.body.consultorioId) {
      const consultorio = await Consultorio.findById(req.body.consultorioId);
      if (!consultorio) {
        return res.status(404).json({ message: 'Office not found' });
      }
      req.body.consultorio = {
        numero: consultorio.numero,
        nombre: consultorio.nombre
      };
    }

    const updatedDoctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('especialidadId', 'nombre')
     .populate('consultorioId', 'numero nombre')
     .populate('userId', 'name email');

    // Update user info if name changed
    if (req.body.nombre || req.body.apellido) {
      const newName = `${req.body.nombre || doctor.nombre} ${req.body.apellido || doctor.apellido}`;
      await User.findByIdAndUpdate(doctor.userId, { name: newName });
    }

    res.json({
      message: 'Doctor updated successfully',
      doctor: updatedDoctor
    });
  } catch (error) {
    console.error('Update doctor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/doctors/:id/schedule
// @desc    Update doctor schedule
// @access  Private (empresa, doctor - own schedule)
router.put('/:id/schedule', [
  auth,
  param('id').isMongoId().withMessage('Invalid doctor ID'),
  body('horarios').isArray().withMessage('Schedule must be an array'),
  body('horarios.*.dia').isIn(['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']).withMessage('Invalid day'),
  body('horarios.*.horaInicio').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid start time format'),
  body('horarios.*.horaFin').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid end time format'),
  body('horarios.*.activo').isBoolean().withMessage('Active must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Check permissions
    const canEdit = req.user.role === 'empresa' || 
                   doctor.userId.toString() === req.user._id.toString();

    if (!canEdit) {
      return res.status(403).json({ message: 'Not authorized to edit this schedule' });
    }

    doctor.horarios = req.body.horarios;
    await doctor.save();

    res.json({
      message: 'Schedule updated successfully',
      doctor
    });
  } catch (error) {
    console.error('Update schedule error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/doctors/:id
// @desc    Deactivate doctor
// @access  Private (empresa only)
router.delete('/:id', [
  auth,
  authorize('empresa'),
  param('id').isMongoId().withMessage('Invalid doctor ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Deactivate doctor and associated user
    doctor.isActive = false;
    await doctor.save();

    await User.findByIdAndUpdate(doctor.userId, { isActive: false });

    res.json({ message: 'Doctor deactivated successfully' });
  } catch (error) {
    console.error('Deactivate doctor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;