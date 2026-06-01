import React from 'react';

function StatCard({ title, value, subtitle, icon, color }) {
  const bgColors = { green: 'bg-green-50 border-green-100', orange: 'bg-orange-50 border-orange-100', blue: 'bg-blue-50 border-blue-100' };
  return (
    <div className={`p-6 rounded-3xl border ${bgColors[color]} shadow-sm`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600/70 mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{value}</h3>
          <p className="text-[13px] text-slate-500 mt-2 font-medium">{subtitle}</p>
        </div>
        <div className="p-3 bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white">{icon}</div>
      </div>
    </div>
  );
}

export default StatCard;

