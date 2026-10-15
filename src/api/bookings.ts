import { request } from './http';
import type { Booking, BookingInput, BookingPatch } from './types';

export const bookingsApi = {
  getByDate: (date: string) =>
    request<Booking[]>(`/bookings?date=${encodeURIComponent(date)}`),

  create: (input: BookingInput) =>
    request<Booking>('/bookings', { method: 'POST', body: JSON.stringify(input) }),

  update: (id: string, patch: BookingPatch) =>
    request<Booking>(`/bookings/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),

  remove: (id: string) => request<void>(`/bookings/${id}`, { method: 'DELETE' }),
};
