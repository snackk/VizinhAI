import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { Plus, X, Receipt, Edit2, Trash2, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

function ExpensesPage({ expenses, isAdmin, currentUser, db, appId, selectedCondoId }) {
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [rubric, setRubric] = useState('');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState({});

  useEffect(() => {
    if (editingExpense) {
      setDate(editingExpense.date || '');
      setRubric(editingExpense.rubric || '');
      setValue(editingExpense.amount || '');
      setShowForm(true);
    } else {
      setDate(new Date().toISOString().split('T')[0]);
      setRubric('');
      setValue('');
    }
  }, [editingExpense]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const expenseData = {
      date,
      rubric,
      amount: parseFloat(value),
      updatedAt: new Date().toISOString(),
      createdBy: currentUser.firestoreId
    };

    try {
      if (editingExpense) {
        await updateDoc(doc(db, 'condos', selectedCondoId, 'expenses', editingExpense.firestoreId), expenseData);
      } else {
        await addDoc(collection(db, 'condos', selectedCondoId, 'expenses'), expenseData);
      }
      setShowForm(false);
      setEditingExpense(null);
    } catch (err) {
      alert('Erro ao guardar despesa: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem a certeza que deseja eliminar esta despesa?')) return;
    try {
      await deleteDoc(doc(db, 'condos', selectedCondoId, 'expenses', id));
    } catch (err) {
      alert('Erro ao eliminar: ' + err.message);
    }
  };

  const groupedExpenses = expenses.reduce((acc, expense) => {
    const d = new Date(expense.date);
    const monthYear = d.toLocaleString('pt', { month: 'long', year: 'numeric' });
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!acc[key]) acc[key] = { label: monthYear, items: [], total: 0 };
    acc[key].items.push(expense);
    acc[key].total += expense.amount;
    return acc;
  }, {});

  const sortedKeys = Object.keys(groupedExpenses).sort((a, b) => b.localeCompare(a));
  const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
        <div>
          <h2 className="text-[26px] font-bold text-slate-800 tracking-tight">Despesas</h2>
          <p className="text-slate-500 text-sm mt-1">Gestão e histórico de despesas do condomínio</p>
        </div>
        {isAdmin && (
          <button onClick={() => { setShowForm(!showForm); setEditingExpense(null); }} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-xl font-semibold active:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
            {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />} {showForm ? 'Cancelar' : 'Nova Despesa'}
          </button>
        )}
      </div>

      {showForm && isAdmin && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="font-bold text-lg text-slate-800">{editingExpense ? 'Editar Despesa' : 'Nova Despesa'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">Data</label>
              <input required type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-3.5 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
            <div className="space-y-1 md:col-span-1">
              <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">Rubrica / Descrição</label>
              <input required placeholder="Ex: Limpeza, Elevador..." value={rubric} onChange={e => setRubric(e.target.value)} className="w-full px-4 py-3.5 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">Valor (€)</label>
              <div className="relative">
                <input required type="number" step="0.01" placeholder="0.00" value={value} onChange={e => setValue(e.target.value)} className="w-full px-4 py-3.5 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all pr-8" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">€</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={() => { setShowForm(false); setEditingExpense(null); }} className="px-6 py-3.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="bg-slate-900 text-white px-8 py-3.5 rounded-xl font-bold disabled:opacity-50 hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10">
              {loading ? 'A processar...' : editingExpense ? 'Atualizar Despesa' : 'Registar Despesa'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {sortedKeys.map((key) => {
          const group = groupedExpenses[key];
          const isCurrent = key === currentMonthKey;
          const isExpanded = expandedMonths[key] !== undefined ? expandedMonths[key] : isCurrent;

          return (
            <div key={key} className={`bg-white rounded-3xl border ${isCurrent ? 'border-blue-100 ring-1 ring-blue-50' : 'border-slate-100'} shadow-sm overflow-hidden transition-all`}>
              <div className={`p-5 flex justify-between items-center cursor-pointer transition-colors ${!isExpanded ? 'hover:bg-slate-50' : ''}`} onClick={() => setExpandedMonths({...expandedMonths, [key]: !isExpanded})}>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${isCurrent ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-100 text-slate-500'}`}>
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 capitalize">{group.label}</h3>
                    <p className="text-xs text-slate-500">{group.items.length} despesas registadas</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Total Mensal</p>
                    <p className={`font-bold ${isCurrent ? 'text-blue-600' : 'text-slate-900'}`}>{group.total.toFixed(2)} €</p>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
              </div>

              {isExpanded && (
                <div className="px-5 pb-6 animate-in fade-in duration-300">
                  <div className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-100">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-slate-100/50 text-slate-500 border-b border-slate-200">
                          <th className="px-4 py-3.5 font-semibold">Data</th>
                          <th className="px-4 py-3.5 font-semibold">Rubrica</th>
                          <th className="px-4 py-3.5 font-semibold text-right">Valor</th>
                          {isAdmin && <th className="px-4 py-3.5 font-semibold text-center w-24">Ações</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {group.items.sort((a,b) => new Date(b.date) - new Date(a.date)).map((item) => (
                          <tr key={item.firestoreId} className="hover:bg-white/50 transition-colors">
                            <td className="px-4 py-3.5 text-slate-500 font-medium">{new Date(item.date).toLocaleDateString('pt')}</td>
                            <td className="px-4 py-3.5 text-slate-700 font-bold">{item.rubric}</td>
                            <td className="px-4 py-3.5 text-slate-900 font-black text-right">{item.amount.toFixed(2)} €</td>
                            {isAdmin && (
                              <td className="px-4 py-3.5">
                                <div className="flex items-center justify-center gap-1">
                                  <button onClick={() => setEditingExpense(item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                                  <button onClick={() => handleDelete(item.firestoreId)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                        <tr className="bg-blue-50/30">
                          <td colSpan="2" className="px-4 py-4 text-blue-900 font-bold text-right">Total do Mês</td>
                          <td className="px-4 py-4 text-blue-700 font-black text-right text-lg">{group.total.toFixed(2)} €</td>
                          {isAdmin && <td></td>}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {expenses.length === 0 && (
          <div className="p-16 text-center bg-white rounded-3xl border border-dashed border-slate-200">
            <div className="bg-slate-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Receipt className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium">Não existem despesas registadas.</p>
            {isAdmin && <button onClick={() => setShowForm(true)} className="mt-4 text-blue-600 font-bold hover:underline">Registar a primeira despesa</button>}
          </div>
        )}
      </div>
    </div>
  );
}

export default ExpensesPage;

