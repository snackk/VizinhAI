import React from 'react';
import { Coffee, Home } from 'lucide-react';

const PAYPAL_URL = 'https://paypal.me/snackk026';

function AboutPage() {
  const cardClass = 'bg-white rounded-3xl border border-slate-100 shadow-sm p-6';

  return (
    <div className="max-w-xl space-y-6">
      <div className="pt-2">
        <h1 className="text-[26px] font-bold text-slate-800 mb-1">Sobre</h1>
        <p className="text-sm text-slate-500">Informação sobre esta aplicação.</p>
      </div>

      <div className={cardClass}>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
            <Home className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800">VizinhAI</h2>
            <p className="text-xs text-slate-400">Gestão de condomínio simplificada</p>
          </div>
        </div>

        <p className="text-sm text-slate-600">
          Desenvolvido por <span className="font-semibold text-slate-800">Diogo Santos</span>.
        </p>
        <p className="text-xs text-slate-400 mt-2">
          Versão <span className="font-mono">{__APP_VERSION__}</span>
        </p>
      </div>

      <div className={cardClass}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800">Oferece-me um café</h2>
            <p className="text-xs text-slate-500">Se esta aplicação lhe é útil, considere apoiar o seu desenvolvimento.</p>
          </div>
        </div>

        <a
          href={PAYPAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 shadow-sm shadow-amber-600/20 transition-colors"
        >
          <Coffee className="w-4 h-4" /> Pagar um café via PayPal
        </a>
      </div>
    </div>
  );
}

export default AboutPage;
