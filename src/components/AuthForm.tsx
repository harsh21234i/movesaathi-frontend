import { useId, useState, type ReactNode } from "react";

type AuthFormProps = {
  title: string;
  subtitle: string;
  submitLabel: string;
  onSubmit: (formData: FormData) => Promise<void>;
  includeName?: boolean;
  includePhone?: boolean;
  includeRole?: boolean;
  passwordLabel?: string;
  passwordHint?: string;
  passwordAutoComplete?: "current-password" | "new-password";
  footer?: ReactNode;
};

export function AuthForm({
  title,
  subtitle,
  submitLabel,
  onSubmit,
  includeName = false,
  includePhone = false,
  includeRole = false,
  passwordLabel = "Password",
  passwordHint,
  passwordAutoComplete = "new-password",
  footer,
}: AuthFormProps) {
  const formId = useId();
  const nameId = `${formId}-name`;
  const emailId = `${formId}-email`;
  const phoneId = `${formId}-phone`;
  const roleId = `${formId}-role`;
  const passwordId = `${formId}-password`;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="auth-card"
      onSubmit={async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        setError(null);
        try {
          await onSubmit(new FormData(event.currentTarget));
        } catch (submitError) {
          setError(submitError instanceof Error ? submitError.message : "Something went wrong.");
        } finally {
          setIsSubmitting(false);
        }
      }}
    >
      <div className="auth-card-header">
        <span className="eyebrow">MooveSaathi</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <div className="form-stack">
        {includeName ? (
          <div className="input-group">
            <label htmlFor={nameId}>Full name</label>
            <input id={nameId} name="full_name" autoComplete="name" required />
          </div>
        ) : null}
        <div className="input-group">
          <label htmlFor={emailId}>Email address</label>
          <input id={emailId} name="email" type="email" autoComplete="email" required />
        </div>
        {includePhone ? (
          <div className="input-group">
            <label htmlFor={phoneId}>Phone number</label>
            <input id={phoneId} name="phone_number" autoComplete="tel" inputMode="tel" />
          </div>
        ) : null}
        {includeRole ? (
          <div className="input-group">
            <label htmlFor={roleId}>I want to use MooveSaathi as</label>
            <select id={roleId} name="role" defaultValue="passenger">
              <option value="passenger">Passenger - discover and book rides</option>
              <option value="driver">Driver - publish and manage rides</option>
            </select>
          </div>
        ) : null}
        <div className="input-group">
          <label htmlFor={passwordId}>{passwordLabel}</label>
          <input
            id={passwordId}
            name="password"
            type="password"
            autoComplete={passwordAutoComplete}
            required
          />
          {passwordHint ? <small>{passwordHint}</small> : null}
        </div>
      </div>

      {error ? <div className="form-alert error">{error}</div> : null}

      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Please wait..." : submitLabel}
      </button>

      {footer ? <div className="auth-footer">{footer}</div> : null}
    </form>
  );
}
