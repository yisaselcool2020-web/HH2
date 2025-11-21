// Servicio de automatización para SAVISER
import { authAPI, patientsAPI, appointmentsAPI, triageAPI, consultationsAPI, doctorsAPI } from './api';

export interface AutomationRule {
  id: string;
  name: string;
  trigger: 'time' | 'event' | 'condition';
  conditions: any[];
  actions: any[];
  isActive: boolean;
  lastExecuted?: Date;
}

export interface NotificationConfig {
  type: 'email' | 'sms' | 'push' | 'system';
  template: string;
  recipients: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

class AutomationService {
  private rules: AutomationRule[] = [];
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();

  constructor() {
    this.initializeDefaultRules();
    this.startAutomationEngine();
  }

  // Inicializar reglas de automatización por defecto
  private initializeDefaultRules() {
    const defaultRules: AutomationRule[] = [
      {
        id: 'appointment-reminder-24h',
        name: 'Recordatorio de cita 24 horas antes',
        trigger: 'time',
        conditions: [
          { field: 'appointment.fecha', operator: 'equals', value: 'tomorrow' },
          { field: 'appointment.estado', operator: 'equals', value: 'programada' }
        ],
        actions: [
          { type: 'notification', config: { type: 'sms', template: 'appointment_reminder_24h' } },
          { type: 'notification', config: { type: 'system', template: 'appointment_reminder_24h' } }
        ],
        isActive: true
      },
      {
        id: 'triage-priority-alert',
        name: 'Alerta de triaje de prioridad alta',
        trigger: 'event',
        conditions: [
          { field: 'triage.prioridad', operator: 'equals', value: 'alta' }
        ],
        actions: [
          { type: 'notification', config: { type: 'push', template: 'high_priority_triage', priority: 'urgent' } },
          { type: 'auto_assign', config: { role: 'doctor', criteria: 'available' } }
        ],
        isActive: true
      },
      {
        id: 'patient-follow-up',
        name: 'Seguimiento automático post-consulta',
        trigger: 'time',
        conditions: [
          { field: 'consultation.fechaHora', operator: 'days_ago', value: 7 },
          { field: 'consultation.estado', operator: 'equals', value: 'completada' }
        ],
        actions: [
          { type: 'notification', config: { type: 'sms', template: 'follow_up_reminder' } },
          { type: 'create_task', config: { assignTo: 'doctor', task: 'follow_up_call' } }
        ],
        isActive: true
      },
      {
        id: 'appointment-auto-confirm',
        name: 'Confirmación automática de citas',
        trigger: 'time',
        conditions: [
          { field: 'appointment.fecha', operator: 'equals', value: 'today' },
          { field: 'appointment.estado', operator: 'equals', value: 'programada' }
        ],
        actions: [
          { type: 'update_status', config: { field: 'estado', value: 'confirmada' } },
          { type: 'notification', config: { type: 'system', template: 'appointment_confirmed' } }
        ],
        isActive: true
      },
      {
        id: 'doctor-workload-balance',
        name: 'Balance automático de carga de trabajo',
        trigger: 'event',
        conditions: [
          { field: 'doctor.assigned_patients', operator: 'greater_than', value: 10 }
        ],
        actions: [
          { type: 'redistribute_patients', config: { criteria: 'least_busy_doctor' } },
          { type: 'notification', config: { type: 'system', template: 'workload_balanced' } }
        ],
        isActive: true
      }
    ];

    this.rules = defaultRules;
  }

  // Motor de automatización principal
  private startAutomationEngine() {
    // Ejecutar reglas basadas en tiempo cada minuto
    const timeBasedInterval = setInterval(() => {
      this.executeTimeBasedRules();
    }, 60000); // 1 minuto

    this.intervals.set('time-based', timeBasedInterval);

    // Configurar listeners para eventos
    this.setupEventListeners();

    console.log('🤖 Motor de automatización SAVISER iniciado');
  }

  // Ejecutar reglas basadas en tiempo
  private async executeTimeBasedRules() {
    const timeBasedRules = this.rules.filter(rule => 
      rule.trigger === 'time' && rule.isActive
    );

    for (const rule of timeBasedRules) {
      try {
        await this.executeRule(rule);
      } catch (error) {
        console.error(`Error ejecutando regla ${rule.name}:`, error);
      }
    }
  }

  // Configurar listeners para eventos
  private setupEventListeners() {
    // Listener para nuevos triajes
    this.addEventListener('triage_created', async (triageData: any) => {
      const eventRules = this.rules.filter(rule => 
        rule.trigger === 'event' && rule.isActive
      );

      for (const rule of eventRules) {
        if (this.evaluateConditions(rule.conditions, triageData)) {
          await this.executeRule(rule, triageData);
        }
      }
    });

    // Listener para nuevas consultas
    this.addEventListener('consultation_completed', async (consultationData: any) => {
      // Programar seguimiento automático
      setTimeout(() => {
        this.triggerEvent('consultation_follow_up', consultationData);
      }, 7 * 24 * 60 * 60 * 1000); // 7 días
    });

    // Listener para asignación de pacientes
    this.addEventListener('patient_assigned', async (assignmentData: any) => {
      await this.sendNotification({
        type: 'system',
        template: 'patient_assigned',
        recipients: [assignmentData.doctorId],
        priority: 'medium'
      }, assignmentData);
    });
  }

  // Ejecutar una regla específica
  private async executeRule(rule: AutomationRule, eventData?: any) {
    console.log(`🔄 Ejecutando regla: ${rule.name}`);

    for (const action of rule.actions) {
      try {
        await this.executeAction(action, eventData);
      } catch (error) {
        console.error(`Error ejecutando acción en regla ${rule.name}:`, error);
      }
    }

    // Actualizar última ejecución
    rule.lastExecuted = new Date();
  }

  // Ejecutar una acción específica
  private async executeAction(action: any, data?: any) {
    switch (action.type) {
      case 'notification':
        await this.sendNotification(action.config, data);
        break;
      
      case 'auto_assign':
        await this.autoAssignPatient(action.config, data);
        break;
      
      case 'update_status':
        await this.updateStatus(action.config, data);
        break;
      
      case 'create_task':
        await this.createTask(action.config, data);
        break;
      
      case 'redistribute_patients':
        await this.redistributePatients(action.config);
        break;
      
      default:
        console.warn(`Tipo de acción desconocido: ${action.type}`);
    }
  }

  // Enviar notificación
  private async sendNotification(config: NotificationConfig, data?: any) {
    const notification = {
      id: Date.now().toString(),
      type: config.type,
      template: config.template,
      recipients: config.recipients,
      priority: config.priority,
      data: data,
      timestamp: new Date(),
      sent: false
    };

    // Simular envío de notificación
    console.log(`📧 Enviando notificación: ${config.template}`, notification);

    // Aquí se integraría con servicios reales de notificación
    // Por ahora, mostrar notificación en el sistema
    this.showSystemNotification(notification);
  }

  // Mostrar notificación en el sistema
  private showSystemNotification(notification: any) {
    const event = new CustomEvent('system_notification', {
      detail: notification
    });
    window.dispatchEvent(event);
  }

  // Asignación automática de pacientes
  private async autoAssignPatient(config: any, data?: any) {
    try {
      // Obtener doctores disponibles
      const doctors = await doctorsAPI.getAll();
      const availableDoctors = doctors.data.filter((doctor: any) => doctor.isActive);

      if (availableDoctors.length === 0) {
        console.warn('No hay doctores disponibles para asignación automática');
        return;
      }

      // Seleccionar doctor según criterio
      let selectedDoctor;
      switch (config.criteria) {
        case 'available':
          selectedDoctor = availableDoctors[0]; // Primer disponible
          break;
        case 'least_busy':
          // Lógica para seleccionar el menos ocupado
          selectedDoctor = availableDoctors[0];
          break;
        default:
          selectedDoctor = availableDoctors[0];
      }

      // Crear asignación
      const assignmentData = {
        pacienteId: data.pacienteId,
        medicoId: selectedDoctor.userId,
        motivoConsulta: data.sintomas || 'Consulta automática',
        prioridad: data.prioridad || 'media',
        observaciones: 'Asignación automática por sistema'
      };

      console.log('🎯 Asignación automática creada:', assignmentData);
      
      // Disparar evento de asignación
      this.triggerEvent('patient_assigned', {
        ...assignmentData,
        doctorId: selectedDoctor.userId
      });

    } catch (error) {
      console.error('Error en asignación automática:', error);
    }
  }

  // Actualizar estado
  private async updateStatus(config: any, data?: any) {
    console.log(`📝 Actualizando estado: ${config.field} = ${config.value}`);
    // Aquí se implementaría la lógica para actualizar estados en la base de datos
  }

  // Crear tarea
  private async createTask(config: any, data?: any) {
    const task = {
      id: Date.now().toString(),
      assignTo: config.assignTo,
      task: config.task,
      data: data,
      created: new Date(),
      status: 'pending'
    };

    console.log('📋 Tarea creada:', task);
    
    // Disparar evento de nueva tarea
    this.triggerEvent('task_created', task);
  }

  // Redistribuir pacientes
  private async redistributePatients(config: any) {
    console.log('⚖️ Redistribuyendo pacientes según criterio:', config.criteria);
    // Lógica para redistribuir pacientes entre doctores
  }

  // Evaluar condiciones
  private evaluateConditions(conditions: any[], data: any): boolean {
    return conditions.every(condition => {
      const fieldValue = this.getFieldValue(data, condition.field);
      return this.evaluateCondition(fieldValue, condition.operator, condition.value);
    });
  }

  // Obtener valor de campo
  private getFieldValue(data: any, field: string): any {
    const parts = field.split('.');
    let value = data;
    for (const part of parts) {
      value = value?.[part];
    }
    return value;
  }

  // Evaluar condición individual
  private evaluateCondition(fieldValue: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === expectedValue;
      case 'greater_than':
        return fieldValue > expectedValue;
      case 'less_than':
        return fieldValue < expectedValue;
      case 'contains':
        return fieldValue?.includes(expectedValue);
      case 'days_ago':
        const daysAgo = Math.floor((Date.now() - new Date(fieldValue).getTime()) / (1000 * 60 * 60 * 24));
        return daysAgo === expectedValue;
      default:
        return false;
    }
  }

  // Agregar listener de eventos
  public addEventListener(eventType: string, callback: Function) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(callback);
  }

  // Disparar evento
  public triggerEvent(eventType: string, data: any) {
    const listeners = this.eventListeners.get(eventType) || [];
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error en listener de evento ${eventType}:`, error);
      }
    });
  }

  // Métodos públicos para integración

  // Programar recordatorio de cita
  public scheduleAppointmentReminder(appointmentId: string, reminderTime: Date) {
    const timeUntilReminder = reminderTime.getTime() - Date.now();
    
    if (timeUntilReminder > 0) {
      setTimeout(() => {
        this.triggerEvent('appointment_reminder', { appointmentId });
      }, timeUntilReminder);
    }
  }

  // Activar/desactivar regla
  public toggleRule(ruleId: string, isActive: boolean) {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.isActive = isActive;
      console.log(`Regla ${rule.name} ${isActive ? 'activada' : 'desactivada'}`);
    }
  }

  // Obtener estadísticas de automatización
  public getAutomationStats() {
    return {
      totalRules: this.rules.length,
      activeRules: this.rules.filter(r => r.isActive).length,
      executedToday: this.rules.filter(r => {
        if (!r.lastExecuted) return false;
        const today = new Date();
        const lastExec = new Date(r.lastExecuted);
        return today.toDateString() === lastExec.toDateString();
      }).length
    };
  }

  // Limpiar recursos
  public cleanup() {
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals.clear();
    this.eventListeners.clear();
    console.log('🧹 Servicio de automatización limpiado');
  }
}

// Instancia singleton del servicio de automatización
export const automationService = new AutomationService();

// Funciones de utilidad para integración fácil
export const automation = {
  // Disparar evento cuando se crea un triaje
  onTriageCreated: (triageData: any) => {
    automationService.triggerEvent('triage_created', triageData);
  },

  // Disparar evento cuando se completa una consulta
  onConsultationCompleted: (consultationData: any) => {
    automationService.triggerEvent('consultation_completed', consultationData);
  },

  // Disparar evento cuando se asigna un paciente
  onPatientAssigned: (assignmentData: any) => {
    automationService.triggerEvent('patient_assigned', assignmentData);
  },

  // Programar recordatorio
  scheduleReminder: (appointmentId: string, reminderTime: Date) => {
    automationService.scheduleAppointmentReminder(appointmentId, reminderTime);
  },

  // Obtener estadísticas
  getStats: () => automationService.getAutomationStats(),

  // Configurar regla personalizada
  addCustomRule: (rule: AutomationRule) => {
    automationService.rules.push(rule);
  }
};

export default automationService;