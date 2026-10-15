import { useState } from 'react';
import { raceSimulation } from '../mocks/race';

export function DevPanel() {
  const [armed, setArmed] = useState(raceSimulation.isArmed);

  const toggle = (value: boolean) => {
    raceSimulation.set(value);
    setArmed(value);
  };

  return (
    <aside className="dev-panel">
      <label>
        <input type="checkbox" checked={armed} onChange={(e) => toggle(e.target.checked)} /> Имитировать
        гонку: сервер вернёт 409, будто слот только что занял другой пользователь
      </label>
    </aside>
  );
}
