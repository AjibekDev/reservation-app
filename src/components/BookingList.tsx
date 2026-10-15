import type { Booking } from '../api/types';
import { useBookings, useDeleteBooking } from '../hooks/useBookings';
import { getBookingStatus, type BookingStatus } from '../lib/validation';
import { EmptyState, ErrorState, Loader } from './StateView';

type Props = {
  date: string;
  now: Date;
  editingId?: string;
  onEdit: (booking: Booking) => void;
  onDeleted: (id: string) => void;
};

const STATUS_LABEL: Record<BookingStatus, string | null> = {
  upcoming: null,
  ongoing: 'Идёт',
  past: 'Прошла',
};

const formatDate = (date: string) =>
  new Date(`${date}T00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' });

export function BookingList({ date, now, editingId, onEdit, onDeleted }: Props) {
  const { data, isPending, isError, error, refetch, isFetching } = useBookings(date);
  const deleteBooking = useDeleteBooking();

  const handleDelete = (booking: Booking) => {
    if (!window.confirm(`Удалить бронь ${booking.start}–${booking.end}?`)) return;
    deleteBooking.mutate(booking.id, { onSuccess: () => onDeleted(booking.id) });
  };

  return (
    <section className="panel" aria-labelledby="bookings-title" aria-busy={isFetching}>
      <div className="panel__head">
        <h2 id="bookings-title">Брони · {formatDate(date)}</h2>
        {isFetching && !isPending && <span className="muted">Обновление…</span>}
      </div>

      {deleteBooking.isError && (
        <p className="form__error" role="alert">
          Не удалось удалить: {deleteBooking.error.message}
        </p>
      )}

      {isPending && <Loader />}
      {isError && <ErrorState message={`Не удалось загрузить брони: ${error.message}`} onRetry={() => refetch()} />}
      {data?.length === 0 && <EmptyState text="На эту дату броней нет" />}

      {data && data.length > 0 && (
        <ul className="booking-list">
          {data.map((booking) => {
            const status = getBookingStatus(booking, now);
            const label = STATUS_LABEL[status];
            const isDeleting = deleteBooking.isPending && deleteBooking.variables === booking.id;

            return (
              <li
                key={booking.id}
                className={[
                  'booking',
                  status !== 'upcoming' && 'booking--locked',
                  booking.id === editingId && 'booking--active',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className="booking__info">
                  <span className="booking__time">
                    {booking.start}–{booking.end}
                  </span>
                  <span className="booking__title">{booking.title || 'Без названия'}</span>
                  {label && <span className="badge">{label}</span>}
                </div>

                {status === 'upcoming' && (
                  <div className="booking__actions">
                    <button
                      type="button"
                      onClick={() => onEdit(booking)}
                      disabled={isDeleting}
                      aria-label={`Изменить бронь ${booking.start}–${booking.end}`}
                    >
                      Изменить
                    </button>
                    <button
                      type="button"
                      className="button--danger"
                      onClick={() => handleDelete(booking)}
                      disabled={isDeleting}
                      aria-label={`Удалить бронь ${booking.start}–${booking.end}`}
                    >
                      {isDeleting ? 'Удаление…' : 'Удалить'}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
