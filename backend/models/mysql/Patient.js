const { getConnection } = require('../../config/database');

class Patient {
  static async findById(id) {
    const connection = getConnection();
    const [rows] = await connection.execute(
      'SELECT *, YEAR(CURDATE()) - YEAR(fecha_nacimiento) - (DATE_FORMAT(CURDATE(), "%m%d") < DATE_FORMAT(fecha_nacimiento, "%m%d")) AS edad FROM patients WHERE id = ? AND is_active = TRUE',
      [id]
    );
    return rows[0] || null;
  }

  static async findByCedula(cedula) {
    const connection = getConnection();
    const [rows] = await connection.execute(
      'SELECT *, YEAR(CURDATE()) - YEAR(fecha_nacimiento) - (DATE_FORMAT(CURDATE(), "%m%d") < DATE_FORMAT(fecha_nacimiento, "%m%d")) AS edad FROM patients WHERE cedula = ? AND is_active = TRUE',
      [cedula]
    );
    return rows[0] || null;
  }

  static async getAll(filters = {}) {
    const connection = getConnection();
    let query = 'SELECT *, YEAR(CURDATE()) - YEAR(fecha_nacimiento) - (DATE_FORMAT(CURDATE(), "%m%d") < DATE_FORMAT(fecha_nacimiento, "%m%d")) AS edad FROM patients WHERE is_active = TRUE';
    const params = [];

    if (filters.search) {
      query += ' AND (nombre LIKE ? OR apellido LIKE ? OR cedula LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (filters.regimen) {
      query += ' AND regimen = ?';
      params.push(filters.regimen);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(parseInt(filters.limit));
    }

    const [rows] = await connection.execute(query, params);
    return rows;
  }

  static async search(searchTerm) {
    const connection = getConnection();
    const [rows] = await connection.execute(
      `SELECT *, YEAR(CURDATE()) - YEAR(fecha_nacimiento) - (DATE_FORMAT(CURDATE(), "%m%d") < DATE_FORMAT(fecha_nacimiento, "%m%d")) AS edad 
       FROM patients 
       WHERE is_active = TRUE 
       AND (nombre LIKE ? OR apellido LIKE ? OR cedula LIKE ?) 
       LIMIT 20`,
      [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]
    );
    return rows;
  }

  static async create(patientData) {
    const connection = getConnection();
    const {
      nombre, apellido, cedula, fecha_nacimiento, telefono, genero,
      direccion, email, regimen = 'contributivo', contacto_emergencia,
      seguro_medico, alergias, enfermedades_cronicas, medicamentos_actuales
    } = patientData;

    const [result] = await connection.execute(
      `INSERT INTO patients (
        nombre, apellido, cedula, fecha_nacimiento, telefono, genero,
        direccion, email, regimen, contacto_emergencia, seguro_medico,
        alergias, enfermedades_cronicas, medicamentos_actuales
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre, apellido, cedula, fecha_nacimiento, telefono, genero,
        direccion, email, regimen,
        contacto_emergencia ? JSON.stringify(contacto_emergencia) : null,
        seguro_medico ? JSON.stringify(seguro_medico) : null,
        alergias ? JSON.stringify(alergias) : null,
        enfermedades_cronicas ? JSON.stringify(enfermedades_cronicas) : null,
        medicamentos_actuales ? JSON.stringify(medicamentos_actuales) : null
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
        if (['contacto_emergencia', 'seguro_medico', 'alergias', 'enfermedades_cronicas', 'medicamentos_actuales'].includes(key)) {
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
      `UPDATE patients SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  static async deactivate(id) {
    const connection = getConnection();
    await connection.execute(
      'UPDATE patients SET is_active = FALSE WHERE id = ?',
      [id]
    );
  }

  static async getByRegimen(regimen) {
    const connection = getConnection();
    const [rows] = await connection.execute(
      'SELECT COUNT(*) as count FROM patients WHERE regimen = ? AND is_active = TRUE',
      [regimen]
    );
    return rows[0].count;
  }

  static async getTotalCount() {
    const connection = getConnection();
    const [rows] = await connection.execute(
      'SELECT COUNT(*) as count FROM patients WHERE is_active = TRUE'
    );
    return rows[0].count;
  }
}

module.exports = Patient;