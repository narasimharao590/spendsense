export function accountBrief(account) {
  if (!account) return null;
  if (typeof account === 'object') {
    if (account.name === undefined) return null;
    return {
      id: String(account._id ?? account.id),
      name: account.name,
      kind: account.kind,
      color: account.color,
      icon: account.icon,
    };
  }
  return { id: String(account), name: null, kind: null, color: null, icon: null };
}
