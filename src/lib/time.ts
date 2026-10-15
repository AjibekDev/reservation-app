import { SLOT_STEP_MINUTES, WORK_DAY_END, WORK_DAY_START } from './constants';

const pad = (value: number) => String(value).padStart(2, '0');

export const toMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export const fromMinutes = (total: number): string =>
  `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;

export const toISODate = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const minutesOfDay = (date: Date): number => date.getHours() * 60 + date.getMinutes();

export const buildTimeSlots = (
  from = WORK_DAY_START,
  to = WORK_DAY_END,
  step = SLOT_STEP_MINUTES,
): string[] => {
  const slots: string[] = [];
  for (let m = toMinutes(from); m <= toMinutes(to); m += step) slots.push(fromMinutes(m));
  return slots;
};
