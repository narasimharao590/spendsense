import { LayoutDashboard, ReceiptText, Settings, Wallet } from 'lucide-react';

export const NAV_GROUPS = [
  {
    heading: 'Menu',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/transactions', label: 'Transactions', icon: ReceiptText, end: false },
      { to: '/budgets', label: 'Budgets', icon: Wallet, end: false },
    ],
  },
  {
    heading: 'Settings',
    items: [{ to: '/settings', label: 'Settings', icon: Settings, end: false }],
  },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

export function navTitleForPath(pathname) {
  const match = [...NAV_ITEMS]
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) => (item.end ? pathname === item.to : pathname.startsWith(item.to)));

  return match ? match.label : 'SpendSense';
}
