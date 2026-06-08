import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Plus, X, Receipt, Edit2, Trash2, Calendar, ChevronDown, ChevronUp, FileSpreadsheet, Settings, Paperclip, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

function ExpensesPage({ expenses, budgets, expenseTypes, isAdmin, currentUser, db, appId, storage, selectedCondoId }) {
  const [showForm, setShowForm] = useState(false);
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [rubric, setRubric] = useState('');
  const [expenseType, setExpenseType] = useState('');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState({});
  const [newTypeName, setNewTypeName] = useState('');
  const [file, setFile] = useState(null);

  useEffect(() => {
    if (editingExpense) {
      setDate(editingExpense.date || '');
      setRubric(editingExpense.rubric || '');
      setExpenseType(editingExpense.expenseType || '');
      setValue(editingExpense.amount || '');
      setFile(null);
      setShowForm(true);
    } else {
      setDate(new Date().toISOString().split('T')[0]);
      setRubric('');
      setExpenseType('');
      setValue('');
      setFile(null);
    }
  }, [editingExpense]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let invoiceUrl = editingExpense?.invoiceUrl || '';
      let invoiceFileName = editingExpense?.invoiceFileName || '';

      if (file) {
        const timestamp = Date.now();
        invoiceFileName = `${timestamp}_${file.name}`;
        const fileRef = ref(storage, `condos/${selectedCondoId}/expenses/${invoiceFileName}`);
        await uploadBytes(fileRef, file);
        invoiceUrl = await getDownloadURL(fileRef);
      }

      const expenseData = {
        date,
        rubric,
        expenseType: expenseType || '',
        amount: parseFloat(value),
        invoiceUrl,
        invoiceFileName,
        updatedAt: new Date().toISOString(),
        createdBy: currentUser.firestoreId
      };

      if (editingExpense) {
        await updateDoc(doc(db, 'condos', selectedCondoId, 'expenses', editingExpense.firestoreId), expenseData);
      } else {
        await addDoc(collection(db, 'condos', selectedCondoId, 'expenses'), expenseData);
      }
      setShowForm(false);
      setEditingExpense(null);
      setFile(null);
    } catch (err) {
      alert('Erro ao guardar despesa: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem a certeza que deseja eliminar esta despesa?')) return;
    try {
      const expense = expenses.find(e => e.firestoreId === id);
      if (expense?.invoiceFileName) {
        const fileRef = ref(storage, `condos/${selectedCondoId}/expenses/${expense.invoiceFileName}`);
        await deleteObject(fileRef).catch(() => {});
      }
      await deleteDoc(doc(db, 'condos', selectedCondoId, 'expenses', id));
    } catch (err) {
      alert('Erro ao eliminar: ' + err.message);
    }
  };

  const handleAddType = async (e) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'condos', selectedCondoId, 'expenseTypes'), {
        name: newTypeName.trim(),
        createdAt: new Date().toISOString()
      });
      setNewTypeName('');
      setShowTypeForm(false);
    } catch (err) {
      alert('Erro ao adicionar tipo: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteType = async (typeId, typeName) => {
    const hasExpenses = expenses.some(e => e.expenseType === typeName);
    if (hasExpenses) return alert('Não é possível eliminar este tipo pois existem despesas associadas.');
    if (!confirm('Tem a certeza que deseja eliminar este tipo de despesa?')) return;
    try {
      await deleteDoc(doc(db, 'condos', selectedCondoId, 'expenseTypes', typeId));
    } catch (err) {
      alert('Erro ao eliminar tipo: ' + err.message);
    }
  };

  const groupedExpenses = expenses.reduce((acc, expense) => {
    const d = new Date(expense.date);
    const monthYear = d.toLocaleString('pt', { month: 'long', year: 'numeric' }).replace(/ [A-Z][a-z]+ /g, (m) => m.toLowerCase());
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!acc[key]) acc[key] = { label: monthYear, items: [], total: 0 };
    acc[key].items.push(expense);
    acc[key].total += expense.amount;
    return acc;
  }, {});

  const sortedKeys = Object.keys(groupedExpenses).sort((a, b) => b.localeCompare(a));
  const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const handleExportExcel = () => {
    // Get the latest budget (sorted by startDate descending)
    const sortedBudgets = [...(budgets || [])].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    const latestBudget = sortedBudgets[0];
    if (!latestBudget) return alert('Não existe nenhum orçamento configurado.');

    // Get budget period boundaries
    const start = new Date(latestBudget.startDate);
    const end = new Date(latestBudget.endDate);
    const budgetStart = new Date(start.getFullYear(), start.getMonth(), 1);
    const budgetEnd = new Date(end.getFullYear(), end.getMonth() + 1, 0); // last day of end month

    // Filter expenses within budget period
    const filteredExpenses = expenses.filter(exp => {
      const expDate = new Date(exp.date);
      return expDate >= budgetStart && expDate <= budgetEnd;
    });

    // Group expenses by expenseType (fallback to rubric name for old expenses without type)
    const typeGroups = {};
    filteredExpenses.forEach(exp => {
      const groupName = exp.expenseType || exp.rubric || 'Sem Tipo';
      if (!typeGroups[groupName]) typeGroups[groupName] = [];
      typeGroups[groupName].push(exp);
    });

    // Sort type names alphabetically
    const sortedTypeNames = Object.keys(typeGroups).sort((a, b) => a.localeCompare(b, 'pt'));

    if (sortedTypeNames.length === 0) return alert('Não existem despesas no período do último orçamento.');

    const wb = XLSX.utils.book_new();

    for (const typeName of sortedTypeNames) {
      const typeExpenses = typeGroups[typeName].sort((a, b) => new Date(a.date) - new Date(b.date));

      // Build table: Header + rows sorted chronologically
      const sheetData = [
        ['Data', 'Rubrica', 'Valor (€)'],
        ...typeExpenses.map(exp => [
          new Date(exp.date).toLocaleDateString('pt'),
          exp.rubric,
          Number(exp.amount).toFixed(2)
        ]),
        [],
        ['', 'Total', typeExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0).toFixed(2)]
      ];

      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      ws['!cols'] = [{ wch: 14 }, { wch: 30 }, { wch: 14 }];

      // Truncate tab name to 31 chars (Excel limit) and sanitize for sheet names
      let tabName = typeName.replace(/[\\/*?:\[\]]/g, '');
      if (tabName.length > 31) tabName = tabName.substring(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, tabName);
    }

    const startYear = start.getFullYear();
    const endYear = end.getFullYear();
    XLSX.writeFile(wb, `Despesas_${startYear}-${endYear}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
        <div>
          <h2 className="text-[26px] font-bold text-slate-800 tracking-tight">Despesas</h2>
          <p className="text-slate-500 text-sm mt-1">Gestão e histórico de despesas do condomínio</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {isAdmin && expenses.length > 0 && (
            <button onClick={handleExportExcel} title="Exportar Excel" className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-3 rounded-xl font-semibold active:bg-green-700 transition-colors shadow-lg shadow-green-600/20">
              <FileSpreadsheet className="w-5 h-5" />
            </button>
          )}
          {isAdmin && (
            <button onClick={() => { setShowTypeForm(!showTypeForm); setShowForm(false); }} className="flex items-center justify-center gap-2 bg-white text-slate-700 border border-slate-200 px-4 py-3 rounded-xl font-semibold hover:bg-slate-50 transition-colors">
              <Settings className="w-5 h-5" /> Tipos
            </button>
          )}
          {isAdmin && (
            <button onClick={() => { setShowForm(!showForm); setShowTypeForm(false); setEditingExpense(null); }} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-xl font-semibold active:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
              {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />} {showForm ? 'Cancelar' : 'Nova Despesa'}
            </button>
          )}
        </div>
      </div>

      {showTypeForm && isAdmin && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="font-bold text-lg text-slate-800">Gerir Tipos de Despesa</h3>
          <form onSubmit={handleAddType} className="flex gap-2">
            <input required placeholder="Novo tipo (ex: Limpeza, Manutenção, Seguros)" value={newTypeName} onChange={e => setNewTypeName(e.target.value)} className="flex-1 px-4 py-3 border border-slate-200 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
            <button type="submit" disabled={loading} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold disabled:opacity-50">Adicionar</button>
          </form>
          <div className="flex flex-wrap gap-2 pt-2">
            {(expenseTypes || []).map(type => (
              <div key={type.firestoreId} className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-lg group">
                <span className="text-sm font-medium text-slate-700">{type.name}</span>
                <button onClick={() => handleDeleteType(type.firestoreId, type.name)} className="text-slate-400 hover:text-red-500 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            {(!expenseTypes || expenseTypes.length === 0) && (
              <p className="text-sm text-slate-400">Nenhum tipo de despesa configurado.</p>
            )}
          </div>
        </div>
      )}

      {showForm && isAdmin && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="font-bold text-lg text-slate-800">{editingExpense ? 'Editar Despesa' : 'Nova Despesa'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">Data</label>
              <input required type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-3.5 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">Tipo de Despesa</label>
              <select required value={expenseType} onChange={e => setExpenseType(e.target.value)} className="w-full px-4 py-3.5 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                <option value="">Selecionar tipo...</option>
                {[...(expenseTypes || [])].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt')).map(type => (
                  <option key={type.firestoreId} value={type.name}>{type.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
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

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">
              <Paperclip className="w-3.5 h-3.5 inline mr-1" />
              Fatura (PDF, Imagem) — Opcional
            </label>
            {editingExpense?.invoiceUrl && !file && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">Fatura atual: {editingExpense.invoiceFileName?.replace(/^\d+_/, '') || 'ficheiro'}</span>
                <span className="text-xs text-slate-400">— selecione um ficheiro para substituir</span>
              </div>
            )}
            <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={e => setFile(e.target.files[0])} className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
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
                          <th className="px-4 py-3.5 font-semibold">Tipo</th>
                          <th className="px-4 py-3.5 font-semibold">Rubrica</th>
                          <th className="px-4 py-3.5 font-semibold text-right">Valor</th>
                          <th className="px-4 py-3.5 font-semibold text-center">Fatura</th>
                          {isAdmin && <th className="px-4 py-3.5 font-semibold text-center w-24">Ações</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {group.items.sort((a,b) => new Date(b.date) - new Date(a.date)).map((item) => (
                          <tr key={item.firestoreId} className="hover:bg-white/50 transition-colors">
                            <td className="px-4 py-3.5 text-slate-500 font-medium">{new Date(item.date).toLocaleDateString('pt')}</td>
                            <td className="px-4 py-3.5 text-slate-500 text-xs">{item.expenseType ? <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-semibold">{item.expenseType}</span> : <span className="text-slate-300">—</span>}</td>
                            <td className="px-4 py-3.5 text-slate-700 font-bold">{item.rubric}</td>
                            <td className="px-4 py-3.5 text-slate-900 font-black text-right">{item.amount.toFixed(2)} €</td>
                            <td className="px-4 py-3.5 text-center">
                              {item.invoiceUrl ? (
                                <a href={item.invoiceUrl} target="_blank" rel="noopener noreferrer" title={item.invoiceFileName?.replace(/^\d+_/, '') || 'Fatura'} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors">
                                  <Download className="w-4 h-4" />
                                </a>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
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
                          <td colSpan="3" className="px-4 py-4 text-blue-900 font-bold text-right">Total do Mês</td>
                          <td className="px-4 py-4 text-blue-700 font-black text-right text-lg">{group.total.toFixed(2)} €</td>
                          <td></td>
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

