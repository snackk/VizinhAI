import React, { useState } from 'react';
import { AlertCircle, CheckCircle, ChevronUp } from 'lucide-react';
import AnnualQuotasTable from '../components/AnnualQuotasTable.jsx';

function UserDashboard({ user, quotas, expenses, budgets, users, t }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const sortedBudgets = [...budgets].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  const currentBudget = sortedBudgets[0];

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
  const rfPerc = currentBudget?.reserveFundPercentage ?? 10;
  const monthlyTotal = currentBudget ? currentBudget.totalAmount / 12 : 0;
  const perm = parseFloat(user.permilagem) || 0;
  const quotaBase = (monthlyTotal * (perm / 1000));
  const reserveFund = quotaBase * (rfPerc / 100);
  const totalMonthly = quotaBase + reserveFund;

  const now = new Date();
  const debtMonths = months.filter(m => {
    const monthKey = `${m.getFullYear()}-${m.getMonth()}`;
    const isPaid = quotas.some(q => q.userId === user.firestoreId && q.monthKey === monthKey);
    return !isPaid && (m.getFullYear() < now.getFullYear() || (m.getFullYear() === now.getFullYear() && m.getMonth() <= now.getMonth()));
  });

  const pendingAmount = debtMonths.length * totalMonthly;
  const hasDebt = pendingAmount > 0.01;
  return (
    <div className="space-y-6">
      <div className="pt-2">
        <h2 className="text-[26px] font-bold text-slate-800 tracking-tight">{t('hello', { name: user.name.split(' ')[0] })}</h2>
        <p className="text-slate-500 text-sm mt-1">{t('unitSummary', { unit: user.fraction })}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div 
          onClick={() => hasDebt && setIsExpanded(!isExpanded)}
          className={`p-6 rounded-3xl border transition-all duration-300 ${hasDebt ? 'bg-red-50 border-red-100 cursor-pointer hover:shadow-md' : 'bg-green-50 border-green-100'}`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className={`text-sm font-semibold uppercase tracking-wider ${hasDebt ? 'text-red-800/70' : 'text-green-800/70'}`}>{hasDebt ? t('amountToPay') : t('regularSituation')}</p>
              <h3 className={`text-4xl font-bold mt-2 tracking-tight ${hasDebt ? 'text-red-600' : 'text-green-600'}`}>{pendingAmount.toFixed(2)} €</h3>
            </div>
            <div className={`p-3.5 rounded-2xl ${hasDebt ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
              {hasDebt ? (isExpanded ? <ChevronUp className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />) : <CheckCircle className="w-6 h-6" />}
            </div>
          </div>
          
          {hasDebt && isExpanded && (
            <div className="mt-6 pt-6 border-t border-red-200/50 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <p className="text-xs font-bold text-red-800/60 uppercase tracking-widest mb-4">{t('overdueMonths')}</p>
              {debtMonths.map((m, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white/40 p-3 rounded-xl border border-red-100/50">
                  <span className="text-sm font-semibold text-red-900 capitalize">
                    {t(`months.${m.getMonth()}`)} {m.getFullYear()}
                  </span>
                  <span className="text-sm font-bold text-red-600">{totalMonthly.toFixed(2)} €</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <AnnualQuotasTable currentBudget={currentBudget} users={users} />
    </div>
  );
}

export default UserDashboard;

