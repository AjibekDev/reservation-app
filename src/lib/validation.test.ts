import { describe, expect, it } from 'vitest';
import type { Booking } from '../api/types';
import { getEndOptions, isStartAvailable, validateBooking, type ValidateParams } from './validation';

const now = new Date(2026, 9, 15, 12, 0);
const TODAY = '2026-10-15';
const TOMORROW = '2026-10-16';

const booking = (id: string, start: string, end: string, date = TOMORROW): Booking => ({
  id,
  date,
  start,
  end,
});

const codes = (params: Partial<ValidateParams> & { input: ValidateParams['input'] }) =>
  validateBooking({ existing: [], now, ...params }).map((e) => e.code);

const at = (start: string, end: string, date = TOMORROW) => ({ date, start, end });

describe('validateBooking', () => {
  it('корректная бронь — без ошибок', () => {
    expect(codes({ input: at('10:00', '11:00') })).toEqual([]);
  });

  it('касание границ не считается пересечением', () => {
    const existing = [booking('a', '10:00', '11:00')];
    expect(codes({ input: at('11:00', '12:00'), existing })).toEqual([]);
    expect(codes({ input: at('09:00', '10:00'), existing })).toEqual([]);
  });

  it('пересечение — OVERLAP', () => {
    const existing = [booking('a', '10:00', '11:00')];
    expect(codes({ input: at('10:30', '11:30'), existing })).toEqual(['OVERLAP']);
  });

  it('редактируемая бронь не конфликтует сама с собой', () => {
    const original = booking('a', '10:00', '11:00');
    expect(codes({ input: at('10:30', '11:30'), existing: [original], original })).toEqual([]);
  });

  it('окончание ровно в 18:00 допустимо, позже — нет', () => {
    expect(codes({ input: at('17:00', '18:00') })).toEqual([]);
    expect(codes({ input: at('17:30', '18:30') })).toEqual(['OUT_OF_WORK_HOURS']);
  });

  it('длительность от 30 минут до 2 часов', () => {
    expect(codes({ input: at('10:00', '10:30') })).toEqual([]);
    expect(codes({ input: at('10:00', '12:00') })).toEqual([]);
    expect(codes({ input: at('10:00', '10:15') })).toEqual(['TOO_SHORT']);
    expect(codes({ input: at('10:00', '12:15') })).toEqual(['TOO_LONG']);
  });

  it('start >= end', () => {
    expect(codes({ input: at('11:00', '10:00') })).toEqual(['START_NOT_BEFORE_END']);
  });

  it('время вне сетки 15 минут', () => {
    expect(codes({ input: at('10:10', '11:00') })).toEqual(['OFF_GRID']);
  });

  it('прошедшая дата и прошедшее время сегодня', () => {
    expect(codes({ input: at('10:00', '11:00', '2026-10-14') })).toEqual(['PAST_DATE']);
    expect(codes({ input: at('11:00', '12:00', TODAY) })).toEqual(['PAST_TIME']);
    expect(codes({ input: at('12:00', '13:00', TODAY) })).toEqual(['PAST_TIME']);
    expect(codes({ input: at('12:15', '13:00', TODAY) })).toEqual([]);
  });

  it('начавшуюся бронь редактировать нельзя', () => {
    const original = booking('a', '11:30', '12:30', TODAY);
    expect(codes({ input: at('15:00', '16:00', TODAY), existing: [original], original })).toEqual(['LOCKED']);
  });

  it('несуществующая дата', () => {
    expect(codes({ input: at('10:00', '11:00', '2026-13-45') })).toEqual(['INVALID_FORMAT']);
  });
});

describe('getEndOptions / isStartAvailable', () => {
  it('окончания ограничены следующей бронью, 2 часами и 18:00', () => {
    const existing = [booking('a', '11:00', '12:00')];
    expect(getEndOptions(TOMORROW, '10:00', existing)).toEqual(['10:30', '10:45', '11:00']);
    expect(getEndOptions(TOMORROW, '17:15', [])).toEqual(['17:45', '18:00']);
    expect(getEndOptions(TOMORROW, '13:00', []).at(-1)).toBe('15:00');
  });

  it('занятый старт и старт без места под минимальную бронь недоступны', () => {
    const existing = [booking('a', '11:00', '12:00')];
    expect(isStartAvailable(TOMORROW, '11:30', existing, now)).toBe(false);
    expect(isStartAvailable(TOMORROW, '10:45', existing, now)).toBe(false);
    expect(isStartAvailable(TOMORROW, '17:30', [], now)).toBe(true);
    expect(isStartAvailable(TOMORROW, '17:45', [], now)).toBe(false);
    expect(isStartAvailable(TODAY, '12:00', [], now)).toBe(false);
  });
});
