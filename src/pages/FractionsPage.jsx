import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut as firebaseSignOut } from 'firebase/auth';
import { setDoc, updateDoc, deleteDoc, doc, collection } from 'firebase/firestore';
import { firebaseConfig, auth } from '../config/firebase.js';
import { Plus, X, Edit2, Trash2 } from 'lucide-react';

function FractionsPage({ users, quotas, isAdmin, db, appId, budgets, currentUser, t, selectedCondoId }) {
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newFraction, setNewFraction] = useState('');
  const [newPermilagem, setNewPermilagem] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newNif, setNewNif] = useState('');
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  const sortedBudgets = [...budgets].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  const currentBudget = sortedBudgets[0];
  const rfPerc = currentBudget?.reserveFundPercentage ?? 10;
  const monthlyTotal = currentBudget ? currentBudget.totalAmount / 12 : 0;

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
  const now = new Date();

  useEffect(() => {
    if (editingUser) {
      setNewName(editingUser.name || '');
      setNewEmail(editingUser.email || '');
      setNewFraction(editingUser.fraction || '');
      setNewPermilagem(editingUser.permilagem || '');
      setNewPhone(editingUser.phone || '');
      setNewNif(editingUser.nif || '');
      setShowForm(true);
    } else {
      setNewName(''); setNewEmail(''); setNewFraction(''); setNewPermilagem(''); setNewPhone(''); setNewNif('');
    }
  }, [editingUser]);

  const handlePromoteAdmin = async (user) => {
    if (!confirm(t('promoteConfirm', { name: user.name }))) return;
    setLoading(true);
    try {
      const existingAdmin = users.find(u => u.role === 'admin' && u.firestoreId !== user.firestoreId);
      if (existingAdmin) {
        await updateDoc(doc(db, 'condos', selectedCondoId, 'users', existingAdmin.firestoreId), { role: 'user' });
        await updateDoc(doc(db, 'users', existingAdmin.firestoreId), { role: 'user' });
      }
      await updateDoc(doc(db, 'condos', selectedCondoId, 'users', user.firestoreId), { role: 'admin' });
      await updateDoc(doc(db, 'users', user.firestoreId), { role: 'admin' });
      alert('Utilizador promovido a administrador.');
    } catch (err) {
      alert('Erro ao promover administrador: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setMsg({ type: '', text: '' });
    try {
      if (editingUser) {
        await updateDoc(doc(db, 'condos', selectedCondoId, 'users', editingUser.firestoreId), {
          name: newName, fraction: newFraction, permilagem: parseFloat(newPermilagem) || 0, phone: newPhone, nif: parseInt(newNif) || null,
        });
        await updateDoc(doc(db, 'users', editingUser.firestoreId), {
          name: newName, permilagem: parseFloat(newPermilagem) || 0, phone: newPhone, nif: parseInt(newNif) || null,
        });
        setMsg({ type: 'success', text: 'Condómino atualizado!' });
        setTimeout(() => { setShowForm(false); setEditingUser(null); }, 2000);
      } else {
        const secondaryApp = initializeApp(firebaseConfig, `TempApp-${Date.now()}`);
        const secondaryAuth = getAuth(secondaryApp);
        const tempPassword = Math.random().toString(36).slice(-10) + "A1!";
        const userCred = await createUserWithEmailAndPassword(secondaryAuth, newEmail, tempPassword);

        const newUser = {
          id: userCred.user.uid, name: newName, email: newEmail, fraction: newFraction,
          permilagem: parseFloat(newPermilagem) || 0, phone: newPhone, nif: parseInt(newNif) || null,
          role: 'user', condoId: selectedCondoId
        };

        await setDoc(doc(db, 'condos', selectedCondoId, 'users', userCred.user.uid), newUser);
        await setDoc(doc(db, 'users', userCred.user.uid), {
          name: newName, email: newEmail, role: 'user',
          permilagem: parseFloat(newPermilagem) || 0, phone: newPhone, nif: parseInt(newNif) || null,
          condoIds: [selectedCondoId]
        }, { merge: true });

        await sendPasswordResetEmail(auth, newEmail);
        await firebaseSignOut(secondaryAuth);
        
        setMsg({ type: 'success', text: 'Condómino adicionado!' });
        setNewName(''); setNewEmail(''); setNewFraction(''); setNewPermilagem(''); setNewPhone(''); setNewNif('');
        setTimeout(() => setShowForm(false), 2000);
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Erro: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!confirm(`Tem a certeza que deseja eliminar o utilizador ${user.name} deste condomínio?`)) return;
    try {
      await deleteDoc(doc(db, 'condos', selectedCondoId, 'users', user.firestoreId));
      alert('Utilizador eliminado do condomínio com sucesso.');
    } catch (err) {
      alert('Erro ao eliminar: ' + err.message);
    }
  };

  const fractionsList = users.map(user => {
    const perm = parseFloat(user.permilagem) || 0;
    const quotaBase = (monthlyTotal * (perm / 1000));
    const reserveFund = quotaBase * (rfPerc / 100);
    const totalMonthly = quotaBase + reserveFund;
    const debtMonths = months.filter(m => {
      const monthKey = `${m.getFullYear()}-${m.getMonth()}`;
      const isPaid = quotas.some(q => q.userId === user.firestoreId && q.monthKey === monthKey);
      return !isPaid && (m.getFullYear() < now.getFullYear() || (m.getFullYear() === now.getFullYear() && m.getMonth() <= now.getMonth()));
    });
    const debt = debtMonths.length * totalMonthly;
    return { ...user, debt };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
        <div><h2 className="text-[26px] font-bold text-slate-800">Frações</h2></div>
        {isAdmin && (
          <button onClick={() => { setShowForm(!showForm); setEditingUser(null); }} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-xl font-semibold active:bg-blue-700 transition-colors">
            {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />} {showForm ? 'Cancelar' : 'Adicionar'}
          </button>
        )}
      </div>

      {showForm && isAdmin && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="font-semibold mb-5 text-lg">{editingUser ? 'Editar Condómino' : 'Novo Condómino'}</h3>
          {msg.text && <div className={`mb-5 p-4 rounded-xl text-sm font-medium ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 ml-1">Nome</label>
              <input required type="text" placeholder="Nome completo" value={newName} onChange={e => setNewName(e.target.value)} className="w-full px-4 py-3.5 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 ml-1">E-mail</label>
              <input required type="email" placeholder="E-mail" value={newEmail} onChange={e => setNewEmail(e.target.value)} disabled={!!editingUser} className="w-full px-4 py-3.5 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 ml-1">Fração</label>
              <input required type="text" placeholder="Fração (Ex: 1º Esq)" value={newFraction} onChange={e => setNewFraction(e.target.value)} className="w-full px-4 py-3.5 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 ml-1">Permilagem</label>
              <input required type="number" step="0.01" placeholder="Permilagem (Ex: 15.5)" value={newPermilagem} onChange={e => setNewPermilagem(e.target.value)} className="w-full px-4 py-3.5 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 ml-1">{t('phoneLabel')}</label>
              <input type="text" placeholder={t('phonePlaceholder')} value={newPhone} onChange={e => setNewPhone(e.target.value)} className="w-full px-4 py-3.5 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 ml-1">{t('nifLabel')}</label>
              <input type="number" placeholder={t('nifPlaceholder')} value={newNif} onChange={e => setNewNif(e.target.value)} className="w-full px-4 py-3.5 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="mt-5 w-full bg-slate-900 text-white px-6 py-4 rounded-xl font-semibold disabled:opacity-50 transition-all active:scale-[0.98]">
            {loading ? 'A processar...' : (editingUser ? 'Atualizar Dados' : 'Guardar Condómino')}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fractionsList.map(frac => (
          <div key={frac.firestoreId} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between group">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-xl tracking-tight">{frac.fraction}</h3>
                <p className="text-slate-500 text-[15px] mt-1">{frac.name}</p>
                <p className="text-slate-400 text-xs mt-1 font-medium">{frac.email}</p>
                {frac.phone && <p className="text-slate-400 text-xs mt-1 font-medium">{frac.phone}</p>}
                {frac.nif && <p className="text-slate-400 text-xs mt-1 font-medium">NIF: {frac.nif}</p>}
                <p className="text-slate-400 text-xs mt-1 font-medium">Permilagem: {frac.permilagem || 0} ‰</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                {frac.role === 'admin' ? (
                  <span className="bg-blue-50 text-blue-700 text-[10px] px-2 py-1 rounded-lg font-bold tracking-wide uppercase">Admin</span>
                ) : (
                  currentUser.role === 'backoffice' && (
                    <button 
                      onClick={() => handlePromoteAdmin(frac)}
                      className="bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-700 text-[10px] px-2 py-1 rounded-lg font-bold tracking-wide uppercase transition-colors"
                    >
                      {t('promoteAdmin')}
                    </button>
                  )
                )}
                {isAdmin && (
                  <div className="flex gap-1">
                    <button onClick={() => setEditingUser(frac)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Editar">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteUser(frac)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Eliminar">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
              <span className="text-sm font-medium text-slate-400">Estado</span>
              {frac.debt > 0 ? <span className="text-red-600 font-bold bg-red-50 px-3 py-1.5 rounded-xl text-sm">Em dívida</span> : <span className="text-green-600 font-bold bg-green-50 px-3 py-1.5 rounded-xl text-sm">Regular</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FractionsPage;

