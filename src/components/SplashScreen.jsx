import React from 'react';

/** Branded loading screen shown while Firebase Auth/session state is resolving. Mirrors public/splash.png's design. */
function SplashScreen() {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-blue-500 via-blue-600 to-blue-900">
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white opacity-[0.07]" />
      <div className="absolute top-1/3 -left-16 w-52 h-52 rounded-full bg-white opacity-[0.06]" />
      <div className="absolute -bottom-24 -left-16 w-96 h-96 rounded-full bg-blue-900 opacity-30" />
      <div className="absolute bottom-16 -right-10 w-64 h-64 rounded-full bg-blue-900 opacity-25" />

      <img src="/logo.png" alt="VizinhAI" className="w-20 h-20 rounded-2xl shadow-lg relative z-10" />
      <h1 className="text-2xl font-bold text-white tracking-tight mt-5 relative z-10">VizinhAI</h1>
      <p className="text-blue-100 mt-1.5 text-sm font-medium relative z-10">Gestão de Condomínio simplificada.</p>

      <div className="mt-8 flex gap-1.5 relative z-10">
        <span className="w-2 h-2 rounded-full bg-white/70 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2 h-2 rounded-full bg-white/70 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2 h-2 rounded-full bg-white/70 animate-bounce" />
      </div>
    </div>
  );
}

export default SplashScreen;
