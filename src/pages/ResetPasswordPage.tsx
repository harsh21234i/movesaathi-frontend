import axios from "axios";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { resetPassword } from "../api/auth";

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return String(error.response?.data?.detail ?? "Unable to reset password.");
  }
  return "Unable to reset password.";
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setToken(searchParams.get("token") ?? "");
  }, [searchParams]);

  return (
    <div className="auth-page">
      <div className="auth-hero single-column">
        <form
          className="auth-card"
          onSubmit={async (event) => {
            event.preventDefault();
            setIsSubmitting(true);
            setError(null);
            setMessage(null);
            try {
              const formData = new FormData(event.currentTarget);
              await resetPassword(String(formData.get("token")), String(formData.get("password")));
              setMessage("Password updated. You can sign in with the new password now.");
            } catch (submitError) {
              setError(getErrorMessage(submitError));
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          <div className="auth-card-header">
            <span className="eyebrow">Credential update</span>
            <h1>Choose a new password</h1>
            <p>The backend enforces a strong password policy, so use upper-case, lower-case, and numbers.</p>
          </div>
          <div className="form-stack">
            <input
              name="token"
              placeholder="Reset token"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              required
            />
            <div className="input-group">
              <label htmlFor="new-password-field">New password</label>
              <input id="new-password-field" name="password" type="password" required />
              <small>At least 8 characters with upper-case, lower-case, and numeric characters.</small>
            </div>
          </div>
          {message ? <div className="form-alert success">{message}</div> : null}
          {error ? <div className="form-alert error">{error}</div> : null}
          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Updating..." : "Reset password"}
          </button>
          <div className="auth-footer">
            <p>
              Back to <Link to="/login">sign in</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
