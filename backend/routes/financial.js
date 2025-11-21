const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const FinancialRecord = require('../models/mysql/FinancialRecord');
const Especialidad = require('../models/mysql/Especialidad');
const Patient = require('../models/mysql/Patient');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/financial/earnings
// @desc    Get earnings summary
// @access  Private (empresa, recepcion)
router.get('/earnings', [
  auth,
  authorize('empresa', 'recepcion'),
  query('fecha_inicio').optional().isISO8601().withMessage('Invalid start date'),
  query('fecha_fin').optional().isISO8601().withMessage('Invalid end date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fecha_inicio, fecha_fin } = req.query;
    
    // Si no se proporcionan fechas, usar el mes actual
    const startDate = fecha_inicio || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const endDate = fecha_fin || new Date().toISOString().split('T')[0];

    const [earningsByRegimen, earningsByDoctor, earningsBySpecialty] = await Promise.all([
      FinancialRecord.getEarningsByPeriod(startDate, endDate),
      FinancialRecord.getEarningsByDoctor(startDate, endDate),
      Especialidad.getEarningsByEspecialidad(startDate, endDate)
    ]);

    // Calcular totales
    const totales = {
      contributivo: 0,
      subsidiado: 0,
      total: 0,
      transacciones: 0
    };

    earningsByRegimen.forEach(item => {
      totales[item.regimen] = parseFloat(item.ingresos_totales);
      totales.total += parseFloat(item.ingresos_totales);
      totales.transacciones += item.total_transacciones;
    });

    res.json({
      periodo: { fecha_inicio: startDate, fecha_fin: endDate },
      totales,
      por_regimen: earningsByRegimen,
      por_doctor: earningsByDoctor,
      por_especialidad: earningsBySpecialty
    });
  } catch (error) {
    console.error('Get earnings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/financial/daily-earnings
// @desc    Get daily earnings
// @access  Private (empresa, recepcion)
router.get('/daily-earnings', [
  auth,
  authorize('empresa', 'recepcion'),
  query('fecha').optional().isISO8601().withMessage('Invalid date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const fecha = req.query.fecha || new Date().toISOString().split('T')[0];
    const dailyEarnings = await FinancialRecord.getDailyEarnings(fecha);

    // Organizar datos por régimen y método de pago
    const summary = {
      fecha,
      contributivo: {
        efectivo: 0,
        tarjeta: 0,
        transferencia: 0,
        total: 0,
        cantidad: 0
      },
      subsidiado: {
        automatico: 0,
        total: 0,
        cantidad: 0
      },
      gran_total: 0
    };

    dailyEarnings.forEach(item => {
      const regimen = item.regimen;
      const metodo = item.metodo_pago;
      const total = parseFloat(item.total);
      const cantidad = item.cantidad;

      if (regimen === 'contributivo') {
        summary.contributivo[metodo] = total;
        summary.contributivo.total += total;
        summary.contributivo.cantidad += cantidad;
      } else if (regimen === 'subsidiado') {
        summary.subsidiado.automatico = total;
        summary.subsidiado.total = total;
        summary.subsidiado.cantidad = cantidad;
      }

      summary.gran_total += total;
    });

    res.json(summary);
  } catch (error) {
    console.error('Get daily earnings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/financial/pending-payments
// @desc    Get pending payments (contributivos only)
// @access  Private (empresa, recepcion)
router.get('/pending-payments', [
  auth,
  authorize('empresa', 'recepcion')
], async (req, res) => {
  try {
    const pendingPayments = await FinancialRecord.getPendingPayments();

    res.json({
      pending_payments: pendingPayments,
      total_pending: pendingPayments.length,
      total_amount: pendingPayments.reduce((sum, payment) => sum + parseFloat(payment.monto), 0)
    });
  } catch (error) {
    console.error('Get pending payments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/financial/process-payment
// @desc    Process payment for contributivo patients
// @access  Private (recepcion)
router.post('/process-payment', [
  auth,
  authorize('recepcion'),
  body('financial_record_id').isInt().withMessage('Invalid financial record ID'),
  body('metodo_pago').isIn(['efectivo', 'tarjeta', 'transferencia']).withMessage('Invalid payment method'),
  body('monto_recibido').isFloat({ min: 0 }).withMessage('Invalid amount received')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { financial_record_id, metodo_pago, monto_recibido } = req.body;

    // Verificar que el registro existe y está pendiente
    const record = await FinancialRecord.findById(financial_record_id);
    if (!record) {
      return res.status(404).json({ message: 'Financial record not found' });
    }

    if (record.estado !== 'pendiente') {
      return res.status(400).json({ message: 'Payment already processed' });
    }

    if (record.regimen !== 'contributivo') {
      return res.status(400).json({ message: 'Only contributivo payments can be processed manually' });
    }

    // Determinar estado del pago
    const montoOriginal = parseFloat(record.monto);
    let estadoPago = 'pagado';
    
    if (monto_recibido < montoOriginal) {
      estadoPago = 'parcial';
    }

    // Actualizar el registro financiero
    const updatedRecord = await FinancialRecord.updatePaymentStatus(
      financial_record_id, 
      estadoPago, 
      metodo_pago
    );

    res.json({
      message: 'Payment processed successfully',
      record: updatedRecord,
      monto_recibido,
      cambio: monto_recibido > montoOriginal ? monto_recibido - montoOriginal : 0
    });
  } catch (error) {
    console.error('Process payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/financial/monthly-trends
// @desc    Get monthly earnings trends
// @access  Private (empresa)
router.get('/monthly-trends', [
  auth,
  authorize('empresa'),
  query('year').optional().isInt({ min: 2020, max: 2030 }).withMessage('Invalid year'),
  query('month').optional().isInt({ min: 1, max: 12 }).withMessage('Invalid month')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const year = req.query.year || new Date().getFullYear();
    const month = req.query.month || new Date().getMonth() + 1;

    const monthlyData = await FinancialRecord.getMonthlyEarnings(year, month);

    // Organizar datos por día
    const daysInMonth = new Date(year, month, 0).getDate();
    const dailyTrends = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dayData = {
        dia: day,
        contributivo: 0,
        subsidiado: 0,
        total: 0
      };

      const dayRecords = monthlyData.filter(record => record.dia === day);
      dayRecords.forEach(record => {
        dayData[record.regimen] = parseFloat(record.total);
        dayData.total += parseFloat(record.total);
      });

      dailyTrends.push(dayData);
    }

    res.json({
      year: parseInt(year),
      month: parseInt(month),
      daily_trends: dailyTrends,
      summary: {
        total_contributivo: dailyTrends.reduce((sum, day) => sum + day.contributivo, 0),
        total_subsidiado: dailyTrends.reduce((sum, day) => sum + day.subsidiado, 0),
        total_mes: dailyTrends.reduce((sum, day) => sum + day.total, 0)
      }
    });
  } catch (error) {
    console.error('Get monthly trends error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/financial/top-specialties
// @desc    Get top earning specialties
// @access  Private (empresa)
router.get('/top-specialties', [
  auth,
  authorize('empresa'),
  query('fecha_inicio').optional().isISO8601().withMessage('Invalid start date'),
  query('fecha_fin').optional().isISO8601().withMessage('Invalid end date'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Invalid limit')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fecha_inicio, fecha_fin, limit = 10 } = req.query;
    
    const startDate = fecha_inicio || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const endDate = fecha_fin || new Date().toISOString().split('T')[0];

    const topSpecialties = await FinancialRecord.getTopEarningSpecialties(
      startDate, 
      endDate, 
      parseInt(limit)
    );

    res.json({
      periodo: { fecha_inicio: startDate, fecha_fin: endDate },
      top_specialties: topSpecialties
    });
  } catch (error) {
    console.error('Get top specialties error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/financial/records
// @desc    Get all financial records with filters
// @access  Private (empresa, recepcion)
router.get('/records', [
  auth,
  authorize('empresa', 'recepcion'),
  query('regimen').optional().isIn(['contributivo', 'subsidiado']).withMessage('Invalid regimen'),
  query('estado').optional().isIn(['pendiente', 'pagado', 'parcial', 'cancelado']).withMessage('Invalid status'),
  query('fecha_inicio').optional().isISO8601().withMessage('Invalid start date'),
  query('fecha_fin').optional().isISO8601().withMessage('Invalid end date'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Invalid limit')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const filters = {
      regimen: req.query.regimen,
      estado: req.query.estado,
      fecha_inicio: req.query.fecha_inicio,
      fecha_fin: req.query.fecha_fin,
      limit: req.query.limit ? parseInt(req.query.limit) : 100
    };

    const records = await FinancialRecord.getAll(filters);

    res.json({
      records,
      total: records.length,
      filters
    });
  } catch (error) {
    console.error('Get financial records error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;