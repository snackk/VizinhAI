import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { CalendarDays, Plus, Trash2, X, ChevronDown, ChevronUp, Save } from 'lucide-react';

export default function CalendarPage({ db, selectedCondoId, t }) {
  const [events, setEvents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [hour, setHour] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const expandedRef = useRef(null);

  useEffect(() => {
    if (!selectedCondoId) return;
    const ref = collection(db, `condos/${selectedCondoId}/events`);
    const unsub = onSnapshot(ref, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      items.sort((a, b) => (a.date > b.date ? 1 : -1));
      setEvents(items);
    });
    return unsub;
  }, [db, selectedCondoId]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (expandedRef.current && !expandedRef.current.contains(e.target)) {
        setExpandedId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (expandedId) {
      const event = events.find(e => e.id === expandedId);
      if (event) {
        setEditData({ name: event.name, date: event.date, hour: event.hour || '', notes: event.notes || '' });
      }
    }
  }, [expandedId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name || !date) return;
    setLoading(true);
    try {
      await addDoc(collection(db, `condos/${selectedCondoId}/events`), {
        name,
        date,
        hour: hour || null,
        notes: notes || null,
        createdAt: Timestamp.now(),
      });
      setName(''); setDate(''); setHour(''); setNotes('');
      setShowForm(false);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleDelete = async (eventId) => {
    if (!confirm(t('calendarDeleteConfirm'))) return;
    await deleteDoc(doc(db, `condos/${selectedCondoId}/events`, eventId));
  };

  const handleUpdate = async (eventId) => {
    if (!editData.name || !editData.date) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, `condos/${selectedCondoId}/events`, eventId), {
        name: editData.name,
        date: editData.date,
        hour: editData.hour || null,
        notes: editData.notes || null,
      });
      setExpandedId(null);
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  const formatDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('calendar')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t('calendarDesc')}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> {t('calendarNewEvent')}
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-800/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">{t('calendarNewEvent')}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('calendarEventName')} *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('calendarEventDate')} *</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('calendarEventHour')}</label>
                <input type="time" value={hour} onChange={e => setHour(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('calendarEventNotes')}</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none" />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
                {loading ? t('saving') : t('calendarCreateEvent')}
              </button>
            </form>
          </div>
        </div>
      )}

      {events.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>{t('calendarNoEvents')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map(event => {
            const isExpanded = expandedId === event.id;
            return (
              <div
                key={event.id}
                ref={isExpanded ? expandedRef : null}
                className={`bg-white rounded-2xl p-4 shadow-sm border border-slate-100 cursor-pointer transition-all ${isExpanded ? 'ring-2 ring-blue-200' : 'hover:shadow-md'}`}
                onClick={() => { if (!isExpanded) { setExpandedId(event.id); } }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800">{event.name}</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {formatDate(event.date)}{event.hour ? ` · ${event.hour}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {isExpanded && (
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(event.id); }} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-xl transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-3" onClick={e => e.stopPropagation()}>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">{t('calendarEventName')}</label>
                      <input type="text" value={editData.name || ''} onChange={e => setEditData({ ...editData, name: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">{t('calendarEventDate')}</label>
                        <input type="date" value={editData.date || ''} onChange={e => setEditData({ ...editData, date: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">{t('calendarEventHour')}</label>
                        <input type="time" value={editData.hour || ''} onChange={e => setEditData({ ...editData, hour: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">{t('calendarEventNotes')}</label>
                      <textarea value={editData.notes || ''} onChange={e => setEditData({ ...editData, notes: e.target.value })} rows={2} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none" />
                    </div>
                    <button onClick={() => handleUpdate(event.id)} disabled={saving} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
                      <Save className="w-3.5 h-3.5" /> {saving ? t('saving') : t('save')}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

