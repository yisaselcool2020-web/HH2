import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  X, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  Clock,
  User,
  Calendar,
  Stethoscope,
  Heart
} from 'lucide-react';

interface SystemNotification {
  id: string;
  type: 'email' | 'sms' | 'push' | 'system';
  template: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: Date;
  read: boolean;
  data?: any;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationRead: (id: string) => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  onNotificationRead
}) => {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all');

  useEffect(() => {
    // Listener para notificaciones del sistema de automatización
    const handleSystemNotification = (event: any) => {
      const notificationData = event.detail;
      
      const newNotification: SystemNotification = {
        id: notificationData.id,
        type: notificationData.type,
        template: notificationData.template,
        title: getNotificationTitle(notificationData.template),
        message: getNotificationMessage(notificationData.template, notificationData.data),
        priority: notificationData.priority,
        timestamp: new Date(notificationData.timestamp),
        read: false,
        data: notificationData.data
      };

      setNotifications(prev => [newNotification, ...prev]);
    };

    window.addEventListener('system_notification', handleSystemNotification);

    return () => {
      window.removeEventListener('system_notification', handleSystemNotification);
    };
  }, []);

  const getNotificationTitle = (template: string): string => {
    const titles: { [key: string]: string } = {
      'appointment_reminder_24h': 'Recordatorio de Cita',
      'high_priority_triage': 'Triaje de Alta Prioridad',
      'patient_assigned': 'Paciente Asignado',
      'follow_up_reminder': 'Recordatorio de Seguimiento',
      'appointment_confirmed': 'Cita Confirmada',
      'workload_balanced': 'Carga de Trabajo Balanceada',
      'task_created': 'Nueva Tarea Asignada'
    };
    return titles[template] || 'Notificación del Sistema';
  };

  const getNotificationMessage = (template: string, data?: any): string => {
    const messages: { [key: string]: (data?: any) => string } = {
      'appointment_reminder_24h': (data) => 
        `Recordatorio: Tiene una cita programada para mañana${data?.time ? ` a las ${data.time}` : ''}`,
      'high_priority_triage': (data) => 
        `Nuevo paciente con triaje de prioridad ALTA${data?.patientName ? `: ${data.patientName}` : ''} requiere atención inmediata`,
      'patient_assigned': (data) => 
        `Se le ha asignado un nuevo paciente${data?.patientName ? `: ${data.patientName}` : ''}`,
      'follow_up_reminder': (data) => 
        `Recordatorio de seguimiento para el paciente${data?.patientName ? ` ${data.patientName}` : ''}`,
      'appointment_confirmed': (data) => 
        `Su cita ha sido confirmada automáticamente${data?.time ? ` para las ${data.time}` : ''}`,
      'workload_balanced': () => 
        'La carga de trabajo ha sido redistribuida automáticamente',
      'task_created': (data) => 
        `Nueva tarea asignada: ${data?.task || 'Tarea del sistema'}`
    };
    
    const messageFunc = messages[template];
    return messageFunc ? messageFunc(data) : 'Notificación del sistema';
  };

  const getNotificationIcon = (template: string, priority: string) => {
    const iconClass = "w-5 h-5";
    
    if (priority === 'urgent') {
      return <AlertTriangle className={`${iconClass} text-red-500`} />;
    }

    const icons: { [key: string]: JSX.Element } = {
      'appointment_reminder_24h': <Calendar className={`${iconClass} text-blue-500`} />,
      'high_priority_triage': <Heart className={`${iconClass} text-red-500`} />,
      'patient_assigned': <User className={`${iconClass} text-green-500`} />,
      'follow_up_reminder': <Clock className={`${iconClass} text-orange-500`} />,
      'appointment_confirmed': <CheckCircle className={`${iconClass} text-green-500`} />,
      'workload_balanced': <Stethoscope className={`${iconClass} text-purple-500`} />,
      'task_created': <Info className={`${iconClass} text-blue-500`} />
    };

    return icons[template] || <Bell className={`${iconClass} text-gray-500`} />;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-l-red-500 bg-red-50';
      case 'high': return 'border-l-orange-500 bg-orange-50';
      case 'medium': return 'border-l-blue-500 bg-blue-50';
      case 'low': return 'border-l-gray-500 bg-gray-50';
      default: return 'border-l-gray-500 bg-white';
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
    onNotificationRead(id);
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const filteredNotifications = notifications.filter(notif => {
    switch (filter) {
      case 'unread': return !notif.read;
      case 'urgent': return notif.priority === 'urgent';
      default: return true;
    }
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const urgentCount = notifications.filter(n => n.priority === 'urgent').length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-16 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Centro de Notificaciones</h2>
              <p className="text-sm text-gray-600">
                {unreadCount} sin leer • {urgentCount} urgentes
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex space-x-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filter === 'all' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Todas ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filter === 'unread' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Sin leer ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('urgent')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filter === 'urgent' 
                  ? 'bg-red-100 text-red-700' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Urgentes ({urgentCount})
            </button>
          </div>
        </div>

        {/* Actions */}
        {unreadCount > 0 && (
          <div className="px-6 py-2 border-b border-gray-200">
            <button
              onClick={markAllAsRead}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Marcar todas como leídas
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="max-h-96 overflow-y-auto">
          {filteredNotifications.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-l-4 ${getPriorityColor(notification.priority)} ${
                    !notification.read ? 'bg-opacity-100' : 'bg-opacity-50'
                  } hover:bg-opacity-75 transition-colors cursor-pointer`}
                  onClick={() => !notification.read && markAsRead(notification.id)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.template, notification.priority)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className={`text-sm font-medium ${
                            !notification.read ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.title}
                          </h4>
                          <p className={`text-sm mt-1 ${
                            !notification.read ? 'text-gray-700' : 'text-gray-500'
                          }`}>
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {notification.timestamp.toLocaleString('es-ES')}
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                          >
                            <X className="w-4 h-4 text-gray-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {filter === 'all' ? 'No hay notificaciones' : 
                 filter === 'unread' ? 'No hay notificaciones sin leer' :
                 'No hay notificaciones urgentes'}
              </h3>
              <p className="text-gray-600">
                {filter === 'all' ? 'Las notificaciones aparecerán aquí' :
                 filter === 'unread' ? 'Todas las notificaciones han sido leídas' :
                 'No hay notificaciones urgentes en este momento'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Sistema SAVISER</span>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>En línea</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;