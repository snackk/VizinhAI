import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Plus, X, Receipt, Edit2, Trash2, Calendar, ChevronDown, ChevronUp, FileSpreadsheet, Settings, Paperclip, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
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
  const [expandedPeriods, setExpandedPeriods] = useState({});
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
    const monthYear = d.toLocaleString('pt', { month: 'long', year: 'numeric' }).replace(/\b[A-Z][a-z]+\b/g, (m) => m.toLowerCase());
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!acc[key]) acc[key] = { label: monthYear, items: [], total: 0 };
    acc[key].items.push(expense);
    acc[key].total += expense.amount;
    return acc;
  }, {});

  const sortedKeys = Object.keys(groupedExpenses).sort((a, b) => b.localeCompare(a));
  const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  // Build budget periods sorted by startDate descending
  const sortedBudgetPeriods = useMemo(() => {
    const sorted = [...(budgets || [])].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    return sorted.map(b => {
      const start = new Date(b.startDate);
      const end = new Date(b.endDate);
      const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
      const endMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0);
      const startLabel = start.toLocaleString('pt', { month: 'short', year: 'numeric' }).replace('.', '');
      const endLabel = end.toLocaleString('pt', { month: 'short', year: 'numeric' }).replace('.', '');
      return {
        id: b.firestoreId,
        label: `${startLabel} — ${endLabel}`,
        startMonth,
        endMonth,
        totalBudget: b.totalAmount || (b.rubrics || []).reduce((s, r) => s + (r.value || 0), 0),
      };
    });
  }, [budgets]);

  // Group month keys by budget period; expenses outside any budget go to "Sem Orçamento"
  const periodGroups = useMemo(() => {
    const groups = {};
    const now = new Date();

    // Initialize a group for each budget period
    sortedBudgetPeriods.forEach(bp => {
      groups[bp.id] = { ...bp, months: [], total: 0, isCurrent: now >= bp.startMonth && now <= bp.endMonth };
    });

    // Assign each month to the matching budget period
    const unmatched = { id: '__none__', label: 'Sem Orçamento', months: [], total: 0, isCurrent: false };
    sortedKeys.forEach(key => {
      const [y, m] = key.split('-');
      const monthDate = new Date(parseInt(y), parseInt(m) - 1, 15); // mid-month for safe comparison
      let matched = false;
      for (const bp of sortedBudgetPeriods) {
        if (monthDate >= bp.startMonth && monthDate <= bp.endMonth) {
          groups[bp.id].months.push(key);
          groups[bp.id].total += groupedExpenses[key].total;
          matched = true;
          break;
        }
      }
      if (!matched) {
        unmatched.months.push(key);
        unmatched.total += groupedExpenses[key].total;
      }
    });

    // Build ordered array: budget periods (newest first), then unmatched at the end if any
    const ordered = sortedBudgetPeriods.map(bp => groups[bp.id]).filter(g => g.months.length > 0);
    if (unmatched.months.length > 0) ordered.push(unmatched);
    return ordered;
  }, [sortedBudgetPeriods, sortedKeys, groupedExpenses]);

  // Chart data: cumulative expenses vs budget regression line
  const chartData = useMemo(() => {
    const sortedBudgets = [...(budgets || [])].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    const latestBudget = sortedBudgets[0];
    if (!latestBudget) return null;

    const start = new Date(latestBudget.startDate);
    const end = new Date(latestBudget.endDate);
    const totalBudget = latestBudget.totalAmount || (latestBudget.rubrics || []).reduce((s, r) => s + (r.value || 0), 0);

    // Generate all months in the budget period
    const months = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
    while (cursor <= endMonth) {
      months.push({
        year: cursor.getFullYear(),
        month: cursor.getMonth(),
        key: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const totalMonths = months.length;
    const monthlyBudget = totalBudget / totalMonths;

    // Calculate cumulative actual expenses per month
    let cumulativeActual = 0;
    const data = months.map((m, idx) => {
      const monthExpenses = expenses.filter(exp => {
        const d = new Date(exp.date);
        return d.getFullYear() === m.year && d.getMonth() === m.month;
      });
      const monthTotal = monthExpenses.reduce((s, e) => s + (e.amount || 0), 0);
      cumulativeActual += monthTotal;

      const cumulativeBudget = Math.round(monthlyBudget * (idx + 1) * 100) / 100;
      const label = new Date(m.year, m.month).toLocaleString('pt', { month: 'short' }).replace('.', '');

      return {
        name: label,
        key: m.key,
        'Gasto Real': Math.round(cumulativeActual * 100) / 100,
        'Orçamentado': cumulativeBudget,
      };
    });

    return { data, totalBudget };
  }, [budgets, expenses]);

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

      {/* Chart: Cumulative expenses vs budget */}
      {chartData && chartData.data.length > 0 && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="mb-4">
            <h3 className="font-bold text-lg text-slate-800">Despesas vs Orçamento</h3>
            <p className="text-xs text-slate-500 mt-1">Evolução cumulativa dos gastos reais face ao orçamentado ({chartData.totalBudget.toFixed(2)} €)</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData.data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} tickFormatter={(v) => `${v}€`} />
              <Tooltip formatter={(value) => [`${Number(value).toFixed(2)} €`]} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
              <Legend wrapperStyle={{ paddingTop: '12px' }} />
              <Line type="monotone" dataKey="Orçamentado" stroke="#94a3b8" strokeWidth={2} strokeDasharray="6 4" dot={false} />
              <Line type="monotone" dataKey="Gasto Real" stroke="#2563eb" strokeWidth={3} dot={{ fill: '#2563eb', r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="space-y-4">
        {periodGroups.map((period) => {
          const isPeriodExpanded = expandedPeriods[period.id] || false;

          return (
            <div key={period.id} className={`bg-white rounded-3xl border ${period.isCurrent ? 'border-blue-100 ring-1 ring-blue-50' : 'border-slate-100'} shadow-sm overflow-hidden`}>
              <div className={`p-5 flex justify-between items-center cursor-pointer transition-colors ${!isPeriodExpanded ? 'hover:bg-slate-50' : ''}`} onClick={() => setExpandedPeriods({...expandedPeriods, [period.id]: !isPeriodExpanded})}>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${period.isCurrent ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-100 text-slate-500'}`}>
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg capitalize">{period.label}</h3>
                    <p className="text-xs text-slate-500">{period.months.length} {period.months.length === 1 ? 'mês' : 'meses'} com despesas{period.totalBudget ? ` · Orçamento: ${period.totalBudget.toFixed(2)} €` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Total Período</p>
                    <p className={`font-bold text-lg ${period.isCurrent ? 'text-blue-600' : 'text-slate-900'}`}>{period.total.toFixed(2)} €</p>
                  </div>
                  {isPeriodExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
              </div>

              {isPeriodExpanded && (
                <div className="px-4 pb-4 space-y-3 animate-in fade-in duration-300">
                  {period.months.map((key) => {
                    const group = groupedExpenses[key];
                    const isCurrent = key === currentMonthKey;
                    const isExpanded = expandedMonths[key] !== undefined ? expandedMonths[key] : isCurrent;

                    return (
                      <div key={key} className={`rounded-2xl border ${isCurrent ? 'border-blue-100' : 'border-slate-100'} overflow-hidden bg-slate-50/50`}>
                        <div className={`px-4 py-3.5 flex justify-between items-center cursor-pointer transition-colors ${!isExpanded ? 'hover:bg-slate-100/50' : ''}`} onClick={() => setExpandedMonths({...expandedMonths, [key]: !isExpanded})}>
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${isCurrent ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                              <Receipt className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-slate-700 capitalize text-sm">{group.label}</h4>
                              <p className="text-xs text-slate-400">{group.items.length} despesas</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <p className={`font-bold text-sm ${isCurrent ? 'text-blue-600' : 'text-slate-700'}`}>{group.total.toFixed(2)} €</p>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-4 pb-4 animate-in fade-in duration-300">
                            <div className="bg-white rounded-xl overflow-hidden border border-slate-100">
                              <table className="w-full text-left text-sm">
                                <thead>
                                  <tr className="bg-slate-100/50 text-slate-500 border-b border-slate-200">
                                    <th className="px-4 py-3 font-semibold">Data</th>
                                    <th className="px-4 py-3 font-semibold">Tipo</th>
                                    <th className="px-4 py-3 font-semibold">Rubrica</th>
                                    <th className="px-4 py-3 font-semibold text-right">Valor</th>
                                    <th className="px-4 py-3 font-semibold text-center">Fatura</th>
                                    {isAdmin && <th className="px-4 py-3 font-semibold text-center w-24">Ações</th>}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {group.items.sort((a,b) => new Date(b.date) - new Date(a.date)).map((item) => (
                                    <tr key={item.firestoreId} className="hover:bg-slate-50/50 transition-colors">
                                      <td className="px-4 py-3 text-slate-500 font-medium">{new Date(item.date).toLocaleDateString('pt')}</td>
                                      <td className="px-4 py-3 text-slate-500 text-xs">{item.expenseType ? <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-semibold">{item.expenseType}</span> : <span className="text-slate-300">—</span>}</td>
                                      <td className="px-4 py-3 text-slate-700 font-bold">{item.rubric}</td>
                                      <td className="px-4 py-3 text-slate-900 font-black text-right">{item.amount.toFixed(2)} €</td>
                                      <td className="px-4 py-3 text-center">
                                        {item.invoiceUrl ? (
                                          <a href={item.invoiceUrl} target="_blank" rel="noopener noreferrer" title={item.invoiceFileName?.replace(/^\d+_/, '') || 'Fatura'} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors">
                                            <Download className="w-4 h-4" />
                                          </a>
                                        ) : (
                                          <span className="text-slate-300">—</span>
                                        )}
                                      </td>
                                      {isAdmin && (
                                        <td className="px-4 py-3">
                                          <div className="flex items-center justify-center gap-1">
                                            <button onClick={() => setEditingExpense(item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                                            <button onClick={() => handleDelete(item.firestoreId)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                          </div>
                                        </td>
                                      )}
                                    </tr>
                                  ))}
                                  <tr className="bg-blue-50/30">
                                    <td colSpan="3" className="px-4 py-3 text-blue-900 font-bold text-right">Total do Mês</td>
                                    <td className="px-4 py-3 text-blue-700 font-black text-right">{group.total.toFixed(2)} €</td>
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

