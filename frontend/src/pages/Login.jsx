import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { apiErrorMessage } from '../lib/api.js';
import AuthForm from '../components/auth/AuthForm.jsx';
import AuthLayout from '../components/auth/AuthLayout.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const redirectTo =
    typeof location.state?.from === 'string' && location.state.from.startsWith('/')
      ? location.state.from
      : '/';

  async function handleSubmit(values) {
    setLoading(true);
    setError(null);

    try {
      await login(values.email, values.password);
      navigate(redirectTo, { replace: true });
    } catch (caught) {
      setError(apiErrorMessage(caught, 'We could not sign you in. Check your email and password.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to pick up where your numbers left off."
      footer={
        <>
          New to SpendSense?{' '}
          <Link
            to="/register"
            className="font-semibold text-primary-700 underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <AuthForm mode="login" onSubmit={handleSubmit} loading={loading} serverError={error} />
    </AuthLayout>
  );
}
