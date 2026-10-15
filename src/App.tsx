import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Booking } from './api/types';
import { BookingForm } from './components/BookingForm';
import { BookingList } from './components/BookingList';
import { DatePicker } from './components/DatePicker';
import { DevPanel } from './components/DevPanel';
import { useNow } from './hooks/useNow';
import { toISODate } from './lib/time';
import { isValidDate } from './lib/validation';

export function App() {
  const now = useNow();
  const [searchParams, setSearchParams] = useSearchParams();
  const [editing, setEditing] = useState<Booking | null>(null);

  const dateParam = searchParams.get('date');
  const date = dateParam && isValidDate(dateParam) ? dateParam : toISODate(now);

  if (editing && editing.date !== date) setEditing(null);

  const changeDate = (next: string) => {
    setSearchParams({ date: next });
    setEditing(null);
  };

  return (
    <main className="app">
      <header className="app__header">
        <h1>Бронирование переговорной</h1>
        <DatePicker value={date} onChange={changeDate} />
      </header>

      <div className="app__content">
        <BookingList
          date={date}
          now={now}
          editingId={editing?.id}
          onEdit={setEditing}
          onDeleted={(id) => editing?.id === id && setEditing(null)}
        />
        <BookingForm
          key={editing?.id ?? 'new'}
          date={date}
          now={now}
          editing={editing}
          onDone={() => setEditing(null)}
        />
      </div>

      <DevPanel />
    </main>
  );
}
