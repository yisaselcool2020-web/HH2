const { getConnection } = require('../../config/database');

class FinancialRecord {
  static async create(recordData) {
    const connection = getConnection();
    const {
      tipo, referencia_id, paciente_id, medico_id, especialidad_id,
      regimen, monto, metodo_pago = 'efectivo', estado = 'pendiente',
      concepto, observaciones
    } = recordData;

    const [result] = await connection.execute(
      `INSERT INTO financial_records (
        tipo, referencia_id, paciente_id, medico_id, especialidad_id,
        regimen, monto, metodo_pago, estado, concepto, observaciones
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tipo, referencia_id, paciente_id, medico_id, especialidad_id,
        regimen, monto, metodo_pago, estado, concepto, observaciones
      ]
    );

    return this.findById(result.insertId);
  }

  static async findById(id) {
    const connection = getConnection();
    const [rows] = await connection.execute(
      'SELECT * FROM financial_records WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  static async updatePaymentStatus(id, estado, metodoPago = null) {
    const connection = getConnection();
    let query = 'UPDATE financial_records SET estado = ?, fecha_transaccion = CURRENT_TIMESTAMP';
    const params = [estado];

    if (metodoPago) {
      query += ', metodo_pago = ?';
      params.push(metodoPago);
    }

    query += ' WHERE id = ?';
    params.push(id);

    await connection.execute(query, params);
    return this.findById(id);
  }

  static async getEarningsByPeriod(fechaInicio, fechaFin) {
    const connection = getConnection();
    const [rows] = await connection.execute(
      `SELECT 
        regimen,
        COUNT(*) as total_transacciones,
        SUM(monto) as ingresos_totales,
        AVG(monto) as promedio_transaccion
      FROM financial_records 
      WHERE fecha_transaccion BETWEEN ? AND ? 
        AND estado = 'pagado'
      GROUP BY regimen`,
      [fechaInicio, fechaFin]
    );
    return rows;
  }

  static async getEarningsByDoctor(fechaInicio, fechaFin) {
    const connection = getConnection();
    const [rows] = await connection.execute(
      `SELECT 
        u.name as doctor_nombre,
        COUNT(fr.id) as total_consultas,
        SUM(CASE WHEN fr.regimen = 'contributivo' THEN fr.monto ELSE 0 END) as ingresos_contributivos,
        SUM(CASE WHEN fr.regimen = 'subsidiado' THEN fr.monto ELSE 0 END) as ingresos_subsidiados,
        SUM(fr.monto) as ingresos_totales
      FROM users u
      LEFT JOIN financial_records fr ON u.id = fr.medico_id 
        AND fr.fecha_transaccion BETWEEN ? AND ?
        AND fr.estado = 'pagado'
      WHERE u.role = 'doctor' AND u.is_active = TRUE
      GROUP BY u.id, u.name
      ORDER BY ingresos_totales DESC`,
      [fechaInicio, fechaFin]
    );
    return rows;
  }

  static async getDailyEarnings(fecha = null) {
    const connection = getConnection();
    const targetDate = fecha || new Date().toISOString().split('T')[0];
    
    const [rows] = await connection.execute(
      `SELECT 
        regimen,
        metodo_pago,
        COUNT(*) as cantidad,
        SUM(monto) as total
      FROM financial_records 
      WHERE DATE(fecha_transaccion) = ? 
        AND estado = 'pagado'
      GROUP BY regimen, metodo_pago
      ORDER BY regimen, metodo_pago`,
      [targetDate]
    );
    return rows;
  }

  static async getMonthlyEarnings(year, month) {
    const connection = getConnection();
    const [rows] = await connection.execute(
      `SELECT 
        DAY(fecha_transaccion) as dia,
        regimen,
        SUM(monto) as total
      FROM financial_records 
      WHERE YEAR(fecha_transaccion) = ? 
        AND MONTH(fecha_transaccion) = ?
        AND estado = 'pagado'
      GROUP BY DAY(fecha_transaccion), regimen
      ORDER BY dia`,
      [year, month]
    );
    return rows;
  }

  static async getTopEarningSpecialties(fechaInicio, fechaFin, limit = 10) {
    const connection = getConnection();
    const [rows] = await connection.execute(
      `SELECT 
        e.nombre as especialidad,
        COUNT(fr.id) as total_consultas,
        SUM(fr.monto) as ingresos_totales,
        AVG(fr.monto) as promedio_consulta
      FROM especialidades e
      LEFT JOIN financial_records fr ON e.id = fr.especialidad_id 
        AND fr.fecha_transaccion BETWEEN ? AND ?
        AND fr.estado = 'pagado'
      WHERE e.is_active = TRUE
      GROUP BY e.id, e.nombre
      HAVING ingresos_totales > 0
      ORDER BY ingresos_totales DESC
      LIMIT ?`,
      [fechaInicio, fechaFin, limit]
    );
    return rows;
  }

  static async getPendingPayments() {
    const connection = getConnection();
    const [rows] = await connection.execute(
      `SELECT fr.*, p.nombre as paciente_nombre, p.apellido as paciente_apellido,
        p.cedula as paciente_cedula, e.nombre as especialidad_nombre
      FROM financial_records fr
      JOIN patients p ON fr.paciente_id = p.id
      LEFT JOIN especialidades e ON fr.especialidad_id = e.id
      WHERE fr.estado = 'pendiente' AND fr.regimen = 'contributivo'
      ORDER BY fr.created_at DESC`
    );
    return rows;
  }

  static async getAll(filters = {}) {
    const connection = getConnection();
    let query = `
      SELECT fr.*, p.nombre as paciente_nombre, p.apellido as paciente_apellido,
        p.cedula as paciente_cedula, u.name as medico_nombre,
        e.nombre as especialidad_nombre
      FROM financial_records fr
      JOIN patients p ON fr.paciente_id = p.id
      LEFT JOIN users u ON fr.medico_id = u.id
      LEFT JOIN especialidades e ON fr.especialidad_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.regimen) {
      query += ' AND fr.regimen = ?';
      params.push(filters.regimen);
    }

    if (filters.estado) {
      query += ' AND fr.estado = ?';
      params.push(filters.estado);
    }

    if (filters.fecha_inicio && filters.fecha_fin) {
      query += ' AND fr.fecha_transaccion BETWEEN ? AND ?';
      params.push(filters.fecha_inicio, filters.fecha_fin);
    }

    query += ' ORDER BY fr.created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(parseInt(filters.limit));
    }

    const [rows] = await connection.execute(query, params);
    return rows;
  }
}

module.exports = FinancialRecord;