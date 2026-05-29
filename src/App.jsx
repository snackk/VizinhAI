import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { auth, db, storage, appId } from './config/firebase.js';
import {
  Home, Receipt, PieChart, Users, LogOut, Menu, X,
  AlertCircle, ShieldAlert, FolderOpen, Wallet,
  TrendingUp, Settings, Calendar, Mail
} from 'lucide-react';

import NavItem from './components/NavItem.jsx';
import LoginScreen from './components/LoginScreen.jsx';
import CondoSelectionScreen from './components/CondoSelectionScreen.jsx';

import AdminDashboard from './pages/AdminDashboard.jsx';
import UserDashboard from './pages/UserDashboard.jsx';
import CondoPage from './pages/CondoPage.jsx';
import DocumentsPage from './pages/DocumentsPage.jsx';
import ExpensesPage from './pages/ExpensesPage.jsx';
import BudgetsPage from './pages/BudgetsPage.jsx';
import CurrentAccountPage from './pages/CurrentAccountPage.jsx';
import FractionsPage from './pages/FractionsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import MailsPage from './pages/MailsPage.jsx';
import AssembleiasPage from './pages/AssembleiasPage.jsx';
import CondosPage from './pages/CondosPage.jsx';

function App() {
  const { t, i18n } = useTranslation();
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedCondoId, setSelectedCondoId] = useState(null);
  const [allCondos, setAllCondos] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleCondoSelect = (id) => {
    if (id === 'new') {
      setActiveTab('condos');
      setSelectedCondoId('temp-new');
    } else {
      setSelectedCondoId(id);
    }
  };
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (currentUser?.language && currentUser.language !== i18n.language) {
      i18n.changeLanguage(currentUser.language);
    }
  }, [currentUser]);

  const [users, setUsers] = useState([]);
  const [quotas, setQuotas] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [docTypes, setDocTypes] = useState([]);
  const [condo, setCondo] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            setCurrentUser({ firestoreId: docSnap.id, ...userData });

            if (!selectedCondoId) {
              if (userData.role !== 'backoffice' && userData.condoIds?.length === 1) {
                setSelectedCondoId(userData.condoIds[0]);
              }
            }
          } else {
            const legacyUserDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid);
            onSnapshot(legacyUserDocRef, (legacySnap) => {
              if (legacySnap.exists()) {
                setCurrentUser({ firestoreId: legacySnap.id, ...legacySnap.data(), condoIds: [appId] });
                if (!selectedCondoId) setSelectedCondoId(appId);
              } else {
                setCurrentUser(null);
              }
            });
          }
        });
      } else {
        setCurrentUser(null);
        setSelectedCondoId(null);
      }
      setIsFirebaseReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!firebaseUser || !currentUser) {
      setAllCondos([]);
      return;
    }

    if (currentUser.role !== 'backoffice' && (!currentUser.condoIds || currentUser.condoIds.length <= 1)) {
      return;
    }

    const unsubCondos = onSnapshot(collection(db, 'condos'), (snap) => {
      setAllCondos(snap.docs.map(d => ({ firestoreId: d.id, ...d.data() })));
    }, (err) => {
      console.error("Erro ao listar condomínios:", err);
    });
    return () => unsubCondos();
  }, [firebaseUser, currentUser]);

  useEffect(() => {
    if (!firebaseUser || !selectedCondoId) {
      setUsers([]); setQuotas([]); setExpenses([]); setBudgets([]); setDocuments([]); setDocTypes([]); setCondo(null);
      return;
    }

    const getCol = (colName) => collection(db, 'condos', selectedCondoId, colName);

    const unsubUsers = onSnapshot(getCol('users'), (snap) => setUsers(snap.docs.map(d => ({ firestoreId: d.id, ...d.data() }))), (err) => console.error("Erro users:", err));
    const unsubQuotas = onSnapshot(getCol('quotas'), (snap) => setQuotas(snap.docs.map(d => ({ firestoreId: d.id, ...d.data() }))), (err) => console.error("Erro quotas:", err));
    const unsubExpenses = onSnapshot(getCol('expenses'), (snap) => setExpenses(snap.docs.map(d => ({ firestoreId: d.id, ...d.data() }))), (err) => console.error("Erro expenses:", err));
    const unsubBudgets = onSnapshot(getCol('budgets'), (snap) => setBudgets(snap.docs.map(d => ({ firestoreId: d.id, ...d.data() }))), (err) => console.error("Erro budgets:", err));
    const unsubDocs = onSnapshot(getCol('documents'), (snap) => setDocuments(snap.docs.map(d => ({ firestoreId: d.id, ...d.data() }))), (err) => console.error("Erro docs:", err));
    const unsubDocTypes = onSnapshot(getCol('docTypes'), (snap) => setDocTypes(snap.docs.map(d => ({ firestoreId: d.id, ...d.data() }))), (err) => console.error("Erro docTypes:", err));
    const unsubCondo = onSnapshot(doc(db, 'condos', selectedCondoId), (docSnap) => {
      if (docSnap.exists()) {
        setCondo({ firestoreId: docSnap.id, ...docSnap.data() });
      }
    }, (err) => console.error("Erro condo:", err));

    const unsubUserInCondo = onSnapshot(doc(db, 'condos', selectedCondoId, 'users', firebaseUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        const condoUserData = docSnap.data();
        setCurrentUser(prev => ({ ...prev, ...condoUserData }));
      }
    }, (err) => console.error("Erro userInCondo:", err));

    return () => { unsubUsers(); unsubQuotas(); unsubExpenses(); unsubBudgets(); unsubDocs(); unsubDocTypes(); unsubCondo(); unsubUserInCondo(); };
  }, [firebaseUser, selectedCondoId]);

  const handleLogout = () => signOut(auth);

  // Verificação de configuração ausente
  const firebaseConfig = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG || '{}');
  if (Object.keys(firebaseConfig).length === 0) {
    return <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
      <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
      <h2 className="text-xl font-bold text-slate-800">Firebase não configurado</h2>
      <p className="text-slate-500 mt-2">A aguardar injeção das variáveis de ambiente ou atualização do JSON.</p>
    </div>;
  }

  if (!isFirebaseReady) return <div className="h-screen w-full flex items-center justify-center bg-slate-50">A carregar o sistema...</div>;
  if (!firebaseUser || !currentUser) return <LoginScreen t={t} />;

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'backoffice';
  const isBackoffice = currentUser.role === 'backoffice';

  if (!selectedCondoId && currentUser.condoIds?.length > 1 || (!selectedCondoId && isBackoffice && activeTab !== 'condos')) {
    return <CondoSelectionScreen currentUser={currentUser} allCondos={allCondos} onSelect={handleCondoSelect} t={t} />;
  }

  const effectiveCondoId = selectedCondoId === 'temp-new' ? null : selectedCondoId;

  const renderContent = () => {
    if (!selectedCondoId && !isBackoffice) {
       return (
         <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
           <AlertCircle className="w-12 h-12 text-orange-400 mb-4" />
           <h2 className="text-xl font-bold text-slate-800">{t('noCondos')}</h2>
         </div>
       );
    }

    if (!selectedCondoId && isBackoffice && activeTab !== 'condos') {
      setActiveTab('condos');
    }

    switch (activeTab) {
      case 'dashboard': return isAdmin ? <AdminDashboard expenses={expenses} quotas={quotas} users={users} budgets={budgets} t={t} /> : <UserDashboard user={currentUser} quotas={quotas} expenses={expenses} budgets={budgets} users={users} t={t} />;
      case 'condo': return <CondoPage condo={condo} isAdmin={isAdmin} db={db} appId={appId} users={users} t={t} selectedCondoId={effectiveCondoId} />;
      case 'documentos': return <DocumentsPage documents={documents} docTypes={docTypes} isAdmin={isAdmin} currentUser={currentUser} db={db} appId={appId} storage={storage} selectedCondoId={effectiveCondoId} />;
      case 'despesas': return <ExpensesPage expenses={expenses} isAdmin={isAdmin} currentUser={currentUser} db={db} appId={appId} selectedCondoId={effectiveCondoId} />;
      case 'orcamentos': return <BudgetsPage budgets={budgets} isAdmin={isAdmin} db={db} appId={appId} selectedCondoId={effectiveCondoId} />;
      case 'conta-corrente': return isAdmin ? <CurrentAccountPage budgets={budgets} users={users} quotas={quotas} isAdmin={isAdmin} db={db} appId={appId} condo={condo} t={t} selectedCondoId={effectiveCondoId} /> : null;
      case 'fracoes': return <FractionsPage users={users} quotas={quotas} isAdmin={isAdmin} db={db} appId={appId} budgets={budgets} currentUser={currentUser} t={t} selectedCondoId={effectiveCondoId} />;
      case 'definicoes': return <SettingsPage currentUser={currentUser} db={db} appId={appId} t={t} selectedCondoId={selectedCondoId} />;
      case 'mails': return (isAdmin || isBackoffice) ? <MailsPage db={db} t={t} selectedCondoId={effectiveCondoId} isBackoffice={isBackoffice} /> : null;
      case 'assembleias': return isAdmin ? <AssembleiasPage db={db} t={t} selectedCondoId={effectiveCondoId} users={users} condo={condo} currentUser={currentUser} /> : null;
      case 'condos': return isBackoffice ? <CondosPage allCondos={allCondos} db={db} t={t} onFirstCreate={() => setSelectedCondoId(null)} /> : null;
      default: return isAdmin ? <AdminDashboard expenses={expenses} quotas={quotas} users={users} budgets={budgets} t={t} /> : null;
    }
  };

  const userRoleLabel = isBackoffice ? t('backoffice') : (isAdmin ? 'Admin' : 'Condómino');

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 safe-pl safe-pr">
      {isMobileMenuOpen && <div className="fixed inset-0 bg-slate-800/60 z-40 lg:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex lg:flex-col lg:shadow-none lg:border-r lg:border-slate-200 safe-pt safe-pb flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg"><Home className="w-5 h-5 text-white" /></div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-500">VizinhAI</span>
          </div>
          <button className="lg:hidden text-slate-400 p-2 hover:bg-slate-100 rounded-full" onClick={() => setIsMobileMenuOpen(false)}><X className="w-6 h-6" /></button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {isBackoffice && <NavItem icon={<ShieldAlert />} label={t('condos')} active={activeTab === 'condos'} onClick={() => { setActiveTab('condos'); setIsMobileMenuOpen(false); }} />}
          {(selectedCondoId || !isBackoffice) && (
            <>
              <NavItem icon={<PieChart />} label={t('summary')} active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} />
              <NavItem icon={<Home />} label={t('condo')} active={activeTab === 'condo'} onClick={() => { setActiveTab('condo'); setIsMobileMenuOpen(false); }} />
              <NavItem icon={<FolderOpen />} label={t('documents')} active={activeTab === 'documentos'} onClick={() => { setActiveTab('documentos'); setIsMobileMenuOpen(false); }} />
              <NavItem icon={<Receipt />} label={t('expenses')} active={activeTab === 'despesas'} onClick={() => { setActiveTab('despesas'); setIsMobileMenuOpen(false); }} />
              <NavItem icon={<Wallet />} label={t('budgets')} active={activeTab === 'orcamentos'} onClick={() => { setActiveTab('orcamentos'); setIsMobileMenuOpen(false); }} />
              {isAdmin && <NavItem icon={<TrendingUp />} label={t('currentAccount')} active={activeTab === 'conta-corrente'} onClick={() => { setActiveTab('conta-corrente'); setIsMobileMenuOpen(false); }} />}
              <NavItem icon={<Users />} label={t('fractions')} active={activeTab === 'fracoes'} onClick={() => { setActiveTab('fracoes'); setIsMobileMenuOpen(false); }} />
              {isAdmin && <NavItem icon={<Mail />} label={t('mails')} active={activeTab === 'mails'} onClick={() => { setActiveTab('mails'); setIsMobileMenuOpen(false); }} />}
              {isAdmin && <NavItem icon={<Calendar />} label={t('assembleias')} active={activeTab === 'assembleias'} onClick={() => { setActiveTab('assembleias'); setIsMobileMenuOpen(false); }} />}
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-100 shrink-0">
          {(isBackoffice || currentUser.condoIds?.length > 1) && (
            <button onClick={() => setSelectedCondoId(null)} className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-blue-600 rounded-xl hover:bg-blue-50 transition-colors mb-2">
              <Calendar className="w-5 h-5" /> {t('switchCondo')}
            </button>
          )}
          <NavItem icon={<Settings />} label={t('settings')} active={activeTab === 'definicoes'} onClick={() => { setActiveTab('definicoes'); setIsMobileMenuOpen(false); }} />
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl mt-2 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
              {currentUser?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{currentUser?.name}</p>
              <p className="text-xs text-slate-500 truncate">{currentUser?.fraction || (isBackoffice ? 'Admin' : '')} {currentUser?.permilagem ? `(${currentUser.permilagem}‰)` : ''} • {userRoleLabel}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-600 rounded-xl hover:bg-red-50 transition-colors">
            <LogOut className="w-5 h-5" /> {t('logout')}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        <header className="mobile-header bg-blue-600 text-white h-16 flex items-center justify-between px-4 lg:hidden shrink-0 shadow-md">
          <div className="w-10 flex justify-start">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-white hover:bg-blue-700 rounded-full transition-colors"><Menu className="w-6 h-6" /></button>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-semibold text-lg tracking-wide">VizinhAI</span>
            {condo && <span className="text-[10px] opacity-80 uppercase font-bold">{condo.name}</span>}
          </div>
          <div className="w-10 flex justify-end">
            {(isBackoffice || currentUser.condoIds?.length > 1) ? (
                <button onClick={() => setSelectedCondoId(null)} className="p-2 text-white hover:bg-blue-700 rounded-full transition-colors"><Calendar className="w-5 h-5" /></button>
            ) : null}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 safe-pb bg-slate-50/50">
          <div className="max-w-5xl mx-auto pb-6">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;

