import React, { useState } from 'react';
import { AlertCircle, CheckCircle, ChevronUp, Calendar } from 'lucide-react';
import AnnualQuotasTable from '../components/AnnualQuotasTable.jsx';

function UserDashboard({ user, quotas, expenses, budgets, users, assembleias, t }) {
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
    const isPaid = quotas.some(q => q.userId === user.firestoreId && q.monthKey === monthKey && q.status === 'paid');
    return !isPaid && (m.getFullYear() < now.getFullYear() || (m.getFullYear() === now.getFullYear() && m.getMonth() <= now.getMonth()));
  });

  // Calculate carryover from partial payments
  let partialPaymentCarry = 0;
  months.forEach((m, idx) => {
    const monthKey = `${m.getFullYear()}-${m.getMonth()}`;
    const quota = quotas.find(q => q.firestoreId === `${user.firestoreId}_${monthKey}`);
    if (quota && quota.status === 'paid' && quota.paidAmount !== undefined) {
      const expectedWithCarry = totalMonthly + partialPaymentCarry;
      const remainder = expectedWithCarry - quota.paidAmount;
      partialPaymentCarry = remainder > 0.01 ? remainder : 0;
    } else if (!quota || quota.status !== 'paid') {
      // unpaid month - carry stays
    } else {
      partialPaymentCarry = 0;
    }
  });

  // Extra quotas (from previous budgets) that are still pending
  const extraPendingQuotas = quotas.filter(q => q.isExtra && q.userId === user.firestoreId && q.status === 'pending' && !q.isPartialPayment);
  const extraDebtAmount = extraPendingQuotas.reduce((sum, q) => sum + (q.extraAmount || 0), 0);

  const pendingAmount = (debtMonths.length * totalMonthly) + extraDebtAmount + partialPaymentCarry;
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
              {extraPendingQuotas.map((q, idx) => {
                const [y, m] = q.monthKey.split('-').map(Number);
                return (
                  <div key={`extra-${idx}`} className="flex justify-between items-center bg-amber-50/40 p-3 rounded-xl border border-amber-100/50">
                    <span className="text-sm font-semibold text-amber-900 capitalize">
                      {t(`months.${m}`)} {y} <span className="text-[10px] text-amber-600 font-normal">(atraso)</span>
                    </span>
                    <span className="text-sm font-bold text-amber-700">{(q.extraAmount || 0).toFixed(2)} €</span>
                  </div>
                );
              })}
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

export default UserDashboard;

