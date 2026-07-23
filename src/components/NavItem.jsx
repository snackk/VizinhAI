import React from 'react';

function NavItem({ icon, label, active, onClick, collapsed = false }) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`w-full flex items-center gap-3.5 rounded-xl transition-all duration-200 text-[15px] font-medium ${collapsed ? 'justify-center px-0 py-3.5' : 'px-4 py-3.5'} ${active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 active:bg-slate-100'}`}
    >
      {React.cloneElement(icon, { className: `w-[22px] h-[22px] shrink-0 ${active ? 'text-blue-600' : 'text-slate-400'}` })}
      {!collapsed && label}
    </button>
  );
}

export default NavItem;
