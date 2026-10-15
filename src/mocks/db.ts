import type { Booking, BookingInput } from '../api/types';
import { toISODate } from '../lib/time';

const bookings = new Map<string, Booking>();

const insert = (input: BookingInput): Booking => {
  const booking: Booking = { ...input, id: crypto.randomUUID() };
  bookings.set(booking.id, booking);
  return booking;
};

const seed = () => {
  const today = toISODate(new Date());
  insert({ date: today, start: '10:00', end: '11:00', title: 'Дейли' });
  insert({ date: today, start: '14:00', end: '15:30', title: 'Планирование' });
};

seed();

export const db = {
  listByDate: (date: string) =>
    [...bookings.values()]
      .filter((b) => b.date === date)
      .sort((a, b) => a.start.localeCompare(b.start)),

  get: (id: string) => bookings.get(id),

  insert,

  update: (id: string, patch: Partial<BookingInput>): Booking | undefined => {
    const current = bookings.get(id);
    if (!current) return undefined;
    const next = { ...current, ...patch };
    bookings.set(id, next);
    return next;
  },

  remove: (id: string) => bookings.delete(id),
};
