const express = require('express');
const { body, validationResult, param } = require('express-validator');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/appointments
// @desc    Get all appointments
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      fecha, 
      medicoId, 
      estado,
      pacienteId 
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
    
    // Filter by doctor
    if (medicoId) {
      query.medicoId = medicoId;
    }
    
    // Filter by status
    if (estado) {
      query.estado = estado;
    }
    
    // Filter by patient
    if (pacienteId) {
      query.pacienteId = pacienteId;
    }

    const appointments = await Appointment.find(query)
      .populate('pacienteId', 'nombre apellido cedula telefono')
      .populate('medicoId', 'name')
      .populate('creadoPor', 'name')
      .sort({ fechaHora: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Appointment.countDocuments(query);

    res.json({
      appointments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/appointments/my-appointments
// @desc    Get current user's appointments (for doctors)
// @access  Private (doctor)
router.get('/my-appointments', [
  auth,
  authorize('doctor', 'consultorio')
], async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      fecha,
      estado 
    } = req.query;
    
    let query = { medicoId: req.user._id };
    
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
    
    // Filter by status
    if (estado) {
      query.estado = estado;
    }

    const appointments = await Appointment.find(query)
      .populate('pacienteId', 'nombre apellido cedula telefono')
      .sort({ fechaHora: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Appointment.countDocuments(query);

    res.json({
      appointments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get my appointments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/appointments/doctor/:doctorId
// @desc    Get appointments for specific doctor
// @access  Private
router.get('/doctor/:doctorId', [
  auth,
  param('doctorId').isMongoId().withMessage('Invalid doctor ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      page = 1, 
      limit = 50, 
      fecha,
      estado 
    } = req.query;
    
    let query = { medicoId: req.params.doctorId };
    
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
    
    // Filter by status
    if (estado) {
      query.estado = estado;
    }

    const appointments = await Appointment.find(query)
      .populate('pacienteId', 'nombre apellido cedula telefono')
      .sort({ fechaHora: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Appointment.countDocuments(query);

    res.json({
      appointments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get doctor appointments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/appointments/:id
// @desc    Get appointment by ID
// @access  Private
router.get('/:id', [
  auth,
  param('id').isMongoId().withMessage('Invalid appointment ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const appointment = await Appointment.findById(req.params.id)
      .populate('pacienteId')
      .populate('medicoId', 'name')
      .populate('creadoPor', 'name');
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    res.json(appointment);
  } catch (error) {
    console.error('Get appointment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/appointments
// @desc    Create new appointment
// @access  Private (recepcion, empresa)
router.post('/', [
  auth,
  authorize('recepcion', 'empresa'),
  body('pacienteId').isMongoId().withMessage('Invalid patient ID'),
  body('medicoId').isMongoId().withMessage('Invalid doctor ID'),
  body('fechaHora').isISO8601().withMessage('Invalid date and time'),
  body('motivoConsulta').trim().isLength({ min: 5 }).withMessage('Reason must be at least 5 characters'),
  body('duracionMinutos').optional().isInt({ min: 15, max: 180 }).withMessage('Duration must be between 15 and 180 minutes')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { pacienteId, medicoId, fechaHora } = req.body;

    // Verify patient exists
    const patient = await Patient.findById(pacienteId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Verify doctor exists
    const doctor = await User.findById(medicoId);
    if (!doctor || !['doctor', 'consultorio'].includes(doctor.role)) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Check for conflicting appointments
    const conflictingAppointment = await Appointment.findOne({
      medicoId,
      fechaHora: new Date(fechaHora),
      estado: { $nin: ['cancelada', 'no_asistio'] }
    });

    if (conflictingAppointment) {
      return res.status(400).json({ 
        message: 'Doctor already has an appointment at this time' 
      });
    }

    const appointment = new Appointment({
      ...req.body,
      creadoPor: req.user._id
    });

    await appointment.save();

    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate('pacienteId', 'nombre apellido cedula telefono')
      .populate('medicoId', 'name')
      .populate('creadoPor', 'name');

    res.status(201).json({
      message: 'Appointment created successfully',
      appointment: populatedAppointment
    });
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/appointments/:id
// @desc    Update appointment
// @access  Private
router.put('/:id', [
  auth,
  param('id').isMongoId().withMessage('Invalid appointment ID'),
  body('fechaHora').optional().isISO8601().withMessage('Invalid date and time'),
  body('motivoConsulta').optional().trim().isLength({ min: 5 }).withMessage('Reason must be at least 5 characters'),
  body('estado').optional().isIn(['programada', 'confirmada', 'en_curso', 'completada', 'cancelada', 'no_asistio']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check permissions
    const canEdit = req.user.role === 'empresa' || 
                   req.user.role === 'recepcion' || 
                   appointment.medicoId.toString() === req.user._id.toString();

    if (!canEdit) {
      return res.status(403).json({ message: 'Not authorized to edit this appointment' });
    }

    // If changing date/time, check for conflicts
    if (req.body.fechaHora && req.body.fechaHora !== appointment.fechaHora.toISOString()) {
      const conflictingAppointment = await Appointment.findOne({
        _id: { $ne: appointment._id },
        medicoId: appointment.medicoId,
        fechaHora: new Date(req.body.fechaHora),
        estado: { $nin: ['cancelada', 'no_asistio'] }
      });

      if (conflictingAppointment) {
        return res.status(400).json({ 
          message: 'Doctor already has an appointment at this time' 
        });
      }
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('pacienteId', 'nombre apellido cedula telefono')
     .populate('medicoId', 'name');

    res.json({
      message: 'Appointment updated successfully',
      appointment: updatedAppointment
    });
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/appointments/:id/payment
// @desc    Update appointment payment
// @access  Private (recepcion, empresa)
router.put('/:id/payment', [
  auth,
  authorize('recepcion', 'empresa'),
  param('id').isMongoId().withMessage('Invalid appointment ID'),
  body('monto').isNumeric().withMessage('Amount must be a number'),
  body('metodoPago').isIn(['efectivo', 'tarjeta', 'transferencia', 'seguro']).withMessage('Invalid payment method'),
  body('estado').isIn(['pendiente', 'pagado', 'parcial']).withMessage('Invalid payment status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { 
        pago: {
          ...req.body,
          fechaPago: req.body.estado === 'pagado' ? new Date() : undefined
        }
      },
      { new: true, runValidators: true }
    ).populate('pacienteId', 'nombre apellido cedula telefono')
     .populate('medicoId', 'name');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    res.json({
      message: 'Payment updated successfully',
      appointment
    });
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/appointments/:id
// @desc    Cancel appointment
// @access  Private
router.delete('/:id', [
  auth,
  param('id').isMongoId().withMessage('Invalid appointment ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check permissions
    const canCancel = req.user.role === 'empresa' || 
                     req.user.role === 'recepcion' || 
                     appointment.medicoId.toString() === req.user._id.toString();

    if (!canCancel) {
      return res.status(403).json({ message: 'Not authorized to cancel this appointment' });
    }

    appointment.estado = 'cancelada';
    await appointment.save();

    res.json({ message: 'Appointment cancelled successfully' });
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;