import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowUpRight,
  CircleAlert,
  PiggyBank,
  Plus,
  ReceiptText,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import BudgetProgressCompact from '../components/dashboard/BudgetProgressCompact.jsx';
import RecentActivity from '../components/dashboard/RecentActivity.jsx';
import SectionCard from '../components/dashboard/SectionCard.jsx';
import TopExpenses from '../components/dashboard/TopExpenses.jsx';
import CategoryDonut from '../components/charts/CategoryDonut.jsx';
import DailyTrendChart from '../components/charts/DailyTrendChart.jsx';
import MonthlyTrendChart from '../components/charts/MonthlyTrendChart.jsx';
import MonthPicker from '../components/MonthPicker.jsx';
import PageHeading from '../components/PageHeading.jsx';
import StatCard from '../components/StatCard.jsx';
import TransactionModal from '../components/transactions/TransactionModal.jsx';
import Button from '../components/ui/Button.jsx';
import Money from '../components/ui/Money.jsx';
import { useCategories } from '../hooks/useCategories.js';
import { useApi } from '../hooks/useApi.js';
import api, { unwrapList } from '../lib/api.js';
import { formatPercent, monthLabel, percentDelta, toMonthKey } from '../lib/format.js';

const ROUND_TWO = (value) => Math.round(Number(value) * 10) / 10;

function hasValues(rows, keys) {
  return rows.some((row) =>
    keys.some((key) => {
      const value = Number(row?.[key]);
      return Number.isFinite(value) && value !== 0;
    }),
  );
}

function previousSavingsRate(previous) {
  const income = Number(previous?.income);
  const expense = Number(previous?.expense);

  if (!Number.isFinite(income) || income <= 0) {
    return null;
  }

  return ROUND_TWO(((income - expense) / income) * 100);
}

export default function Dashboard() {
  const [month, setMonth] = useState(() => toMonthKey(new Date()));
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  const { categories, refetch: refetchCategories } = useCategories();

  const overview = useApi(
    ({ signal }) =>
      api.get('/stats/overview', { params: { month }, signal }).then((response) => response.data),
    [month],
  );

  const budgetCall = useApi(
    ({ signal }) =>
      api.get('/budgets', { params: { month }, signal }).then((response) => unwrapList(response.data)),
    [month],
  );

  const budgetSummary = useApi(
    ({ signal }) =>
      api
        .get('/budgets/summary', { params: { month }, signal })
        .then((response) => response.data),
    [month],
  );

  const data = overview.data;
  const totals = data?.totals ?? null;
  const previous = data?.previous ?? null;

  const daily = data?.daily ?? [];
  const categoryBreakdown = data?.categoryBreakdown ?? [];
  const monthlyTrend = data?.monthlyTrend ?? [];
  const recent = data?.recent ?? [];
  const topExpenses = data?.topExpenses ?? [];
  const budgets = budgetCall.data ?? [];

  const savingsRate = Number(totals?.savingsRate) * 100;
  const previousRate = previousSavingsRate(previous);
  const savingsDelta =
    Number.isFinite(savingsRate) && previousRate !== null
      ? ROUND_TWO(savingsRate - previousRate)
      : null;

  const transactionCount = Number(totals?.transactionCount) || 0;

  function openEdit(transaction) {
    setEditingTransaction(transaction);
    setModalOpen(true);
  }

  function openCreate() {
    setEditingTransaction(null);
    setModalOpen(true);
  }

  function handleSaved() {
    setModalOpen(false);
    setEditingTransaction(null);
    overview.refetch();
    budgetCall.refetch();
    budgetSummary.refetch();
  }

  return (
    <div className="space-y-6">
      <PageHeading
        title={`Overview for ${monthLabel(month)}`}
        description={
          transactionCount > 0
            ? `${transactionCount} ${transactionCount === 1 ? 'entry' : 'entries'} shaped this month.`
            : 'No entries recorded for this month yet.'
        }
        actions={
          <>
            <MonthPicker month={month} onChange={setMonth} />
            <Button onClick={openCreate}>
              <Plus size={16} aria-hidden="true" />
              Add transaction
            </Button>
          </>
        }
      />

      {overview.error ? (
        <div className="card flex flex-wrap items-center justify-between gap-3 border-rose-200 bg-rose-50/60 p-5">
          <p role="alert" className="flex items-center gap-2 text-sm text-rose-800">
            <CircleAlert size={16} aria-hidden="true" />
            {overview.error}
          </p>
          <Button variant="secondary" onClick={overview.refetch}>
            Try again
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Income"
          icon={TrendingUp}
          value={<Money value={totals?.income ?? 0} />}
          delta={percentDelta(totals?.income, previous?.income)}
        />
        <StatCard
          label="Expenses"
          icon={TrendingDown}
          value={<Money value={totals?.expense ?? 0} />}
          delta={percentDelta(totals?.expense, previous?.expense)}
          deltaGoodWhenHigher={false}
        />
        <StatCard
          label={Number(totals?.net ?? 0) >= 0 ? 'You saved' : 'Net loss'}
          icon={PiggyBank}
          value={<Money value={totals?.net ?? 0} />}
          delta={percentDelta(totals?.net, previous?.net)}
        />
        <StatCard
          label="Savings rate"
          icon={Sparkles}
          value={formatPercent(Number.isFinite(savingsRate) ? savingsRate : 0, 0)}
          delta={savingsDelta}
          deltaUnit="pts"
        />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-5">
        <SectionCard
          className="lg:col-span-3"
          title="Daily spending"
          description={`Income and expenses for each day of ${monthLabel(month)}.`}
          loading={overview.loading}
          empty={!hasValues(daily, ['income', 'expense'])}
          skeletonVariant="chart"
          emptyIcon={Activity}
          emptyTitle="Nothing tracked yet"
          emptyDescription="Add your first transaction and this chart fills in day by day."
          emptyAction={
            <Button size="sm" onClick={openCreate}>
              <Plus size={15} aria-hidden="true" />
              Add transaction
            </Button>
          }
        >
          <DailyTrendChart data={daily} />
        </SectionCard>

        <SectionCard
          className="lg:col-span-2"
          title="Where it went"
          description="Your expense categories, biggest first."
          loading={overview.loading}
          empty={categoryBreakdown.length === 0}
          skeletonVariant="donut"
          emptyIcon={Wallet}
          emptyTitle="No expenses this month"
          emptyDescription="Category splits appear as soon as you log an expense."
        >
          <CategoryDonut data={categoryBreakdown} title="Total spent" />
        </SectionCard>

        <SectionCard
          className="lg:col-span-3"
          title="Six-month trend"
          description="Comparing income against expenses, month by month."
          loading={overview.loading}
          empty={!hasValues(monthlyTrend, ['income', 'expense'])}
          skeletonVariant="chart"
          emptyIcon={TrendingUp}
          emptyTitle="Not enough history yet"
          emptyDescription="A few weeks of entries is enough to reveal your rhythm."
        >
          <MonthlyTrendChart data={monthlyTrend} />
        </SectionCard>

        <SectionCard
          className="lg:col-span-2"
          title="Top expenses"
          description="The largest single payments this month."
          loading={overview.loading}
          empty={topExpenses.length === 0}
          emptyIcon={TrendingDown}
          emptyTitle="No expenses to rank"
          emptyDescription="Your biggest payments will be listed here."
        >
          <TopExpenses items={topExpenses} />
        </SectionCard>

        <SectionCard
          className="lg:col-span-3"
          title="Recent activity"
          description="The latest entries you recorded."
          loading={overview.loading}
          empty={recent.length === 0}
          emptyIcon={ReceiptText}
          emptyTitle="No recent entries"
          emptyDescription="Transactions you add appear here, ready to edit in one click."
          emptyAction={
            <Button size="sm" onClick={openCreate}>
              <Plus size={15} aria-hidden="true" />
              Add transaction
            </Button>
          }
          action={
            <Link
              to="/transactions"
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary-700 transition hover:bg-primary-50"
            >
              View all
              <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
          }
        >
          <RecentActivity transactions={recent} onEdit={openEdit} />
        </SectionCard>

        <div className="lg:col-span-2">
          {budgets.length > 0 ? (
            <BudgetProgressCompact budgets={budgets} summary={budgetSummary.data} />
          ) : (
            <SectionCard
              title="Budgets"
              loading={budgetCall.loading}
              emptyIcon={PiggyBank}
              emptyTitle="No budget for this month"
              emptyDescription="Set limits per category to keep the month honest."
              empty
              emptyAction={
                <Link
                  to="/budgets"
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary-600 px-3 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700"
                >
                  Plan a budget
                  <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
              }
            />
          )}
        </div>
      </div>

      <TransactionModal
        open={modalOpen}
        transaction={editingTransaction}
        categories={categories}
        onClose={() => {
          setModalOpen(false);
          setEditingTransaction(null);
        }}
        onSaved={handleSaved}
        onCategoryCreated={refetchCategories}
      />
    </div>
  );
}
