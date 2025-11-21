const { getConnection } = require('../../config/database');

class Especialidad {
  static async findById(id) {
    const connection = getConnection();
    const [rows] = await connection.execute(
      'SELECT * FROM especialidades WHERE id = ? AND is_active = TRUE',
      [id]
    );
    return rows[0] || null;
  }

  static async findByNombre(nombre) {
    const connection = getConnection();
    const [rows] = await connection.execute(
      'SELECT * FROM especialidades WHERE nombre = ? AND is_active = TRUE',
      [nombre]
    );
    return rows[0] || null;
  }

  static async getAll(filters = {}) {
    const connection = getConnection();
    let query = 'SELECT * FROM especialidades WHERE is_active = TRUE';
    const params = [];

    query += ' ORDER BY nombre ASC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(parseInt(filters.limit));
    }

    const [rows] = await connection.execute(query, params);
    return rows;
  }

  static async create(especialidadData) {
    const connection = getConnection();
    const {
      nombre, descripcion, codigo, precio_contributivo = 0,
      precio_subsidiado = 3676.12, duracion_consulta_minutos = 30,
      requiere_triaje = true, color = '#3B82F6'
    } = especialidadData;

    const [result] = await connection.execute(
      `INSERT INTO especialidades (
        nombre, descripcion, codigo, precio_contributivo, precio_subsidiado,
        duracion_consulta_minutos, requiere_triaje, color
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre, descripcion, codigo, precio_contributivo, precio_subsidiado,
        duracion_consulta_minutos, requiere_triaje, color
      ]
    );

    return this.findById(result.insertId);
  }

  static async update(id, updateData) {
    const connection = getConnection();
    const fields = [];
    const values = [];

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined && key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(updateData[key]);
      }
    });

    if (fields.length === 0) return null;

    values.push(id);
    
    await connection.execute(
      `UPDATE especialidades SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  static async deactivate(id) {
    const connection = getConnection();
    await connection.execute(
      'UPDATE especialidades SET is_active = FALSE WHERE id = ?',
      [id]
    );
  }

  static async getPrecioByRegimen(especialidadId, regimen) {
    const connection = getConnection();
    const campo = regimen === 'contributivo' ? 'precio_contributivo' : 'precio_subsidiado';
    const [rows] = await connection.execute(
      `SELECT ${campo} as precio FROM especialidades WHERE id = ? AND is_active = TRUE`,
      [especialidadId]
    );
    return rows[0]?.precio || 0;
  }

  static async getEarningsByEspecialidad(fechaInicio, fechaFin) {
    const connection = getConnection();
    const [rows] = await connection.execute(
      `SELECT 
        e.nombre as especialidad,
        COUNT(fr.id) as total_consultas,
        SUM(CASE WHEN fr.regimen = 'contributivo' THEN fr.monto ELSE 0 END) as ingresos_contributivos,
        SUM(CASE WHEN fr.regimen = 'subsidiado' THEN fr.monto ELSE 0 END) as ingresos_subsidiados,
        SUM(fr.monto) as ingresos_totales
      FROM especialidades e
      LEFT JOIN financial_records fr ON e.id = fr.especialidad_id 
        AND fr.fecha_transaccion BETWEEN ? AND ?
        AND fr.estado = 'pagado'
      WHERE e.is_active = TRUE
      GROUP BY e.id, e.nombre
      ORDER BY ingresos_totales DESC`,
      [fechaInicio, fechaFin]
    );
    return rows;
  }
}

module.exports = Especialidad;