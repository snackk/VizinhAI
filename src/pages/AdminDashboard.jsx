import React from 'react';
import { TrendingUp, AlertCircle, Calendar } from 'lucide-react';
import StatCard from '../components/StatCard.jsx';
import AnnualQuotasTable from '../components/AnnualQuotasTable.jsx';

function AdminDashboard({ expenses, quotas, users, budgets, assembleias, t }) {
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

    let carry = 0;
    months.forEach(m => {
      const monthKey = `${m.getFullYear()}-${m.getMonth()}`;
      const quota = quotas.find(q => q.firestoreId === `${user.firestoreId}_${monthKey}`);
      const isPaid = quota && quota.status === 'paid';
      const expectedWithCarry = totalMonthly + carry;

      if (isPaid) {
        const paidAmt = quota.paidAmount !== undefined ? quota.paidAmount : expectedWithCarry;
        collectedAmount += paidAmt;
        const remainder = expectedWithCarry - paidAmt;
        carry = remainder > 0.01 ? remainder : 0;
      } else if (m.getFullYear() < now.getFullYear() || (m.getFullYear() === now.getFullYear() && m.getMonth() <= now.getMonth())) {
        totalDebt += expectedWithCarry;
        carry = 0;
      }
    });
    // If there's still carry after all months, add to debt
    if (carry > 0.01) totalDebt += carry;
  });

  // Include extra quotas in collected/debt
  quotas.filter(q => q.isExtra).forEach(q => {
    if (q.isPartialPayment && q.status === 'paid') {
      collectedAmount += q.paidAmount || 0;
    } else if (q.status === 'paid') {
      collectedAmount += q.paidAmount || q.extraAmount || 0;
    } else if (q.status === 'pending') {
      totalDebt += q.extraAmount || 0;
    }
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

      {(() => {
        const now = new Date();
        const upcoming = (assembleias || [])
          .filter(a => a.data && new Date(a.data) >= now)
          .sort((a, b) => new Date(a.data) - new Date(b.data));
        if (upcoming.length === 0) return null;
        return (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-2xl bg-blue-50">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">{t('upcomingAssemblies') || 'Próximas Assembleias'}</h3>
            </div>
            <div className="space-y-3">
              {upcoming.map(a => (
                <div key={a.firestoreId} className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl">
                  <div>
                    <p className="font-semibold text-slate-800">{a.numero ? `Assembleia ${a.numero}` : 'Assembleia'}{a.tipo === 'extraordinaria' ? ' (Extraordinária)' : ' (Geral)'}</p>
                    <p className="text-sm text-slate-500">
                      {new Date(a.data).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}
                      {a.hora ? ` às ${a.hora}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
      <AnnualQuotasTable currentBudget={currentBudget} users={users} />
    </div>
  );
}

export default AdminDashboard;

