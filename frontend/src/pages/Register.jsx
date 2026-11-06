import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { apiErrorMessage } from '../lib/api.js';
import AuthForm from '../components/auth/AuthForm.jsx';
import AuthLayout from '../components/auth/AuthLayout.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(values) {
    setLoading(true);
    setError(null);

    try {
      await register(values.name, values.email, values.password);
      navigate('/', { replace: true });
    } catch (caught) {
      setError(apiErrorMessage(caught, 'We could not create your account. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start with your numbers, then shape budgets that actually fit your month."
      footer={
        <>
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-primary-700 underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <AuthForm mode="register" onSubmit={handleSubmit} loading={loading} serverError={error} />
    </AuthLayout>
  );
}
