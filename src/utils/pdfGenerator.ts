import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Patient {
  nombre: string;
  apellido: string;
  cedula: string;
  fechaNacimiento: string;
  telefono: string;
  genero: 'M' | 'F';
  direccion?: string;
}

interface Doctor {
  nombre: string;
  apellido: string;
  especialidad: string;
  numeroLicencia: string;
  consultorio: {
    numero: string;
    nombre: string;
  };
}

interface Consultation {
  _id: string;
  pacienteId: Patient;
  medicoId: any;
  motivoConsulta: string;
  anamnesis: string;
  examenFisico: string;
  diagnostico: string;
  tratamiento: string;
  medicamentos: {
    nombre: string;
    dosis: string;
    frecuencia: string;
    duracion: string;
  }[];
  examenes: {
    tipo: string;
    descripcion: string;
    urgente: boolean;
  }[];
  fechaHora: string;
}

interface TriageData {
  sintomas: string;
  prioridad: 'alta' | 'media' | 'baja';
  signosVitales: {
    presionArterial: string;
    temperatura: number;
    pulso: number;
    saturacionOxigeno: number;
    frecuenciaRespiratoria?: number;
  };
  fechaHora: string;
}

export class PDFGenerator {
  private static calculateAge(birthDate: string): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  private static formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  private static formatTime(date: string): string {
    return new Date(date).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  static async generateConsultationPDF(
    consultation: Consultation,
    doctor: Doctor,
    triage?: TriageData
  ): Promise<Blob> {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 20;

    // Header con logo SAVISER
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 102, 153); // Azul SAVISER
    pdf.text('SAVISER', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 8;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Servicio de Apoyo a la Vida del Ser Humano', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 15;
    pdf.setDrawColor(0, 102, 153);
    pdf.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 15;

    // Información del médico
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('HISTORIA CLÍNICA', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Información del doctor
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('MÉDICO:', 20, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Dr. ${doctor.nombre} ${doctor.apellido}`, 45, yPosition);
    yPosition += 6;

    pdf.setFont('helvetica', 'bold');
    pdf.text('ESPECIALIDAD:', 20, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(doctor.especialidad, 55, yPosition);
    yPosition += 6;

    pdf.setFont('helvetica', 'bold');
    pdf.text('LICENCIA:', 20, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(doctor.numeroLicencia, 45, yPosition);
    yPosition += 6;

    pdf.setFont('helvetica', 'bold');
    pdf.text('CONSULTORIO:', 20, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${doctor.consultorio.numero} - ${doctor.consultorio.nombre}`, 55, yPosition);
    yPosition += 15;

    // Información del paciente
    pdf.setDrawColor(200, 200, 200);
    pdf.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DATOS DEL PACIENTE', 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('NOMBRE:', 20, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${consultation.pacienteId.nombre} ${consultation.pacienteId.apellido}`, 45, yPosition);
    yPosition += 6;

    pdf.setFont('helvetica', 'bold');
    pdf.text('CÉDULA:', 20, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(consultation.pacienteId.cedula, 45, yPosition);
    yPosition += 6;

    pdf.setFont('helvetica', 'bold');
    pdf.text('EDAD:', 20, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${this.calculateAge(consultation.pacienteId.fechaNacimiento)} años`, 35, yPosition);
    yPosition += 6;

    pdf.setFont('helvetica', 'bold');
    pdf.text('GÉNERO:', 20, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(consultation.pacienteId.genero === 'M' ? 'Masculino' : 'Femenino', 45, yPosition);
    yPosition += 6;

    pdf.setFont('helvetica', 'bold');
    pdf.text('TELÉFONO:', 20, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(consultation.pacienteId.telefono, 45, yPosition);
    yPosition += 6;

    pdf.setFont('helvetica', 'bold');
    pdf.text('FECHA:', 20, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${this.formatDate(consultation.fechaHora)} - ${this.formatTime(consultation.fechaHora)}`, 40, yPosition);
    yPosition += 15;

    // Información del triaje si existe
    if (triage) {
      pdf.line(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('TRIAJE', 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('SIGNOS VITALES:', 20, yPosition);
      yPosition += 6;

      pdf.setFont('helvetica', 'normal');
      pdf.text(`• Presión Arterial: ${triage.signosVitales.presionArterial}`, 25, yPosition);
      yPosition += 5;
      pdf.text(`• Temperatura: ${triage.signosVitales.temperatura}°C`, 25, yPosition);
      yPosition += 5;
      pdf.text(`• Pulso: ${triage.signosVitales.pulso} bpm`, 25, yPosition);
      yPosition += 5;
      pdf.text(`• Saturación O2: ${triage.signosVitales.saturacionOxigeno}%`, 25, yPosition);
      if (triage.signosVitales.frecuenciaRespiratoria) {
        yPosition += 5;
        pdf.text(`• Frecuencia Respiratoria: ${triage.signosVitales.frecuenciaRespiratoria} rpm`, 25, yPosition);
      }
      yPosition += 10;

      pdf.setFont('helvetica', 'bold');
      pdf.text('PRIORIDAD:', 20, yPosition);
      pdf.setFont('helvetica', 'normal');
      const prioridadColor = triage.prioridad === 'alta' ? [255, 0, 0] : 
                            triage.prioridad === 'media' ? [255, 165, 0] : [0, 128, 0];
      pdf.setTextColor(prioridadColor[0], prioridadColor[1], prioridadColor[2]);
      pdf.text(triage.prioridad.toUpperCase(), 50, yPosition);
      pdf.setTextColor(0, 0, 0);
      yPosition += 15;
    }

    // Consulta médica
    pdf.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('CONSULTA MÉDICA', 20, yPosition);
    yPosition += 10;

    // Motivo de consulta
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('MOTIVO DE CONSULTA:', 20, yPosition);
    yPosition += 6;
    pdf.setFont('helvetica', 'normal');
    const motivoLines = pdf.splitTextToSize(consultation.motivoConsulta, pageWidth - 40);
    pdf.text(motivoLines, 20, yPosition);
    yPosition += motivoLines.length * 5 + 5;

    // Anamnesis
    pdf.setFont('helvetica', 'bold');
    pdf.text('ANAMNESIS:', 20, yPosition);
    yPosition += 6;
    pdf.setFont('helvetica', 'normal');
    const anamnesisLines = pdf.splitTextToSize(consultation.anamnesis, pageWidth - 40);
    pdf.text(anamnesisLines, 20, yPosition);
    yPosition += anamnesisLines.length * 5 + 5;

    // Examen físico
    pdf.setFont('helvetica', 'bold');
    pdf.text('EXAMEN FÍSICO:', 20, yPosition);
    yPosition += 6;
    pdf.setFont('helvetica', 'normal');
    const examenLines = pdf.splitTextToSize(consultation.examenFisico, pageWidth - 40);
    pdf.text(examenLines, 20, yPosition);
    yPosition += examenLines.length * 5 + 5;

    // Diagnóstico
    pdf.setFont('helvetica', 'bold');
    pdf.text('DIAGNÓSTICO:', 20, yPosition);
    yPosition += 6;
    pdf.setFont('helvetica', 'normal');
    const diagnosticoLines = pdf.splitTextToSize(consultation.diagnostico, pageWidth - 40);
    pdf.text(diagnosticoLines, 20, yPosition);
    yPosition += diagnosticoLines.length * 5 + 5;

    // Tratamiento
    pdf.setFont('helvetica', 'bold');
    pdf.text('TRATAMIENTO:', 20, yPosition);
    yPosition += 6;
    pdf.setFont('helvetica', 'normal');
    const tratamientoLines = pdf.splitTextToSize(consultation.tratamiento, pageWidth - 40);
    pdf.text(tratamientoLines, 20, yPosition);
    yPosition += tratamientoLines.length * 5 + 10;

    // Verificar si necesitamos nueva página
    if (yPosition > pageHeight - 60) {
      pdf.addPage();
      yPosition = 20;
    }

    // Medicamentos
    if (consultation.medicamentos.length > 0) {
      pdf.line(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PRESCRIPCIÓN MÉDICA', 20, yPosition);
      yPosition += 10;

      consultation.medicamentos.forEach((med, index) => {
        if (med.nombre.trim()) {
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`${index + 1}. ${med.nombre}`, 20, yPosition);
          yPosition += 6;
          
          pdf.setFont('helvetica', 'normal');
          pdf.text(`   Dosis: ${med.dosis}`, 20, yPosition);
          yPosition += 5;
          pdf.text(`   Frecuencia: ${med.frecuencia}`, 20, yPosition);
          yPosition += 5;
          pdf.text(`   Duración: ${med.duracion}`, 20, yPosition);
          yPosition += 8;
        }
      });
      yPosition += 5;
    }

    // Exámenes solicitados
    if (consultation.examenes.length > 0) {
      if (yPosition > pageHeight - 40) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.line(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('EXÁMENES SOLICITADOS', 20, yPosition);
      yPosition += 10;

      consultation.examenes.forEach((exam, index) => {
        if (exam.tipo.trim()) {
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold');
          if (exam.urgente) {
            pdf.setTextColor(255, 0, 0);
            pdf.text(`${index + 1}. ${exam.tipo} (URGENTE)`, 20, yPosition);
            pdf.setTextColor(0, 0, 0);
          } else {
            pdf.text(`${index + 1}. ${exam.tipo}`, 20, yPosition);
          }
          yPosition += 6;
          
          pdf.setFont('helvetica', 'normal');
          const descripcionLines = pdf.splitTextToSize(`   ${exam.descripcion}`, pageWidth - 40);
          pdf.text(descripcionLines, 20, yPosition);
          yPosition += descripcionLines.length * 5 + 5;
        }
      });
    }

    // Firma del médico
    yPosition = pageHeight - 40;
    pdf.line(pageWidth - 80, yPosition, pageWidth - 20, yPosition);
    yPosition += 6;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Dr. ${doctor.nombre} ${doctor.apellido}`, pageWidth - 50, yPosition, { align: 'center' });
    yPosition += 5;
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Lic. ${doctor.numeroLicencia}`, pageWidth - 50, yPosition, { align: 'center' });

    return pdf.output('blob');
  }

  static async generatePrescriptionPDF(
    consultation: Consultation,
    doctor: Doctor
  ): Promise<Blob> {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    let yPosition = 20;

    // Header
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 102, 153);
    pdf.text('SAVISER', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 8;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Servicio de Apoyo a la Vida del Ser Humano', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 15;
    pdf.setDrawColor(0, 102, 153);
    pdf.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 15;

    // Título
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('RECETA MÉDICA', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    // Información del médico
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Dr. ${doctor.nombre} ${doctor.apellido}`, 20, yPosition);
    yPosition += 5;
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${doctor.especialidad} - Lic. ${doctor.numeroLicencia}`, 20, yPosition);
    yPosition += 5;
    pdf.text(`Consultorio ${doctor.consultorio.numero} - ${doctor.consultorio.nombre}`, 20, yPosition);
    yPosition += 15;

    // Información del paciente
    pdf.setFont('helvetica', 'bold');
    pdf.text('PACIENTE:', 20, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${consultation.pacienteId.nombre} ${consultation.pacienteId.apellido}`, 55, yPosition);
    yPosition += 6;

    pdf.setFont('helvetica', 'bold');
    pdf.text('CÉDULA:', 20, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(consultation.pacienteId.cedula, 45, yPosition);
    yPosition += 6;

    pdf.setFont('helvetica', 'bold');
    pdf.text('FECHA:', 20, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(this.formatDate(consultation.fechaHora), 40, yPosition);
    yPosition += 20;

    // Medicamentos
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PRESCRIPCIÓN:', 20, yPosition);
    yPosition += 15;

    consultation.medicamentos.forEach((med, index) => {
      if (med.nombre.trim()) {
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${index + 1}. ${med.nombre}`, 25, yPosition);
        yPosition += 8;
        
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Dosis: ${med.dosis}`, 30, yPosition);
        yPosition += 6;
        pdf.text(`Frecuencia: ${med.frecuencia}`, 30, yPosition);
        yPosition += 6;
        pdf.text(`Duración: ${med.duracion}`, 30, yPosition);
        yPosition += 12;
      }
    });

    // Firma
    yPosition += 20;
    pdf.line(pageWidth - 80, yPosition, pageWidth - 20, yPosition);
    yPosition += 8;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Dr. ${doctor.nombre} ${doctor.apellido}`, pageWidth - 50, yPosition, { align: 'center' });
    yPosition += 5;
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Lic. ${doctor.numeroLicencia}`, pageWidth - 50, yPosition, { align: 'center' });

    return pdf.output('blob');
  }

// Agregar función para generar reporte de empresa
  static async generateCompanyReportPDF(stats: any, doctors: any[]): Promise<Blob> {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    let yPosition = 20;

    // Header
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 102, 153);
    pdf.text('SAVISER', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 8;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Servicio de Apoyo a la Vida del Ser Humano', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 15;
    pdf.setDrawColor(0, 102, 153);
    pdf.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 15;

    // Título
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('REPORTE EJECUTIVO', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Fecha: ${this.formatDate(new Date().toISOString())}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    // Estadísticas generales
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ESTADÍSTICAS GENERALES', 20, yPosition);
    yPosition += 15;

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    
    // Crear tabla de estadísticas
    const statsData = [
      ['Total de Pacientes', stats.totalPatients?.toString() || '0'],
      ['Citas del Día', stats.todayAppointments?.toString() || '0'],
      ['Triajes Pendientes', stats.pendingTriages?.toString() || '0'],
      ['Consultas del Día', stats.todayConsultations?.toString() || '0'],
      ['Citas del Mes', stats.monthlyAppointments?.toString() || '0'],
      ['Consultas del Mes', stats.monthlyConsultations?.toString() || '0'],
      ['Doctores Activos', doctors.filter(d => d.isActive).length.toString()]
    ];

    statsData.forEach(([label, value]) => {
      pdf.setFont('helvetica', 'bold');
      pdf.text(label + ':', 25, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(value, 120, yPosition);
      yPosition += 8;
    });

    yPosition += 15;

    // Lista de doctores
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PERSONAL MÉDICO', 20, yPosition);
    yPosition += 15;

    doctors.forEach((doctor, index) => {
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${index + 1}. Dr. ${doctor.nombre} ${doctor.apellido}`, 25, yPosition);
      yPosition += 6;
      
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Especialidad: ${doctor.especialidad}`, 30, yPosition);
      yPosition += 5;
      pdf.text(`Licencia: ${doctor.numeroLicencia}`, 30, yPosition);
      yPosition += 5;
      pdf.text(`Consultorio: ${doctor.consultorio.numero} - ${doctor.consultorio.nombre}`, 30, yPosition);
      yPosition += 5;
      pdf.text(`Estado: ${doctor.isActive ? 'Activo' : 'Inactivo'}`, 30, yPosition);
      yPosition += 10;
    });

    // Pie de página
    const pageHeight = pdf.internal.pageSize.getHeight();
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Generado el ${new Date().toLocaleString('es-ES')}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

    return pdf.output('blob');
  }

  static downloadPDF(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Nuevas funciones para reportes de triaje
  static async generateTriagesReportPDF(triajes: any[]): Promise<Blob> {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 20;

    // Header
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 102, 153);
    pdf.text('SAVISER', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 8;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Servicio de Apoyo a la Vida del Ser Humano', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 15;
    pdf.setDrawColor(0, 102, 153);
    pdf.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 15;

    // Título
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('REPORTE DE TRIAJES', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Fecha: ${this.formatDate(new Date().toISOString())}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    // Resumen
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('RESUMEN DEL DÍA', 20, yPosition);
    yPosition += 15;

    const stats = {
      total: triajes.length,
      pendientes: triajes.filter(t => t.estado === 'pendiente').length,
      enProceso: triajes.filter(t => t.estado === 'en_proceso').length,
      completados: triajes.filter(t => t.estado === 'completado').length,
      prioridadAlta: triajes.filter(t => t.prioridad === 'alta').length,
      prioridadMedia: triajes.filter(t => t.prioridad === 'media').length,
      prioridadBaja: triajes.filter(t => t.prioridad === 'baja').length
    };

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    
    const summaryData = [
      ['Total de Triajes:', stats.total.toString()],
      ['Pendientes:', stats.pendientes.toString()],
      ['En Proceso:', stats.enProceso.toString()],
      ['Completados:', stats.completados.toString()],
      ['Prioridad Alta:', stats.prioridadAlta.toString()],
      ['Prioridad Media:', stats.prioridadMedia.toString()],
      ['Prioridad Baja:', stats.prioridadBaja.toString()]
    ];

    summaryData.forEach(([label, value]) => {
      pdf.setFont('helvetica', 'bold');
      pdf.text(label, 25, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(value, 120, yPosition);
      yPosition += 8;
    });

    yPosition += 15;

    // Lista de triajes
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DETALLE DE TRIAJES', 20, yPosition);
    yPosition += 15;

    triajes.forEach((triaje, index) => {
      if (yPosition > pageHeight - 60) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${index + 1}. ${triaje.pacienteId.nombre} ${triaje.pacienteId.apellido}`, 25, yPosition);
      yPosition += 6;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`C.I: ${triaje.pacienteId.cedula}`, 30, yPosition);
      yPosition += 5;
      pdf.text(`Edad: ${this.calculateAge(triaje.pacienteId.fechaNacimiento)} años`, 30, yPosition);
      yPosition += 5;
      
      // Prioridad con color
      pdf.setFont('helvetica', 'bold');
      const prioridadColor = triaje.prioridad === 'alta' ? [255, 0, 0] : 
                            triaje.prioridad === 'media' ? [255, 165, 0] : [0, 128, 0];
      pdf.setTextColor(prioridadColor[0], prioridadColor[1], prioridadColor[2]);
      pdf.text(`Prioridad: ${triaje.prioridad.toUpperCase()}`, 30, yPosition);
      pdf.setTextColor(0, 0, 0);
      yPosition += 5;
      
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Estado: ${triaje.estado.replace('_', ' ').toUpperCase()}`, 30, yPosition);
      yPosition += 5;
      pdf.text(`Síntomas: ${triaje.sintomas}`, 30, yPosition);
      yPosition += 5;
      
      // Signos vitales
      pdf.text(`Signos Vitales:`, 30, yPosition);
      yPosition += 5;
      pdf.text(`  • PA: ${triaje.signosVitales.presionArterial}`, 35, yPosition);
      yPosition += 4;
      pdf.text(`  • Temp: ${triaje.signosVitales.temperatura}°C`, 35, yPosition);
      yPosition += 4;
      pdf.text(`  • FC: ${triaje.signosVitales.pulso} bpm`, 35, yPosition);
      yPosition += 4;
      pdf.text(`  • SpO2: ${triaje.signosVitales.saturacionOxigeno}%`, 35, yPosition);
      if (triaje.signosVitales.frecuenciaRespiratoria) {
        yPosition += 4;
        pdf.text(`  • FR: ${triaje.signosVitales.frecuenciaRespiratoria} rpm`, 35, yPosition);
      }
      yPosition += 5;
      
      pdf.text(`Hora: ${new Date(triaje.fechaHora).toLocaleTimeString('es-ES')}`, 30, yPosition);
      yPosition += 15;
    });

    // Pie de página
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Generado el ${new Date().toLocaleString('es-ES')}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

    return pdf.output('blob');
  }

  static async generateTriageStatisticsPDF(stats: any, triajes: any[]): Promise<Blob> {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    let yPosition = 20;

    // Header
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 102, 153);
    pdf.text('SAVISER', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 8;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Servicio de Apoyo a la Vida del Ser Humano', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 15;
    pdf.setDrawColor(0, 102, 153);
    pdf.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 15;

    // Título
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('ESTADÍSTICAS DE TRIAJE', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Fecha: ${this.formatDate(new Date().toISOString())}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    // Estadísticas generales
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ESTADÍSTICAS GENERALES', 20, yPosition);
    yPosition += 15;

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    
    const generalStats = [
      ['Total de Triajes:', stats.total?.toString() || '0'],
      ['Triajes Pendientes:', stats.pendientes?.toString() || '0'],
      ['Triajes en Proceso:', stats.enProceso?.toString() || '0'],
      ['Triajes Completados:', stats.completados?.toString() || '0']
    ];

    generalStats.forEach(([label, value]) => {
      pdf.setFont('helvetica', 'bold');
      pdf.text(label, 25, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(value, 120, yPosition);
      yPosition += 8;
    });

    yPosition += 15;

    // Distribución por prioridad
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DISTRIBUCIÓN POR PRIORIDAD', 20, yPosition);
    yPosition += 15;

    const priorityStats = [
      ['Prioridad Alta:', stats.prioridadAlta?.toString() || '0', [255, 0, 0]],
      ['Prioridad Media:', stats.prioridadMedia?.toString() || '0', [255, 165, 0]],
      ['Prioridad Baja:', stats.prioridadBaja?.toString() || '0', [0, 128, 0]]
    ];

    priorityStats.forEach(([label, value, color]) => {
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(color[0], color[1], color[2]);
      pdf.text(label, 25, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(value, 120, yPosition);
      
      // Barra de progreso
      const percentage = stats.total > 0 ? (parseInt(value) / stats.total) * 100 : 0;
      const barWidth = 60;
      const barHeight = 4;
      
      // Fondo de la barra
      pdf.setFillColor(220, 220, 220);
      pdf.rect(140, yPosition - 3, barWidth, barHeight, 'F');
      
      // Barra de progreso
      pdf.setFillColor(color[0], color[1], color[2]);
      pdf.rect(140, yPosition - 3, (barWidth * percentage) / 100, barHeight, 'F');
      
      // Porcentaje
      pdf.setTextColor(0, 0, 0);
      pdf.text(`${percentage.toFixed(1)}%`, 205, yPosition);
      
      yPosition += 12;
    });

    yPosition += 15;

    // Signos vitales promedio
    if (triajes.length > 0) {
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('SIGNOS VITALES PROMEDIO', 20, yPosition);
      yPosition += 15;

      const avgTemp = triajes.reduce((sum, t) => sum + t.signosVitales.temperatura, 0) / triajes.length;
      const avgPulse = triajes.reduce((sum, t) => sum + t.signosVitales.pulso, 0) / triajes.length;
      const avgSat = triajes.reduce((sum, t) => sum + t.signosVitales.saturacionOxigeno, 0) / triajes.length;

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      
      const vitalStats = [
        ['Temperatura Promedio:', `${avgTemp.toFixed(1)}°C`],
        ['Pulso Promedio:', `${avgPulse.toFixed(0)} bpm`],
        ['Saturación Promedio:', `${avgSat.toFixed(1)}%`]
      ];

      vitalStats.forEach(([label, value]) => {
        pdf.setFont('helvetica', 'bold');
        pdf.text(label, 25, yPosition);
        pdf.setFont('helvetica', 'normal');
        pdf.text(value, 120, yPosition);
        yPosition += 8;
      });
    }

    // Pie de página
    const pageHeight = pdf.internal.pageSize.getHeight();
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Generado el ${new Date().toLocaleString('es-ES')}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

    return pdf.output('blob');
  }

  static async generateSingleTriagePDF(triaje: any): Promise<Blob> {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    let yPosition = 20;

    // Header
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 102, 153);
    pdf.text('SAVISER', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 8;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Servicio de Apoyo a la Vida del Ser Humano', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 15;
    pdf.setDrawColor(0, 102, 153);
    pdf.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 15;

    // Título
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('TRIAJE MÉDICO', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    // Información del paciente
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DATOS DEL PACIENTE', 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('NOMBRE:', 20, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${triaje.pacienteId.nombre} ${triaje.pacienteId.apellido}`, 55, yPosition);
    yPosition += 6;

    pdf.setFont('helvetica', 'bold');
    pdf.text('CÉDULA:', 20, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(triaje.pacienteId.cedula, 45, yPosition);
    yPosition += 6;

    pdf.setFont('helvetica', 'bold');
    pdf.text('EDAD:', 20, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${this.calculateAge(triaje.pacienteId.fechaNacimiento)} años`, 35, yPosition);
    yPosition += 6;

    pdf.setFont('helvetica', 'bold');
    pdf.text('GÉNERO:', 20, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(triaje.pacienteId.genero === 'M' ? 'Masculino' : 'Femenino', 45, yPosition);
    yPosition += 6;

    pdf.setFont('helvetica', 'bold');
    pdf.text('FECHA/HORA:', 20, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${this.formatDate(triaje.fechaHora)} - ${this.formatTime(triaje.fechaHora)}`, 60, yPosition);
    yPosition += 15;

    // Información del triaje
    pdf.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('EVALUACIÓN DE TRIAJE', 20, yPosition);
    yPosition += 10;

    // Prioridad
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PRIORIDAD:', 20, yPosition);
    const prioridadColor = triaje.prioridad === 'alta' ? [255, 0, 0] : 
                          triaje.prioridad === 'media' ? [255, 165, 0] : [0, 128, 0];
    pdf.setTextColor(prioridadColor[0], prioridadColor[1], prioridadColor[2]);
    pdf.text(triaje.prioridad.toUpperCase(), 55, yPosition);
    pdf.setTextColor(0, 0, 0);
    yPosition += 10;

    // Síntomas
    pdf.setFont('helvetica', 'bold');
    pdf.text('SÍNTOMAS:', 20, yPosition);
    yPosition += 6;
    pdf.setFont('helvetica', 'normal');
    const sintomasLines = pdf.splitTextToSize(triaje.sintomas, pageWidth - 40);
    pdf.text(sintomasLines, 20, yPosition);
    yPosition += sintomasLines.length * 5 + 10;

    // Signos vitales
    pdf.setFont('helvetica', 'bold');
    pdf.text('SIGNOS VITALES:', 20, yPosition);
    yPosition += 8;

    pdf.setFont('helvetica', 'normal');
    pdf.text(`• Presión Arterial: ${triaje.signosVitales.presionArterial}`, 25, yPosition);
    yPosition += 6;
    pdf.text(`• Temperatura: ${triaje.signosVitales.temperatura}°C`, 25, yPosition);
    yPosition += 6;
    pdf.text(`• Pulso: ${triaje.signosVitales.pulso} bpm`, 25, yPosition);
    yPosition += 6;
    pdf.text(`• Saturación O2: ${triaje.signosVitales.saturacionOxigeno}%`, 25, yPosition);
    if (triaje.signosVitales.frecuenciaRespiratoria) {
      yPosition += 6;
      pdf.text(`• Frecuencia Respiratoria: ${triaje.signosVitales.frecuenciaRespiratoria} rpm`, 25, yPosition);
    }
    yPosition += 15;

    // Observaciones
    if (triaje.observaciones) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('OBSERVACIONES:', 20, yPosition);
      yPosition += 6;
      pdf.setFont('helvetica', 'normal');
      const observacionesLines = pdf.splitTextToSize(triaje.observaciones, pageWidth - 40);
      pdf.text(observacionesLines, 20, yPosition);
      yPosition += observacionesLines.length * 5 + 10;
    }

    // Estado
    pdf.setFont('helvetica', 'bold');
    pdf.text('ESTADO:', 20, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(triaje.estado.replace('_', ' ').toUpperCase(), 50, yPosition);

    // Pie de página
    const pageHeight = pdf.internal.pageSize.getHeight();
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Generado el ${new Date().toLocaleString('es-ES')}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

    return pdf.output('blob');
  }
}