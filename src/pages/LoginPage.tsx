import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

import { login } from "../api/auth";
import { AuthForm } from "../components/AuthForm";
import { useAuth } from "../context/AuthContext";

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return String(error.response?.data?.detail ?? "Unable to sign in.");
  }
  return "Unable to sign in.";
}

export function LoginPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();

  return (
    <div className="auth-page">
      <div className="auth-hero">
        <div className="auth-copy">
          <span className="eyebrow">City-to-city rides</span>
          <h2>Reliable shared travel with live booking and verified accounts.</h2>
          <p>
            Sign in to publish rides, manage bookings, and keep passenger conversations in one place.
          </p>
        </div>
        <AuthForm
          title="Welcome back"
          subtitle="Use the same email you used on the backend-authenticated account."
          submitLabel="Sign in"
          onSubmit={async (formData) => {
            try {
              const response = await login(String(formData.get("email")), String(formData.get("password")));
              await setSession(response);
              navigate("/");
            } catch (error) {
              throw new Error(getErrorMessage(error));
            }
          }}
          footer={
            <>
              <p>
                New here? <Link to="/register">Create an account</Link>
              </p>
              <p>
                Forgot your password? <Link to="/forgot-password">Reset it</Link>
              </p>
            </>
          }
        />
      </div>
    </div>
  );
}
