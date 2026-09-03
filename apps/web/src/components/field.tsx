type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
};

/** Labeled control used on operator forms (Nova captura, correção, login). */
export function Field({ label, hint, error, children }: FieldProps) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {error ? (
        <span className="field-error" role="alert">
          {error}
        </span>
      ) : null}
      {!error && hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}
