import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Search, Filter, FileText, Download } from 'lucide-react';

function MailsPage({ db, t, selectedCondoId, isBackoffice }) {
  const [mails, setMails] = useState([]);
  const [search, setSearch] = useState('');
  const [filterError, setFilterError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q = collection(db, 'mail');
    if (!isBackoffice && selectedCondoId) {
      q = query(q, where('condoId', '==', selectedCondoId));
    }

    const unsub = onSnapshot(q, (snap) => {
      setMails(snap.docs.map(d => ({ firestoreId: d.id, ...d.data() })).sort((a, b) => {
        const dateA = a.delivery?.endTime?.toDate?.() || new Date(0);
        const dateB = b.delivery?.endTime?.toDate?.() || new Date(0);
        return dateB - dateA;
      }));
      setLoading(false);
    }, (err) => {
      console.error("Erro ao listar e-mails:", err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredMails = mails.filter(m => {
    const matchesSearch = search === '' || m.message?.attachments?.some(a => a.filename.toLowerCase().includes(search.toLowerCase()));
    const matchesFilter = !filterError || (m.delivery?.state && m.delivery.state !== 'SUCCESS');
    return matchesSearch && matchesFilter;
  });

  const downloadAttachment = (attachment) => {
    const link = document.createElement('a');
    link.href = `data:application/pdf;base64,${attachment.content}`;
    link.download = attachment.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (state) => {
    switch (state) {
      case 'SUCCESS':
        return <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">{t('mailSuccess')}</span>;
      case 'ERROR':
        return <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">{t('mailError')}</span>;
      case 'PROCESSING':
        return <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Enviando</span>;
      default:
        return <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">{state || 'Pendente'}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="pt-2">
        <h2 className="text-[26px] font-bold text-slate-800 tracking-tight">{t('mails')}</h2>
        <p className="text-slate-500 text-sm mt-1">Histórico de comunicações enviadas pelo sistema</p>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder={t('mailSearchPlaceholder')} 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-slate-200 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
        <button 
          onClick={() => setFilterError(!filterError)}
          className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-semibold transition-all border ${filterError ? 'bg-red-50 border-red-200 text-red-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
        >
          <Filter className="w-5 h-5" />
          {t('mailFilterError')}
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <th className="px-6 py-4 font-semibold">{t('mailTo')}</th>
                <th className="px-6 py-4 font-semibold">{t('mailSubject')}</th>
                <th className="px-6 py-4 font-semibold text-center">{t('mailStatus')}</th>
                <th className="px-6 py-4 font-semibold">{t('mailAttachment')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredMails.length > 0 ? filteredMails.map((mail) => (
                <tr key={mail.firestoreId} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900">{mail.to}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-slate-600 line-clamp-1">{mail.message?.subject}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {getStatusBadge(mail.delivery?.state)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {mail.message?.attachments?.map((att, idx) => (
                        <button 
                          key={idx}
                          onClick={() => downloadAttachment(att)}
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium group"
                        >
                          <FileText className="w-4 h-4 text-blue-400 group-hover:text-blue-600" />
                          <span className="truncate max-w-[150px]">{att.filename}</span>
                          <Download className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-slate-500 font-medium">
                    {loading ? 'A carregar e-mails...' : t('mailNoMails')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default MailsPage;

