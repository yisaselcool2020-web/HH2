import axios from 'axios';

// Detectar automáticamente la URL base
const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    // En desarrollo usar puerto 3000, en producción usar el mismo dominio
    const port = hostname === 'localhost' || hostname === '127.0.0.1' ? ':3000' : '';
    return `${protocol}//${hostname}${port}`;
  }
  return 'http://localhost:3000';
};

const API_URL = getBaseURL();

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Solo hacer logout automático si NO es un error de login
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('hasShownWelcome');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data: { cedula: string; password: string }) =>
    api.post('/auth/login', data),

  register: (data: {
    name: string;
    email: string;
    cedula: string;
    password: string;
    role: string;
  }) => api.post('/auth/register', data),
};

export const patientsAPI = {
  getAll: () => api.get('/patients'),
  getById: (id: string) => api.get(`/patients/${id}`),
  search: (query: string) => api.get(`/patients/search/${query}`),
  create: (data: any) => api.post('/patients', data),
  update: (id: string, data: any) => api.put(`/patients/${id}`, data),
  delete: (id: string) => api.delete(`/patients/${id}`),
};

export const appointmentsAPI = {
  getAll: (params?: any) => api.get('/appointments', { params }),
  getMyAppointments: (params?: any) => api.get('/appointments/my-appointments', { params }),
  getDoctorAppointments: (doctorId: string, params?: any) => api.get(`/appointments/doctor/${doctorId}`, { params }),
  getById: (id: string) => api.get(`/appointments/${id}`),
  create: (data: any) => api.post('/appointments', data),
  update: (id: string, data: any) => api.put(`/appointments/${id}`, data),
  updatePayment: (id: string, data: any) => api.put(`/appointments/${id}/payment`, data),
  delete: (id: string) => api.delete(`/appointments/${id}`),
};

export const triageAPI = {
  getAll: (params?: any) => api.get('/triage', { params }),
  getById: (id: string) => api.get(`/triage/${id}`),
  create: (data: any) => api.post('/triage', data),
  update: (id: string, data: any) => api.put(`/triage/${id}`, data),
  delete: (id: string) => api.delete(`/triage/${id}`),
};

export const consultationsAPI = {
  getAll: (params?: any) => api.get('/consultations', { params }),
  getPendingTriages: () => api.get('/consultations/pending-triages'),
  create: (data: any) => api.post('/consultations', data),
  update: (id: string, data: any) => api.put(`/consultations/${id}`, data),
  delete: (id: string) => api.delete(`/consultations/${id}`),
};

export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getRecentActivities: () => api.get('/dashboard/recent-activities'),
};

export const doctorsAPI = {
  getAll: () => api.get('/doctors'),
  getById: (id: string) => api.get(`/doctors/${id}`),
  getAvailable: (fecha: string, hora: string) => api.get(`/doctors/available/${fecha}/${hora}`),
  getSchedule: (id: string, fecha: string) => api.get(`/doctors/${id}/horarios/${fecha}`),
  create: (data: any) => api.post('/doctors', data),
  update: (id: string, data: any) => api.put(`/doctors/${id}`, data),
  delete: (id: string) => api.delete(`/doctors/${id}`),
};

export const patientAssignmentsAPI = {
  getAll: (params?: any) => api.get('/patient-assignments', { params }),
  getDoctorAssignments: (params?: any) => api.get('/patient-assignments/doctor', { params }),
  getNewAssignments: (lastCheck?: string) => api.get('/patient-assignments/doctor/new', { params: { lastCheck } }),
  create: (data: any) => api.post('/patient-assignments', data),
  update: (id: string, data: any) => api.put(`/patient-assignments/${id}`, data),
  delete: (id: string) => api.delete(`/patient-assignments/${id}`),
  getStats: () => api.get('/patient-assignments/stats/doctor'),
};

export const especialidadesAPI = {
  getAll: () => api.get('/especialidades'),
  getById: (id: string) => api.get(`/especialidades/${id}`),
  create: (data: any) => api.post('/especialidades', data),
  update: (id: string, data: any) => api.put(`/especialidades/${id}`, data),
  delete: (id: string) => api.delete(`/especialidades/${id}`),
};

export const consultoriosAPI = {
  getAll: () => api.get('/consultorios'),
  getById: (id: string) => api.get(`/consultorios/${id}`),
  create: (data: any) => api.post('/consultorios', data),
  update: (id: string, data: any) => api.put(`/consultorios/${id}`, data),
  delete: (id: string) => api.delete(`/consultorios/${id}`),
};

export default api;
