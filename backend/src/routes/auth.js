const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public (but should be restricted in production)
router.post('/register', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('cedula').trim().isLength({ min: 6 }).withMessage('Cedula must be at least 6 characters'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['empresa', 'recepcion', 'consultorio', 'enfermeria', 'doctor']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const { name, email, cedula, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { cedula }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: 'User already exists with this email or cedula' 
      });
    }

    // Create user
    const user = new User({
      name,
      email,
      cedula,
      password,
      role
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        cedula: user.cedula,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('cedula').trim().notEmpty().withMessage('Cedula is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const { cedula, password } = req.body;

    // Find user by cedula
    const user = await User.findOne({ cedula }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Get doctor info if user is a doctor
    let doctorInfo = null;
    if (user.role === 'doctor') {
      const doctor = await Doctor.findOne({ userId: user._id })
        .populate('especialidadId', 'nombre')
        .populate('consultorioId', 'numero nombre');
      
      if (doctor) {
        doctorInfo = {
          cedula: doctor.cedula,
          especialidad: doctor.especialidad,
          numeroLicencia: doctor.numeroLicencia,
          consultorio: doctor.consultorio
        };
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        cedula: user.cedula,
        role: user.role,
        lastLogin: user.lastLogin,
        doctorInfo
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    let doctorInfo = null;
    if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ userId: req.user._id })
        .populate('especialidadId', 'nombre')
        .populate('consultorioId', 'numero nombre');
      
      if (doctor) {
        doctorInfo = {
          cedula: doctor.cedula,
          especialidad: doctor.especialidad,
          numeroLicencia: doctor.numeroLicencia,
          consultorio: doctor.consultorio
        };
      }
    }

    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        cedula: req.user.cedula,
        role: req.user.role,
        lastLogin: req.user.lastLogin,
        doctorInfo
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', auth, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;