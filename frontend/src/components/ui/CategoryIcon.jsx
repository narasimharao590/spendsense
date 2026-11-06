import { getCategoryIcon } from '../../lib/icons.js';

export default function CategoryIcon({ icon, size = 16, className, strokeWidth = 2, ...rest }) {
  const IconComponent = getCategoryIcon(icon);

  return <IconComponent size={size} className={className} strokeWidth={strokeWidth} {...rest} />;
}
