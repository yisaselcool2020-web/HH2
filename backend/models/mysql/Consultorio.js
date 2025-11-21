const { getConnection } = require('../../config/database');

class Consultorio {
  static async findById(id) {
    const connection = getConnection();
    const [rows] = await connection.execute(
      'SELECT * FROM consultorios WHERE id = ? AND is_active = TRUE',
      [id]
    );
    return rows[0] || null;
  }

  static async findByNumero(numero) {
    const connection = getConnection();
    const [rows] = await connection.execute(
      'SELECT * FROM consultorios WHERE numero = ? AND is_active = TRUE',
      [numero]
    );
    return rows[0] || null;
  }

  static async getAll(filters = {}) {
    const connection = getConnection();
    let query = 'SELECT * FROM consultorios WHERE is_active = TRUE';
    const params = [];

    if (filters.tipo_consultorio) {
      query += ' AND tipo_consultorio = ?';
      params.push(filters.tipo_consultorio);
    }

    query += ' ORDER BY numero ASC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(parseInt(filters.limit));
    }

    const [rows] = await connection.execute(query, params);
    return rows;
  }

  static async create(consultorioData) {
    const connection = getConnection();
    const {
      numero, nombre, ubicacion, equipamiento, capacidad = 1,
      tipo_consultorio = 'general', requiere_reservacion = true
    } = consultorioData;

    const [result] = await connection.execute(
      `INSERT INTO consultorios (
        numero, nombre, ubicacion, equipamiento, capacidad,
        tipo_consultorio, requiere_reservacion
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        numero, nombre, ubicacion,
        equipamiento ? JSON.stringify(equipamiento) : null,
        capacidad, tipo_consultorio, requiere_reservacion
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
        if (key === 'equipamiento') {
          fields.push(`${key} = ?`);
          values.push(JSON.stringify(updateData[key]));
        } else {
          fields.push(`${key} = ?`);
          values.push(updateData[key]);
        }
      }
    });

    if (fields.length === 0) return null;

    values.push(id);
    
    await connection.execute(
      `UPDATE consultorios SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  static async deactivate(id) {
    const connection = getConnection();
    await connection.execute(
      'UPDATE consultorios SET is_active = FALSE WHERE id = ?',
      [id]
    );
  }

  static async getAvailable() {
    const connection = getConnection();
    const [rows] = await connection.execute(
      `SELECT c.* FROM consultorios c
       LEFT JOIN doctors d ON c.id = d.consultorio_id AND d.is_active = TRUE
       WHERE c.is_active = TRUE AND d.id IS NULL
       ORDER BY c.numero ASC`
    );
    return rows;
  }
}

module.exports = Consultorio;