import mongoose from 'mongoose';
import { assertEnv } from '../src/config/env.js';
import { connectDatabase } from '../src/config/db.js';
import { DEFAULT_CATEGORIES } from '../src/config/defaultCategories.js';
import { User } from '../src/models/User.js';
import { Category } from '../src/models/Category.js';
import { Transaction } from '../src/models/Transaction.js';
import { Budget } from '../src/models/Budget.js';
import { Account } from '../src/models/Account.js';
import { Payment, nextDueDateFor } from '../src/models/Payment.js';
import { accountDeltas, balanceOf } from '../src/utils/accountBalances.js';
import { currentMonth, daysInMonth } from '../src/utils/dates.js';
import { money } from '../src/utils/format.js';

const DEMO_EMAIL = 'demo@spendsense.app';
const DEMO_PASSWORD = 'demo1234';
const DEMO_NAME = 'Demo Explorer';

const args = process.argv.slice(2);
const targetEmail = (
  args.find((arg) => arg.startsWith('--email='))?.slice('--email='.length) || DEMO_EMAIL
).toLowerCase();
const keepExisting = args.includes('--keep');

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(20261106);

function between(min, max) {
  return min + random() * (max - min);
}

function intBetween(min, max) {
  return Math.floor(between(min, max + 1));
}

function pick(list) {
  return list[Math.floor(random() * list.length)];
}

function chance(probability) {
  return random() < probability;
}

const MENU = {
  'Food & Dining': [
    'Dinner at Punjab Grill',
    'Weekend brunch at Cafe Co',
    'Biryani with friends',
    'Sushi night',
    'Lunch at Swati Snacks',
    'Pizza delivery',
    'Coffee and pastries',
    'Rooftop dinner',
    'Thali at Adarsh',
  ],
  Groceries: [
    'Weekly BigBasket order',
    'Fresh vegetables and fruit',
    'Atta, rice and dal refill',
    'Milk, curd and eggs',
    'Detergent and household supplies',
    'Organic store run',
  ],
  Transport: [
    'Uber to office',
    'Metro card top-up',
    'Fuel refill',
    'Airport cab',
    'Auto rides for the week',
    'Car wash and service',
  ],
  Housing: ['Monthly rent'],
  Utilities: [
    'Electricity bill',
    'Broadband recharge',
    'Mobile postpaid bill',
    'Water supply bill',
    'Gas cylinder',
  ],
  Health: ['Pharmacy order', 'Dental check-up', 'Gym membership', 'Doctor consultation', 'Monthly vitamins'],
  Entertainment: [
    'Cinema tickets',
    'Concert passes',
    'Bowling night',
    'Stand-up comedy show',
    'Weekend movie marathon',
  ],
  Shopping: [
    'Running shoes',
    'Monitors and cable order',
    'Kurta set for wedding',
    'Kitchen storage boxes',
    'Headphones',
  ],
  Education: ['Udemy course', 'Tech magazine bundle', 'Certification exam fee', 'Kindle books'],
  Travel: ['Goa weekend trip', 'Weekend hill station drive', 'Train tickets home', 'Hotel stay in Jaipur'],
  Subscriptions: ['Netflix family plan', 'Spotify premium', 'YouTube Premium', 'iCloud storage', 'Prime membership'],
  Other: ['Gift for cousin', 'Donation to trust', 'Miscellaneous expenses'],
  Salary: ['Monthly salary credit'],
  Freelance: ['Freelance landing page project', 'Consulting retainer', 'App design gig', 'Code review contract'],
  Investments: ['Dividend payout', 'Mutual fund SIP returns', 'Stock dividend'],
  Gifts: ['Cash gift received', 'Birthday gift money'],
  'Other Income': ['Sold old phone', 'Reimbursement received', 'Auction sale of bicycle'],
};

function weekendDays(year, month) {
  const total = daysInMonth(`${year}-${String(month).padStart(2, '0')}`);
  const days = [];
  for (let day = 1; day <= total; day += 1) {
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    if (weekday === 0 || weekday === 5 || weekday === 6) days.push(day);
  }
  return days;
}

function anyDay(maxDay) {
  return intBetween(1, maxDay);
}

function upsertCategories(ownerId) {
  return Promise.all(
    DEFAULT_CATEGORIES.map((category) =>
      Category.updateOne(
        { owner: ownerId, nameLower: category.name.toLowerCase(), type: category.type },
        {
          $set: {
            name: category.name,
            nameLower: category.name.toLowerCase(),
            color: category.color,
            icon: category.icon,
            isDefault: true,
          },
        },
        { upsert: true }
      )
    )
  );
}

function buildMonthTransactions({ year, month, maxDay, byName, accounts, rows }) {
  const dateFor = (day) => new Date(Date.UTC(year, month - 1, Math.min(day, maxDay)));
  const weekends = weekendDays(year, month).filter((day) => day <= maxDay);
  const fallbackWeekends = weekends.length ? weekends : [anyDay(maxDay)];

  const add = (categoryName, type, title, amount, day, note = '') => {
    const category = byName.get(`${type}:${categoryName.toLowerCase()}`);
    if (!category) throw new Error(`Missing seeded category ${type}/${categoryName}`);
    rows.push({
      owner: category.owner,
      type,
      category: category._id,
      account: accountFor({ type, categoryName, title, accounts }),
      title,
      amount: money(amount),
      note,
      date: dateFor(day),
    });
  };

  add('Salary', 'income', pick(MENU.Salary), money(between(84000, 88000)), Math.min(1, maxDay), 'credited by employer');
  if (maxDay >= 2) add('Housing', 'expense', MENU.Housing[0], 22000, 2, 'flat rent, 2BHK Andheri');
  if (maxDay >= 5) add('Utilities', 'expense', 'Electricity bill', between(1650, 2650), 5);
  if (maxDay >= 7) add('Subscriptions', 'expense', 'Netflix family plan', 649, 7);
  if (maxDay >= 8) add('Subscriptions', 'expense', 'Spotify premium', 119, 8);
  if (maxDay >= 12) add('Utilities', 'expense', 'Broadband recharge', 999, 12);
  if (maxDay >= 15) add('Utilities', 'expense', 'Mobile postpaid bill', 499, 15);

  for (let index = 0; index < intBetween(4, 5); index += 1) {
    add('Groceries', 'expense', pick(MENU.Groceries), between(780, 2850), anyDay(maxDay));
  }

  const diningCount = intBetween(7, 9);
  for (let index = 0; index < diningCount; index += 1) {
    const day = index < 5 ? pick(fallbackWeekends) : anyDay(maxDay);
    add('Food & Dining', 'expense', pick(MENU['Food & Dining']), between(320, 1680), day);
  }

  for (let index = 0; index < intBetween(4, 6); index += 1) {
    add('Transport', 'expense', pick(MENU.Transport), between(110, 720), anyDay(maxDay));
  }

  for (let index = 0; index < intBetween(2, 3); index += 1) {
    add('Entertainment', 'expense', pick(MENU.Entertainment), between(380, 1550), pick(fallbackWeekends));
  }

  for (let index = 0; index < intBetween(1, 3); index += 1) {
    add('Shopping', 'expense', pick(MENU.Shopping), between(790, 4600), anyDay(maxDay));
  }

  for (let index = 0; index < intBetween(1, 2); index += 1) {
    add('Health', 'expense', pick(MENU.Health), between(420, 2300), anyDay(maxDay));
  }

  if (chance(0.7)) add('Education', 'expense', pick(MENU.Education), between(1200, 6200), anyDay(maxDay));
  if (chance(0.45)) add('Travel', 'expense', pick(MENU.Travel), between(3200, 15800), anyDay(maxDay));
  if (chance(0.6)) add('Other', 'expense', pick(MENU.Other), between(300, 2600), anyDay(maxDay));

  for (let index = 0; index < intBetween(1, 2); index += 1) {
    add('Freelance', 'income', pick(MENU.Freelance), between(8500, 26500), anyDay(maxDay), 'side project invoice');
  }
  if (chance(0.5)) add('Investments', 'income', pick(MENU.Investments), between(1200, 6800), anyDay(maxDay));
  if (chance(0.35)) add('Gifts', 'income', pick(MENU.Gifts), between(1000, 5000), anyDay(maxDay));
  if (chance(0.35)) add('Other Income', 'income', pick(MENU['Other Income']), between(900, 4200), anyDay(maxDay));
}

const ACCOUNT_PLAN = [
  {
    name: 'Salary Account',
    kind: 'cash',
    openingBalance: 0,
    color: '#22c55e',
    icon: 'banknote',
    note: 'Primary account, salary in and big fixed bills out',
  },
  {
    name: 'Everyday Wallet',
    kind: 'cash',
    openingBalance: 140000,
    color: '#06b6d4',
    icon: 'wallet',
    note: 'Pre-funded UPI float for day-to-day spending',
  },
  {
    name: 'Emergency Fund',
    kind: 'savings',
    openingBalance: 250000,
    color: '#f59e0b',
    icon: 'shield-check',
    note: 'Six months of expenses, monthly auto top-up',
  },
  {
    name: 'Fixed Deposit',
    kind: 'savings',
    openingBalance: 150000,
    color: '#8b5cf6',
    icon: 'lock',
    note: 'Bank FD maturing in 2027',
  },
  {
    name: 'Index Funds',
    kind: 'investment',
    openingBalance: 180000,
    color: '#6366f1',
    icon: 'trending-up',
    note: 'Nifty 50 index mutual fund',
  },
  {
    name: 'Credit Card',
    kind: 'credit',
    openingBalance: -15000,
    color: '#ef4444',
    icon: 'credit-card',
    note: 'HDFC Infinia, bill carried forward',
  },
];

const SALARY_ACCOUNT = 'salary account';
const WALLET_ACCOUNT = 'everyday wallet';
const CARD_ACCOUNT = 'credit card';

const CARD_TITLES = new Set(['Headphones', 'Monitors and cable order', 'Running shoes']);

function accountFor({ type, categoryName, title, accounts }) {
  const key = categoryName.toLowerCase();
  if (type === 'income') {
    if (key === 'investments') return accounts.get('index funds')?._id ?? null;
    return accounts.get(SALARY_ACCOUNT)?._id ?? null;
  }
  if (key === 'shopping' && CARD_TITLES.has(title)) return accounts.get(CARD_ACCOUNT)?._id ?? null;
  if (
    key === 'housing' ||
    key === 'utilities' ||
    key === 'subscriptions' ||
    key === 'health' ||
    key === 'education' ||
    key === 'travel' ||
    key === 'other'
  ) {
    return accounts.get(SALARY_ACCOUNT)?._id ?? null;
  }
  return accounts.get(WALLET_ACCOUNT)?._id ?? null;
}

const TRANSFER_PLAN = [
  { title: 'Emergency fund auto top-up', destination: 'emergency fund', amount: 6000, day: 3 },
  { title: 'Index fund monthly SIP', destination: 'index funds', amount: 8000, day: 20 },
];

function buildMonthTransfers({ year, month, maxDay, accounts, owner, rows }) {
  const source = accounts.get(SALARY_ACCOUNT);
  if (!source) return;
  for (const plan of TRANSFER_PLAN) {
    const destination = accounts.get(plan.destination);
    if (!destination || plan.day > maxDay) continue;
    rows.push({
      owner,
      type: 'transfer',
      category: null,
      account: source._id,
      transferTo: destination._id,
      title: plan.title,
      amount: money(plan.amount),
      note: 'moved between own accounts',
      date: new Date(Date.UTC(year, month - 1, plan.day)),
    });
  }
}

const PAYMENT_PLAN = [
  {
    title: 'Flat rent',
    category: 'Housing',
    amount: 22000,
    frequency: 'monthly',
    dueDay: 2,
    account: SALARY_ACCOUNT,
    note: '2BHK in Andheri, paid to landlord',
    paidDaysAgo: 30,
  },
  {
    title: 'Electricity bill',
    category: 'Utilities',
    amount: 1800,
    frequency: 'monthly',
    dueDay: 8,
    account: SALARY_ACCOUNT,
    note: 'Adani Electricity',
    paidDaysAgo: 22,
  },
  {
    title: 'Weekly grocery budget',
    category: 'Groceries',
    amount: 2200,
    frequency: 'weekly',
    dueDay: 3,
    account: WALLET_ACCOUNT,
    note: 'BigBasket + local vendor',
  },
  {
    title: 'Netflix family plan',
    category: 'Subscriptions',
    amount: 649,
    frequency: 'monthly',
    dueDay: 15,
    account: WALLET_ACCOUNT,
    note: 'Shared with two flatmates',
    dueOffsetDays: 1,
  },
  {
    title: 'Mobile postpaid bill',
    category: 'Utilities',
    amount: 499,
    frequency: 'monthly',
    dueDay: 6,
    account: SALARY_ACCOUNT,
    note: 'Jio postpaid',
    dueOffsetDays: -4,
    paidDaysAgo: 34,
  },
  {
    title: 'Cloud storage annual plan',
    category: 'Subscriptions',
    amount: 1499,
    frequency: 'yearly',
    dueDay: 12,
    account: CARD_ACCOUNT,
    note: 'iCloud 2TB, renews once a year',
  },
  {
    title: 'Certification cohort fee',
    category: 'Education',
    amount: 1499,
    frequency: 'quarterly',
    dueDay: 21,
    account: SALARY_ACCOUNT,
    note: 'Cloud architecture course, billed quarterly',
  },
  {
    title: 'Gym membership',
    category: 'Health',
    amount: 1200,
    frequency: 'monthly',
    dueDay: 28,
    account: WALLET_ACCOUNT,
    note: 'Paused while travelling',
    isActive: false,
  },
];

function daysFromToday(offset) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset));
}

async function upsertAccounts(ownerId) {
  await Promise.all(
    ACCOUNT_PLAN.map((account) =>
      Account.updateOne(
        { owner: ownerId, nameLower: account.name.toLowerCase() },
        {
          $set: {
            name: account.name,
            nameLower: account.name.toLowerCase(),
            kind: account.kind,
            openingBalance: account.openingBalance,
            color: account.color,
            icon: account.icon,
            note: account.note,
            isActive: true,
          },
        },
        { upsert: true }
      )
    )
  );
  const accounts = await Account.find({ owner: ownerId });
  return new Map(accounts.map((account) => [account.nameLower, account]));
}

async function upsertPayments({ ownerId, byName, accounts }) {
  const rows = PAYMENT_PLAN.map((plan) => {
    const category = byName.get(`expense:${plan.category.toLowerCase()}`);
    if (!category) throw new Error(`Missing seeded category expense/${plan.category}`);
    const account = accounts.get(plan.account) ?? null;
    return {
      plan,
      doc: {
        owner: ownerId,
        title: plan.title,
        amount: money(plan.amount),
        category: category._id,
        account: account ? account._id : null,
        frequency: plan.frequency,
        dueDay: plan.dueDay,
        isActive: plan.isActive ?? true,
        note: plan.note ?? '',
        lastPaidAt: plan.paidDaysAgo != null ? daysFromToday(-plan.paidDaysAgo) : null,
        nextDueAt:
          plan.dueOffsetDays != null
            ? daysFromToday(plan.dueOffsetDays)
            : nextDueDateFor(plan.frequency, plan.dueDay, new Date()),
      },
    };
  });

  await Promise.all(
    rows.map(({ doc }) =>
      Payment.updateOne({ owner: doc.owner, title: doc.title }, { $set: doc }, { upsert: true })
    )
  );

  return rows.length;
}

const BUDGET_PLAN = [
  ['Food & Dining', 9500],
  ['Groceries', 9000],
  ['Transport', 3200],
  ['Entertainment', 3500],
  ['Shopping', 6000],
  ['Utilities', 4000],
];

async function main() {
  assertEnv();
  await connectDatabase();

  let user = await User.findOne({ email: targetEmail });
  let createdUser = false;
  if (!user) {
    if (targetEmail !== DEMO_EMAIL) {
      throw new Error(`No account for ${targetEmail}. Register in the app first, then run the seed again.`);
    }
    user = await User.create({ name: DEMO_NAME, email: DEMO_EMAIL, password: DEMO_PASSWORD, currency: 'INR' });
    createdUser = true;
  }

  await upsertCategories(user._id);
  const categories = await Category.find({ owner: user._id }).sort({ nameLower: 1 });
  const byName = new Map(categories.map((category) => [`${category.type}:${category.nameLower}`, category]));

  const accounts = await upsertAccounts(user._id);

  const existingTransactions = await Transaction.countDocuments({ owner: user._id });
  const deletedTransactions = keepExisting
    ? 0
    : (await Transaction.deleteMany({ owner: user._id })).deletedCount;
  const deletedBudgets = keepExisting
    ? 0
    : (await Budget.deleteMany({ owner: user._id })).deletedCount;
  const shouldSeedTransactions = !keepExisting || existingTransactions < 30;

  const today = new Date();
  const nowYear = today.getUTCFullYear();
  const nowMonth = today.getUTCMonth() + 1;
  const nowDay = today.getUTCDate();

  const rows = [];
  if (shouldSeedTransactions) {
    for (let offset = 5; offset >= 0; offset -= 1) {
      const cursor = new Date(Date.UTC(nowYear, nowMonth - 1 - offset, 1));
      const year = cursor.getUTCFullYear();
      const month = cursor.getUTCMonth() + 1;
      const maxDay = offset === 0 ? nowDay : daysInMonth(`${year}-${String(month).padStart(2, '0')}`);
      buildMonthTransactions({ year, month, maxDay, byName, accounts, rows });
      buildMonthTransfers({ year, month, maxDay, accounts, owner: user._id, rows });
    }

    await Transaction.insertMany(rows, { ordered: false });
  }

  const paymentCount = await upsertPayments({ ownerId: user._id, byName, accounts });

  const month = currentMonth();
  const budgetDocs = [];
  for (const [name, amount] of BUDGET_PLAN) {
    const category = byName.get(`expense:${name.toLowerCase()}`);
    if (!category) continue;
    budgetDocs.push({ owner: user._id, category: category._id, month, amount });
  }
  if (keepExisting) {
    await Promise.all(
      budgetDocs.map((doc) =>
        Budget.updateOne(
          { owner: doc.owner, category: doc.category, month: doc.month },
          { $set: { amount: doc.amount } },
          { upsert: true }
        )
      )
    );
  } else {
    await Budget.insertMany(budgetDocs, { ordered: false });
  }

  const totals = await Transaction.aggregate([
    { $match: { owner: user._id } },
    { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);
  const summary = new Map(totals.map((row) => [row._id, row]));

  const monthRangeStart = new Date(`${month}-01T00:00:00.000Z`);
  const nextMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1));
  const monthTotals = await Transaction.aggregate([
    { $match: { owner: user._id, date: { $gte: monthRangeStart, $lt: nextMonth } } },
    { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);
  const monthSummary = new Map(monthTotals.map((row) => [row._id, row]));

  const transferRows = rows.filter((row) => row.type === 'transfer');
  const spentRows = rows.length - transferRows.length;

  const accountDocs = await Account.find({ owner: user._id }).sort({ nameLower: 1 });
  const deltas = await accountDeltas(user._id);
  const accountBalances = accountDocs.map((account) => ({
    account,
    balance: balanceOf(account, deltas.get(String(account._id))),
  }));
  const netWorth = accountBalances.reduce((total, entry) => total + entry.balance, 0);

  const paymentDocs = await Payment.find({ owner: user._id }).sort({ nextDueAt: 1 });
  const paymentViews = paymentDocs.map((payment) => payment.toPublicJSON({ reference: new Date() }));
  const statusCounts = paymentViews.reduce((counts, payment) => {
    counts[payment.status] = (counts[payment.status] ?? 0) + 1;
    return counts;
  }, {});

  console.log('');
  console.log('SpendSense seed complete');
  console.log('------------------------');
  console.log(`user              : ${user.email} (${createdUser ? 'created' : 'reused'})`);
  if (createdUser) console.log(`password          : ${DEMO_PASSWORD}`);
  console.log(`user id           : ${user._id}`);
  console.log(`categories        : ${categories.length} (defaults ensured)`);
  console.log(
    `transactions      : ${
      shouldSeedTransactions
        ? `${spentRows} inserted across 6 months`
        : 'skipped, sample history already present'
    }${keepExisting ? ` (kept ${existingTransactions} existing)` : ` (cleared ${deletedTransactions} old)`}`
  );
  console.log(`  income total    : ${summary.get('income')?.total ?? 0} (${summary.get('income')?.count ?? 0} rows)`);
  console.log(`  expense total   : ${summary.get('expense')?.total ?? 0} (${summary.get('expense')?.count ?? 0} rows)`);
  console.log(`accounts          : ${accountDocs.length} ensured (${ACCOUNT_PLAN.map((a) => a.name).join(', ')})`);
  for (const entry of accountBalances) {
    console.log(`  ${entry.account.name.padEnd(18)}: ${String(entry.account.kind).padEnd(10)} ${entry.balance}`);
  }
  console.log(`  net worth       : ${money(netWorth)}`);
  console.log(`transfers         : ${transferRows.length} inserted (never counted as income or expense)`);
  console.log(`  transfer total  : ${summary.get('transfer')?.total ?? 0} (${transferRows.length} rows)`);
  console.log(`payments          : ${paymentCount} ensured (overdue ${statusCounts.overdue ?? 0}, due ${statusCounts.due ?? 0}, upcoming ${statusCounts.upcoming ?? 0}, inactive ${statusCounts.inactive ?? 0})`);
  console.log(`budgets           : ${budgetDocs.length} for ${month} (${keepExisting ? 'upserted' : `cleared ${deletedBudgets} old`})`);
  console.log(`  ${month} income : ${monthSummary.get('income')?.total ?? 0}`);
  console.log(`  ${month} expense: ${monthSummary.get('expense')?.total ?? 0}`);
  console.log('');
  console.log(
    createdUser
      ? `login: curl -s localhost:4000/api/auth/login -H 'content-type: application/json' -d '{"email":"${DEMO_EMAIL}","password":"${DEMO_PASSWORD}"}'`
      : `account: ${user.email} (existing password unchanged)`
  );
  console.log('');

  await mongoose.connection.close();
}

main().catch((error) => {
  console.error('seed failed:', error);
  Promise.resolve()
    .then(() => mongoose.connection.close())
    .finally(() => process.exit(1));
});
