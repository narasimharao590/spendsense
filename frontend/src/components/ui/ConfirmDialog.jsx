import Button from './Button.jsx';
import Modal from './Modal.jsx';

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  message = null,
  busy = false,
  onConfirm,
  onClose,
}) {
  return (
    <Modal
      open={open}
      title={title}
      description={description}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message ? (
        <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {message}
        </p>
      ) : null}
    </Modal>
  );
}
