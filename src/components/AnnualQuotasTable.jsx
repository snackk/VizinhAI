import React from 'react';

function AnnualQuotasTable({ currentBudget, users }) {
  if (!currentBudget) return null;

  const rfPerc = currentBudget.reserveFundPercentage ?? 10;
  const totalBudget = currentBudget.totalAmount;

  let grandTotalQuota = 0;
  let grandTotalRF = 0;
  let grandTotal = 0;

  const rows = users.map(user => {
    const perm = parseFloat(user.permilagem) || 0;
    const annualQuota = (totalBudget * (perm / 1000));
    const annualRF = annualQuota * (rfPerc / 100);
    const total = annualQuota + annualRF;

    grandTotalQuota += annualQuota;
    grandTotalRF += annualRF;
    grandTotal += total;

    return {
      fraction: user.fraction,
      perm,
      annualQuota,
      annualRF,
      total
    };
  });

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mt-6">
      <div className="p-5 border-b border-slate-50 bg-slate-50/50">
        <h3 className="font-bold text-slate-800">Quotas Anuais e Fundo de Reserva</h3>
        <p className="text-xs text-slate-500 mt-1">Valores anuais baseados no orçamento em vigor ({rfPerc}% Fundo de Reserva)</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50/30 text-slate-500 border-b border-slate-100">
              <th className="px-4 py-3.5 font-semibold">Fração</th>
              <th className="px-4 py-3.5 font-semibold text-center">Permilagem</th>
              <th className="px-4 py-3.5 font-semibold text-right">Orçamento (€)</th>
              <th className="px-4 py-3.5 font-semibold text-right">F. Reserva ({rfPerc}%)</th>
              <th className="px-4 py-3.5 font-semibold text-right font-bold">Total Anual</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3.5 font-bold text-slate-900">{row.fraction}</td>
                <td className="px-4 py-3.5 text-center text-slate-600">{row.perm}‰</td>
                <td className="px-4 py-3.5 text-right text-slate-700">{row.annualQuota.toFixed(2)} €</td>
                <td className="px-4 py-3.5 text-right text-slate-700">{row.annualRF.toFixed(2)} €</td>
                <td className="px-4 py-3.5 text-right font-black text-blue-600">{row.total.toFixed(2)} €</td>
              </tr>
            ))}
            <tr className="bg-blue-50/30 font-bold">
              <td className="px-4 py-4 text-blue-900">TOTAL GERAL</td>
              <td className="px-4 py-4 text-center text-blue-900">1000‰</td>
              <td className="px-4 py-4 text-right text-blue-900">{grandTotalQuota.toFixed(2)} €</td>
              <td className="px-4 py-4 text-right text-blue-900">{grandTotalRF.toFixed(2)} €</td>
              <td className="px-4 py-4 text-right text-blue-700 text-lg font-black">{grandTotal.toFixed(2)} €</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AnnualQuotasTable;

