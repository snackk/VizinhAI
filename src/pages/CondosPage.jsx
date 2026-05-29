import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { Home, Plus, X, Edit2, Trash2 } from 'lucide-react';

function CondosPage({ allCondos, db, t, onFirstCreate }) {
  const [showForm, setShowForm] = useState(false);
  const [editingCondo, setEditingCondo] = useState(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [nif, setNif] = useState('');
  const [iban, setIban] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (allCondos.length === 0 && !showForm) {
      setShowForm(true);
    }
  }, [allCondos]);

  useEffect(() => {
    if (editingCondo) {
      setName(editingCondo.name || '');
      setAddress(editingCondo.address || '');
      setNif(editingCondo.nif || '');
      setIban(editingCondo.iban || '');
      setShowForm(true);
    } else {
      setName(''); setAddress(''); setNif(''); setIban('');
    }
  }, [editingCondo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const condoData = { name, address, nif, iban };
    try {
      if (editingCondo) {
        await updateDoc(doc(db, 'condos', editingCondo.firestoreId), condoData);
      } else {
        const docRef = await addDoc(collection(db, 'condos'), condoData);
        if (allCondos.length === 0 && onFirstCreate) {
          onFirstCreate(docRef.id);
        }
      }
      setShowForm(false);
      setEditingCondo(null);
    } catch (err) {
      alert('Erro: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (condoId) => {
    if (!confirm(t('confirmDeleteCondo'))) return;
    try {
      await deleteDoc(doc(db, 'condos', condoId));
    } catch (err) {
      alert('Erro ao eliminar: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pt-2">
        <div>
          <h2 className="text-[26px] font-bold text-slate-800 tracking-tight">{t('condos')}</h2>
          <p className="text-slate-500 text-sm mt-1">Gestão global de condomínios no sistema</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditingCondo(null); }} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
          {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />} {showForm ? 'Cancelar' : t('createCondo')}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="font-bold text-lg text-slate-800">{editingCondo ? t('editCondo') : t('createCondo')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 ml-1 uppercase">{t('condoName')}</label>
              <input required value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 ml-1 uppercase">{t('condoAddress')}</label>
              <input required value={address} onChange={e => setAddress(e.target.value)} className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 ml-1 uppercase">{t('condoNif')}</label>
              <input required value={nif} onChange={e => setNif(e.target.value)} className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 ml-1 uppercase">{t('condoIban')}</label>
              <input required value={iban} onChange={e => setIban(e.target.value)} className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl">Cancelar</button>
            <button type="submit" disabled={loading} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold disabled:opacity-50">
              {loading ? 'A processar...' : t('save')}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {allCondos.map(c => (
          <div key={c.firestoreId} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-4">
                <div className="bg-blue-50 p-3 rounded-2xl text-blue-600">
                  <Home className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-800">{c.name}</h3>
                  <p className="text-slate-500 text-sm mt-0.5 line-clamp-1">{c.address}</p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setEditingCondo(c)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(c.firestoreId)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-50 flex justify-between items-center text-xs text-slate-400 font-medium">
              <span>NIF: {c.nif}</span>
              <span className="truncate ml-4">IBAN: {c.iban}</span>
            </div>
          </div>
        ))}
      </div>

      {allCondos.length === 0 && !showForm && (
        <div className="p-16 text-center bg-white rounded-3xl border border-dashed border-slate-200">
          <div className="bg-slate-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Home className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-slate-500 font-medium mb-6">Não existem condomínios registados no sistema.</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
          >
            <Plus className="w-6 h-6" /> {t('createCondo')}
          </button>
        </div>
      )}
    </div>
  );
}

export default CondosPage;

