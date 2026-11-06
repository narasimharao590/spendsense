import { useCurrency } from '../../hooks/useCurrency.js';
import { cx } from '../../lib/cx.js';
import { formatMoney, formatSignedMoney } from '../../lib/format.js';

export default function Money({ value, currency, signed = false, className }) {
  const userCurrency = useCurrency();
  const resolved = currency ?? userCurrency;

  return (
    <span className={cx('money', className)}>
      {signed ? formatSignedMoney(value, resolved) : formatMoney(value, resolved)}
    </span>
  );
}
