import React, { useState } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebase.js';
import { Home, Lock, AlertCircle, CheckCircle } from 'lucide-react';

function LoginScreen({ t }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError('Credenciais incorretas ou conta inexistente.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setResetSuccess(false);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSuccess(true);
    } catch (err) {
      setError(t('errorReset'));
    } finally {
      setLoading(false);
    }
  };

  if (showReset) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 safe-pt safe-pb">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
          <div className="bg-blue-600 px-6 py-10 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-blue-500 opacity-20"></div>
            <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 rounded-full bg-blue-700 opacity-20"></div>
            
            <div className="bg-white/20 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm shadow-inner relative z-10">
              <Lock className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight relative z-10">{t('resetPassword')}</h1>
          </div>
          
          <div className="p-8">
            {error && <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-100 rounded-xl text-sm flex items-start gap-3"><AlertCircle className="w-5 h-5 shrink-0" /><span>{error}</span></div>}
            {resetSuccess && <div className="mb-6 p-4 bg-green-50 text-green-700 border border-green-100 rounded-xl text-sm flex items-start gap-3"><CheckCircle className="w-5 h-5 shrink-0" /><span>{t('resetSent')}</span></div>}
            
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 ml-1">E-mail</label>
                <input type="email" required className="w-full px-5 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="O seu e-mail" />
              </div>
              <div className="pt-2">
                <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-70 flex justify-center items-center gap-2">
                  {loading ? <span className="animate-pulse">A enviar...</span> : t('sendResetLink')}
                </button>
              </div>
              <button type="button" onClick={() => { setShowReset(false); setError(''); setResetSuccess(false); }} className="w-full text-center text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors pt-2">
                {t('backToLogin')}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 safe-pt safe-pb">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-blue-600 px-6 py-10 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-blue-500 opacity-20"></div>
          <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 rounded-full bg-blue-700 opacity-20"></div>
          
          <div className="bg-white/20 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm shadow-inner relative z-10">
            <Home className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight relative z-10">VizinhAI</h1>
          <p className="text-blue-100 mt-2 text-sm font-medium relative z-10">A gestão do seu condomínio na palma da mão.</p>
        </div>
        
        <div className="p-8">
          {error && <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-100 rounded-xl text-sm flex items-start gap-3"><AlertCircle className="w-5 h-5 shrink-0" /><span>{error}</span></div>}
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 ml-1">E-mail</label>
              <input type="email" required className="w-full px-5 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="O seu e-mail" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2 ml-1">
                <label className="block text-sm font-medium text-slate-700">Palavra-passe</label>
                <button type="button" onClick={() => { setShowReset(true); setError(''); setResetSuccess(false); }} className="text-xs font-semibold text-blue-600 hover:text-blue-700">{t('forgotPassword')}</button>
              </div>
              <input type="password" required className="w-full px-5 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="pt-2">
              <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-70 flex justify-center items-center gap-2">
                {loading ? <span className="animate-pulse">A entrar...</span> : 'Iniciar Sessão'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;

