import { useState, type ReactNode, type SubmitEvent } from 'react';
import { isConflictError } from '../api/http';
import type { Booking, BookingInput } from '../api/types';
import { useBookings, useCreateBooking, useUpdateBooking } from '../hooks/useBookings';
import { WORK_DAY_END } from '../lib/constants';
import { buildTimeSlots } from '../lib/time';
import {
  getEndOptions,
  isPastDate,
  isStartAvailable,
  validateBooking,
  type ValidationField,
} from '../lib/validation';
import { EmptyState } from './StateView';

type Props = {
  date: string;
  now: Date;
  editing: Booking | null;
  onDone: () => void;
};

const START_SLOTS = buildTimeSlots().filter((slot) => slot < WORK_DAY_END);

export function BookingForm({ date, now, editing, onDone }: Props) {
  const { data: bookings = [], isPending: bookingsLoading } = useBookings(date);
  const createBooking = useCreateBooking();
  const updateBooking = useUpdateBooking();

  const [start, setStart] = useState(editing?.start ?? '');
  const [end, setEnd] = useState(editing?.end ?? '');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [prevDate, setPrevDate] = useState(date);
  if (date !== prevDate) {
    setPrevDate(date);
    setServerError(null);
    setSuccessMessage(null);
  }

  const excludeId = editing?.id;
  const isSubmitting = createBooking.isPending || updateBooking.isPending;

  const errors =
    start && end
      ? validateBooking({ input: { date, start, end }, existing: bookings, now, original: editing ?? undefined })
      : [];
  const fieldError = (...fields: ValidationField[]) => errors.find((e) => fields.includes(e.field))?.message;

  const startError = fieldError('start');
  const endError = fieldError('end');
  const formError =
    serverError ??
    fieldError('form', 'date') ??
    (submitted && (!start || !end) ? 'Выберите время начала и окончания' : undefined);

  const endOptions = start ? getEndOptions(date, start, bookings, excludeId) : [];
  const endSelectOptions = end && !endOptions.includes(end) ? [end, ...endOptions] : endOptions;

  const hasFreeStart = START_SLOTS.some((slot) => isStartAvailable(date, slot, bookings, now, excludeId));

  const resetFeedback = () => {
    setServerError(null);
    setSuccessMessage(null);
  };

  const handleStartChange = (value: string) => {
    resetFeedback();
    setStart(value);
    const options = getEndOptions(date, value, bookings, excludeId);
    if (!options.includes(end)) setEnd(options[0] ?? '');
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    resetFeedback();
    if (!start || !end || errors.length > 0) return;

    const input: BookingInput = { date, start, end, title: title.trim() || undefined };

    try {
      if (editing) {
        await updateBooking.mutateAsync({ id: editing.id, patch: input });
        onDone();
      } else {
        await createBooking.mutateAsync(input);
        setStart('');
        setEnd('');
        setTitle('');
        setSubmitted(false);
        setSuccessMessage(`Бронь ${start}–${end} создана`);
      }
    } catch (error) {
      setServerError(
        isConflictError(error)
          ? `${error.message}. Список броней обновлён — выберите другое время.`
          : `Не удалось сохранить: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`,
      );
    }
  };

  const heading = editing ? `Изменить бронь ${editing.start}–${editing.end}` : 'Новая бронь';

  if (!editing && isPastDate(date, now)) {
    return (
      <FormPanel heading={heading}>
        <EmptyState text="На прошедшую дату создать бронь нельзя" />
      </FormPanel>
    );
  }

  if (!editing && !bookingsLoading && !hasFreeStart) {
    return (
      <FormPanel heading={heading}>
        <EmptyState text="На эту дату свободного времени не осталось" />
      </FormPanel>
    );
  }

  return (
    <FormPanel heading={heading}>
      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="form__row">
          <label className="field">
            <span className="field__label">Начало</span>
            <select
              value={start}
              onChange={(e) => handleStartChange(e.target.value)}
              disabled={isSubmitting || bookingsLoading}
              aria-invalid={Boolean(startError)}
              aria-describedby={startError ? 'start-error' : undefined}
            >
              <option value="" disabled>
                —
              </option>
              {START_SLOTS.map((slot) => (
                <option
                  key={slot}
                  value={slot}
                  disabled={slot !== start && !isStartAvailable(date, slot, bookings, now, excludeId)}
                >
                  {slot}
                </option>
              ))}
            </select>
            {startError && (
              <span id="start-error" className="field__error">
                {startError}
              </span>
            )}
          </label>

          <label className="field">
            <span className="field__label">Окончание</span>
            <select
              value={end}
              onChange={(e) => {
                resetFeedback();
                setEnd(e.target.value);
              }}
              disabled={isSubmitting || !start}
              aria-invalid={Boolean(endError)}
              aria-describedby={endError ? 'end-error' : undefined}
            >
              <option value="" disabled>
                —
              </option>
              {endSelectOptions.map((slot) => (
                <option key={slot} value={slot} disabled={!endOptions.includes(slot)}>
                  {slot}
                </option>
              ))}
            </select>
            {endError && (
              <span id="end-error" className="field__error">
                {endError}
              </span>
            )}
          </label>
        </div>

        <label className="field">
          <span className="field__label">Название (необязательно)</span>
          <input
            type="text"
            value={title}
            maxLength={100}
            placeholder="Например, планирование спринта"
            onChange={(e) => setTitle(e.target.value)}
            disabled={isSubmitting}
          />
        </label>

        <div aria-live="polite">
          {formError && (
            <p className="form__error" role="alert">
              {formError}
            </p>
          )}
          {successMessage && <p className="form__success">{successMessage}</p>}
        </div>

        <div className="form__actions">
          <button type="submit" className="button--primary" disabled={isSubmitting || bookingsLoading}>
            {isSubmitting ? 'Сохранение…' : editing ? 'Сохранить' : 'Забронировать'}
          </button>
          {editing && (
            <button type="button" onClick={onDone} disabled={isSubmitting}>
              Отмена
            </button>
          )}
        </div>
      </form>
    </FormPanel>
  );
}

function FormPanel({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="panel" aria-labelledby="form-title">
      <h2 id="form-title">{heading}</h2>
      {children}
    </section>
  );
}
