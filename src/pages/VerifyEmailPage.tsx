import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";

import { resendVerification, verifyEmail } from "../api/auth";

type VerifyLocationState = {
  email?: string;
  verificationToken?: string | null;
  fromRegistration?: boolean;
};

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return String(error.response?.data?.detail ?? "Unable to verify email.");
  }
  return "Unable to verify email.";
}

export function VerifyEmailPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const locationState = (location.state ?? {}) as VerifyLocationState;
  const initialToken = useMemo(
    () => searchParams.get("token") ?? locationState.verificationToken ?? "",
    [locationState.verificationToken, searchParams],
  );
  const [token, setToken] = useState(initialToken);
  const [email, setEmail] = useState(locationState.email ?? "");
  const [message, setMessage] = useState<string | null>(
    locationState.fromRegistration
      ? "Account created. Verify your email to complete the new auth flow."
      : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setToken(initialToken);
  }, [initialToken]);

  return (
    <div className="auth-page">
      <div className="auth-hero single-column">
        <div className="auth-card">
          <div className="auth-card-header">
            <span className="eyebrow">Account verification</span>
            <h1>Verify your email</h1>
            <p>Use the verification token from email, or request a fresh one if you lost it.</p>
          </div>

          <form
            className="form-stack"
            onSubmit={async (event) => {
              event.preventDefault();
              setIsSubmitting(true);
              setError(null);
              setMessage(null);
              try {
                await verifyEmail(token);
                setMessage("Email verified. You can sign in now.");
              } catch (submitError) {
                setError(getErrorMessage(submitError));
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            <input
              name="token"
              placeholder="Verification token"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              required
            />
            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Verifying..." : "Verify email"}
            </button>
          </form>

          <form
            className="form-stack secondary-form"
            onSubmit={async (event) => {
              event.preventDefault();
              setIsSubmitting(true);
              setError(null);
              try {
                const response = await resendVerification(email);
                setMessage(response.message);
                if (response.verification_token) {
                  setToken(response.verification_token);
                }
              } catch (submitError) {
                setError(getErrorMessage(submitError));
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            <input
              name="email"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <button className="ghost-button" type="submit" disabled={isSubmitting}>
              Resend verification
            </button>
          </form>

          {message ? <div className="form-alert success">{message}</div> : null}
          {error ? <div className="form-alert error">{error}</div> : null}

          <div className="auth-footer">
            <p>
              Back to <Link to="/login">sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
