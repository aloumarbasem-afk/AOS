/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  Terminal, 
  Settings, 
  Layers, 
  Database, 
  FolderTree, 
  FileCode, 
  CheckCircle, 
  Cpu, 
  Copy, 
  Check, 
  AlertCircle, 
  HelpCircle,
  Code,
  Zap,
  RotateCcw,
  GitBranch,
  ShieldAlert,
  Sliders,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { ArchitecturalPlanResponse, FileTreeNode } from './types';

// Preset configurations for user convenience
const PRESETS = [
  {
    title: "SaaS Rendering Reviews",
    prompt: "Build a subscription-based SaaS for architectural rendering reviews with high-concurrency real-time feedback, comments system, Stripe billing, and a PostgreSQL database.",
  },
  {
    title: "Fintech Trading Dashboard",
    prompt: "An ultra-low latency fintech stock trading dashboard. Uses real-time WebSocket streams, Redis cache, high-frequency transaction database, and an automated Playwright testing suite.",
  },
  {
    title: "AI Collaborative Workspace",
    prompt: "A real-time collaborative workspace with canvas drawing. Integrates Gemini API for auto-generating layout modules, Supabase Auth + Database, with modular CSS & Vitest."
  }
];

export default function App() {
  const [prompt, setPrompt] = useState(PRESETS[0].prompt);
  const [preferredFrontend, setPreferredFrontend] = useState('');
  const [preferredBackend, setPreferredBackend] = useState('');
  const [preferredDatabase, setPreferredDatabase] = useState('');
  const [agent, setAgent] = useState('Cursor AI');
  const [agentCount, setAgentCount] = useState<'single' | 'multi'>('single');
  const [isLoading, setIsLoading] = useState(false);
  const [currentLoadingStep, setCurrentLoadingStep] = useState(0);
  const [result, setResult] = useState<ArchitecturalPlanResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  // File explorer interactions
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [expandedDirectories, setExpandedDirectories] = useState<Record<string, boolean>>({
    'root': true,
  });

  const loadingSteps = [
    "Analyzing requirements & core constraints...",
    "Evaluating intelligence stack & recommendations...",
    "Querying Senior Dev intelligence agent...",
    "Synthesizing optimal stack choices...",
    "Drafting database schema & philosophy...",
    "Generating granular authentication & RBAC strategy...",
    "Building interactive tree directory...",
    "Writing custom testing & CI/CD workflow...",
    "Applying high-performance standard layout..."
  ];

  // Simulated compilation effect
  useEffect(() => {
    let interval: any;
    if (isLoading) {
      setCurrentLoadingStep(0);
      interval = setInterval(() => {
        setCurrentLoadingStep((prev) => {
          if (prev >= loadingSteps.length - 1) {
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // Generate the architectural blueprint
  const generateBlueprint = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setResult(null);
    try {
      const response = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt, 
          agents: [agent], 
          preferredFrontend, 
          preferredBackend, 
          preferredDatabase 
        }),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Server error generating plan.');
      }

      const data: ArchitecturalPlanResponse = await response.json();
      setResult(data);
      
      // Auto-select the first boilerplate file if available
      if (data.boilerplates && Object.keys(data.boilerplates).length > 0) {
        setSelectedFilePath(Object.keys(data.boilerplates)[0]);
      } else {
        setSelectedFilePath(null);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'A network error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFile(identifier);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  const toggleDirectory = (dirName: string) => {
    setExpandedDirectories(prev => ({
      ...prev,
      [dirName]: !prev[dirName]
    }));
  };

  // Build the hierarchical visually neat tree nodes
  const renderTreeNodes = (nodes: FileTreeNode[]) => {
    return (
      <div className="font-mono text-xs space-y-1 pl-2">
        {nodes.map((node) => {
          const isDir = node.type === 'directory';
          const parts = node.path.split('/');
          const level = parts.length - 1;
          const label = parts[parts.length - 1];
          const isSelected = selectedFilePath === node.path;
          
          return (
            <div 
              key={node.path}
              id={`node-${node.path.replace(/[^a-zA-Z0-9]/g, '-')}`}
              style={{ paddingLeft: `${level * 12}px` }}
              className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer group transition-all duration-150 ${
                isSelected 
                  ? 'bg-white/10 text-white font-medium border-l-2 border-white' 
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
              onClick={() => {
                if (isDir) {
                  toggleDirectory(node.path);
                } else {
                  setSelectedFilePath(node.path);
                }
              }}
            >
              <span className="opacity-40">
                {isDir ? (
                  expandedDirectories[node.path] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
                ) : (
                  <FileCode className="w-3.5 h-3.5 text-white/60" />
                )}
              </span>
              <span className="truncate">{label}</span>
              {node.shortLabel && (
                <span className="text-[9px] uppercase tracking-wider text-white/30 truncate ml-auto group-hover:text-white/50">
                  {node.shortLabel}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div id="app-root-container" className="min-h-screen bg-[#0A0A0B] text-[#E0E0E0] font-sans flex flex-col justify-between selection:bg-white/20 selection:text-white">
      
      {/* Top Header/Navigation */}
      <nav id="app-top-navbar" className="flex items-center justify-between px-8 py-5 border-b border-white/10 bg-[#0A0A0B]">
        <div id="brand-logo" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white flex items-center justify-center rounded-sm">
            <div className="w-4 h-4 bg-black rotate-45"></div>
          </div>
          <span className="text-xl font-bold tracking-tighter uppercase text-white">Architect.OS</span>
        </div>
        <div id="top-nav-metadata" className="hidden md:flex gap-8 text-[10px] uppercase tracking-[0.2em] font-mono font-medium opacity-60">
          <span>Session: 0x4F2A</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
            Status: {isLoading ? 'Compiling' : 'Ready'}
          </span>
          <span>Role: Principal Architect</span>
        </div>
      </nav>

      {/* Main Grid Workspace */}
      <main id="app-main-workspace" className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-0">
        
        {/* Left column: User Prompts, Agent Select, Trigger button */}
        <div id="left-sidebar-controls" className="lg:col-span-4 p-8 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col gap-6 bg-[#0D0D0F]">
          
          {/* Preset Buttons */}
          <div>
            <h2 id="presets-section-title" className="text-[10px] uppercase tracking-[0.3em] mb-3 text-white/40 font-mono">Presets</h2>
            <div className="grid grid-cols-1 gap-2">
              {PRESETS.map((preset, index) => (
                <button
                  key={index}
                  id={`preset-btn-${index}`}
                  onClick={() => setPrompt(preset.prompt)}
                  className={`w-full text-left text-xs p-3 rounded border text-ellipsis overflow-hidden whitespace-nowrap transition-all ${
                    prompt === preset.prompt 
                      ? 'bg-white/10 text-white border-white/35 font-semibold' 
                      : 'bg-black/25 text-white/60 border-white/5 hover:border-white/20 hover:text-white'
                  }`}
                >
                  {preset.title}
                </button>
              ))}
            </div>
          </div>

          {/* User Multi-line Prompt Box */}
          <div>
            <h2 id="prompt-section-title" className="text-[10px] uppercase tracking-[0.3em] mb-4 text-white/40 font-mono">01 / The Project Prompt</h2>
            <div className="bg-black/60 border border-white/10 p-4 rounded-lg focus-within:border-white/30 transition-all">
              <textarea
                id="prompt-textarea-input"
                className="w-full text-sm leading-relaxed text-white/90 bg-transparent border-0 outline-none resize-none focus:ring-0 placeholder:text-white/30 h-36"
                placeholder="E.g., build a custom SaaS architecture with high throughput, Next.js, and Redis caching..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/5 text-[10px] text-white/30">
                <span>Natural Language Input</span>
                <span>{prompt.length} chars</span>
              </div>
            </div>
          </div>

          {/* Preferences (Optional) */}
          <div>
            <h2 id="preferences-section-title" className="text-[10px] uppercase tracking-[0.3em] mb-4 text-white/40 font-mono">02 / Technology Preferences</h2>
            <div className="space-y-3">
              <div className="flex flex-col">
                <label className="text-[10px] uppercase font-mono text-white/50 mb-1">Frontend Framework</label>
                <input 
                  type="text" 
                  value={preferredFrontend} 
                  onChange={(e) => setPreferredFrontend(e.target.value)} 
                  placeholder="e.g. React, Next.js, Angular, Vue (Leave blank for AI choice)"
                  className="bg-black/40 border border-white/10 p-2 rounded text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-white/30"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] uppercase font-mono text-white/50 mb-1">Backend Framework</label>
                <input 
                  type="text" 
                  value={preferredBackend} 
                  onChange={(e) => setPreferredBackend(e.target.value)} 
                  placeholder="e.g. Node.js, Django, Go, Spring (Leave blank for AI choice)"
                  className="bg-black/40 border border-white/10 p-2 rounded text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-white/30"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] uppercase font-mono text-white/50 mb-1">Database Layer</label>
                <input 
                  type="text" 
                  value={preferredDatabase} 
                  onChange={(e) => setPreferredDatabase(e.target.value)} 
                  placeholder="e.g. PostgreSQL, Redis, MongoDB (Leave blank for AI choice)"
                  className="bg-black/40 border border-white/10 p-2 rounded text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-white/30"
                />
              </div>
            </div>
          </div>

          {/* Target Coding Agent Selection */}
          <div>
            <h2 id="agent-section-title" className="text-[10px] uppercase tracking-[0.3em] mb-4 text-white/40 font-mono">03 / Target Coding Agents</h2>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[
                { name: 'Cursor AI', desc: 'Composer & Multi-file' },
                { name: 'Claude 3.5', desc: 'Artifacts / Sonnet' },
                { name: 'Gemini Coder', desc: 'Multi-turn Agent' },
                { name: 'v0 / Bolt.new', desc: 'Web Builder' }
              ].map((item) => (
                <button
                  key={item.name}
                  id={`agent-btn-${item.name.replace(/\s+/g, '-')}`}
                  type="button"
                  onClick={() => setAgent(item.name)}
                  className={`text-left p-3 rounded transition-all flex flex-col ${
                    agent === item.name 
                      ? 'bg-white text-black font-bold' 
                      : 'bg-black/30 border border-white/15 text-white opacity-60 hover:opacity-100 hover:border-white/30'
                  }`}
                >
                  <span className="text-xs font-semibold uppercase tracking-wider">{item.name}</span>
                  <span className={`text-[9px] mt-0.5 ${agent === item.name ? 'text-black/60' : 'text-white/40'}`}>{item.desc}</span>
                </button>
              ))}
            </div>

            {/* Agent Mode (Single vs Multi-Agent Swarm) */}
            <div>
              <h3 id="deployment-type-title" className="text-[10px] uppercase tracking-wider mb-2 text-white/40 font-mono">Agent Team Size</h3>
              <div className="flex bg-black/40 p-1 rounded border border-white/10 text-xs font-mono">
                <button
                  type="button"
                  id="agent-count-single-btn"
                  onClick={() => setAgentCount('single')}
                  className={`flex-1 py-1.5 rounded text-center transition-all ${agentCount === 'single' ? 'bg-white/10 text-white font-semibold' : 'text-white/40 hover:text-white/70'}`}
                >
                  Single Agent
                </button>
                <button
                  type="button"
                  id="agent-count-multi-btn"
                  onClick={() => setAgentCount('multi')}
                  className={`flex-1 py-1.5 rounded text-center transition-all ${agentCount === 'multi' ? 'bg-white/10 text-white font-semibold' : 'text-white/40 hover:text-white/70'}`}
                >
                  Swarm Team (Multi-Agent)
                </button>
              </div>
            </div>
          </div>

          {/* Trigger Button or Loading Animation */}
          <div className="mt-auto pt-6 border-t border-white/5">
            {isLoading ? (
              <div id="compiler-loading-visual" className="p-5 border border-dashed border-white/20 rounded flex flex-col items-center gap-3 bg-black/30">
                <div className="w-10 h-10 rounded-full border-t-2 border-r-2 border-white flex items-center justify-center animate-spin">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-white/80 animate-pulse text-center">
                  {loadingSteps[currentLoadingStep]}
                </span>
                <span className="text-[9px] text-white/40 font-mono">Evaluating architecture...</span>
              </div>
            ) : (
              <button
                id="execute-btn"
                onClick={generateBlueprint}
                disabled={!prompt.trim()}
                className="w-full flex items-center justify-center gap-3 bg-white text-black hover:bg-white/90 disabled:bg-white/20 disabled:text-black/50 px-6 py-4 rounded font-bold uppercase text-xs tracking-wider transition-all shadow-lg hover:shadow-white/5 active:scale-[0.98]"
              >
                Assemble Blueprint Framework
                <span className="text-sm">→</span>
              </button>
            )}

            {errorMsg && (
              <div id="error-banner" className="mt-3 p-3 bg-red-950/40 border border-red-500/30 text-red-200 text-xs rounded flex gap-2 items-start">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <div>
                  <span className="font-bold block">Engine Halt:</span>
                  {errorMsg}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Right column: The Full Architectural Output Dashboard */}
        <div id="right-dashboard-pane" className="lg:col-span-8 p-6 md:p-10 flex flex-col gap-10 overflow-auto bg-[#0A0A0B]">
          
          {!result && !isLoading && (
            <div id="empty-state-welcome" className="flex-grow flex flex-col items-center justify-center text-center my-12 max-w-xl mx-auto gap-6 transition-all duration-300">
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center animate-pulse">
                <Terminal className="w-8 h-8 text-white/80" />
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-light tracking-tight leading-none text-white">
                  Architect<span className="font-black italic">OS</span>
                </h1>
                <p className="text-sm text-white/50 leading-relaxed">
                  Enter your high-level system needs. ArchitectOS is primed to output complete blueprints, dynamic directory boilers, optimal styling guides, Vitest/Jest configs, and modular CI/CD pipelines instantly.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full text-left font-mono mt-4">
                <div className="p-4 bg-[#0D0D0F] border border-white/5 rounded-lg">
                  <div className="text-[10px] tracking-wider text-white/30 uppercase mb-1">01. Dynamic intelligence</div>
                  <p className="text-xs text-white/60">Finds perfect combinations for Next.js, Express, PostgreSQL, Redis, Drizzle, etc.</p>
                </div>
                <div className="p-4 bg-[#0D0D0F] border border-white/5 rounded-lg">
                  <div className="text-[10px] tracking-wider text-white/30 uppercase mb-1">02. Automated Pipeline</div>
                  <p className="text-xs text-white/60">Outlines complete testing and production-grade GitHub Actions CI/CD yml workflows.</p>
                </div>
              </div>
            </div>
          )}

          {isLoading && (
            <div id="loading-state" className="flex-grow flex flex-col items-center justify-center text-center py-20 gap-4">
              <div className="w-14 h-14 relative flex items-center justify-center">
                <span className="absolute inline-flex h-full w-full rounded-full bg-white/5 animate-ping"></span>
                <Cpu className="w-6 h-6 text-white animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-light uppercase tracking-widest text-white/90">Drafting Blueprints</h3>
                <p className="text-xs text-white/40 font-mono mt-1">Modeling directory tables & pipeline environments...</p>
              </div>
            </div>
          )}

          {result && !isLoading && (
            <div id="results-dashboard-grid" className="space-y-8 animate-fade-in">
              
              {/* Intelligence Decision Header */}
              <div id="results-header-container" className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/10 pb-6">
                <div>
                  <h1 className="text-4xl md:text-5xl font-light tracking-tight leading-none mb-3">
                    Optimized <span className="font-black italic block md:inline text-white">Blueprint</span>
                  </h1>
                  <p className="text-sm text-white/60 italic font-mono">
                    "{result.projectName}" &mdash; {result.oneLiner}
                  </p>
                </div>
                <div className="text-right p-4 bg-[#0D0D0F] border border-white/5 rounded-xl self-stretch md:self-auto flex items-center justify-between md:block">
                  <span className="text-[10px] uppercase tracking-[0.15em] text-white/40 block">Quality Scale</span>
                  <span id="efficiency-indicator" className="block text-3xl font-mono leading-none text-white font-bold">99.8%</span>
                </div>
              </div>

              {/* Scope requirements extracted */}
              <div id="scope-boundaries-box" className="bg-[#0D0D0F] border border-white/5 p-5 rounded-lg">
                <h3 className="text-[11px] uppercase tracking-widest mb-3 opacity-50 font-mono">Requirements & Bounds Identified</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {result.scope && result.scope.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-white/70 bg-black/20 p-2 rounded">
                      <div className="w-1.5 h-1.5 bg-white/75 shrink-0 rounded-sm"></div>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stack Choices grid - Matrix */}
              <div id="stack-decision-matrix" className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Frontend Card */}
                <div className="bg-[#0D0D0F] border border-white/5 p-5 rounded-xl flex flex-col justify-between">
                  <div>
                    <h3 className="text-[10px] uppercase tracking-wider opacity-40 font-mono mb-2 flex items-center justify-between">
                      Frontend Frame <Layers className="w-3.5 h-3.5" />
                    </h3>
                    <div className="text-lg font-bold text-white mb-1">
                      {result.stack?.frontend?.name}
                      <span className="text-xs font-mono font-normal text-white/40 ml-1.5">{result.stack?.frontend?.version}</span>
                    </div>
                    <p className="text-xs text-white/60 mb-4">{result.stack?.frontend?.reason}</p>
                  </div>
                  <div className="space-y-1 pt-2 border-t border-white/5">
                    {result.stack?.frontend?.advantages?.map((adv, i) => (
                      <span key={i} className="inline-block bg-white/5 text-[9px] text-white/80 uppercase tracking-wide px-2 py-0.5 rounded mr-1">
                        {adv}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Backend Card */}
                <div className="bg-[#0D0D0F] border border-white/5 p-5 rounded-xl flex flex-col justify-between">
                  <div>
                    <h3 className="text-[10px] uppercase tracking-wider opacity-40 font-mono mb-2 flex items-center justify-between">
                      Runtime Backend <Cpu className="w-3.5 h-3.5" />
                    </h3>
                    <div className="text-lg font-bold text-white mb-1">
                      {result.stack?.backend?.name}
                      <span className="text-xs font-mono font-normal text-white/40 ml-1.5">{result.stack?.backend?.version}</span>
                    </div>
                    <p className="text-xs text-white/60 mb-4">{result.stack?.backend?.reason}</p>
                  </div>
                  <div className="space-y-1 pt-2 border-t border-white/5">
                    {result.stack?.backend?.advantages?.map((adv, i) => (
                      <span key={i} className="inline-block bg-white/5 text-[9px] text-white/80 uppercase tracking-wide px-2 py-0.5 rounded mr-1">
                        {adv}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Database Card */}
                <div className="bg-[#0D0D0F] border border-white/5 p-5 rounded-xl flex flex-col justify-between">
                  <div>
                    <h3 className="text-[10px] uppercase tracking-wider opacity-40 font-mono mb-2 flex items-center justify-between">
                      Database Layer <Database className="w-3.5 h-3.5" />
                    </h3>
                    <div className="text-lg font-bold text-white mb-1">
                      {result.stack?.database?.name}
                      <span className="text-xs font-mono font-normal text-white/40 ml-1.5">{result.stack?.database?.version}</span>
                    </div>
                    <p className="text-xs text-white/60 mb-1">{result.stack?.database?.reason}</p>
                    <p className="text-[10px] font-mono text-white/30 italic mb-3">Model: {result.stack?.database?.schemaPhilosophy}</p>
                  </div>
                  <div className="space-y-1 pt-2 border-t border-white/5">
                    {result.stack?.database?.advantages?.map((adv, i) => (
                      <span key={i} className="inline-block bg-white/5 text-[9px] text-white/80 uppercase tracking-wide px-2 py-0.5 rounded mr-1">
                        {adv}
                      </span>
                    ))}
                  </div>
                </div>

              </div>

              {/* Infrastructure and hosting summary */}
              <div id="hosting-caching-row" className="p-4 bg-black/40 border border-white/5 rounded-lg flex flex-col md:flex-row justify-between text-xs gap-2">
                <div>
                  <span className="text-white/40 uppercase font-mono mr-2">Hosting Model:</span>
                  <span className="text-white font-bold">{result.stack?.infraAndCaching?.hosting}</span>
                </div>
                {result.stack?.infraAndCaching?.cacheOrQueue && (
                  <div>
                    <span className="text-white/40 uppercase font-mono mr-2">Caching/Queue:</span>
                    <span className="text-white font-bold">{result.stack?.infraAndCaching?.cacheOrQueue}</span>
                  </div>
                )}
                <div>
                  <span className="text-white/40 uppercase font-mono mr-2">Strategy:</span>
                  <span className="text-white/70">{result.stack?.infraAndCaching?.reason}</span>
                </div>
              </div>

              {/* Authentication & Authorization Strategy Panel */}
              <div id="auth-strategy-panel" className="bg-[#0D0D0F] border border-white/5 p-6 rounded-xl">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/5">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <h3 className="text-sm font-bold tracking-tight text-white">Authentication & Authorization Strategy</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-black/30 p-3 rounded border border-white/5">
                    <span className="text-[10px] text-white/40 uppercase font-mono block mb-1">Auth Method</span>
                    <span className="text-xs font-bold text-white">{result.authStrategy?.method}</span>
                  </div>
                  <div className="bg-black/30 p-3 rounded border border-white/5">
                    <span className="text-[10px] text-white/40 uppercase font-mono block mb-1">Password Management</span>
                    <span className="text-xs font-bold text-white">{result.authStrategy?.passwordManagement}</span>
                  </div>
                  <div className="bg-black/30 p-3 rounded border border-white/5">
                    <span className="text-[10px] text-white/40 uppercase font-mono block mb-1">RBAC</span>
                    <span className="text-xs font-bold text-white">{result.authStrategy?.rbac}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] text-white/40 uppercase font-mono">
                    <span>Boilerplate Component: {result.authStrategy?.boilerplatePath}</span>
                    <button
                      onClick={() => copyToClipboard(result.authStrategy?.boilerplateCode, 'auth-boilerplate')}
                      className="hover:text-white flex items-center gap-1"
                    >
                      {copiedFile === 'auth-boilerplate' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      Copy Code
                    </button>
                  </div>
                  <pre className="bg-[#070709] p-3 rounded font-mono text-[10px] text-rose-300/85 overflow-auto max-h-48 leading-relaxed">
                    {result.authStrategy?.boilerplateCode}
                  </pre>
                </div>
              </div>


              {/* Interactive File Hierarchy Explorer & Code Boilerplate Panel */}
              <div id="interactive-explorer-panel" className="bg-[#0D0D0F] border border-white/8 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10 bg-black/40 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <FolderTree className="w-4 h-4 text-white/60" />
                    <span className="text-xs font-mono uppercase tracking-widest text-white/80">Boilerplates & Directory Architecture</span>
                  </div>
                  <span className="text-[10px] font-mono opacity-40">Click files to preview enterprise boilerplate code</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 min-h-[460px]">
                  
                  {/* Left explorer tree view */}
                  <div className="md:col-span-5 p-4 border-r border-white/10 overflow-auto max-h-[500px]">
                    <div className="flex items-center gap-2 mb-3 px-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span className="text-[10px] tracking-wider uppercase font-mono text-white/40">Blueprint Repo Structure</span>
                    </div>
                    {renderTreeNodes(result.tree || [])}
                  </div>

                  {/* Right interactive boilerplate code previewer */}
                  <div className="md:col-span-7 bg-black/30 flex flex-col max-h-[500px]">
                    {selectedFilePath && result.boilerplates && result.boilerplates[selectedFilePath] ? (
                      <div className="flex flex-col h-full overflow-hidden">
                        
                        {/* Tab header */}
                        <div className="px-4 py-2 bg-black/60 border-b border-white/5 flex justify-between items-center">
                          <div className="flex items-center gap-2 font-mono text-[11px] text-white/80 truncate">
                            <FileCode className="w-3.5 h-3.5 opacity-60" />
                            <span>{selectedFilePath}</span>
                          </div>
                          
                          <button
                            onClick={() => copyToClipboard(result.boilerplates[selectedFilePath], 'file')}
                            className="text-white/50 hover:text-white px-2 py-1 rounded hover:bg-white/5 transition-all flex items-center gap-1 text-[10px] font-mono"
                          >
                            {copiedFile === 'file' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            {copiedFile === 'file' ? 'Copied!' : 'Copy'}
                          </button>
                        </div>

                        {/* Interactive pre viewport */}
                        <div className="flex-grow overflow-auto p-4 font-mono text-[11px] leading-relaxed text-emerald-300/90 bg-[#08080C] min-h-[250px]">
                          <pre className="whitespace-pre">{result.boilerplates[selectedFilePath]}</pre>
                        </div>

                      </div>
                    ) : (
                      <div className="flex-grow flex flex-col items-center justify-center text-center p-8 text-white/40 font-mono text-xs">
                        <FileCode className="w-6 h-6 mb-2 opacity-30" />
                        <span>Select any file in the tree to preview enterprise-grade scaffolded code</span>
                      </div>
                    )}
                  </div>

                </div>
              </div>


              {/* The Automated Testing Suite (Vitest/Jest) Panel */}
              <div id="testing-strategy-panel" className="bg-[#0D0D0F] border border-white/5 p-6 rounded-xl">
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold tracking-tight text-white">Automated Testing Configuration</h3>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-mono text-[9px] uppercase">
                    {result.testingStrategy?.testingFramework}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-black/40 p-3 rounded text-xs text-white/60 font-mono">
                    <span>Test Command Command Run:</span>
                    <span className="bg-white/5 px-2 py-0.5 rounded text-white font-bold">{result.testingStrategy?.command}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Setup Config code block */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] text-white/40 uppercase font-mono">
                        <span>Config Boilerplate: {result.testingStrategy?.configBoilerplatePath}</span>
                        <button
                          onClick={() => copyToClipboard(result.testingStrategy?.configBoilerplate, 'test-config')}
                          className="hover:text-white flex items-center gap-1"
                        >
                          {copiedFile === 'test-config' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          Copy
                        </button>
                      </div>
                      <pre className="bg-[#070709] p-3 rounded font-mono text-[10px] text-emerald-400/85 overflow-auto max-h-48 leading-relaxed">
                        {result.testingStrategy?.configBoilerplate}
                      </pre>
                    </div>

                    {/* Sample execution file code block */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] text-white/40 uppercase font-mono">
                        <span>Sample Unit Test: {result.testingStrategy?.sampleTestPath}</span>
                        <button
                          onClick={() => copyToClipboard(result.testingStrategy?.sampleTestCode, 'test-sample')}
                          className="hover:text-white flex items-center gap-1"
                        >
                          {copiedFile === 'test-sample' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          Copy
                        </button>
                      </div>
                      <pre className="bg-[#070709] p-3 rounded font-mono text-[10px] text-emerald-400/85 overflow-auto max-h-48 leading-relaxed">
                        {result.testingStrategy?.sampleTestCode}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>


              {/* Enterprise-grade CI/CD and DevOps panel */}
              <div id="cicd-pipeline-panel" className="bg-[#0D0D0F] border border-white/5 p-6 rounded-xl">
                <div className="flex justify-between items-center mb-5 pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-bold tracking-tight text-white">Full-Stack CI/CD Pipeline Strategy</h3>
                  </div>
                  <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded font-mono text-[9px] uppercase">
                    {result.cicdStrategy?.toolName}
                  </span>
                </div>

                <div className="mb-5 space-y-2 text-xs">
                  <p className="text-white/80 shrink-0">
                    <span className="font-bold text-white uppercase font-mono block text-[10px] tracking-wider text-white/40 mb-1">Architect pipeline rationale:</span>
                    {result.cicdStrategy?.reason}
                  </p>
                </div>

                {/* Pipeline visual topology progress bar representation */}
                <div className="mb-6 p-4 bg-black/30 rounded border border-white/5">
                  <span className="text-[9px] uppercase tracking-wider font-mono text-white/40 block mb-4">Pipeline Stages Flow Topology</span>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {result.cicdStrategy?.stages && result.cicdStrategy.stages.map((stage, sIdx) => (
                      <div key={sIdx} className="bg-black/40 p-3 rounded border border-white/5 relative group hover:border-white/20 transition-all">
                        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></div>
                        <div className="text-[10px] font-mono text-indigo-400 mb-1">0{sIdx + 1} / stage</div>
                        <div className="text-xs font-bold text-white mb-1">{stage.name}</div>
                        <p className="text-[10px] text-white/50 mb-2 leading-relaxed">{stage.description}</p>
                        
                        <div className="space-y-1">
                          {stage.commandsOrActions && stage.commandsOrActions.map((cmd, cIdx) => (
                            <div key={cIdx} className="bg-black/50 p-1 rounded font-mono text-[8px] text-white/70 truncate">
                              {cmd}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* yml workflow configurations file block */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] text-white/40 uppercase font-mono">
                    <span>CI/CD Config Script: {result.cicdStrategy?.configFileTemplatePath}</span>
                    <button
                      onClick={() => copyToClipboard(result.cicdStrategy?.configFileContent, 'cicd-config')}
                      className="hover:text-white flex items-center gap-1"
                    >
                      {copiedFile === 'cicd-config' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      Copy Workflow Code
                    </button>
                  </div>
                  <pre className="bg-[#070709] p-4 rounded font-mono text-[10px] text-indigo-300/90 overflow-auto max-h-64 leading-relaxed whitespace-pre">
                    {result.cicdStrategy?.configFileContent}
                  </pre>
                </div>
              </div>


              {/* Tactical execution blueprints tailored to target AI Agent */}
              <div id="ai-agent-guide" className="bg-black/40 border border-white/5 p-6 rounded-xl">
                <div className="flex items-center gap-2.5 mb-4">
                  <Zap className="w-4 h-4 text-yellow-400 shrink-0" />
                  <h3 className="text-xs font-mono uppercase tracking-widest text-white/90">
                    Execution Plan for <span className="font-bold underline text-white">{result.agentPlan?.agentName}</span>
                  </h3>
                </div>

                <div className="space-y-6">
                  
                  {/* Setup Prerequisites list */}
                  <div>
                    <h4 className="text-[10px] uppercase text-white/40 font-mono mb-2">Prerequisite setups to ask your agent</h4>
                    <ul className="text-xs space-y-1 text-white/70">
                      {result.agentPlan?.setupPrerequisites?.map((prereq, rI) => (
                        <li key={rI} className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>{prereq}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Implementation Phases accordion / sequence */}
                  <div>
                    <h4 className="text-[10px] uppercase text-white/40 font-mono mb-3">Modular Implementation Stages</h4>
                    <div className="space-y-3">
                      {result.agentPlan?.phases?.map((phase, pI) => (
                        <div key={pI} className="bg-[#0D0D0F] border border-white/5 p-4 rounded-lg">
                          <div className="flex justify-between items-center mb-1.5 flex-wrap gap-1">
                            <span className="text-xs font-bold text-white">Phase 0{pI + 1}: {phase.title}</span>
                            {phase.commandToRun && (
                              <span className="font-mono text-[9px] bg-white/5 px-2 py-0.5 rounded text-white/80">
                                Run: `{phase.commandToRun}`
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-white/50 mb-2 leading-relaxed">{phase.description}</p>
                          <div className="space-y-1 pl-3 border-l border-white/10">
                            {phase.steps?.map((step, sI) => (
                              <div key={sI} className="text-xs text-white/70 flex gap-1 items-start">
                                <span className="text-white/30">&raquo;</span>
                                <span>{step}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Agent specific optimizations tips */}
                  <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
                    <h4 className="text-[10px] font-mono uppercase tracking-wider text-yellow-400 mb-2 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5" /> High-Efficiency Agent Tips
                    </h4>
                    <ul className="text-xs space-y-1 text-white/80 leading-normal pl-1">
                      {result.agentPlan?.agentSpecificTips?.map((tip, tI) => (
                        <li key={tI} className="list-disc leading-relaxed ml-3 pl-1">
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>

                </div>
              </div>


              {/* Professional CSS Optimization & modular guide */}
              <div id="frontend-styling-and-optimization" className="bg-[#0D0D0F] border border-white/5 p-6 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-widest text-white/40 mb-3 flex items-center gap-2">
                    <Sliders className="w-4 h-4" /> Styling & Modular CSS Strategy
                  </h3>
                  <div className="bg-black/30 p-4 rounded border border-white/5 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-white/40 font-mono">Recommended Styling Library:</span>
                      <span className="bg-white text-black font-mono font-bold px-2 py-0.5 rounded text-[10px] uppercase">
                        {result.frontendGuide?.stylingLibrary}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-white/40 uppercase block mb-1">Enterprise Design Separation</span>
                      <ul className="text-xs space-y-1.5 text-white/70">
                        {result.frontendGuide?.modularPatterns?.map((pat, pi) => (
                          <li key={pi} className="flex gap-2 items-start text-white/80">
                            <span className="text-white/40">&bull;</span>
                            <span>{pat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-mono uppercase tracking-widest text-white/40 mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" /> Core Performance Optimizations
                  </h3>
                  <div className="bg-black/30 p-4 rounded border border-white/5">
                    <span className="text-[10px] font-mono text-white/40 uppercase block mb-2 font-bold tracking-wider">Speed Enhancers & LCP targets</span>
                    <ul className="text-xs space-y-1.5 text-white/80">
                      {result.frontendGuide?.performanceTricks?.map((trick, ti) => (
                        <li key={ti} className="flex gap-2 items-start leading-relaxed">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{trick}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      </main>

      {/* Styled Footer */}
      <footer id="app-footer" className="bg-[#0A0A0B] border-t border-white/10 px-8 py-5 flex flex-col md:flex-row justify-between items-center text-xs opacity-50 gap-4 mt-auto">
        <div className="flex gap-8 font-mono text-[10px] uppercase tracking-wider">
          <span>PORT: 3000 (STATIC + ENDPOINT PROXY)</span>
          <span>DB: SCHEMA_DRIZZLE_PHILOSOPHY</span>
          <span>AGENT_OS: EXECUTION_READY</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>Crafted for professional agents</span>
          <span className="text-white/80 font-bold tracking-tighter uppercase font-mono">Architect.OS v1.4</span>
        </div>
      </footer>

    </div>
  );
}
