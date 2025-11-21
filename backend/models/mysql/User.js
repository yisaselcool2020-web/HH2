const { getConnection } = require('../../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async findById(id) {
    const connection = getConnection();
    const [rows] = await connection.execute(
      'SELECT * FROM users WHERE id = ? AND is_active = TRUE',
      [id]
    );
    return rows[0] || null;
  }

  static async findByCedula(cedula) {
    const connection = getConnection();
    const [rows] = await connection.execute(
      'SELECT * FROM users WHERE cedula = ? AND is_active = TRUE',
      [cedula]
    );
    return rows[0] || null;
  }

  static async findByEmail(email) {
    const connection = getConnection();
    const [rows] = await connection.execute(
      'SELECT * FROM users WHERE email = ? AND is_active = TRUE',
      [email]
    );
    return rows[0] || null;
  }

  static async create(userData) {
    const connection = getConnection();
    const { name, email, cedula, password, role } = userData;
    
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const [result] = await connection.execute(
      `INSERT INTO users (name, email, cedula, password, role) 
       VALUES (?, ?, ?, ?, ?)`,
      [name, email, cedula, hashedPassword, role]
    );
    
    return this.findById(result.insertId);
  }

  static async updateLastLogin(id) {
    const connection = getConnection();
    await connection.execute(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
  }

  static async comparePassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  static async getAll(filters = {}) {
    const connection = getConnection();
    let query = 'SELECT * FROM users WHERE is_active = TRUE';
    const params = [];

    if (filters.role) {
      query += ' AND role = ?';
      params.push(filters.role);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await connection.execute(query, params);
    return rows;
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
      `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  static async deactivate(id) {
    const connection = getConnection();
    await connection.execute(
      'UPDATE users SET is_active = FALSE WHERE id = ?',
      [id]
    );
  }
}

module.exports = User;