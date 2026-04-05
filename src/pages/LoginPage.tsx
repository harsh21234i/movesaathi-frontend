import { Link, useNavigate } from "react-router-dom";

import { login } from "../api/auth";
import { AuthForm } from "../components/AuthForm";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const navigate = useNavigate();
  const { login: saveToken } = useAuth();

  return (
    <div className="auth-page">
      <AuthForm
        title="Welcome back"
        submitLabel="Login"
        onSubmit={async (formData) => {
          const response = await login(String(formData.get("email")), String(formData.get("password")));
          await saveToken(response.access_token);
          navigate("/");
        }}
      />
      <p className="auth-link">
        New here? <Link to="/register">Create an account</Link>
      </p>
    </div>
  );
}
