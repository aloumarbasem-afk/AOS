/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { 
  BookOpen, 
  FileCode, 
  Copy, 
  Check, 
  ExternalLink, 
  ArrowRight, 
  FileText,
  Code,
  Terminal,
  Compass,
  Cpu,
  Layers
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';

// Raw file imports using Vite's ?raw suffix
import methodology from '../../METHODOLOGY.md?raw';
import agentTemplate from '../../templates/agent-template.md?raw';
import workflowSkeleton from '../../templates/workflow-skeleton.js?raw';
import caseStudy from '../../examples/aos-sse-refactor/CASE_STUDY.md?raw';
import promptIRan from '../../examples/aos-sse-refactor/the-prompt-i-ran.md?raw';
import actualWorkflow from '../../workflows/aos-sse-pipeline-refactor.workflow.js?raw';
import adapterClaude from '../../adapters/claude-code.md?raw';
import adapterCursor from '../../adapters/cursor.md?raw';
import adapterCodex from '../../adapters/codex-cli.md?raw';
import adapterGeneric from '../../adapters/generic-orchestrator.md?raw';

interface PlaybookFile {
  id: string;
  name: string;
  path: string;
  content: string;
  type: 'markdown' | 'javascript';
  icon: any;
}

interface PlaybookSection {
  title: string;
  icon: any;
  files: PlaybookFile[];
}

export function Playbook() {
  const sections: PlaybookSection[] = [
    {
      title: "Core Methodology",
      icon: Compass,
      files: [
        {
          id: 'methodology',
          name: 'Methodology Guide',
          path: 'METHODOLOGY.md',
          content: methodology,
          type: 'markdown',
          icon: BookOpen
        }
      ]
    },
    {
      title: "Reusable Templates",
      icon: Layers,
      files: [
        {
          id: 'agent-template',
          name: 'Agent Specification',
          path: 'templates/agent-template.md',
          content: agentTemplate,
          type: 'markdown',
          icon: FileText
        },
        {
          id: 'workflow-skeleton',
          name: 'Orchestrator Skeleton',
          path: 'templates/workflow-skeleton.js',
          content: workflowSkeleton,
          type: 'javascript',
          icon: FileCode
        }
      ]
    },
    {
      title: "Worked Example (SSE Refactor)",
      icon: Cpu,
      files: [
        {
          id: 'case-study',
          name: 'Case Study & Analysis',
          path: 'examples/aos-sse-refactor/CASE_STUDY.md',
          content: caseStudy,
          type: 'markdown',
          icon: BookOpen
        },
        {
          id: 'prompt-i-ran',
          name: 'Verbatim Prompt Log',
          path: 'examples/aos-sse-refactor/the-prompt-i-ran.md',
          content: promptIRan,
          type: 'markdown',
          icon: Terminal
        }
      ]
    },
    {
      title: "Live Production Script",
      icon: Terminal,
      files: [
        {
          id: 'actual-workflow',
          name: 'SSE Pipeline Script',
          path: 'workflows/aos-sse-pipeline-refactor.workflow.js',
          content: actualWorkflow,
          type: 'javascript',
          icon: FileCode
        }
      ]
    },
    {
      title: "Agent Tool Adapters",
      icon: Code,
      files: [
        {
          id: 'adapter-claude',
          name: 'Claude Code',
          path: 'adapters/claude-code.md',
          content: adapterClaude,
          type: 'markdown',
          icon: BookOpen
        },
        {
          id: 'adapter-cursor',
          name: 'Cursor AI',
          path: 'adapters/cursor.md',
          content: adapterCursor,
          type: 'markdown',
          icon: BookOpen
        },
        {
          id: 'adapter-codex',
          name: 'Codex CLI',
          path: 'adapters/codex-cli.md',
          content: adapterCodex,
          type: 'markdown',
          icon: BookOpen
        },
        {
          id: 'adapter-generic',
          name: 'Generic Orchestrator',
          path: 'adapters/generic-orchestrator.md',
          content: adapterGeneric,
          type: 'markdown',
          icon: BookOpen
        }
      ]
    }
  ];

  // Find first file to set as default selected file
  const [selectedFile, setSelectedFile] = useState<PlaybookFile>(sections[0].files[0]);
  const [viewMode, setViewMode] = useState<'rendered' | 'raw'>(selectedFile.type === 'markdown' ? 'rendered' : 'raw');
  const [copied, setCopied] = useState(false);

  const handleSelectFile = (file: PlaybookFile) => {
    setSelectedFile(file);
    setViewMode(file.type === 'markdown' ? 'rendered' : 'raw');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 flex flex-col gap-6 h-full min-h-[600px]">
      
      {/* Playbook Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-white/10 pb-6 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-light tracking-tight leading-none mb-3">
            Multi-Agent <span className="font-black italic text-white">Playbook</span>
          </h1>
          <p className="text-sm text-white/50 leading-relaxed max-w-2xl">
            Learn how to decompose complex tasks into reliable contracts, parallel build stages, automated verifications, and adversarial reviews. Includes templates and worked examples.
          </p>
        </div>
        
        <div className="bg-[#0D0D0F] border border-white/5 px-4 py-2 rounded-xl flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-emerald-400" />
          <span className="font-mono text-xs text-white/70">Tool-Agnostic Patterns</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-grow">
        
        {/* Sidebar Nav */}
        <div className="lg:col-span-4 glass-panel glow-border p-4 flex flex-col gap-5 max-h-[700px] overflow-y-auto rounded-xl">
          {sections.map((section, sIdx) => {
            const SectionIcon = section.icon;
            return (
              <div key={sIdx} className="space-y-2">
                <h3 className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-mono flex items-center gap-1.5 px-2">
                  <SectionIcon className="w-3.5 h-3.5" />
                  {section.title}
                </h3>
                
                <div className="space-y-1">
                  {section.files.map((file) => {
                    const FileIcon = file.icon;
                    const isSelected = selectedFile.id === file.id;
                    return (
                      <button
                        key={file.id}
                        onClick={() => handleSelectFile(file)}
                        className={`w-full text-left text-xs p-2.5 rounded flex items-center gap-2.5 group cursor-pointer transition-all duration-200 hover:translate-x-0.5 ${
                          isSelected
                            ? 'bg-white/10 text-white font-semibold border-l-2 border-white'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <FileIcon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-white/40 group-hover:text-white/60'}`} />
                        <span className="truncate flex-grow">{file.name}</span>
                        <ArrowRight className={`w-3 h-3 transition-transform opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 ${isSelected ? 'text-white/80' : 'text-white/40'}`} />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Content Viewer */}
        <div className="lg:col-span-8 glass-panel glow-border flex flex-col max-h-[700px] rounded-xl overflow-hidden">
          
          {/* Viewer Toolbar */}
          <div className="px-5 py-3 bg-black/40 border-b border-white/10 flex justify-between items-center gap-4 shrink-0">
            <div className="flex items-center gap-2 font-mono text-xs text-white/70 truncate">
              <span className="text-white/30">path:</span>
              <span className="text-white/85 truncate">{selectedFile.path}</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Toggle Render / Raw for Markdown files */}
              {selectedFile.type === 'markdown' && (
                <div className="flex bg-black/50 p-0.5 rounded border border-white/10 text-[10px] font-mono mr-2">
                  <button
                    onClick={() => setViewMode('rendered')}
                    className={`px-2 py-1 rounded transition-all ${viewMode === 'rendered' ? 'bg-white/10 text-white font-semibold' : 'text-white/40 hover:text-white/70'}`}
                  >
                    Render
                  </button>
                  <button
                    onClick={() => setViewMode('raw')}
                    className={`px-2 py-1 rounded transition-all ${viewMode === 'raw' ? 'bg-white/10 text-white font-semibold' : 'text-white/40 hover:text-white/70'}`}
                  >
                    Raw
                  </button>
                </div>
              )}

              {/* Copy Code Shortcut */}
              <button
                onClick={copyToClipboard}
                className="text-white/50 hover:text-white hover:bg-white/5 px-2.5 py-1 rounded border border-white/10 transition-all flex items-center gap-1.5 text-[10px] font-mono"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy Code'}
              </button>
            </div>
          </div>

          {/* Content Body Viewport */}
          <div className="flex-grow overflow-auto p-6 bg-[#08080C] leading-relaxed select-text">
            <AnimatePresence mode="wait">
              {viewMode === 'rendered' ? (
                <motion.div
                  key={`${selectedFile.id}-rendered`}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4"
                >
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => <h1 className="text-2xl font-bold border-b border-white/10 pb-2 mb-5 text-white mt-4">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-lg font-bold pb-1 mb-4 text-white/95 mt-6 flex items-center gap-2">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-base font-semibold mb-3 text-white/90 mt-5">{children}</h3>,
                      p: ({ children }) => <p className="text-xs text-white/70 leading-relaxed mb-4">{children}</p>,
                      code: ({ className, children, ...props }) => {
                        const match = /language-(\w+)/.exec(className || '');
                        const isBlock = match || String(children).includes('\n');
                        return isBlock ? (
                          <pre className="bg-[#040406] p-4 rounded-lg font-mono text-[10px] text-emerald-300 overflow-x-auto border border-white/5 my-4 leading-normal">
                            <code className={className} {...props}>{children}</code>
                          </pre>
                        ) : (
                          <code className="bg-white/10 px-1.5 py-0.5 rounded font-mono text-[10px] text-white/95" {...props}>{children}</code>
                        );
                      },
                      ul: ({ children }) => <ul className="list-disc pl-5 mb-4 text-xs text-white/70 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 text-xs text-white/70 space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                      table: ({ children }) => <div className="overflow-x-auto my-6 border border-white/10 rounded-lg"><table className="w-full text-left text-[11px] text-white/80 border-collapse">{children}</table></div>,
                      thead: ({ children }) => <thead className="bg-white/5 border-b border-white/10 text-white/60 font-mono uppercase tracking-wider">{children}</thead>,
                      tbody: ({ children }) => <tbody>{children}</tbody>,
                      tr: ({ children }) => <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">{children}</tr>,
                      th: ({ children }) => <th className="p-3 font-semibold">{children}</th>,
                      td: ({ children }) => <td className="p-3">{children}</td>,
                      blockquote: ({ children }) => <blockquote className="border-l-4 border-white/20 pl-4 py-2 italic my-4 text-white/60 bg-white/5 rounded-r">{children}</blockquote>,
                      hr: () => <hr className="border-t border-white/10 my-6" />,
                      a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 underline inline-flex items-center gap-0.5">{children}<ExternalLink className="w-3 h-3 inline-block" /></a>
                    }}
                  >
                    {selectedFile.content}
                  </ReactMarkdown>
                </motion.div>
              ) : (
                <motion.div
                  key={`${selectedFile.id}-raw`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="font-mono text-[10px] text-emerald-300/95 leading-normal whitespace-pre overflow-x-auto"
                >
                  <pre>{selectedFile.content}</pre>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>

    </div>
  );
}
