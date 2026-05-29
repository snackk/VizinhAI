import React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase.js';
import { Home, Plus, LogOut } from 'lucide-react';

function CondoSelectionScreen({ currentUser, allCondos, onSelect, t }) {
  const isBackoffice = currentUser.role === 'backoffice';
  const myCondos = allCondos.filter(c => isBackoffice || currentUser.condoIds?.includes(c.firestoreId));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 safe-pt safe-pb">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-blue-600 p-8 text-center text-white">
          <h1 className="text-2xl font-bold">{t('selectCondo')}</h1>
          <p className="opacity-80 mt-2">{t('chooseCondo')}</p>
        </div>
        <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {myCondos.map(condo => (
            <button
              key={condo.firestoreId}
              onClick={() => onSelect(condo.firestoreId)}
              className="p-6 bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-2xl text-left transition-all group"
            >
              <Home className="w-8 h-8 text-blue-600 mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-bold text-slate-800">{condo.name}</h3>
              <p className="text-sm text-slate-500 mt-1 line-clamp-1">{condo.address}</p>
            </button>
          ))}
          {myCondos.length === 0 && (
            <div className="col-span-full py-12 text-center">
              <div className="bg-slate-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Home className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-500 font-medium mb-6">{t('noCondos')}</p>
              {isBackoffice && (
                <button
                  onClick={() => onSelect('new')}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                >
                  <Plus className="w-5 h-5" /> {t('createCondo')}
                </button>
              )}
            </div>
          )}
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-center">
           <button onClick={() => signOut(auth)} className="text-red-600 font-semibold px-4 py-2 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-2">
             <LogOut className="w-4 h-4" /> {t('logout')}
           </button>
        </div>
      </div>
    </div>
  );
}

export default CondoSelectionScreen;

