import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { Plus, X, Wallet, Edit2, Trash2, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

function BudgetsPage({ budgets, isAdmin, db, appId, selectedCondoId }) {
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rubrics, setRubrics] = useState([{ name: '', value: '' }]);
  const [reserveFundPercentage, setReserveFundPercentage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const sortedBudgets = [...budgets].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

  useEffect(() => {
    if (editingBudget) {
      setStartDate(editingBudget.startDate || '');
      setEndDate(editingBudget.endDate || '');
      setRubrics(editingBudget.rubrics || [{ name: '', value: '' }]);
      setReserveFundPercentage(editingBudget.reserveFundPercentage ?? 10);
      setShowForm(true);
    } else {
      setStartDate('');
      setEndDate('');
      setRubrics([{ name: '', value: '' }]);
      setReserveFundPercentage(10);
    }
  }, [editingBudget]);

  const handleAddRubric = () => setRubrics([...rubrics, { name: '', value: '' }]);
  const handleRemoveRubric = (index) => setRubrics(rubrics.filter((_, i) => i !== index));
  const handleRubricChange = (index, field, value) => {
    const newRubrics = [...rubrics];
    newRubrics[index][field] = value;
    setRubrics(newRubrics);
  };
  const calculateTotal = (items) => items.reduce((acc, curr) => acc + (parseFloat(curr.value) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const totalAmount = calculateTotal(rubrics);
    const budgetData = {
      startDate, endDate,
      rubrics: rubrics.map(r => ({ name: r.name, value: parseFloat(r.value) || 0 })),
      reserveFundPercentage: parseFloat(reserveFundPercentage) || 0,
      totalAmount,
      updatedAt: new Date().toISOString()
    };
    try {
      if (editingBudget) {
        await updateDoc(doc(db, 'condos', selectedCondoId, 'budgets', editingBudget.firestoreId), budgetData);
      } else {
        await addDoc(collection(db, 'condos', selectedCondoId, 'budgets'), budgetData);
      }
      setShowForm(false);
      setEditingBudget(null);
    } catch (err) {
      alert('Erro ao guardar orçamento: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem a certeza que deseja eliminar este orçamento?')) return;
    try {
      await deleteDoc(doc(db, 'condos', selectedCondoId, 'budgets', id));
    } catch (err) {
      alert('Erro ao eliminar: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
        <div>
          <h2 className="text-[26px] font-bold text-slate-800">Orçamentos</h2>
          <p className="text-slate-500 text-sm mt-1">Gestão de orçamentos e exercício</p>
        </div>
        {isAdmin && (
          <button onClick={() => { setShowForm(!showForm); setEditingBudget(null); }} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-xl font-semibold active:bg-blue-700 transition-colors">
            {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />} {showForm ? 'Cancelar' : 'Novo Orçamento'}
          </button>
        )}
      </div>

      {showForm && isAdmin && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <h3 className="font-semibold text-lg">{editingBudget ? 'Editar Orçamento' : 'Novo Orçamento'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 ml-1">Data de Início</label>
              <input required type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-4 py-3.5 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 ml-1">Data de Fim</label>
              <input required type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-4 py-3.5 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 ml-1">Fundo de Reserva (%)</label>
            <div className="w-full sm:w-32 relative">
              <input required type="number" step="0.1" value={reserveFundPercentage} onChange={e => setReserveFundPercentage(e.target.value)} className="w-full px-4 py-3 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500 pr-8" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-slate-700 ml-1">Rubricas</label>
              <button type="button" onClick={handleAddRubric} className="text-sm text-blue-600 font-bold flex items-center gap-1"><Plus className="w-4 h-4" /> Adicionar Linha</button>
            </div>
            {rubrics.map((rubric, index) => (
              <div key={index} className="flex gap-2 items-start">
                <input required placeholder="Descrição da Rubrica" value={rubric.name} onChange={e => handleRubricChange(index, 'name', e.target.value)} className="flex-1 px-4 py-3 border border-slate-200 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                <div className="w-32 relative">
                  <input required type="number" step="0.01" placeholder="0.00" value={rubric.value} onChange={e => handleRubricChange(index, 'value', e.target.value)} className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 pr-8" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">€</span>
                </div>
                {rubrics.length > 1 && (
                  <button type="button" onClick={() => handleRemoveRubric(index)} className="p-3 text-red-500 hover:bg-red-50 rounded-xl"><Trash2 className="w-5 h-5" /></button>
                )}
              </div>
            ))}
          </div>
          <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
            <span className="font-bold text-slate-700">Total: {calculateTotal(rubrics).toFixed(2)} €</span>
            <button type="submit" disabled={loading} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-semibold disabled:opacity-50">
              {loading ? 'A processar...' : 'Submeter Orçamento'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {sortedBudgets.map((budget, index) => {
          const isCurrent = index === 0;
          const isExpanded = expandedId === budget.firestoreId || isCurrent;
          
          return (
            <div key={budget.firestoreId} className={`bg-white rounded-3xl border ${isCurrent ? 'border-blue-100 ring-1 ring-blue-50' : 'border-slate-100'} shadow-sm overflow-hidden`}>
              <div className={`p-5 flex justify-between items-center cursor-pointer ${!isCurrent ? 'hover:bg-slate-50' : ''}`} onClick={() => !isCurrent && setExpandedId(expandedId === budget.firestoreId ? null : budget.firestoreId)}>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800">{new Date(budget.startDate).getFullYear()} - {new Date(budget.endDate).getFullYear()}</h3>
                      {isCurrent && <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Atual</span>}
                    </div>
                    <p className="text-xs text-slate-500">{new Date(budget.startDate).toLocaleDateString()} até {new Date(budget.endDate).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Total</p>
                    <p className="font-bold text-slate-900">{budget.totalAmount.toFixed(2)} €</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); setEditingBudget(budget); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(budget.firestoreId); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </>
                    )}
                    {!isCurrent && (isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />)}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="px-5 pb-6">
                  <div className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-100">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-slate-100/50 text-slate-500 border-b border-slate-200">
                          <th className="px-4 py-3 font-semibold">Rubrica</th>
                          <th className="px-4 py-3 font-semibold text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {budget.rubrics.map((rubric, ridx) => (
                          <tr key={ridx}>
                            <td className="px-4 py-3 text-slate-700 font-medium">{rubric.name}</td>
                            <td className="px-4 py-3 text-slate-900 font-bold text-right">{rubric.value.toFixed(2)} €</td>
                          </tr>
                        ))}
                        <tr>
                          <td className="px-4 py-3 text-slate-700 font-medium">Fundo de Reserva ({budget.reserveFundPercentage ?? 10}%)</td>
                          <td className="px-4 py-3 text-slate-900 font-bold text-right">{(budget.totalAmount * ((budget.reserveFundPercentage ?? 10) / 100)).toFixed(2)} €</td>
                        </tr>
                        <tr className="bg-blue-50/30">
                          <td className="px-4 py-4 text-blue-900 font-bold">Total do Exercício (+ FR)</td>
                          <td className="px-4 py-4 text-blue-700 font-black text-right text-lg">{(budget.totalAmount * (1 + (budget.reserveFundPercentage ?? 10) / 100)).toFixed(2)} €</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {sortedBudgets.length === 0 && (
          <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200">
            <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Não existem orçamentos registados.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default BudgetsPage;

