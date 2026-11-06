import { useState } from 'react';
import { useToast } from '../context/ToastContext.jsx';
import Button from './ui/Button.jsx';
import CategoryPickerField from './CategoryPickerField.jsx';
import api, { apiErrorMessage, unwrapResource } from '../lib/api.js';

const DEFAULT_COLOR = '#10b981';
const DEFAULT_ICON = 'more-horizontal';

export default function CategoryCreator({
  defaultType = 'expense',
  allowTypeChoice = false,
  onCreated,
  onCancel,
}) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [type, setType] = useState(defaultType);
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [icon, setIcon] = useState(DEFAULT_ICON);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const nextErrors = {};
    if (name.trim().length < 2) {
      nextErrors.name = 'Use at least 2 characters.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/categories', {
        name: name.trim(),
        type,
        color,
        icon,
      });
      const category = unwrapResource(response.data, 'category');
      toast.success(`${category.name} added to your categories.`);
      setName('');
      setErrors({});
      onCreated(category);
    } catch (error) {
      const message = apiErrorMessage(error, 'Could not create the category.');
      setErrors({ name: message });
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
    >
      <div>
        <h3 className="text-sm font-semibold text-slate-800">Create a category</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          It becomes available immediately, no page reload needed.
        </p>
      </div>

      <CategoryPickerField
        name={name}
        setName={setName}
        type={type}
        setType={setType}
        color={color}
        setColor={setColor}
        icon={icon}
        setIcon={setIcon}
        allowTypeChoice={allowTypeChoice}
        errors={errors}
      />

      <div className="flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          Save category
        </Button>
      </div>
    </form>
  );
}
