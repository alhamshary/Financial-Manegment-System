import type { User } from '@/components/auth-provider';

export type Service = {
  id: string;
  name: string;
  category: string;
  price: number;
};

export type ServiceLog = {
  id: string;
  serviceId: string;
  employeeId: string;
  clientName: string;
  clientPhone: string;
  quantity: number;
  discount: number;
  finalPrice: number;
  date: string;
};

export const users: User[] = [
  { id: '1', name: 'Admin User', email: 'admin@alhamshary.com', role: 'admin' },
  { id: '2', name: 'Manager User', email: 'manager@alhamshary.com', role: 'manager' },
  { id: '3', name: 'Employee User', email: 'employee@alhamshary.com', role: 'employee' },
  { id: '4', name: 'Sara Smith', email: 'sara@alhamshary.com', role: 'employee' },
  { id: '5', name: 'John Doe', email: 'john@alhamshary.com', role: 'employee' },
];

export const services: Service[] = [
  { id: 's1', name: 'Haircut', category: 'Styling', price: 50 },
  { id: 's2', name: 'Coloring', category: 'Color', price: 120 },
  { id: 's3', name: 'Manicure', category: 'Nails', price: 35 },
  { id: 's4', name: 'Pedicure', category: 'Nails', price: 45 },
  { id: 's5', name: 'Facial', category: 'Skincare', price: 80 },
  { id: 's6', name: 'Massage (60 min)', category: 'Body', price: 100 },
];

const today = new Date();
const formatDate = (date: Date) => date.toISOString().split('T')[0];

export const serviceLogs: ServiceLog[] = [
  { id: 'l1', serviceId: 's1', employeeId: '3', clientName: 'Alice Johnson', clientPhone: '123-456-7890', quantity: 1, discount: 0, finalPrice: 50, date: formatDate(today) },
  { id: 'l2', serviceId: 's3', employeeId: '4', clientName: 'Bob Williams', clientPhone: '123-456-7891', quantity: 1, discount: 5, finalPrice: 30, date: formatDate(today) },
  { id: 'l3', serviceId: 's5', employeeId: '5', clientName: 'Charlie Brown', clientPhone: '123-456-7892', quantity: 1, discount: 10, finalPrice: 70, date: formatDate(today) },
  { id: 'l4', serviceId: 's2', employeeId: '3', clientName: 'Diana Prince', clientPhone: '123-456-7893', quantity: 1, discount: 0, finalPrice: 120, date: formatDate(new Date(today.setDate(today.getDate() - 1))) },
  { id: 'l5', serviceId: 's4', employeeId: '4', clientName: 'Ethan Hunt', clientPhone: '123-456-7894', quantity: 2, discount: 10, finalPrice: 80, date: formatDate(new Date(today.setDate(today.getDate() - 2))) },
];
