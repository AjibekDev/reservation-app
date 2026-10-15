import { delay, http, HttpResponse } from 'msw';
import type { ApiErrorBody, Booking, BookingInput } from '../api/types';
import { findConflicts, isBookingLocked, validateBooking } from '../lib/validation';
import { db } from './db';
import { raceSimulation } from './race';

const error = (status: number, body: ApiErrorBody) => HttpResponse.json(body, { status });

const notFound = () => error(404, { code: 'NOT_FOUND', message: 'Бронь не найдена — возможно, её уже удалили' });

const networkDelay = () => delay(300 + Math.random() * 300);

const readBody = async (request: Request): Promise<Partial<BookingInput> | null> => {
  try {
    const body: unknown = await request.json();
    return body && typeof body === 'object' ? (body as Partial<BookingInput>) : null;
  } catch {
    return null;
  }
};

const toInput = (body: Partial<BookingInput>, base?: Booking): BookingInput => ({
  date: String(body.date ?? base?.date ?? ''),
  start: String(body.start ?? base?.start ?? ''),
  end: String(body.end ?? base?.end ?? ''),
  title: String(body.title ?? base?.title ?? '').trim() || undefined,
});

function rejectInput(input: BookingInput, original?: Booking) {
  const errors = validateBooking({ input, existing: db.listByDate(input.date), now: new Date(), original });

  const overlap = errors.find((e) => e.code === 'OVERLAP');
  if (overlap) {
    return error(409, { code: 'CONFLICT', message: overlap.message, details: { conflicts: overlap.conflicts } });
  }
  if (errors.length) {
    return error(400, { code: 'VALIDATION', message: errors[0].message, details: { errors } });
  }

  const overlapsSelf = original && findConflicts(input, [original]).length > 0;
  if (raceSimulation.isArmed() && !overlapsSelf) {
    const foreign = db.insert({ ...input, title: 'Занято другим пользователем' });
    return error(409, {
      code: 'CONFLICT',
      message: `Слот ${input.start}–${input.end} только что занял другой пользователь`,
      details: { conflicts: [foreign] },
    });
  }

  return null;
}

export const handlers = [
  http.get('/api/bookings', async ({ request }) => {
    await networkDelay();
    const date = new URL(request.url).searchParams.get('date');
    if (!date) return error(400, { code: 'VALIDATION', message: 'Не указана дата' });
    return HttpResponse.json(db.listByDate(date));
  }),

  http.post('/api/bookings', async ({ request }) => {
    await networkDelay();
    const body = await readBody(request);
    if (!body) return error(400, { code: 'VALIDATION', message: 'Некорректное тело запроса' });

    const input = toInput(body);
    const rejection = rejectInput(input);
    if (rejection) return rejection;

    return HttpResponse.json(db.insert(input), { status: 201 });
  }),

  http.patch('/api/bookings/:id', async ({ params, request }) => {
    await networkDelay();
    const original = db.get(String(params.id));
    if (!original) return notFound();

    const body = await readBody(request);
    if (!body) return error(400, { code: 'VALIDATION', message: 'Некорректное тело запроса' });

    const input = toInput(body, original);
    const rejection = rejectInput(input, original);
    if (rejection) return rejection;

    return HttpResponse.json(db.update(original.id, input));
  }),

  http.delete('/api/bookings/:id', async ({ params }) => {
    await networkDelay();
    const booking = db.get(String(params.id));
    if (!booking) return notFound();
    if (isBookingLocked(booking, new Date())) {
      return error(400, { code: 'VALIDATION', message: 'Бронь уже началась или прошла — удалить её нельзя' });
    }
    db.remove(booking.id);
    return new HttpResponse(null, { status: 204 });
  }),
];
