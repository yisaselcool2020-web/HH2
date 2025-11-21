# SAVISER - Sistema de Gestión Médica

Sistema integral de gestión médica con dashboards multi-rol, automatización de procesos y gestión financiera.

## 🚀 Características Principales

### Gestión Empresarial
- ✅ Creación y gestión de especialidades médicas
- ✅ Configuración de consultorios
- ✅ Gestión de precios por régimen (contributivo/subsidiado)
- ✅ Dashboard de ingresos y ganancias
- ✅ Estadísticas financieras detalladas
- ✅ Reportes ejecutivos en PDF

### Sistema de Pagos
- ✅ Pago automático para subsidiados ($3,676.12)
- ✅ Cobro manual para contributivos en recepción
- ✅ Seguimiento de pagos pendientes
- ✅ Cálculo automático de ingresos por régimen

### Funcionalidades por Rol

#### 👔 Empresa (Dirección)
- Gestión completa de doctores y especialidades
- Dashboard de ingresos y ganancias
- Estadísticas por especialidad y médico
- Configuración de precios por régimen
- Reportes financieros detallados

#### 📋 Recepción
- Registro de pacientes (contributivos/subsidiados)
- Programación de citas
- Cobro a pacientes contributivos
- Gestión de pagos pendientes

#### 🏥 Consultorio Médico
- Atención de triajes pendientes
- Creación de consultas médicas
- Historial de pacientes
- Prescripciones y exámenes

#### 🩺 Enfermería
- Creación de triajes
- **Búsqueda de triajes por ID de paciente (cédula)**
- Evaluación de signos vitales
- Clasificación por prioridad

#### 👨‍⚕️ Médicos
- Dashboard personalizado
- Pacientes asignados
- Consultas del día
- Historial médico
- Generación de reportes

### 🔍 Búsqueda Avanzada
- Búsqueda de triajes por cédula del paciente
- Filtros por fecha, prioridad y estado
- Resultados en tiempo real

### 💰 Sistema Financiero
- Cálculo automático de ingresos por régimen
- Seguimiento de pagos contributivos
- Pago automático para subsidiados
- Estadísticas de ganancias por especialidad
- Reportes financieros detallados

## 🛠️ Tecnologías

### Backend
- **Base de Datos**: MySQL (XAMPP)
- **ORM**: Consultas SQL nativas
- **API**: Node.js + Express
- **Autenticación**: JWT

### Frontend
- **Framework**: React + TypeScript
- **Estilos**: Tailwind CSS
- **Iconos**: Lucide React
- **PDF**: jsPDF + html2canvas

## 📦 Instalación

### Prerrequisitos
- XAMPP con MySQL activado
- Node.js 18+
- npm o yarn

### Configuración

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd saviser
```

2. **Configurar XAMPP**
- Iniciar Apache y MySQL en XAMPP
- La base de datos se creará automáticamente

3. **Backend**
```bash
cd backend
npm install
cp .env.example .env
# Editar .env con tus configuraciones
npm run dev
```

4. **Frontend**
```bash
npm install
npm run dev
```

## 🔧 Configuración de Base de Datos

El sistema se conecta automáticamente a MySQL y crea:
- Base de datos: `saviser_db`
- Tablas necesarias con relaciones
- Datos iniciales (especialidades, consultorios, usuario admin)

### Credenciales por defecto:
- **Usuario**: empresa@saviser.com
- **Contraseña**: empresa123

## 💡 Funcionalidades Destacadas

### 🎯 Automatización
- Pago automático para pacientes subsidiados
- Cálculo de ingresos en tiempo real
- Asignación inteligente de pacientes
- Notificaciones del sistema

### 📊 Dashboards Inteligentes
- Métricas en tiempo real
- Gráficos interactivos
- Filtros avanzados
- Exportación a PDF

### 🔍 Búsqueda Potente
- Búsqueda de triajes por cédula
- Filtros múltiples
- Resultados instantáneos
- Historial completo

### 💳 Gestión Financiera
- Seguimiento de ingresos por régimen
- Pagos pendientes
- Estadísticas por especialidad
- Reportes ejecutivos

## 🚀 Uso del Sistema

### Para Empresas
1. Configurar especialidades y precios
2. Crear consultorios
3. Registrar médicos
4. Monitorear ingresos y estadísticas

### Para Recepción
1. Registrar pacientes (especificar régimen)
2. Programar citas
3. Cobrar a contributivos
4. Gestionar pagos pendientes

### Para Enfermería
1. Realizar triajes
2. Buscar triajes por cédula del paciente
3. Clasificar por prioridad
4. Asignar a médicos

### Para Médicos
1. Revisar pacientes asignados
2. Realizar consultas
3. Prescribir medicamentos
4. Generar reportes

## 📈 Métricas y Reportes

- Ingresos por régimen (contributivo/subsidiado)
- Estadísticas por especialidad
- Rendimiento por médico
- Tendencias mensuales
- Pagos pendientes
- Reportes ejecutivos en PDF

## 🔒 Seguridad

- Autenticación JWT
- Roles y permisos granulares
- Validación de datos
- Protección de rutas
- Encriptación de contraseñas

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 📞 Soporte

Para soporte técnico o consultas:
- Email: soporte@saviser.com
- Documentación: [docs.saviser.com](https://docs.saviser.com)

---

**SAVISER** - *Servicio de Apoyo a la Vida del Ser Humano*