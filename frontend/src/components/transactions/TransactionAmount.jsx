import { useCurrency } from '../../hooks/useCurrency.js';
import { formatSignedMoney } from '../../lib/format.js';
import { cx } from '../../lib/cx.js';

export default function TransactionAmount({ transaction, className }) {
  const currency = useCurrency();
  const amount = Math.abs(Number(transaction.amount) || 0);
  const signedAmount = transaction.type === 'income' ? amount : -amount;

  return (
    <span
      className={cx(
        'money font-semibold',
        transaction.type === 'income' ? 'text-income' : 'text-expense',
        className,
      )}
    >
      {formatSignedMoney(signedAmount, currency)}
    </span>
  );
}
