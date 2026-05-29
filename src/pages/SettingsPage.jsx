import React, { useState } from 'react';
import { updateDoc, doc } from 'firebase/firestore';

function SettingsPage({ currentUser, db, appId, t, selectedCondoId }) {
  const [name, setName] = useState(currentUser.name);
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [nif, setNif] = useState(currentUser.nif || '');
  const [language, setLanguage] = useState(currentUser.language || 'pt');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setMessage({ type: '', text: '' });
    try {
      const userUpdate = { name, phone, nif: parseInt(nif) || null, language };
      await updateDoc(doc(db, 'users', currentUser.firestoreId), userUpdate);
      if (selectedCondoId) {
        try {
          await updateDoc(doc(db, 'condos', selectedCondoId, 'users', currentUser.firestoreId), userUpdate);
        } catch (err) {
          console.warn("Não foi possível atualizar perfil no contexto do condomínio:", err);
        }
      }
      setMessage({ type: 'success', text: t('profileSaved') });
    } catch (err) {
      setMessage({ type: 'error', text: t('errorSaving') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="pt-2"><h2 className="text-[26px] font-bold text-slate-800">{t('settings')}</h2></div>
      <form onSubmit={handleSave} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        {message.text && <div className={`p-4 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{message.text}</div>}
        <div>
          <label className="block text-sm font-semibold mb-2 ml-1 text-slate-700">{t('nameLabel')}</label>
          <input required type="text" className="w-full px-5 py-3.5 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2 ml-1 text-slate-700">{t('phoneLabel')}</label>
          <input type="text" className="w-full px-5 py-3.5 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('phonePlaceholder')} value={phone} onChange={e => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2 ml-1 text-slate-700">{t('nifLabel')}</label>
          <input type="number" className="w-full px-5 py-3.5 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('nifPlaceholder')} value={nif} onChange={e => setNif(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2 ml-1 text-slate-700">{t('languageLabel')}</label>
          <select
            className="w-full px-5 py-3.5 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            value={language} onChange={e => setLanguage(e.target.value)}
          >
            <option value="pt">Português</option>
            <option value="en">English</option>
            <option value="fr">Français</option>
          </select>
        </div>
        <button type="submit" disabled={saving} className="w-full bg-blue-600 active:bg-blue-700 text-white px-6 py-4 rounded-xl font-semibold disabled:opacity-50">
          {saving ? t('saving') : t('save')}
        </button>
      </form>
    </div>
  );
}

export default SettingsPage;

