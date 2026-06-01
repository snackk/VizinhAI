import React, { useState, useEffect } from 'react';
import { updateDoc, doc } from 'firebase/firestore';
import { Home, Settings, AlertCircle, FileText, User } from 'lucide-react';

function CondoPage({ condo, isAdmin, db, appId, users, t, selectedCondoId }) {
  const [isEditing, setIsEditing] = useState(!condo);
  const [formData, setFormData] = useState(condo || { name: '', address: '', nif: '', iban: '' });
  const [saving, setSaving] = useState(false);

  const currentAdmin = users.find(u => u.role === 'admin');

  useEffect(() => { 
    if (condo) {
      setFormData(condo);
      setIsEditing(false);
    } else if (isAdmin) {
      setIsEditing(true);
    }
  }, [condo, isAdmin]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateDoc(doc(db, 'condos', selectedCondoId), formData);
      setIsEditing(false);
    } catch (err) {
      alert('Erro ao guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!condo && !isAdmin) return <div className="p-8 text-center bg-white rounded-3xl border border-slate-100 shadow-sm"><AlertCircle className="w-12 h-12 text-orange-400 mx-auto mb-4" /> <p className="text-slate-600 font-medium">Os dados do condomínio ainda não foram configurados pelo administrador.</p></div>;
  if (!condo && !isEditing) return <div className="p-8 text-center">A carregar dados do condomínio...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pt-2">
        <h2 className="text-[26px] font-bold text-slate-800 tracking-tight">Condomínio</h2>
        {isAdmin && !isEditing && (
          <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
            <Settings className="w-4 h-4" /> Editar
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1 ml-1 text-slate-700">Nome do Condomínio</label>
            <input required className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 ml-1 text-slate-700">Morada</label>
            <input required className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 ml-1 text-slate-700">Contribuinte (NIF)</label>
              <input required className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={formData.nif || ''} onChange={e => setFormData({...formData, nif: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 ml-1 text-slate-700">IBAN</label>
              <input required className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={formData.iban || ''} onChange={e => setFormData({...formData, iban: e.target.value})} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold disabled:opacity-50">
              {saving ? 'A guardar...' : 'Guardar Alterações'}
            </button>
            <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-3 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50">Cancelar</button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-blue-100 ring-1 ring-blue-50 shadow-sm overflow-hidden">
            <div className="p-5 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                  <Home className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800">{condo.name}</h3>
                    <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Entidade</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{condo.address}</p>
                </div>
              </div>
            </div>

            <div className="px-5 pb-6">
              <div className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-100">
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Morada Oficial</p>
                    <p className="text-slate-700 font-medium text-lg leading-relaxed">{condo.address}</p>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Contribuinte (NIF)</p>
                      <p className="text-slate-900 font-bold text-xl tracking-tight">{condo.nif}</p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">IBAN para Pagamentos</p>
                      <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                        <p className="text-blue-700 font-mono font-bold text-lg">{condo.iban}</p>
                        <button onClick={() => {navigator.clipboard.writeText(condo.iban); alert('IBAN copiado!');}} className="text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition-colors">
                          <FileText className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {currentAdmin && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-5 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-slate-100 text-slate-500">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800">{t('currentAdmin')}</h3>
                      <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Gestão</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Responsável pela administração</p>
                  </div>
                </div>
              </div>

              <div className="px-5 pb-6">
                <div className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-100">
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                      <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-2xl shrink-0 border-4 border-white shadow-sm">
                        {currentAdmin.name?.charAt(0) || 'A'}
                      </div>
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
                        <div className="space-y-1">
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t('adminName')}</p>
                          <p className="text-slate-800 font-bold text-lg">{currentAdmin.name}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t('adminEmail')}</p>
                          <p className="text-slate-900 font-medium">{currentAdmin.email}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t('adminPhone')}</p>
                          <p className="text-slate-900 font-medium">{currentAdmin.phone || '---'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CondoPage;

