import { useState, type ReactNode } from "react";

type AuthFormProps = {
  title: string;
  subtitle: string;
  submitLabel: string;
  onSubmit: (formData: FormData) => Promise<void>;
  includeName?: boolean;
  includePhone?: boolean;
  passwordLabel?: string;
  passwordHint?: string;
  footer?: ReactNode;
};

export function AuthForm({
  title,
  subtitle,
  submitLabel,
  onSubmit,
  includeName = false,
  includePhone = false,
  passwordLabel = "Password",
  passwordHint,
  footer,
}: AuthFormProps) {
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
        {includeName ? <input name="full_name" placeholder="Full name" required /> : null}
        <input name="email" placeholder="Email address" type="email" required />
        {includePhone ? <input name="phone_number" placeholder="Phone number" /> : null}
        <div className="input-group">
          <label htmlFor="password-field">{passwordLabel}</label>
          <input id="password-field" name="password" placeholder={passwordLabel} type="password" required />
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
