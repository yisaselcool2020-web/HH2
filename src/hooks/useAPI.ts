import { useState, useCallback } from 'react';
import {
  patientsAPI,
  appointmentsAPI,
  triageAPI,
  consultationsAPI,
  dashboardAPI,
  doctorsAPI,
  patientAssignmentsAPI,
  especialidadesAPI,
  consultoriosAPI,
} from '../services/api';

export const useAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequest = useCallback(async <T,>(
    request: () => Promise<any>,
    onSuccess?: (data: T) => void,
    onError?: (error: any) => void
  ) => {
    setLoading(true);
    setError(null);
    try {
      const response = await request();
      const data = response.data;
      if (onSuccess) onSuccess(data);
      return data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error de conexión';
      setError(errorMessage);
      if (onError) onError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    handleRequest,

    patients: {
      getAll: () => handleRequest(() => patientsAPI.getAll()),
      getById: (id: string) => handleRequest(() => patientsAPI.getById(id)),
      search: (query: string) => handleRequest(() => patientsAPI.search(query)),
      create: (data: any) => handleRequest(() => patientsAPI.create(data)),
      update: (id: string, data: any) => handleRequest(() => patientsAPI.update(id, data)),
      delete: (id: string) => handleRequest(() => patientsAPI.delete(id)),
    },

    appointments: {
      getAll: (params?: any) => handleRequest(() => appointmentsAPI.getAll(params)),
      getMyAppointments: (params?: any) => handleRequest(() => appointmentsAPI.getMyAppointments(params)),
      getDoctorAppointments: (doctorId: string, params?: any) => handleRequest(() => appointmentsAPI.getDoctorAppointments(doctorId, params)),
      getById: (id: string) => handleRequest(() => appointmentsAPI.getById(id)),
      create: (data: any) => handleRequest(() => appointmentsAPI.create(data)),
      update: (id: string, data: any) => handleRequest(() => appointmentsAPI.update(id, data)),
      updatePayment: (id: string, data: any) => handleRequest(() => appointmentsAPI.updatePayment(id, data)),
      delete: (id: string) => handleRequest(() => appointmentsAPI.delete(id)),
    },

    triage: {
      getAll: (params?: any) => handleRequest(() => triageAPI.getAll(params)),
      getById: (id: string) => handleRequest(() => triageAPI.getById(id)),
      create: (data: any) => handleRequest(() => triageAPI.create(data)),
      update: (id: string, data: any) => handleRequest(() => triageAPI.update(id, data)),
      delete: (id: string) => handleRequest(() => triageAPI.delete(id)),
    },

    consultations: {
      getAll: (params?: any) => handleRequest(() => consultationsAPI.getAll(params)),
      getPendingTriages: () => handleRequest(() => consultationsAPI.getPendingTriages()),
      create: (data: any) => handleRequest(() => consultationsAPI.create(data)),
      update: (id: string, data: any) => handleRequest(() => consultationsAPI.update(id, data)),
      delete: (id: string) => handleRequest(() => consultationsAPI.delete(id)),
    },

    dashboard: {
      getStats: () => handleRequest(() => dashboardAPI.getStats()),
      getRecentActivities: () => handleRequest(() => dashboardAPI.getRecentActivities()),
    },

    doctors: {
      getAll: () => handleRequest(() => doctorsAPI.getAll()),
      getById: (id: string) => handleRequest(() => doctorsAPI.getById(id)),
      getAvailable: (fecha: string, hora: string) => handleRequest(() => doctorsAPI.getAvailable(fecha, hora)),
      getSchedule: (id: string, fecha: string) => handleRequest(() => doctorsAPI.getSchedule(id, fecha)),
      create: (data: any) => handleRequest(() => doctorsAPI.create(data)),
      update: (id: string, data: any) => handleRequest(() => doctorsAPI.update(id, data)),
      delete: (id: string) => handleRequest(() => doctorsAPI.delete(id)),
    },

    patientAssignments: {
      getAll: (params?: any) => handleRequest(() => patientAssignmentsAPI.getAll(params)),
      getDoctorAssignments: (params?: any) => handleRequest(() => patientAssignmentsAPI.getDoctorAssignments(params)),
      getNewAssignments: (lastCheck?: string) => handleRequest(() => patientAssignmentsAPI.getNewAssignments(lastCheck)),
      create: (data: any) => handleRequest(() => patientAssignmentsAPI.create(data)),
      update: (id: string, data: any) => handleRequest(() => patientAssignmentsAPI.update(id, data)),
      delete: (id: string) => handleRequest(() => patientAssignmentsAPI.delete(id)),
      getStats: () => handleRequest(() => patientAssignmentsAPI.getStats()),
    },

    especialidades: {
      getAll: () => handleRequest(() => especialidadesAPI.getAll()),
      getById: (id: string) => handleRequest(() => especialidadesAPI.getById(id)),
      create: (data: any) => handleRequest(() => especialidadesAPI.create(data)),
      update: (id: string, data: any) => handleRequest(() => especialidadesAPI.update(id, data)),
      delete: (id: string) => handleRequest(() => especialidadesAPI.delete(id)),
    },

    consultorios: {
      getAll: () => handleRequest(() => consultoriosAPI.getAll()),
      getById: (id: string) => handleRequest(() => consultoriosAPI.getById(id)),
      create: (data: any) => handleRequest(() => consultoriosAPI.create(data)),
      update: (id: string, data: any) => handleRequest(() => consultoriosAPI.update(id, data)),
      delete: (id: string) => handleRequest(() => consultoriosAPI.delete(id)),
    },
  };
};
