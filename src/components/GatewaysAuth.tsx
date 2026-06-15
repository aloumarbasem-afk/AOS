import React, { useState } from 'react';
import { KeyRound, ShieldCheck, Globe, Zap, LogIn, Lock } from 'lucide-react';
import { motion } from 'motion/react';

export const GatewaysAuth: React.FC = () => {
  const [googleConnected, setGoogleConnected] = useState(false);
  const [codexKey, setCodexKey] = useState('');
  const [gatewayEnabled, setGatewayEnabled] = useState(true);

  // Mock connecting to google
  const handleGoogleConnect = () => {
    setGoogleConnected(true);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-8 max-w-4xl mx-auto flex flex-col gap-8 w-full"
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-light tracking-tight leading-none text-white flex items-center gap-3">
          <Globe className="w-8 h-8" /> 
          Global <span className="font-black italic">Gateways</span>
        </h1>
        <p className="text-sm text-white/50 font-mono mt-2">
          Configure authentication for various AI Providers and route traffic through an optimized AI API Gateway.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gemini Auth */}
        <div className="glass-panel glow-border glow-border-emerald p-6 rounded-xl flex flex-col gap-4 transition-all duration-300">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-mono uppercase tracking-widest text-white/80 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" /> Google Gemini API
            </h3>
            {googleConnected && (
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                Connected
              </span>
            )}
          </div>
          <p className="text-xs text-white/50 leading-relaxed">
            Authenticate to enable the Gemini suite across the application. Provides access to 1.5 Pro and 1.5 Flash models.
          </p>
          
          <div className="mt-auto pt-4">
            {!googleConnected ? (
              <button 
                onClick={handleGoogleConnect}
                className="w-full flex items-center justify-center gap-2 bg-white text-black hover:bg-white/90 px-4 py-3 rounded font-bold uppercase text-xs tracking-wider transition-all duration-200 cursor-pointer shadow-lg hover:shadow-white/5 active:scale-[0.98] hover:scale-[1.01]"
              >
                <LogIn className="w-4 h-4" /> Sign in with Google
              </button>
            ) : (
              <div className="w-full flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-4 py-3 rounded font-bold uppercase text-xs tracking-wider cursor-not-allowed">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Authenticated
              </div>
            )}
          </div>
        </div>

        {/* Codex Auth */}
        <div className="glass-panel glow-border glow-border-indigo p-6 rounded-xl flex flex-col gap-4 transition-all duration-300">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-mono uppercase tracking-widest text-white/80 flex items-center gap-2">
              <Code className="w-4 h-4 text-indigo-400" /> Codex Configuration
            </h3>
          </div>
          <p className="text-xs text-white/50 leading-relaxed">
            Provide an API key to access OpenAI automated Codex and GPT logic generation modules for fallback intelligence.
          </p>
          
          <div className="mt-auto pt-4 space-y-3">
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input 
                type="password"
                value={codexKey}
                onChange={(e) => setCodexKey(e.target.value)}
                placeholder="sk-..."
                className="w-full bg-black/50 border border-white/10 p-3 pl-9 rounded text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/40 font-mono transition-all duration-200"
              />
            </div>
            <button className="w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-3 rounded font-bold uppercase text-xs tracking-wider transition-all duration-200 cursor-pointer shadow-lg hover:shadow-indigo-500/10 active:scale-[0.98] hover:scale-[1.01]">
              <Lock className="w-4 h-4" /> Save Codex Key
            </button>
          </div>
        </div>
      </div>

      {/* Unified AI Gateway Wrapper */}
      <div className="bg-gradient-to-br from-[#0D0D0F] to-black border border-white/10 p-6 rounded-xl flex flex-col gap-4 mt-4">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <h3 className="text-sm font-bold tracking-tight text-white mb-1">Unified AI Gateway routing</h3>
            <p className="text-xs text-white/40">Optimize latency and fallback requests across the provider swarm automatically.</p>
          </div>
          <button 
            onClick={() => setGatewayEnabled(!gatewayEnabled)}
            className={`w-12 h-6 rounded-full flex items-center transition-all px-1 ${
              gatewayEnabled ? 'bg-emerald-500 justify-end' : 'bg-white/10 justify-start'
            }`}
          >
            <div className="w-4 h-4 bg-white rounded-full"></div>
          </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
           <div className="bg-black/30 p-3 rounded border border-white/5">
              <span className="text-[10px] text-white/40 uppercase font-mono block mb-1">Status</span>
              <span className={`text-xs font-bold ${gatewayEnabled ? 'text-emerald-400' : 'text-white/50'}`}>
                {gatewayEnabled ? 'Active' : 'Bypassed'}
              </span>
           </div>
           <div className="bg-black/30 p-3 rounded border border-white/5">
              <span className="text-[10px] text-white/40 uppercase font-mono block mb-1">Primary Route</span>
              <span className="text-xs font-bold text-white">Gemini Edge</span>
           </div>
           <div className="bg-black/30 p-3 rounded border border-white/5">
              <span className="text-[10px] text-white/40 uppercase font-mono block mb-1">Fallback Layer</span>
              <span className="text-xs font-bold text-white">Codex / Switch</span>
           </div>
        </div>
      </div>

    </motion.div>
  );
};

// Also define the Code icon internally since we didn't import it at the top
const Code = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6"></polyline>
    <polyline points="8 6 2 12 8 18"></polyline>
  </svg>
);
