const { getConnection } = require('../../config/database');

class Triage {
  static async findById(id) {
    const connection = getConnection();
    const [rows] = await connection.execute(
      `SELECT t.*, 
        p.nombre as paciente_nombre, p.apellido as paciente_apellido, 
        p.cedula as paciente_cedula, p.telefono as paciente_telefono,
        p.fecha_nacimiento as paciente_fecha_nacimiento, p.genero as paciente_genero,
        u.name as enfermero_nombre,
        ua.name as asignado_nombre
       FROM triages t
       JOIN patients p ON t.paciente_id = p.id
       JOIN users u ON t.enfermero_id = u.id
       LEFT JOIN users ua ON t.asignado_a = ua.id
       WHERE t.id = ?`,
      [id]
    );
    
    if (rows[0]) {
      const triage = rows[0];
      // Formatear datos del paciente
      triage.pacienteId = {
        id: triage.paciente_id,
        nombre: triage.paciente_nombre,
        apellido: triage.paciente_apellido,
        cedula: triage.paciente_cedula,
        telefono: triage.paciente_telefono,
        fechaNacimiento: triage.paciente_fecha_nacimiento,
        genero: triage.paciente_genero
      };
      
      // Formatear signos vitales
      triage.signosVitales = {
        presionArterial: triage.presion_arterial,
        temperatura: triage.temperatura,
        pulso: triage.pulso,
        saturacionOxigeno: triage.saturacion_oxigeno,
        frecuenciaRespiratoria: triage.frecuencia_respiratoria
      };
      
      return triage;
    }
    return null;
  }

  static async getAll(filters = {}) {
    const connection = getConnection();
    let query = `
      SELECT t.*, 
        p.nombre as paciente_nombre, p.apellido as paciente_apellido, 
        p.cedula as paciente_cedula, p.telefono as paciente_telefono,
        p.fecha_nacimiento as paciente_fecha_nacimiento, p.genero as paciente_genero,
        u.name as enfermero_nombre,
        ua.name as asignado_nombre
      FROM triages t
      JOIN patients p ON t.paciente_id = p.id
      JOIN users u ON t.enfermero_id = u.id
      LEFT JOIN users ua ON t.asignado_a = ua.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.fecha) {
      query += ' AND DATE(t.fecha_hora) = ?';
      params.push(filters.fecha);
    }

    if (filters.prioridad) {
      query += ' AND t.prioridad = ?';
      params.push(filters.prioridad);
    }

    if (filters.estado) {
      query += ' AND t.estado = ?';
      params.push(filters.estado);
    }

    if (filters.enfermero_id) {
      query += ' AND t.enfermero_id = ?';
      params.push(filters.enfermero_id);
    }

    if (filters.paciente_id) {
      query += ' AND t.paciente_id = ?';
      params.push(filters.paciente_id);
    }

    // Búsqueda por ID de paciente (cédula)
    if (filters.search_id) {
      query += ' AND p.cedula LIKE ?';
      params.push(`%${filters.search_id}%`);
    }

    query += ' ORDER BY t.prioridad = "alta" DESC, t.fecha_hora DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(parseInt(filters.limit));
    }

    const [rows] = await connection.execute(query, params);
    
    return rows.map(row => ({
      ...row,
      pacienteId: {
        id: row.paciente_id,
        nombre: row.paciente_nombre,
        apellido: row.paciente_apellido,
        cedula: row.paciente_cedula,
        telefono: row.paciente_telefono,
        fechaNacimiento: row.paciente_fecha_nacimiento,
        genero: row.paciente_genero
      },
      signosVitales: {
        presionArterial: row.presion_arterial,
        temperatura: row.temperatura,
        pulso: row.pulso,
        saturacionOxigeno: row.saturacion_oxigeno,
        frecuenciaRespiratoria: row.frecuencia_respiratoria
      }
    }));
  }

  static async create(triageData) {
    const connection = getConnection();
    const {
      paciente_id, enfermero_id, sintomas, prioridad, signosVitales,
      observaciones, dolor_escala, glasgow_escala
    } = triageData;

    const [result] = await connection.execute(
      `INSERT INTO triages (
        paciente_id, enfermero_id, sintomas, prioridad,
        presion_arterial, temperatura, pulso, saturacion_oxigeno,
        frecuencia_respiratoria, peso, talla, dolor_escala, glasgow_escala,
        observaciones
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        paciente_id, enfermero_id, sintomas, prioridad,
        signosVitales.presionArterial, signosVitales.temperatura,
        signosVitales.pulso, signosVitales.saturacionOxigeno,
        signosVitales.frecuenciaRespiratoria || null,
        signosVitales.peso || null, signosVitales.talla || null,
        dolor_escala || null, glasgow_escala || null, observaciones
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
        if (key === 'signosVitales') {
          const sv = updateData[key];
          if (sv.presionArterial !== undefined) {
            fields.push('presion_arterial = ?');
            values.push(sv.presionArterial);
          }
          if (sv.temperatura !== undefined) {
            fields.push('temperatura = ?');
            values.push(sv.temperatura);
          }
          if (sv.pulso !== undefined) {
            fields.push('pulso = ?');
            values.push(sv.pulso);
          }
          if (sv.saturacionOxigeno !== undefined) {
            fields.push('saturacion_oxigeno = ?');
            values.push(sv.saturacionOxigeno);
          }
          if (sv.frecuenciaRespiratoria !== undefined) {
            fields.push('frecuencia_respiratoria = ?');
            values.push(sv.frecuenciaRespiratoria);
          }
        } else {
          fields.push(`${key} = ?`);
          values.push(updateData[key]);
        }
      }
    });

    if (fields.length === 0) return null;

    values.push(id);
    
    await connection.execute(
      `UPDATE triages SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  static async assignToDoctor(id, doctorId) {
    const connection = getConnection();
    await connection.execute(
      `UPDATE triages SET 
        asignado_a = ?, 
        fecha_asignacion = CURRENT_TIMESTAMP, 
        estado = 'en_proceso',
        updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [doctorId, id]
    );
    return this.findById(id);
  }

  static async getPendingTriages() {
    const connection = getConnection();
    return this.getAll({ 
      estado: 'pendiente'
    });
  }

  static async getTriagesByPriority() {
    const connection = getConnection();
    const [rows] = await connection.execute(
      `SELECT prioridad, COUNT(*) as count 
       FROM triages 
       WHERE DATE(fecha_hora) = CURDATE() 
       GROUP BY prioridad`
    );
    
    const result = { alta: 0, media: 0, baja: 0 };
    rows.forEach(row => {
      result[row.prioridad] = row.count;
    });
    
    return result;
  }

  static async searchByPatientId(searchTerm) {
    const connection = getConnection();
    return this.getAll({ search_id: searchTerm });
  }

  static async delete(id) {
    const connection = getConnection();
    await connection.execute('DELETE FROM triages WHERE id = ?', [id]);
  }
}

module.exports = Triage;