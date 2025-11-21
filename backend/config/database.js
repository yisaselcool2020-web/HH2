const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuración de MySQL para XAMPP
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'saviser_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

let pool;

const connectDB = async () => {
  try {
    // Crear conexión inicial sin especificar base de datos
    const tempConnection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password
    });

    // Crear base de datos si no existe
    await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    await tempConnection.end();

    // Crear pool de conexiones
    pool = mysql.createPool(dbConfig);

    // Crear tablas
    await createTables();

    console.log('✅ Conectado a MySQL (XAMPP)');
    console.log(`📊 Base de datos: ${dbConfig.database}`);
    
    return pool;
  } catch (error) {
    console.error('❌ Error conectando a MySQL:', error);
    process.exit(1);
  }
};

const createTables = async () => {
  const tables = [
    // Tabla de usuarios
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      cedula VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('empresa', 'recepcion', 'consultorio', 'enfermeria', 'doctor') NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      last_login DATETIME,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,

    // Tabla de especialidades
    `CREATE TABLE IF NOT EXISTS especialidades (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(255) UNIQUE NOT NULL,
      descripcion TEXT,
      codigo VARCHAR(20) UNIQUE,
      precio_contributivo DECIMAL(10,2) DEFAULT 0.00,
      precio_subsidiado DECIMAL(10,2) DEFAULT 3676.12,
      duracion_consulta_minutos INT DEFAULT 30,
      requiere_triaje BOOLEAN DEFAULT TRUE,
      color VARCHAR(7) DEFAULT '#3B82F6',
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,

    // Tabla de consultorios
    `CREATE TABLE IF NOT EXISTS consultorios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      numero VARCHAR(50) UNIQUE NOT NULL,
      nombre VARCHAR(255) NOT NULL,
      ubicacion VARCHAR(255),
      equipamiento JSON,
      capacidad INT DEFAULT 1,
      tipo_consultorio ENUM('general', 'especializado', 'procedimientos', 'emergencia') DEFAULT 'general',
      requiere_reservacion BOOLEAN DEFAULT TRUE,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,

    // Tabla de doctores
    `CREATE TABLE IF NOT EXISTS doctors (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      nombre VARCHAR(255) NOT NULL,
      apellido VARCHAR(255) NOT NULL,
      cedula VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      telefono VARCHAR(50) NOT NULL,
      especialidad_id INT NOT NULL,
      especialidad VARCHAR(255) NOT NULL,
      consultorio_id INT NOT NULL,
      numero_licencia VARCHAR(100) UNIQUE NOT NULL,
      fecha_ingreso DATE DEFAULT (CURRENT_DATE),
      horarios JSON,
      is_active BOOLEAN DEFAULT TRUE,
      total_consultas INT DEFAULT 0,
      consultas_este_mes INT DEFAULT 0,
      pacientes_asignados INT DEFAULT 0,
      ultima_consulta DATETIME,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (especialidad_id) REFERENCES especialidades(id),
      FOREIGN KEY (consultorio_id) REFERENCES consultorios(id)
    )`,

    // Tabla de pacientes
    `CREATE TABLE IF NOT EXISTS patients (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(255) NOT NULL,
      apellido VARCHAR(255) NOT NULL,
      cedula VARCHAR(50) UNIQUE NOT NULL,
      fecha_nacimiento DATE NOT NULL,
      telefono VARCHAR(50) NOT NULL,
      genero ENUM('M', 'F') NOT NULL,
      direccion TEXT,
      email VARCHAR(255),
      regimen ENUM('contributivo', 'subsidiado') DEFAULT 'contributivo',
      contacto_emergencia JSON,
      seguro_medico JSON,
      alergias JSON,
      enfermedades_cronicas JSON,
      medicamentos_actuales JSON,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,

    // Tabla de citas
    `CREATE TABLE IF NOT EXISTS appointments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      paciente_id INT NOT NULL,
      medico_id INT NOT NULL,
      fecha_hora DATETIME NOT NULL,
      duracion_minutos INT DEFAULT 30,
      motivo_consulta TEXT NOT NULL,
      estado ENUM('programada', 'confirmada', 'en_curso', 'completada', 'cancelada', 'no_asistio') DEFAULT 'programada',
      tipo_consulta ENUM('primera_vez', 'control', 'urgencia', 'especializada') DEFAULT 'primera_vez',
      observaciones TEXT,
      monto DECIMAL(10,2) DEFAULT 0.00,
      metodo_pago ENUM('efectivo', 'tarjeta', 'transferencia', 'seguro') DEFAULT 'efectivo',
      estado_pago ENUM('pendiente', 'pagado', 'parcial') DEFAULT 'pendiente',
      fecha_pago DATETIME,
      comprobante VARCHAR(255),
      recordatorio_24h BOOLEAN DEFAULT FALSE,
      recordatorio_2h BOOLEAN DEFAULT FALSE,
      fecha_ultimo_recordatorio DATETIME,
      creado_por INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (paciente_id) REFERENCES patients(id),
      FOREIGN KEY (medico_id) REFERENCES users(id),
      FOREIGN KEY (creado_por) REFERENCES users(id),
      UNIQUE KEY unique_appointment (medico_id, fecha_hora)
    )`,

    // Tabla de triajes
    `CREATE TABLE IF NOT EXISTS triages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      paciente_id INT NOT NULL,
      enfermero_id INT NOT NULL,
      fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
      sintomas TEXT NOT NULL,
      prioridad ENUM('baja', 'media', 'alta') NOT NULL,
      presion_arterial VARCHAR(20) NOT NULL,
      temperatura DECIMAL(4,2) NOT NULL,
      pulso INT NOT NULL,
      saturacion_oxigeno INT NOT NULL,
      frecuencia_respiratoria INT,
      peso DECIMAL(5,2),
      talla DECIMAL(5,2),
      dolor_escala INT CHECK (dolor_escala >= 0 AND dolor_escala <= 10),
      glasgow_escala INT CHECK (glasgow_escala >= 3 AND glasgow_escala <= 15),
      estado ENUM('pendiente', 'en_proceso', 'completado') DEFAULT 'pendiente',
      observaciones TEXT,
      tiempo_espera INT,
      asignado_a INT,
      fecha_asignacion DATETIME,
      consulta_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (paciente_id) REFERENCES patients(id),
      FOREIGN KEY (enfermero_id) REFERENCES users(id),
      FOREIGN KEY (asignado_a) REFERENCES users(id),
      FOREIGN KEY (consulta_id) REFERENCES consultations(id)
    )`,

    // Tabla de consultas
    `CREATE TABLE IF NOT EXISTS consultations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      paciente_id INT NOT NULL,
      medico_id INT NOT NULL,
      triage_id INT,
      appointment_id INT,
      fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
      motivo_consulta TEXT NOT NULL,
      anamnesis TEXT NOT NULL,
      examen_fisico TEXT NOT NULL,
      diagnostico TEXT NOT NULL,
      tratamiento TEXT NOT NULL,
      medicamentos JSON,
      examenes JSON,
      presion_arterial VARCHAR(20),
      temperatura DECIMAL(4,2),
      pulso INT,
      saturacion_oxigeno INT,
      frecuencia_respiratoria INT,
      peso DECIMAL(5,2),
      talla DECIMAL(5,2),
      observaciones TEXT,
      proxima_cita_fecha DATE,
      proxima_cita_motivo VARCHAR(255),
      proxima_cita_programada BOOLEAN DEFAULT FALSE,
      estado ENUM('en_curso', 'completada', 'cancelada') DEFAULT 'en_curso',
      duracion_minutos INT,
      monto_facturacion DECIMAL(10,2) DEFAULT 0.00,
      conceptos_facturacion JSON,
      estado_facturacion ENUM('pendiente', 'pagado', 'parcial') DEFAULT 'pendiente',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (paciente_id) REFERENCES patients(id),
      FOREIGN KEY (medico_id) REFERENCES users(id),
      FOREIGN KEY (triage_id) REFERENCES triages(id),
      FOREIGN KEY (appointment_id) REFERENCES appointments(id)
    )`,

    // Tabla de asignaciones de pacientes
    `CREATE TABLE IF NOT EXISTS patient_assignments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      paciente_id INT NOT NULL,
      medico_id INT NOT NULL,
      triage_id INT,
      fecha_asignacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      motivo_consulta TEXT NOT NULL,
      prioridad ENUM('baja', 'media', 'alta') DEFAULT 'media',
      estado ENUM('pendiente', 'en_proceso', 'completado', 'cancelado') DEFAULT 'pendiente',
      observaciones TEXT,
      sintomas_triage TEXT,
      signos_vitales JSON,
      fecha_triaje DATETIME,
      fecha_aceptacion DATETIME,
      fecha_completado DATETIME,
      tiempo_respuesta INT,
      consulta_id INT,
      asignado_por INT,
      tipo_asignacion ENUM('manual', 'automatica') DEFAULT 'manual',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (paciente_id) REFERENCES patients(id),
      FOREIGN KEY (medico_id) REFERENCES users(id),
      FOREIGN KEY (triage_id) REFERENCES triages(id),
      FOREIGN KEY (consulta_id) REFERENCES consultations(id),
      FOREIGN KEY (asignado_por) REFERENCES users(id)
    )`,

    // Tabla de ingresos y estadísticas financieras
    `CREATE TABLE IF NOT EXISTS financial_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tipo ENUM('cita', 'consulta', 'procedimiento') NOT NULL,
      referencia_id INT NOT NULL,
      paciente_id INT NOT NULL,
      medico_id INT,
      especialidad_id INT,
      regimen ENUM('contributivo', 'subsidiado') NOT NULL,
      monto DECIMAL(10,2) NOT NULL,
      metodo_pago ENUM('efectivo', 'tarjeta', 'transferencia', 'seguro', 'automatico') DEFAULT 'efectivo',
      estado ENUM('pendiente', 'pagado', 'parcial', 'cancelado') DEFAULT 'pendiente',
      fecha_transaccion DATETIME DEFAULT CURRENT_TIMESTAMP,
      concepto VARCHAR(255) NOT NULL,
      observaciones TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (paciente_id) REFERENCES patients(id),
      FOREIGN KEY (medico_id) REFERENCES users(id),
      FOREIGN KEY (especialidad_id) REFERENCES especialidades(id)
    )`
  ];

  for (const table of tables) {
    try {
      await pool.execute(table);
    } catch (error) {
      console.error('Error creando tabla:', error);
    }
  }

  // Insertar datos iniciales
  await insertInitialData();
};

const insertInitialData = async () => {
  try {
    // Insertar especialidades por defecto
    const especialidades = [
      ['Medicina General', 'Atención médica general', 'MG001', 50000.00, 3676.12],
      ['Cardiología', 'Especialidad en enfermedades del corazón', 'CARD001', 80000.00, 3676.12],
      ['Pediatría', 'Atención médica infantil', 'PED001', 60000.00, 3676.12],
      ['Ginecología', 'Salud femenina y reproductiva', 'GIN001', 70000.00, 3676.12],
      ['Dermatología', 'Enfermedades de la piel', 'DERM001', 65000.00, 3676.12]
    ];

    for (const [nombre, descripcion, codigo, precio_contributivo, precio_subsidiado] of especialidades) {
      await pool.execute(
        `INSERT IGNORE INTO especialidades (nombre, descripcion, codigo, precio_contributivo, precio_subsidiado) 
         VALUES (?, ?, ?, ?, ?)`,
        [nombre, descripcion, codigo, precio_contributivo, precio_subsidiado]
      );
    }

    // Insertar consultorios por defecto
    const consultorios = [
      ['101', 'Consultorio General 1', 'Planta Baja - Ala Norte'],
      ['102', 'Consultorio General 2', 'Planta Baja - Ala Norte'],
      ['201', 'Consultorio Cardiología', 'Segundo Piso - Ala Este'],
      ['202', 'Consultorio Pediatría', 'Segundo Piso - Ala Oeste'],
      ['301', 'Consultorio Ginecología', 'Tercer Piso - Ala Este']
    ];

    for (const [numero, nombre, ubicacion] of consultorios) {
      await pool.execute(
        `INSERT IGNORE INTO consultorios (numero, nombre, ubicacion) VALUES (?, ?, ?)`,
        [numero, nombre, ubicacion]
      );
    }

    // Insertar usuario empresa por defecto
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('empresa123', 12);
    
    await pool.execute(
      `INSERT IGNORE INTO users (name, email, cedula, password, role) 
       VALUES (?, ?, ?, ?, ?)`,
      ['Administrador Sistema', 'empresa@saviser.com', '1000000000', hashedPassword, 'empresa']
    );

    console.log('✅ Datos iniciales insertados');
  } catch (error) {
    console.error('Error insertando datos iniciales:', error);
  }
};

const getConnection = () => {
  if (!pool) {
    throw new Error('Base de datos no inicializada');
  }
  return pool;
};

module.exports = {
  connectDB,
  getConnection
};