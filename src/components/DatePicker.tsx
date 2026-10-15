type Props = {
  value: string;
  onChange: (date: string) => void;
};

export function DatePicker({ value, onChange }: Props) {
  return (
    <label className="field">
      <span className="field__label">Дата</span>
      <input
        type="date"
        value={value}
        onChange={(e) => e.target.value && onChange(e.target.value)}
      />
    </label>
  );
}
