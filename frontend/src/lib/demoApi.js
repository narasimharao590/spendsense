import api from './api.js';
import { readToken, writeToken } from './session.js';

// GitHub Pages can only serve static files, so the production build ships an in-browser
// demo backend. It mirrors the Express API envelopes and persists mutations in localStorage.
const STORE_KEY = 'spendsense.demo.store.v1';
const DEMO_USER_ID = 'demo-user';
const DEMO_EMAIL = 'demo@spendsense.app';
const DEMO_PASSWORD = 'demo1234';
const ACCOUNT_KIND_LABELS = {
  cash: 'Cash',
  savings: 'Savings',
  investment: 'Investments',
  credit: 'Credit',
};
const ACCOUNT_KIND_ORDER = ['cash', 'savings', 'investment', 'credit'];

const CATEGORY_BLUEPRINT = [
  { name: 'Food & Dining', type: 'expense', color: '#f97316', icon: 'utensils' },
  { name: 'Groceries', type: 'expense', color: '#84cc16', icon: 'shopping-cart' },
  { name: 'Transport', type: 'expense', color: '#3b82f6', icon: 'car' },
  { name: 'Housing', type: 'expense', color: '#8b5cf6', icon: 'home' },
  { name: 'Utilities', type: 'expense', color: '#06b6d4', icon: 'zap' },
  { name: 'Health', type: 'expense', color: '#ef4444', icon: 'heart' },
  { name: 'Entertainment', type: 'expense', color: '#ec4899', icon: 'film' },
  { name: 'Shopping', type: 'expense', color: '#eab308', icon: 'shopping-bag' },
  { name: 'Education', type: 'expense', color: '#6366f1', icon: 'book-open' },
  { name: 'Travel', type: 'expense', color: '#14b8a6', icon: 'plane' },
  { name: 'Subscriptions', type: 'expense', color: '#a855f7', icon: 'repeat' },
  { name: 'Other', type: 'expense', color: '#64748b', icon: 'more-horizontal' },
  { name: 'Salary', type: 'income', color: '#22c55e', icon: 'briefcase' },
  { name: 'Freelance', type: 'income', color: '#10b981', icon: 'laptop' },
  { name: 'Investments', type: 'income', color: '#0ea5e9', icon: 'trending-up' },
  { name: 'Gifts', type: 'income', color: '#f59e0b', icon: 'gift' },
  { name: 'Other Income', type: 'income', color: '#94a3b8', icon: 'coins' },
];

export function isDemoMode() {
  return import.meta.env.VITE_DEMO_MODE === 'true';
}

/* ------------------------------------------------------------------ helpers */

function pad2(value) {
  return String(value).padStart(2, '0');
}

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function round1(value) {
  return Math.round((Number(value) + Number.EPSILON) * 10) / 10;
}

function round3(value) {
  return Math.round((Number(value) + Number.EPSILON) * 1000) / 1000;
}

function monthKeyOf(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

function shiftMonthKey(month, delta) {
  const [year, mm] = month.split('-').map(Number);
  return monthKeyOf(new Date(year, mm - 1 + delta, 1));
}

function daysInMonth(month) {
  const [year, mm] = month.split('-').map(Number);
  return new Date(year, mm, 0).getDate();
}

function prng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashPassword(value) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash + value.charCodeAt(index)) >>> 0;
  }
  return `demo-hash-${hash.toString(36)}`;
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/* -------------------------------------------------------------------- store */

function writeStore(store) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    /* private mode: the demo simply resets on the next load */
  }
}

function readStore() {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.version === 1 && Array.isArray(parsed.users)) {
        return parsed;
      }
    }
  } catch {
    /* fall through to a fresh seed */
  }
  const seeded = seedStore();
  writeStore(seeded);
  return seeded;
}

function categoriesFor(ownerId) {
  return CATEGORY_BLUEPRINT.map((category, index) => ({
    ...category,
    id: `cat-${index}-${ownerId}`,
    ownerId,
    isDefault: true,
    createdAt: new Date().toISOString(),
  }));
}

function seedStore() {
  const now = new Date();
  const store = {
    version: 1,
    users: [
      {
        id: DEMO_USER_ID,
        name: 'Aarav Mehta',
        email: DEMO_EMAIL,
        currency: 'INR',
        createdAt: new Date(now.getFullYear() - 1, now.getMonth(), 4).toISOString(),
        passwordHash: hashPassword(DEMO_PASSWORD),
      },
    ],
    categories: categoriesFor(DEMO_USER_ID),
    transactions: [],
    budgets: [],
    accounts: [
      {
        id: 'acc-savings',
        ownerId: DEMO_USER_ID,
        name: 'HDFC Savings',
        kind: 'savings',
        openingBalance: 145000,
        color: '#0ea5e9',
        icon: 'landmark',
        note: 'Salary account',
        isActive: true,
      },
      {
        id: 'acc-cash',
        ownerId: DEMO_USER_ID,
        name: 'Cash Wallet',
        kind: 'cash',
        openingBalance: 18000,
        color: '#f59e0b',
        icon: 'wallet',
        note: '',
        isActive: true,
      },
      {
        id: 'acc-credit',
        ownerId: DEMO_USER_ID,
        name: 'ICICI Credit Card',
        kind: 'credit',
        openingBalance: 0,
        color: '#ef4444',
        icon: 'credit-card',
        note: 'Billed monthly',
        isActive: true,
      },
    ],
  };

  const categoryId = (name) =>
    store.categories.find((category) => category.name === name && category.ownerId === DEMO_USER_ID)?.id ?? null;

  const currentMonth = monthKeyOf(now);
  const months = Array.from({ length: 6 }, (_, index) => shiftMonthKey(currentMonth, index - 5));
  const random = prng(20261106);
  const between = (min, max) => min + random() * (max - min);
  let counter = 0;

  function add(month, lastDay, entry) {
    const day = Math.min(Math.max(1, entry.day), lastDay);
    const dayKey = `${month}-${pad2(day)}`;
    counter += 1;
    store.transactions.push({
      id: `tx-demo-${counter}`,
      ownerId: DEMO_USER_ID,
      title: entry.title,
      amount: round2(entry.amount),
      type: entry.type,
      note: entry.note ?? '',
      categoryId: entry.category ? categoryId(entry.category) : null,
      accountId: entry.account ?? null,
      transferToId: entry.transferTo ?? null,
      date: `${dayKey}T12:00:00.000Z`,
      createdAt: `${dayKey}T12:05:00.000Z`,
    });
  }

  const FOOD_TITLES = ['Masala dosa breakfast', 'Team lunch', 'Pizza night', 'Coffee and snack', 'Dinner with friends', 'Street food'];
  const GROCERY_TITLES = ['BigBasket order', 'Weekly vegetables', 'Milk and eggs', 'Dry fruits', 'Supermarket run'];
  const TRANSPORT_TITLES = ['Metro card top-up', 'Auto ride', 'Fuel top-up', 'Cab to office', 'Parking'];
  const FUN_TITLES = ['Movie tickets', 'Concert tickets', 'Board game night', 'Weekend bowling'];
  const SHOPPING_TITLES = ['Running shoes', 'Kurta online order', 'Headphones', 'Home decor'];

  months.forEach((month, monthIndex) => {
    const lastDay = month === currentMonth ? now.getDate() : daysInMonth(month);

    add(month, lastDay, { title: 'Monthly salary', amount: 85000, type: 'income', category: 'Salary', day: 1, account: 'acc-savings' });
    if (monthIndex % 2 === 1) {
      add(month, lastDay, {
        title: 'Freelance UI project',
        amount: between(9000, 18000),
        type: 'income',
        category: 'Freelance',
        day: 12,
        account: 'acc-savings',
      });
    }

    add(month, lastDay, { title: 'Rent', amount: 22000, type: 'expense', category: 'Housing', day: 3, account: 'acc-savings' });
    add(month, lastDay, { title: 'Electricity bill', amount: between(1500, 2400), type: 'expense', category: 'Utilities', day: 7, account: 'acc-savings' });
    add(month, lastDay, { title: 'Broadband and water', amount: between(900, 1300), type: 'expense', category: 'Utilities', day: 8, account: 'acc-savings' });
    add(month, lastDay, { title: 'Netflix and Spotify', amount: 1299, type: 'expense', category: 'Subscriptions', day: 9, account: 'acc-savings' });

    const groceryRuns = 4 + Math.round(random());
    for (let index = 0; index < groceryRuns; index += 1) {
      add(month, lastDay, {
        title: GROCERY_TITLES[index % GROCERY_TITLES.length],
        amount: between(650, 2600),
        type: 'expense',
        category: 'Groceries',
        day: 2 + Math.floor(random() * 25),
        account: 'acc-cash',
      });
    }

    const meals = 6 + Math.round(random() * 2);
    for (let index = 0; index < meals; index += 1) {
      add(month, lastDay, {
        title: FOOD_TITLES[index % FOOD_TITLES.length],
        amount: between(180, 1400),
        type: 'expense',
        category: 'Food & Dining',
        day: 2 + Math.floor(random() * 26),
        account: 'acc-cash',
      });
    }

    const rides = 4 + Math.round(random() * 2);
    for (let index = 0; index < rides; index += 1) {
      add(month, lastDay, {
        title: TRANSPORT_TITLES[index % TRANSPORT_TITLES.length],
        amount: between(80, 750),
        type: 'expense',
        category: 'Transport',
        day: 2 + Math.floor(random() * 26),
        account: 'acc-cash',
      });
    }

    for (let index = 0; index < 2; index += 1) {
      add(month, lastDay, {
        title: FUN_TITLES[Math.floor(random() * FUN_TITLES.length)],
        amount: between(350, 1600),
        type: 'expense',
        category: 'Entertainment',
        day: 4 + Math.floor(random() * 24),
        account: 'acc-credit',
      });
    }

    const buys = 1 + Math.round(random() * 2);
    for (let index = 0; index < buys; index += 1) {
      add(month, lastDay, {
        title: SHOPPING_TITLES[index % SHOPPING_TITLES.length],
        amount: between(700, 5400),
        type: 'expense',
        category: 'Shopping',
        day: 5 + Math.floor(random() * 22),
        account: 'acc-credit',
      });
    }

    if (random() > 0.35) {
      add(month, lastDay, {
        title: 'Pharmacy',
        amount: between(350, 2200),
        type: 'expense',
        category: 'Health',
        day: 6 + Math.floor(random() * 20),
        account: 'acc-savings',
      });
    }

    if (monthIndex === 2 || monthIndex === 4) {
      add(month, lastDay, {
        title: 'Weekend train tickets',
        amount: between(3200, 9800),
        type: 'expense',
        category: 'Travel',
        day: 16 + Math.floor(random() * 8),
        account: 'acc-credit',
      });
    }

    add(month, lastDay, {
      title: 'Transfer to wallet',
      amount: 6000,
      type: 'transfer',
      day: 14,
      account: 'acc-savings',
      transferTo: 'acc-cash',
      note: 'Monthly cash top-up',
    });
  });

  const budgetLimits = {
    'Food & Dining': 6500,
    Groceries: 9000,
    Transport: 3500,
    Housing: 24000,
    Utilities: 4000,
    Entertainment: 3500,
    Shopping: 8000,
    Subscriptions: 1800,
  };

  months.forEach((month, monthIndex) => {
    Object.entries(budgetLimits).forEach(([name, amount], index) => {
      store.budgets.push({
        id: `budget-${month}-${index}`,
        ownerId: DEMO_USER_ID,
        categoryId: categoryId(name),
        amount,
        month,
        createdAt: `${month}-01T09:00:00.000Z`,
      });
    });
  });

  return store;
}

/* ------------------------------------------------------------------ serialise */

function categoryPublic(category) {
  if (!category) return null;
  return {
    id: category.id,
    name: category.name,
    type: category.type,
    color: category.color,
    icon: category.icon,
    isDefault: Boolean(category.isDefault),
    createdAt: category.createdAt,
  };
}

function accountBrief(account) {
  if (!account) return null;
  return { id: account.id, name: account.name, kind: account.kind, color: account.color, icon: account.icon };
}

function transactionPublic(store, transaction) {
  const category = store.categories.find((entry) => entry.id === transaction.categoryId);
  const account = store.accounts.find((entry) => entry.id === transaction.accountId);
  const transferTo = store.accounts.find((entry) => entry.id === transaction.transferToId);

  return {
    id: transaction.id,
    title: transaction.title,
    amount: round2(transaction.amount),
    type: transaction.type,
    note: transaction.note ?? '',
    date: transaction.date,
    category: categoryPublic(category),
    account: accountBrief(account),
    transferTo: accountBrief(transferTo),
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt ?? transaction.createdAt,
  };
}

function spentFor(store, userId, month, categoryId) {
  return round2(
    store.transactions
      .filter(
        (transaction) =>
          transaction.ownerId === userId &&
          transaction.type === 'expense' &&
          transaction.categoryId === categoryId &&
          transaction.date.slice(0, 7) === month,
      )
      .reduce((total, transaction) => total + transaction.amount, 0),
  );
}

function budgetPublic(store, budget) {
  const category = store.categories.find((entry) => entry.id === budget.categoryId);
  const spent = spentFor(store, budget.ownerId, budget.month, budget.categoryId);
  const amount = round2(budget.amount);
  return {
    id: budget.id,
    month: budget.month,
    amount,
    spent,
    remaining: round2(amount - spent),
    percentUsed: amount > 0 ? round1((spent / amount) * 100) : 0,
    category: category ? { id: category.id, name: category.name, color: category.color, icon: category.icon } : null,
  };
}

/* ------------------------------------------------------------------- reports */

function totalsOf(transactions) {
  let income = 0;
  let expense = 0;
  let transferCount = 0;

  transactions.forEach((transaction) => {
    if (transaction.type === 'income') income += transaction.amount;
    else if (transaction.type === 'expense') expense += transaction.amount;
    else if (transaction.type === 'transfer') transferCount += 1;
  });

  return {
    income: round2(income),
    expense: round2(expense),
    net: round2(income - expense),
    savingsRate: income > 0 ? round3((income - expense) / income) : 0,
    transactionCount: transactions.length,
    transferCount,
  };
}

function breakdownOf(store, transactions, type) {
  const grouped = new Map();

  transactions
    .filter((transaction) => transaction.type === type)
    .forEach((transaction) => {
      const category = store.categories.find((entry) => entry.id === transaction.categoryId);
      const key = category?.id ?? 'uncategorised';
      const entry = grouped.get(key) ?? {
        categoryId: key,
        name: category?.name ?? 'Uncategorised',
        color: category?.color ?? '#64748b',
        icon: category?.icon ?? 'tag',
        total: 0,
        count: 0,
      };
      entry.total = round2(entry.total + transaction.amount);
      entry.count += 1;
      grouped.set(key, entry);
    });

  const rows = [...grouped.values()].sort((a, b) => b.total - a.total);
  const total = rows.reduce((sum, row) => sum + row.total, 0);

  return rows.map((row) => ({
    ...row,
    percent: total > 0 ? round1((row.total / total) * 100) : 0,
  }));
}

function accountsSummary(store, userId) {
  const accounts = store.accounts.filter((account) => account.ownerId === userId);
  const byKind = new Map(
    ACCOUNT_KIND_ORDER.map((kind) => [kind, { kind, label: ACCOUNT_KIND_LABELS[kind], balance: 0, count: 0 }]),
  );
  const totals = { cash: 0, savings: 0, investments: 0, credit: 0, netWorth: 0 };
  const transactions = store.transactions.filter((transaction) => transaction.ownerId === userId);

  accounts.forEach((account) => {
    let balance = Number(account.openingBalance) || 0;

    transactions.forEach((transaction) => {
      if (transaction.accountId === account.id) {
        if (transaction.type === 'income') balance += transaction.amount;
        else if (transaction.type === 'expense') balance -= transaction.amount;
        else if (transaction.type === 'transfer') balance -= transaction.amount;
      }
      if (transaction.transferToId === account.id) balance += transaction.amount;
    });

    balance = round2(balance);
    totals.netWorth = round2(totals.netWorth + balance);

    const bucket = byKind.get(account.kind);
    if (bucket) {
      bucket.balance = round2(bucket.balance + balance);
      bucket.count += 1;
    }

    if (account.kind === 'cash') totals.cash = round2(totals.cash + balance);
    else if (account.kind === 'savings') totals.savings = round2(totals.savings + balance);
    else if (account.kind === 'investment') totals.investments = round2(totals.investments + balance);
    else if (account.kind === 'credit') totals.credit = round2(totals.credit + balance);
  });

  return {
    netWorth: totals.netWorth,
    cash: totals.cash,
    savings: totals.savings,
    investments: totals.investments,
    credit: totals.credit,
    totalBalance: round2(totals.cash + totals.savings + totals.investments),
    accountCount: accounts.length,
    byKind: ACCOUNT_KIND_ORDER.map((kind) => byKind.get(kind)),
  };
}

function overviewFor(store, userId, month) {
  const previousMonth = shiftMonthKey(month, -1);
  const transactions = store.transactions.filter((transaction) => transaction.ownerId === userId);
  const currentRows = transactions.filter((transaction) => transaction.date.slice(0, 7) === month);
  const previousRows = transactions.filter((transaction) => transaction.date.slice(0, 7) === previousMonth);

  const totals = totalsOf(currentRows);
  const previous = totalsOf(previousRows);

  const expenseRows = currentRows.filter((transaction) => transaction.type === 'expense');
  const previousExpenses = previousRows.filter((transaction) => transaction.type === 'expense');
  const comparisonMap = new Map();

  expenseRows.forEach((transaction) => {
    const entry = comparisonMap.get(transaction.categoryId) ?? { thisMonth: 0, lastMonth: 0, transactions: 0 };
    entry.thisMonth += transaction.amount;
    entry.transactions += 1;
    comparisonMap.set(transaction.categoryId, entry);
  });
  previousExpenses.forEach((transaction) => {
    const entry = comparisonMap.get(transaction.categoryId) ?? { thisMonth: 0, lastMonth: 0, transactions: 0 };
    entry.lastMonth += transaction.amount;
    comparisonMap.set(transaction.categoryId, entry);
  });

  const categoryComparison = [...comparisonMap.entries()]
    .map(([categoryIdValue, entry]) => {
      const category = store.categories.find((item) => item.id === categoryIdValue);
      return {
        categoryId: categoryIdValue,
        name: category?.name ?? 'Uncategorised',
        color: category?.color ?? '#64748b',
        icon: category?.icon ?? 'tag',
        thisMonth: round2(entry.thisMonth),
        lastMonth: round2(entry.lastMonth),
        transactions: entry.transactions,
      };
    })
    .sort((a, b) => b.thisMonth - a.thisMonth)
    .slice(0, 10);

  const daily = Array.from({ length: daysInMonth(month) }, (_, index) => {
    const date = `${month}-${pad2(index + 1)}`;
    let income = 0;
    let expense = 0;
    currentRows.forEach((transaction) => {
      if (transaction.date.slice(0, 10) !== date) return;
      if (transaction.type === 'income') income += transaction.amount;
      if (transaction.type === 'expense') expense += transaction.amount;
    });
    return { date, income: round2(income), expense: round2(expense) };
  });

  const monthlyTrend = Array.from({ length: 6 }, (_, index) => {
    const key = shiftMonthKey(month, index - 5);
    const rows = transactions.filter((transaction) => transaction.date.slice(0, 7) === key);
    const monthTotals = totalsOf(rows);
    return {
      month: key,
      income: monthTotals.income,
      expense: monthTotals.expense,
      net: monthTotals.net,
    };
  });

  const recent = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)))
    .slice(0, 8)
    .map((transaction) => transactionPublic(store, transaction));

  const topExpenses = [...expenseRows]
    .sort((a, b) => b.amount - a.amount || String(a.id).localeCompare(String(b.id)))
    .slice(0, 5)
    .map((transaction) => {
      const category = store.categories.find((entry) => entry.id === transaction.categoryId);
      return {
        id: transaction.id,
        title: transaction.title,
        amount: round2(transaction.amount),
        date: transaction.date,
        category: {
          name: category?.name ?? 'Uncategorised',
          color: category?.color ?? '#64748b',
        },
      };
    });

  return {
    month,
    totals,
    previous: { income: previous.income, expense: previous.expense, net: previous.net },
    categoryBreakdown: breakdownOf(store, currentRows, 'expense'),
    incomeBreakdown: breakdownOf(store, currentRows, 'income'),
    categoryComparison,
    accounts: accountsSummary(store, userId),
    daily,
    monthlyTrend,
    recent,
    topExpenses,
  };
}

/* --------------------------------------------------------------------- router */

class DemoHttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function parseBody(data) {
  if (!data) return {};
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
  return data;
}

function requireUser(store) {
  const token = readToken();
  if (!token || !token.startsWith('demo.')) {
    throw new DemoHttpError(401, 'Session expired, please sign in again');
  }
  const user = store.users.find((entry) => entry.id === token.slice('demo.'.length));
  if (!user) {
    throw new DemoHttpError(401, 'Session expired, please sign in again');
  }
  return user;
}

function userPublic(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    currency: user.currency,
    createdAt: user.createdAt,
  };
}

function normalizeCategory(type, color, icon) {
  return {
    type: type === 'income' ? 'income' : 'expense',
    color: typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color) ? color : '#64748b',
    icon: typeof icon === 'string' && icon.trim() ? icon.trim() : 'tag',
  };
}

function createUser(store, { name, email, password }) {
  const cleanName = String(name ?? '').trim();
  const cleanEmail = String(email ?? '').trim().toLowerCase();

  if (cleanName.length < 2) {
    throw new DemoHttpError(400, 'Validation failed', ['Name needs at least 2 characters']);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
    throw new DemoHttpError(400, 'Validation failed', ['Enter a valid email address']);
  }
  if (String(password ?? '').length < 8) {
    throw new DemoHttpError(400, 'Validation failed', ['Password must be at least 8 characters']);
  }
  if (store.users.some((user) => user.email === cleanEmail)) {
    throw new DemoHttpError(409, 'An account with this email already exists');
  }

  const user = {
    id: uid('user'),
    name: cleanName,
    email: cleanEmail,
    currency: 'INR',
    createdAt: new Date().toISOString(),
    passwordHash: hashPassword(String(password)),
  };

  store.users.push(user);
  store.categories.push(...categoriesFor(user.id));
  return user;
}

function routeRequest(store, method, pathname, params, body) {
  const segments = pathname.split('/').filter(Boolean);
  const [resource, second, third] = segments;

  if (resource === 'auth') {
    if (second === 'register' && method === 'POST') {
      const user = createUser(store, body);
      return { status: 201, data: { token: `demo.${user.id}`, user: userPublic(user) } };
    }

    if (second === 'login' && method === 'POST') {
      const email = String(body.email ?? '').trim().toLowerCase();
      const user = store.users.find((entry) => entry.email === email);
      if (!user || user.passwordHash !== hashPassword(String(body.password ?? ''))) {
        throw new DemoHttpError(401, 'Email or password is incorrect');
      }
      return { data: { token: `demo.${user.id}`, user: userPublic(user) } };
    }

    if (second === 'me' && method === 'GET') {
      return { data: { user: userPublic(requireUser(store)) } };
    }

    if (second === 'me' && method === 'PATCH') {
      const user = requireUser(store);
      if (body.name !== undefined) {
        const name = String(body.name).trim();
        if (name.length < 2) {
          throw new DemoHttpError(400, 'Validation failed', ['Name needs at least 2 characters']);
        }
        user.name = name;
      }
      if (body.currency !== undefined) {
        const currency = String(body.currency).trim().toUpperCase();
        if (!/^[A-Z]{3}$/.test(currency)) {
          throw new DemoHttpError(400, 'Validation failed', ['Choose a three letter currency code']);
        }
        user.currency = currency;
      }
      return { data: { user: userPublic(user) } };
    }

    if (second === 'change-password' && method === 'POST') {
      const user = requireUser(store);
      if (user.passwordHash !== hashPassword(String(body.currentPassword ?? ''))) {
        throw new DemoHttpError(400, 'Current password is incorrect');
      }
      if (String(body.newPassword ?? '').length < 8) {
        throw new DemoHttpError(400, 'Validation failed', ['Password must be at least 8 characters']);
      }
      user.passwordHash = hashPassword(String(body.newPassword));
      return { data: { message: 'Password changed successfully' } };
    }

    throw new DemoHttpError(404, 'Not found');
  }

  if (resource === 'categories') {
    if (method === 'GET') {
      const user = requireUser(store);
      const rows = store.categories
        .filter((category) => category.ownerId === user.id)
        .filter((category) => (params.type ? category.type === params.type : true))
        .map(categoryPublic);
      return { data: { data: rows } };
    }

    if (method === 'POST') {
      const user = requireUser(store);
      const name = String(body.name ?? '').trim();
      if (name.length < 2) {
        throw new DemoHttpError(400, 'Validation failed', ['Use at least 2 characters']);
      }
      const exists = store.categories.some(
        (category) => category.ownerId === user.id && category.name.toLowerCase() === name.toLowerCase(),
      );
      if (exists) {
        throw new DemoHttpError(409, `You already have a category named "${name}"`);
      }
      const normalized = normalizeCategory(body.type, body.color, body.icon);
      const category = {
        id: uid('cat'),
        ownerId: user.id,
        name,
        isDefault: false,
        createdAt: new Date().toISOString(),
        ...normalized,
      };
      store.categories.push(category);
      return { status: 201, data: { category: categoryPublic(category) } };
    }

    throw new DemoHttpError(404, 'Not found');
  }

  if (resource === 'transactions') {
    const user = requireUser(store);

    if (method === 'GET' && !second) {
      const { type, categoryId, search, from, to, sort = '-date' } = params;
      let rows = store.transactions.filter((transaction) => transaction.ownerId === user.id);

      if (type) rows = rows.filter((transaction) => transaction.type === type);
      if (categoryId) rows = rows.filter((transaction) => transaction.categoryId === categoryId);
      if (search) {
        const needle = String(search).toLowerCase();
        rows = rows.filter(
          (transaction) =>
            transaction.title.toLowerCase().includes(needle) ||
            String(transaction.note ?? '').toLowerCase().includes(needle),
        );
      }
      if (from) rows = rows.filter((transaction) => transaction.date.slice(0, 10) >= from);
      if (to) rows = rows.filter((transaction) => transaction.date.slice(0, 10) <= to);

      rows = [...rows].sort((a, b) => {
        if (sort === 'amount') return a.amount - b.amount;
        if (sort === '-amount') return b.amount - a.amount;
        if (sort === 'date') return a.date.localeCompare(b.date) || String(a.id).localeCompare(String(b.id));
        return b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id));
      });

      const limit = Math.min(Math.max(Number(params.limit) || 20, 1), 100);
      const page = Math.max(Number(params.page) || 1, 1);
      const total = rows.length;

      return {
        data: {
          data: rows.slice((page - 1) * limit, page * limit).map((transaction) => transactionPublic(store, transaction)),
          total,
          page,
          limit,
          pages: Math.max(1, Math.ceil(total / limit)),
        },
      };
    }

    if (method === 'POST' && !second) {
      const category = store.categories.find(
        (entry) => entry.id === body.categoryId && entry.ownerId === user.id,
      );
      if (!category) throw new DemoHttpError(400, 'Choose a valid category');
      if (category.type !== body.type) {
        throw new DemoHttpError(400, `Category "${category.name}" does not match the entry type`);
      }

      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new DemoHttpError(400, 'Validation failed', ['Enter an amount greater than zero']);
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.date ?? ''))) {
        throw new DemoHttpError(400, 'Validation failed', ['Date must be YYYY-MM-DD']);
      }

      const transaction = {
        id: uid('tx'),
        ownerId: user.id,
        title: String(body.title ?? '').trim(),
        amount: round2(amount),
        type: body.type,
        note: String(body.note ?? '').slice(0, 280),
        categoryId: category.id,
        accountId: body.accountId ?? null,
        transferToId: null,
        date: `${body.date}T12:00:00.000Z`,
        createdAt: new Date().toISOString(),
      };
      store.transactions.push(transaction);
      return { status: 201, data: { transaction: transactionPublic(store, transaction) } };
    }

    if ((method === 'PATCH' || method === 'DELETE') && second) {
      const transaction = store.transactions.find(
        (entry) => entry.id === second && entry.ownerId === user.id,
      );
      if (!transaction) throw new DemoHttpError(404, 'Transaction not found');

      if (method === 'DELETE') {
        store.transactions = store.transactions.filter((entry) => entry.id !== transaction.id);
        return { status: 204, data: null };
      }

      if (body.categoryId) {
        const category = store.categories.find(
          (entry) => entry.id === body.categoryId && entry.ownerId === user.id,
        );
        if (!category) throw new DemoHttpError(400, 'Choose a valid category');
        if (body.type && category.type !== body.type) {
          throw new DemoHttpError(400, `Category "${category.name}" does not match the entry type`);
        }
        transaction.categoryId = category.id;
      }
      if (body.title !== undefined) transaction.title = String(body.title).trim();
      if (body.amount !== undefined) transaction.amount = round2(body.amount);
      if (body.type !== undefined) transaction.type = body.type;
      if (body.note !== undefined) transaction.note = String(body.note).slice(0, 280);
      if (body.date !== undefined) transaction.date = `${body.date}T12:00:00.000Z`;
      transaction.updatedAt = new Date().toISOString();

      return { data: { transaction: transactionPublic(store, transaction) } };
    }

    throw new DemoHttpError(404, 'Not found');
  }

  if (resource === 'budgets') {
    const user = requireUser(store);

    if (method === 'GET' && second === 'summary') {
      const month = params.month;
      const budgets = store.budgets.filter((budget) => budget.ownerId === user.id && budget.month === month);
      const budgeted = round2(budgets.reduce((total, budget) => total + budget.amount, 0));
      const spent = round2(
        budgets.reduce(
          (total, budget) => total + spentFor(store, user.id, month, budget.categoryId),
          0,
        ),
      );
      return { data: { month, budgeted, spent, remaining: round2(budgeted - spent) } };
    }

    if (method === 'GET' && !second) {
      const month = params.month;
      const rows = store.budgets
        .filter((budget) => budget.ownerId === user.id && budget.month === month)
        .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
        .map((budget) => budgetPublic(store, budget));
      return { data: { data: rows, month } };
    }

    if (method === 'POST' && !second) {
      const category = store.categories.find(
        (entry) => entry.id === body.categoryId && entry.ownerId === user.id,
      );
      if (!category) throw new DemoHttpError(404, 'Category not found');
      if (category.type !== 'expense') {
        throw new DemoHttpError(400, `Budgets can only be set on expense categories, "${category.name}" is income`);
      }
      if (store.budgets.some((budget) => budget.ownerId === user.id && budget.categoryId === category.id && budget.month === body.month)) {
        throw new DemoHttpError(409, `A budget for "${category.name}" already exists in ${body.month}`);
      }
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new DemoHttpError(400, 'Validation failed', ['Enter an amount greater than zero']);
      }

      const budget = {
        id: uid('budget'),
        ownerId: user.id,
        categoryId: category.id,
        amount: round2(amount),
        month: body.month,
        createdAt: new Date().toISOString(),
      };
      store.budgets.push(budget);
      return { status: 201, data: { budget: budgetPublic(store, budget) } };
    }

    if ((method === 'PATCH' || method === 'DELETE') && second) {
      const budget = store.budgets.find((entry) => entry.id === second && entry.ownerId === user.id);
      if (!budget) throw new DemoHttpError(404, 'Budget not found');

      if (method === 'DELETE') {
        store.budgets = store.budgets.filter((entry) => entry.id !== budget.id);
        return { status: 204, data: null };
      }

      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new DemoHttpError(400, 'Validation failed', ['Enter an amount greater than zero']);
      }
      budget.amount = round2(amount);
      return { data: { budget: budgetPublic(store, budget) } };
    }

    throw new DemoHttpError(404, 'Not found');
  }

  if (resource === 'stats' && second === 'overview' && method === 'GET') {
    const user = requireUser(store);
    return { data: overviewFor(store, user.id, params.month) };
  }

  throw new DemoHttpError(404, 'Not found');
}

function toAxiosError(config, error) {
  const response = {
    data: {
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    },
    status: error.status,
    statusText: '',
    headers: {},
    config,
  };
  const wrapped = new Error(error.message);
  wrapped.config = config;
  wrapped.response = response;
  wrapped.isAxiosError = true;
  return wrapped;
}

async function demoAdapter(config) {
  const method = String(config.method ?? 'get').toUpperCase();
  const base = String(config.baseURL ?? '');
  let path = String(config.url ?? '');
  if (base && path.startsWith(base)) {
    path = path.slice(base.length);
  }
  const pathname = path.split('?')[0].replace(/\/+$/, '') || '/';
  const params = config.params ?? {};
  const body = parseBody(config.data);

  const store = readStore();

  try {
    const result = routeRequest(store, method, pathname, params, body);
    writeStore(store);
    return {
      data: result.data,
      status: result.status ?? 200,
      statusText: 'OK',
      headers: {},
      config,
      request: {},
    };
  } catch (error) {
    if (error instanceof DemoHttpError) {
      throw toAxiosError(config, error);
    }
    throw error;
  }
}

export function installDemoApi() {
  if (!isDemoMode()) return;

  const store = readStore();
  api.defaults.baseURL = '';
  api.defaults.adapter = demoAdapter;

  const token = readToken();
  if (!token || !token.startsWith('demo.')) {
    const demoUser = store.users.find((user) => user.id === DEMO_USER_ID);
    if (demoUser) {
      writeToken(`demo.${demoUser.id}`);
    }
  }
}

export const DEMO_CREDENTIALS = { email: DEMO_EMAIL, password: DEMO_PASSWORD };
