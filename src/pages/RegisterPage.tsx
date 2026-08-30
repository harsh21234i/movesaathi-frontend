import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

import { register } from "../api/auth";
import { AuthForm } from "../components/AuthForm";

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return String(error.response?.data?.detail ?? "Unable to create your account.");
  }
  return "Unable to create your account.";
}

export function RegisterPage() {
  const navigate = useNavigate();

  return (
    <div className="auth-page">
      <div className="auth-hero">
        <div className="auth-copy auth-copy-panel">
          <span className="eyebrow">Verified onboarding</span>
          <h2>Create your rider profile and finish verification on your terms.</h2>
          <p>The backend now supports email verification, refresh sessions, and password recovery. This keeps the frontend aligned instead of assuming instant login forever.</p>
          <div className="auth-copy-points">
            <div>
              <strong>Passenger or driver</strong>
              <span>Choose the right role up front so the dashboard matches the workflow.</span>
            </div>
            <div>
              <strong>Better recovery</strong>
              <span>Email verification and password reset are wired into the new auth flow.</span>
            </div>
          </div>
        </div>
        <AuthForm
          title="Create account"
          subtitle="Passwords must include upper-case, lower-case, and numeric characters."
          submitLabel="Create account"
          includeName
          includePhone
          includeRole
          passwordHint="Use at least 8 characters with upper-case, lower-case, and a number."
          passwordAutoComplete="new-password"
          onSubmit={async (formData) => {
            try {
              const response = await register({
                full_name: String(formData.get("full_name")),
                email: String(formData.get("email")),
                password: String(formData.get("password")),
                phone_number: String(formData.get("phone_number") || ""),
                role: String(formData.get("role") || "passenger") as "driver" | "passenger",
              });
              navigate("/verify-email", {
                replace: true,
                state: {
                  email: response.email,
                  verificationToken: response.verification_token ?? null,
                  fromRegistration: true,
                },
              });
            } catch (error) {
              throw new Error(getErrorMessage(error));
            }
          }}
          footer={
            <p>
              Already registered? <Link to="/login">Sign in</Link>
            </p>
          }
        />
      </div>
    </div>
  );
}
