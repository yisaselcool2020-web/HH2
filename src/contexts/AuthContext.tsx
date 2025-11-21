export type UserRole = 'empresa' | 'recepcion' | 'consultorio' | 'enfermeria' | 'doctor';

export const mockUsers = [
  { email: 'empresa@saviser.com', password: 'empresa123', role: 'empresa' as UserRole, name: 'Director General' },
  { email: 'recepcion@saviser.com', password: 'recepcion123', role: 'recepcion' as UserRole, name: 'Ana García' },
  { email: 'consultorio@saviser.com', password: 'consultorio123', role: 'consultorio' as UserRole, name: 'Dr. Carlos Mendez' },
  { email: 'enfermeria@saviser.com', password: 'enfermeria123', role: 'enfermeria' as UserRole, name: 'Enf. María López' },
];

export const getRoleDisplayName = (role: UserRole): string => {
  switch (role) {
    case 'empresa':
      return 'Dirección General';
    case 'recepcion':
      return 'Recepción';
    case 'consultorio':
      return 'Consultorio Médico';
    case 'enfermeria':
      return 'Enfermería - Triaje';
    case 'doctor':
      return 'Médico Especialista';
    default:
      return role;
  }
};