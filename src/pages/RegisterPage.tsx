import { Link, useNavigate } from "react-router-dom";

import { login, register } from "../api/auth";
import { AuthForm } from "../components/AuthForm";
import { useAuth } from "../context/AuthContext";

export function RegisterPage() {
  const navigate = useNavigate();
  const { login: saveToken } = useAuth();

  return (
    <div className="auth-page">
      <AuthForm
        title="Create your MooveSaathi account"
        submitLabel="Register"
        includeName
        onSubmit={async (formData) => {
          await register({
            full_name: String(formData.get("full_name")),
            email: String(formData.get("email")),
            password: String(formData.get("password")),
            phone_number: String(formData.get("phone_number") || ""),
          });
          const response = await login(String(formData.get("email")), String(formData.get("password")));
          await saveToken(response.access_token);
          navigate("/");
        }}
      />
      <p className="auth-link">
        Already registered? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}
