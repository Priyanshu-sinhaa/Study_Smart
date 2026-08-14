'use client';

import React, { useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, LayoutGrid, Cpu, ListRestart } from 'lucide-react';

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // If already authenticated, redirect to secure canvas workspace
  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/canvas');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#050b14] text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-cyber-cyan border-t-transparent"></div>
        <p className="mt-4 text-xs font-bold text-cyber-cyan/60 uppercase tracking-widest">Checking Authentication...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050b14] text-white flex flex-col relative overflow-hidden font-sans select-none selection:bg-cyber-cyan/30">
      
      {/* Cyberpunk dot background grid pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(0,240,255,0.06)_1.5px,transparent_1.5px)] [background-size:24px_24px] pointer-events-none z-0"></div>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyber-cyan/5 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-cyber-magenta/5 rounded-full blur-[90px] pointer-events-none z-0"></div>

      {/* Header bar */}
      <header className="h-20 px-6 max-w-7xl mx-auto w-full flex items-center justify-between border-b border-white/5 z-10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="bg-miro-yellow text-miro-ink w-8 h-8 rounded-lg flex items-center justify-center font-black shadow-md shadow-neon-yellow select-none">
            C
          </div>
          <div>
            <h1 className="font-extrabold text-xs tracking-tight leading-none text-white uppercase">
              Concept Canvas
            </h1>
            <span className="text-[9px] text-cyber-cyan font-bold tracking-wider">
              Internal AI Tool
            </span>
          </div>
        </div>

        <button
          onClick={() => signIn('credentials', { username: 'developer', callbackUrl: '/canvas' })}
          className="border border-white/10 hover:border-cyber-cyan/50 hover:text-cyber-cyan transition-all px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 bg-white/5 hover:bg-cyber-cyan/5 cursor-pointer"
        >
          Developer Bypass
        </button>
      </header>

      {/* Main Hero Panel */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full px-6 text-center z-10 py-10">
        
        {/* Sparkle Tag */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/20 text-cyber-cyan text-[10px] font-black uppercase tracking-wider mb-6 animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          Classroom Blackboard Explanations Powered by AI
        </div>

        {/* Big Catchy Title */}
        <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.1] mb-6 max-w-3xl">
          Visual Study Maps on an <br />
          <span className="bg-gradient-to-r from-cyber-cyan via-miro-yellow to-cyber-magenta bg-clip-text text-transparent">
            Infinite Whiteboard Canvas
          </span>
        </h2>

        {/* Pitch Statement */}
        <p className="text-sm md:text-base text-gray-400 max-w-2xl leading-relaxed mb-10">
          Turn dry course PDFs, slides, and codebase walkthroughs into organic, handwritten tuition whiteboard flows. 
          Highlight terms to branch explanations and review layouts scoped safely to your login context.
        </p>

        {/* CTA Login Dialog Box */}
        <div className="bg-slate-900/60 border border-white/5 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full shadow-2xl relative mb-12 hover:border-cyber-cyan/20 transition-all duration-300">
          <h3 className="font-extrabold text-base mb-2">Internal Workspace Access</h3>
          <p className="text-xs text-gray-400 mb-6 leading-relaxed">
            Authorized team members only. Access requires login via corporate Google account.
          </p>

          <button
            onClick={() => signIn('google', { callbackUrl: '/canvas' })}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-cyber-cyan to-miro-blue hover:opacity-90 active:scale-95 text-slate-950 text-sm font-black rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-cyber-cyan/20 cursor-pointer mb-3"
          >
            Sign In with Google Account
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>
          
          <button
            onClick={() => signIn('credentials', { username: 'developer', callbackUrl: '/canvas' })}
            className="w-full py-2.5 px-6 border border-white/10 hover:border-cyber-cyan/40 bg-white/5 hover:bg-cyber-cyan/5 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Offline Developer Bypass Login
          </button>
        </div>

        {/* Features Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left pt-6">
          <div className="p-5 bg-white/2 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
            <LayoutGrid className="w-5 h-5 text-cyber-cyan mb-3" />
            <h4 className="text-xs uppercase font-extrabold tracking-wider text-white mb-2">Infinite Board</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Drag, zoom, and link visual notes. Map sub-definitions dynamically in real-time.
            </p>
          </div>

          <div className="p-5 bg-white/2 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
            <Cpu className="w-5 h-5 text-miro-yellow mb-3" />
            <h4 className="text-xs uppercase font-extrabold tracking-wider text-white mb-2">Universal LLM</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Branch tutoring logic using Groq Llama 3 or Grok models. Support custom API keys.
            </p>
          </div>

          <div className="p-5 bg-white/2 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
            <ListRestart className="w-5 h-5 text-cyber-magenta mb-3" />
            <h4 className="text-xs uppercase font-extrabold tracking-wider text-white mb-2">Spaced Repetition</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Save key insights to a personal revision list and recall coordinate highlights on click.
            </p>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="h-16 px-6 max-w-7xl mx-auto w-full flex items-center justify-between text-[10px] text-gray-500 border-t border-white/5 z-10 shrink-0 select-none">
        <span>© 2026 Conversational Concept Canvas. All rights reserved.</span>
        <span>Secure Internal Learning Network</span>
      </footer>

    </div>
  );
}
