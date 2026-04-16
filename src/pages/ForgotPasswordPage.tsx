import axios from "axios";
import { useState } from "react";
import { Link } from "react-router-dom";

import { forgotPassword } from "../api/auth";

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return String(error.response?.data?.detail ?? "Unable to start password reset.");
  }
  return "Unable to start password reset.";
}

export function ForgotPasswordPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
            setResetToken(null);
            try {
              const formData = new FormData(event.currentTarget);
              const response = await forgotPassword(String(formData.get("email")));
              setMessage(response.message);
              setResetToken(response.reset_token ?? null);
            } catch (submitError) {
              setError(getErrorMessage(submitError));
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          <div className="auth-card-header">
            <span className="eyebrow">Password recovery</span>
            <h1>Reset your password</h1>
            <p>Request a reset link for the email attached to your MooveSaathi account.</p>
          </div>
          <div className="form-stack">
            <input name="email" type="email" placeholder="Email address" required />
          </div>
          {message ? <div className="form-alert success">{message}</div> : null}
          {resetToken ? <div className="form-alert info">Local reset token: {resetToken}</div> : null}
          {error ? <div className="form-alert error">{error}</div> : null}
          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Requesting..." : "Send reset link"}
          </button>
          <div className="auth-footer">
            <p>
              Have a reset token already? <Link to="/reset-password">Update password</Link>
            </p>
            <p>
              Back to <Link to="/login">sign in</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
