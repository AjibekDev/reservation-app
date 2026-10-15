export function Loader() {
  return (
    <p className="state" role="status">
      Загрузка…
    </p>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <p className="state">{text}</p>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state state--error" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry}>
          Повторить
        </button>
      )}
    </div>
  );
}
