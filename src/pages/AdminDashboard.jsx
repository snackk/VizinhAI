import React from 'react';
import { TrendingUp, AlertCircle } from 'lucide-react';
import StatCard from '../components/StatCard.jsx';
import AnnualQuotasTable from '../components/AnnualQuotasTable.jsx';

function AdminDashboard({ expenses, quotas, users, budgets, t }) {
  const sortedBudgets = [...budgets].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  const currentBudget = sortedBudgets[0];
  const rfPerc = currentBudget?.reserveFundPercentage ?? 10;
  const totalExpected = (currentBudget?.totalAmount || 0) * (1 + rfPerc / 100);
  const pendingExpensesAmount = expenses.filter(e => e.status === 'pending').reduce((acc, curr) => acc + curr.amount, 0);

  const getMonths = (start, end) => {
    const months = [];
    if (!start || !end) return months;
    let current = new Date(start);
    const last = new Date(end);
    while (current <= last) {
      months.push(new Date(current));
      current.setMonth(current.getMonth() + 1);
    }
    return months;
  };

  const months = currentBudget ? getMonths(currentBudget.startDate, currentBudget.endDate) : [];
  const monthlyTotal = currentBudget ? currentBudget.totalAmount / 12 : 0;
  
  let collectedAmount = 0;
  let totalDebt = 0;
  const now = new Date();

  users.forEach(user => {
    const perm = parseFloat(user.permilagem) || 0;
    const quotaBase = (monthlyTotal * (perm / 1000));
    const reserveFund = quotaBase * (rfPerc / 100);
    const totalMonthly = quotaBase + reserveFund;

    months.forEach(m => {
      const monthKey = `${m.getFullYear()}-${m.getMonth()}`;
      const isPaid = quotas.some(q => q.userId === user.firestoreId && q.monthKey === monthKey);
      
      if (isPaid) {
        collectedAmount += totalMonthly;
      } else if (m.getFullYear() < now.getFullYear() || (m.getFullYear() === now.getFullYear() && m.getMonth() <= now.getMonth())) {
        totalDebt += totalMonthly;
      }
    });
  });

  return (
    <div className="space-y-6">
      <div className="pt-2">
        <h2 className="text-[26px] font-bold text-slate-800 tracking-tight">{t('dashboard')}</h2>
        <p className="text-slate-500 text-sm mt-1">{t('globalVision')}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title={t('collectedFund')} value={`${collectedAmount.toFixed(2)} €`} subtitle={t('budgetedOf', { amount: totalExpected.toFixed(2) })} icon={<TrendingUp className="w-6 h-6 text-green-600" />} color="green" />
        <StatCard title={t('overdueQuotas')} value={`${totalDebt.toFixed(2)} €`} subtitle={t('toReceive')} icon={<AlertCircle className="w-6 h-6 text-orange-600" />} color="orange" />
      </div>
      <AnnualQuotasTable currentBudget={currentBudget} users={users} />
    </div>
  );
}

export default AdminDashboard;

