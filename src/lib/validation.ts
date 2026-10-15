import type { Booking, BookingInput } from '../api/types';
import {
  MAX_DURATION_MINUTES,
  MIN_DURATION_MINUTES,
  SLOT_STEP_MINUTES,
  WORK_DAY_END,
  WORK_DAY_START,
} from './constants';
import { fromMinutes, minutesOfDay, toISODate, toMinutes } from './time';

export type ValidationCode =
  | 'INVALID_FORMAT'
  | 'OFF_GRID'
  | 'OUT_OF_WORK_HOURS'
  | 'START_NOT_BEFORE_END'
  | 'TOO_SHORT'
  | 'TOO_LONG'
  | 'PAST_DATE'
  | 'PAST_TIME'
  | 'OVERLAP'
  | 'LOCKED';

export type ValidationField = 'date' | 'start' | 'end' | 'form';

export type ValidationError = {
  code: ValidationCode;
  field: ValidationField;
  message: string;
  conflicts?: Booking[];
};

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const DAY_START = toMinutes(WORK_DAY_START);
const DAY_END = toMinutes(WORK_DAY_END);

export function isValidDate(date: string): boolean {
  return DATE_RE.test(date) && toISODate(new Date(`${date}T00:00`)) === date;
}

export function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function findConflicts(
  candidate: Pick<BookingInput, 'date' | 'start' | 'end'>,
  existing: readonly Booking[],
  excludeId?: string,
): Booking[] {
  const s = toMinutes(candidate.start);
  const e = toMinutes(candidate.end);
  return existing.filter(
    (b) =>
      b.id !== excludeId &&
      b.date === candidate.date &&
      rangesOverlap(s, e, toMinutes(b.start), toMinutes(b.end)),
  );
}

export function isPastDate(date: string, now: Date): boolean {
  return date < toISODate(now);
}

export function isPastMoment(date: string, time: string, now: Date): boolean {
  const today = toISODate(now);
  if (date !== today) return date < today;
  return toMinutes(time) <= minutesOfDay(now);
}

export function isBookingLocked(booking: Pick<Booking, 'date' | 'start'>, now: Date): boolean {
  return isPastMoment(booking.date, booking.start, now);
}

export type BookingStatus = 'upcoming' | 'ongoing' | 'past';

export function getBookingStatus(booking: Booking, now: Date): BookingStatus {
  if (isPastMoment(booking.date, booking.end, now)) return 'past';
  if (isBookingLocked(booking, now)) return 'ongoing';
  return 'upcoming';
}

export type ValidateParams = {
  input: Pick<BookingInput, 'date' | 'start' | 'end'>;
  existing: readonly Booking[];
  now: Date;
  original?: Booking;
};

export function validateBooking({ input, existing, now, original }: ValidateParams): ValidationError[] {
  if (original && isBookingLocked(original, now)) {
    return [
      { code: 'LOCKED', field: 'form', message: 'Бронь уже началась или прошла — изменить её нельзя' },
    ];
  }

  const errors: ValidationError[] = [];
  const { date, start, end } = input;

  if (!isValidDate(date)) {
    errors.push({ code: 'INVALID_FORMAT', field: 'date', message: 'Некорректная дата' });
  }
  if (!TIME_RE.test(start)) {
    errors.push({ code: 'INVALID_FORMAT', field: 'start', message: 'Некорректное время начала' });
  }
  if (!TIME_RE.test(end)) {
    errors.push({ code: 'INVALID_FORMAT', field: 'end', message: 'Некорректное время окончания' });
  }
  if (errors.length) return errors;

  const s = toMinutes(start);
  const e = toMinutes(end);
  const offGrid = `Время должно быть кратно ${SLOT_STEP_MINUTES} минутам`;
  const outOfHours = `Время должно быть в пределах ${WORK_DAY_START}–${WORK_DAY_END}`;

  if (s % SLOT_STEP_MINUTES !== 0) {
    errors.push({ code: 'OFF_GRID', field: 'start', message: offGrid });
  }
  if (e % SLOT_STEP_MINUTES !== 0) {
    errors.push({ code: 'OFF_GRID', field: 'end', message: offGrid });
  }

  if (s < DAY_START || s >= DAY_END) {
    errors.push({ code: 'OUT_OF_WORK_HOURS', field: 'start', message: outOfHours });
  }
  if (e <= DAY_START || e > DAY_END) {
    errors.push({ code: 'OUT_OF_WORK_HOURS', field: 'end', message: outOfHours });
  }

  if (s >= e) {
    errors.push({ code: 'START_NOT_BEFORE_END', field: 'end', message: 'Окончание должно быть позже начала' });
  } else {
    const duration = e - s;
    if (duration < MIN_DURATION_MINUTES) {
      errors.push({ code: 'TOO_SHORT', field: 'end', message: `Минимальная длительность — ${MIN_DURATION_MINUTES} минут` });
    }
    if (duration > MAX_DURATION_MINUTES) {
      errors.push({ code: 'TOO_LONG', field: 'end', message: `Максимальная длительность — ${MAX_DURATION_MINUTES / 60} часа` });
    }
  }

  if (isPastDate(date, now)) {
    errors.push({ code: 'PAST_DATE', field: 'date', message: 'Нельзя бронировать на прошедшую дату' });
  } else if (isPastMoment(date, start, now)) {
    errors.push({ code: 'PAST_TIME', field: 'start', message: 'Это время уже прошло' });
  }

  if (s < e) {
    const conflicts = findConflicts(input, existing, original?.id);
    if (conflicts.length) {
      errors.push({
        code: 'OVERLAP',
        field: 'form',
        message: `Пересекается с бронью ${conflicts.map((c) => `${c.start}–${c.end}`).join(', ')}`,
        conflicts,
      });
    }
  }

  return errors;
}

export function getEndOptions(
  date: string,
  start: string,
  existing: readonly Booking[],
  excludeId?: string,
): string[] {
  if (!TIME_RE.test(start)) return [];
  const s = toMinutes(start);
  let limit = Math.min(s + MAX_DURATION_MINUTES, DAY_END);

  for (const b of existing) {
    if (b.id === excludeId || b.date !== date) continue;
    const bStart = toMinutes(b.start);
    if (bStart <= s && s < toMinutes(b.end)) return [];
    if (bStart > s) limit = Math.min(limit, bStart);
  }

  const options: string[] = [];
  for (let m = s + MIN_DURATION_MINUTES; m <= limit; m += SLOT_STEP_MINUTES) {
    options.push(fromMinutes(m));
  }
  return options;
}

export function isStartAvailable(
  date: string,
  start: string,
  existing: readonly Booking[],
  now: Date,
  excludeId?: string,
): boolean {
  if (toMinutes(start) < DAY_START || isPastMoment(date, start, now)) return false;
  return getEndOptions(date, start, existing, excludeId).length > 0;
}
