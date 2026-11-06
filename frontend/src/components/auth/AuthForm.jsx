import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import Button from '../ui/Button.jsx';
import { TextInput } from '../ui/formFields.jsx';
import { DEMO_CREDENTIALS, isDemoMode } from '../../lib/demoApi.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const INITIAL_VALUES = { name: '', email: '', password: '', confirm: '' };

export default function AuthForm({ mode, onSubmit, loading = false, serverError = null }) {
  const isRegister = mode === 'register';
  const [values, setValues] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState({});
  const [revealPassword, setRevealPassword] = useState(false);

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function validate() {
    const nextErrors = {};

    if (isRegister && values.name.trim().length < 2) {
      nextErrors.name = 'Tell us what to call you.';
    }

    if (!EMAIL_PATTERN.test(values.email.trim())) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (values.password.length < (isRegister ? 8 : 1)) {
      nextErrors.password = isRegister
        ? 'Use at least 8 characters.'
        : 'Enter your password.';
    }

    if (isRegister && values.confirm !== values.password) {
      nextErrors.confirm = 'Passwords do not match.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) {
      return;
    }

    onSubmit(
      isRegister
        ? {
            name: values.name.trim(),
            email: values.email.trim(),
            password: values.password,
          }
        : { email: values.email.trim(), password: values.password },
    );
  }

  const revealButton = (
    <button
      type="button"
      onClick={() => setRevealPassword((current) => !current)}
      aria-pressed={revealPassword}
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
    >
      {revealPassword ? <EyeOff size={13} aria-hidden="true" /> : <Eye size={13} aria-hidden="true" />}
      {revealPassword ? 'Hide' : 'Show'}
    </button>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {serverError ? (
        <p
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700"
        >
          {serverError}
        </p>
      ) : null}

      {isRegister ? (
        <TextInput
          label="Name"
          required
          autoComplete="name"
          value={values.name}
          onChange={(event) => update('name', event.target.value)}
          placeholder="Alex Morgan"
          error={errors.name}
        />
      ) : null}

      <TextInput
        label="Email"
        type="email"
        required
        autoComplete="email"
        value={values.email}
        onChange={(event) => update('email', event.target.value)}
        placeholder="you@example.com"
        error={errors.email}
      />

      <TextInput
        label="Password"
        type={revealPassword ? 'text' : 'password'}
        required
        autoComplete={isRegister ? 'new-password' : 'current-password'}
        value={values.password}
        onChange={(event) => update('password', event.target.value)}
        placeholder={isRegister ? 'At least 8 characters' : 'Your password'}
        error={errors.password}
        action={revealButton}
      />

      {isRegister ? (
        <TextInput
          label="Confirm password"
          type={revealPassword ? 'text' : 'password'}
          required
          autoComplete="new-password"
          value={values.confirm}
          onChange={(event) => update('confirm', event.target.value)}
          placeholder="Repeat your password"
          error={errors.confirm}
        />
      ) : null}

      <Button type="submit" size="lg" loading={loading} className="w-full">
        {isRegister ? 'Create my account' : 'Sign in'}
      </Button>

      {isDemoMode() && !isRegister ? (
        <p className="rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs leading-relaxed text-slate-500">
          This Pages build is a live demo. Sign in with{' '}
          <span className="font-semibold text-slate-700">{DEMO_CREDENTIALS.email}</span> /{' '}
          <span className="font-semibold text-slate-700">{DEMO_CREDENTIALS.password}</span>.
        </p>
      ) : null}
    </form>
  );
}
