import { useEffect, useState } from 'react';
import { CalendarDays, KeyRound, Mail, UserCog } from 'lucide-react';
import PageHeading from '../components/PageHeading.jsx';
import Button from '../components/ui/Button.jsx';
import { SelectInput, TextInput } from '../components/ui/formFields.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import api, { apiErrorMessage } from '../lib/api.js';
import { formatDate } from '../lib/format.js';

const COMMON_CURRENCIES = [
  { value: 'INR', label: 'INR — Indian Rupee' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'AUD', label: 'AUD — Australian Dollar' },
  { value: 'CAD', label: 'CAD — Canadian Dollar' },
  { value: 'CHF', label: 'CHF — Swiss Franc' },
  { value: 'CNY', label: 'CNY — Chinese Yuan' },
  { value: 'JPY', label: 'JPY — Japanese Yen' },
  { value: 'SGD', label: 'SGD — Singapore Dollar' },
  { value: 'AED', label: 'AED — UAE Dirham' },
  { value: 'ZAR', label: 'ZAR — South African Rand' },
  { value: 'BRL', label: 'BRL — Brazilian Real' },
  { value: 'SEK', label: 'SEK — Swedish Krona' },
  { value: 'NZD', label: 'NZD — New Zealand Dollar' },
];

function ProfileCard() {
  const { user, updateProfile } = useAuth();
  const toast = useToast();

  const [name, setName] = useState(user?.name ?? '');
  const [currency, setCurrency] = useState(user?.currency ?? 'INR');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(user?.name ?? '');
    setCurrency(user?.currency ?? 'INR');
    setErrors({});
  }, [user]);

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    if (name.trim().length < 2) {
      nextErrors.name = 'Your name needs at least 2 characters.';
    }
    if (!/^[A-Z]{3}$/.test(currency)) {
      nextErrors.currency = 'Choose a currency.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSaving(true);
    try {
      await updateProfile({ name: name.trim(), currency });
      toast.success('Profile updated.');
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not save your profile.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card p-5 sm:p-6" aria-labelledby="profile-heading">
      <header className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary-50 text-primary-600">
          <UserCog size={16} aria-hidden="true" />
        </span>
        <div>
          <h2 id="profile-heading" className="text-sm font-semibold text-slate-900 sm:text-base">
            Profile
          </h2>
          <p className="text-xs text-slate-500">How you appear across SpendSense.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
        <TextInput
          label="Name"
          required
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={errors.name}
        />

        <SelectInput
          label="Display currency"
          required
          value={currency}
          onChange={(event) => setCurrency(event.target.value)}
          options={COMMON_CURRENCIES}
          error={errors.currency}
          hint="Every amount is formatted with this currency."
        />

        <div className="flex justify-end">
          <Button type="submit" loading={saving}>
            Save profile
          </Button>
        </div>
      </form>
    </section>
  );
}

function PasswordCard() {
  const toast = useToast();
  const [values, setValues] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    if (!values.currentPassword) {
      nextErrors.currentPassword = 'Enter your current password.';
    }
    if (values.newPassword.length < 8) {
      nextErrors.newPassword = 'Use at least 8 characters.';
    }
    if (values.confirm !== values.newPassword) {
      nextErrors.confirm = 'Passwords do not match.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSaving(true);
    try {
      const response = await api.post('/auth/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      setValues({ currentPassword: '', newPassword: '', confirm: '' });
      toast.success(response.data?.message ?? 'Password updated.');
    } catch (error) {
      setFormError(apiErrorMessage(error, 'Could not change your password.'));
      toast.error(apiErrorMessage(error, 'Could not change your password.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card p-5 sm:p-6" aria-labelledby="password-heading">
      <header className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary-50 text-primary-600">
          <KeyRound size={16} aria-hidden="true" />
        </span>
        <div>
          <h2 id="password-heading" className="text-sm font-semibold text-slate-900 sm:text-base">
            Password
          </h2>
          <p className="text-xs text-slate-500">Choose something you do not reuse elsewhere.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
        {formError ? (
          <p
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700"
          >
            {formError}
          </p>
        ) : null}

        <TextInput
          label="Current password"
          type="password"
          required
          autoComplete="current-password"
          value={values.currentPassword}
          onChange={(event) => update('currentPassword', event.target.value)}
          error={errors.currentPassword}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="New password"
            type="password"
            required
            autoComplete="new-password"
            value={values.newPassword}
            onChange={(event) => update('newPassword', event.target.value)}
            error={errors.newPassword}
            hint="Minimum 8 characters."
          />

          <TextInput
            label="Confirm new password"
            type="password"
            required
            autoComplete="new-password"
            value={values.confirm}
            onChange={(event) => update('confirm', event.target.value)}
            error={errors.confirm}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" loading={saving}>
            Change password
          </Button>
        </div>
      </form>
    </section>
  );
}

function AccountDetails() {
  const { user } = useAuth();

  return (
    <section className="card p-5 sm:p-6" aria-labelledby="account-heading">
      <h2 id="account-heading" className="text-sm font-semibold text-slate-900 sm:text-base">
        Account
      </h2>
      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex items-center gap-3">
          <dt className="flex items-center gap-2 text-slate-500">
            <Mail size={15} aria-hidden="true" />
            Email
          </dt>
          <dd className="ml-auto truncate font-medium text-slate-800">{user?.email ?? ''}</dd>
        </div>
        <div className="flex items-center gap-3">
          <dt className="flex items-center gap-2 text-slate-500">
            <CalendarDays size={15} aria-hidden="true" />
            Member since
          </dt>
          <dd className="ml-auto font-medium text-slate-800 money">
            {user?.createdAt ? formatDate(user.createdAt, 'D MMMM YYYY') : '—'}
          </dd>
        </div>
        <div className="flex items-center gap-3">
          <dt className="flex items-center gap-2 text-slate-500">
            <KeyRound size={15} aria-hidden="true" />
            Currency
          </dt>
          <dd className="ml-auto font-medium text-slate-800">{user?.currency ?? '—'}</dd>
        </div>
      </dl>
    </section>
  );
}

export default function Settings() {
  return (
    <div className="space-y-6">
      <PageHeading
        title="Settings"
        description="Update how SpendSense addresses you and protects your data."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ProfileCard />
        <PasswordCard />
        <AccountDetails />
      </div>
    </div>
  );
}
