import React, { useEffect } from 'react';
import { Handle, Position, useUpdateNodeInternals } from '@xyflow/react';
import { CanvasNodeData } from '../lib/dummyData';
import { Terminal, Lightbulb, BookOpen, AlertCircle, FileText, ChevronRight, HelpCircle, RotateCw } from 'lucide-react';

interface CustomNodeProps {
  id: string;
  data: CanvasNodeData;
  selected?: boolean;
  onTextSelect?: (nodeId: string, text: string, clientX: number, clientY: number) => void;
  onRefreshNode?: (nodeId: string) => void;
}

// Global handle helper to allow organic whiteboard connections in all 4 directions
const CardinalHandles = () => (
  <>
    <Handle type="target" position={Position.Left} id="left-in" className="!bg-miro-blue dark:!bg-cyber-cyan !w-2.5 !h-2.5 !border-white dark:!border-slate-950" />
    <Handle type="source" position={Position.Right} id="right-out" className="!bg-miro-blue dark:!bg-cyber-cyan !w-2.5 !h-2.5 !border-white dark:!border-slate-950" />
    <Handle type="target" position={Position.Top} id="top-in" className="!bg-miro-blue dark:!bg-cyber-cyan !w-2.5 !h-2.5 !border-white dark:!border-slate-950" />
    <Handle type="source" position={Position.Bottom} id="bottom-out" className="!bg-miro-blue dark:!bg-cyber-cyan !w-2.5 !h-2.5 !border-white dark:!border-slate-950" />
  </>
);

// Shared selection handler helper to trigger context menu on arbitrary text highlight
const createSelectionHandler = (nodeId: string, callback?: (nodeId: string, text: string, x: number, y: number) => void) => {
  return (e: React.MouseEvent) => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const text = selection.toString().trim();
      const container = e.currentTarget;
      // Make sure the highlight was actually made within this node container
      if (container.contains(selection.anchorNode)) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (callback) {
          callback(nodeId, text, rect.left, rect.bottom);
        }
      }
    }
  };
};

// Robust string sanitizer to prevent React "Objects are not valid as a React child" errors
export const toPlainString = (item: any): string => {
  if (item === null || item === undefined) return '';
  if (typeof item === 'string') return item;
  if (typeof item === 'object') {
    return String(item.name || item.title || item.term || item.concept || item.label || item.value || JSON.stringify(item));
  }
  return String(item);
};

const renderSafeText = (val: any): string => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    return String(val.definition || val.summary || val.text || val.description || val.value || JSON.stringify(val));
  }
  return String(val);
};

// Helper to convert text into a clean handle ID slug
export const slugify = (text: string) => text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');

// Helper function to render markdown-like text with highlighted concept triggers and dedicated inline source handles
const renderFormattedText = (
  text: string, 
  concepts: any[], 
  onConceptClick: (e: React.MouseEvent, concept: string) => void,
  nodeId?: string
) => {
  if (!text) return null;
  const safeConcepts = (concepts || []).map(toPlainString).filter(Boolean);
  if (safeConcepts.length === 0) {
    return <div className="whitespace-pre-wrap text-sm leading-relaxed handwritten">{text}</div>;
  }

  const sortedConcepts = [...safeConcepts].sort((a, b) => b.length - a.length); // match longest first
  const regex = new RegExp(`\\b(${sortedConcepts.map(c => c.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})\\b`, 'gi');

  const parts = text.split(regex);

  return (
    <div className="whitespace-pre-wrap leading-relaxed handwritten">
      {parts.map((part, index) => {
        const isConcept = safeConcepts.some(c => c.toLowerCase() === part.toLowerCase());
        if (isConcept) {
          const handleId = nodeId ? `handle-${nodeId}-${slugify(part)}` : undefined;
          return (
            <span
              key={index}
              onClick={(e) => onConceptClick(e, part)}
              className="relative highlight-concept font-bold text-miro-blue dark:text-cyber-cyan inline-block px-1.5 rounded hover:bg-miro-blue/10 dark:hover:bg-cyber-cyan/20 cursor-pointer group"
            >
              {part}
              {handleId && (
                <Handle
                  type="source"
                  position={Position.Right}
                  id={handleId}
                  className="!bg-miro-blue dark:!bg-cyber-cyan !w-2.5 !h-2.5 !border-2 !border-white dark:!border-slate-950 opacity-80 group-hover:opacity-100 transition-opacity"
                  style={{ right: -8, top: '50%', transform: 'translateY(-50%)' }}
                />
              )}
            </span>
          );
        }
        return part;
      })}
    </div>
  );
};

export const ConversationNode: React.FC<CustomNodeProps & { onConceptSelect?: (nodeId: string, concept: string, clientX: number, clientY: number) => void }> = ({
  id,
  data,
  selected,
  onTextSelect,
  onConceptSelect,
  onRefreshNode
}) => {
  const updateNodeInternals = useUpdateNodeInternals();
  useEffect(() => {
    updateNodeInternals(id);
  }, [data.concepts, data.subpoints, id, updateNodeInternals]);

  const handleConceptClick = (e: React.MouseEvent, concept: string) => {
    e.stopPropagation();
    if (onConceptSelect) {
      onConceptSelect(id, concept, e.clientX, e.clientY);
    }
  };

  const handleMouseUp = createSelectionHandler(id, onTextSelect);

  return (
    <div 
      onMouseUp={handleMouseUp}
      className={`p-6 rounded-2xl border-2 border-l-[8px] transition-[background-color,border-color,box-shadow] duration-300 w-85 glass-panel select-text hover:shadow-xl border-l-miro-blue dark:border-l-cyber-cyan cursor-grab active:cursor-grabbing ${
        selected 
          ? 'border-miro-blue shadow-lg dark:border-cyber-cyan dark:shadow-neon-cyan/20' 
          : 'border-miro-hairline-strong dark:border-cyber-border'
      }`}
    >
      <CardinalHandles />
      
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-miro-hairline dark:border-cyber-border/40 select-none">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4.5 h-4.5 text-miro-yellow dark:text-cyber-yellow" />
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-miro-ink/50 dark:text-cyber-yellow">
            Tutor Conversation
          </span>
        </div>
        {onRefreshNode && (
          <button
            onClick={(e) => { e.stopPropagation(); onRefreshNode(id); }}
            title="Refresh / Retry AI response"
            className="nodrag p-1 rounded-full hover:bg-miro-surface dark:hover:bg-cyber-bg/60 text-miro-ink/40 dark:text-cyber-text/40 hover:text-miro-blue dark:hover:text-cyber-cyan transition-all"
          >
            <RotateCw className="w-3 h-3" />
          </button>
        )}
      </div>

      {data.question && (
        <h4 className="nodrag cursor-text font-extrabold text-base mb-3 text-[var(--text-primary)] dark:text-white leading-snug tracking-tight">
          {toPlainString(data.question)}
        </h4>
      )}

      <div className="nodrag cursor-text text-[15px] text-[var(--text-secondary)] dark:text-cyber-text leading-relaxed">
        {data.answer ? renderFormattedText(renderSafeText(data.answer), data.concepts || [], handleConceptClick, id) : ''}
      </div>
    </div>
  );
};

export const ConceptNode: React.FC<CustomNodeProps & { onSubpointSelect?: (nodeId: string, subpoint: string, clientX: number, clientY: number) => void }> = ({ 
  id, 
  data, 
  selected, 
  onTextSelect,
  onSubpointSelect,
  onRefreshNode
}) => {
  const isAdvanced = data.depth === 'advanced';
  const handleMouseUp = createSelectionHandler(id, onTextSelect);

  const updateNodeInternals = useUpdateNodeInternals();
  useEffect(() => {
    updateNodeInternals(id);
  }, [data.concepts, data.subpoints, id, updateNodeInternals]);

  const handleConceptClick = (e: React.MouseEvent, concept: string) => {
    e.stopPropagation();
    if (onTextSelect) {
      onTextSelect(id, concept, e.clientX, e.clientY);
    }
  };

  // Left accent styling for premium tuition sticky note look
  const themeCardStyle = isAdvanced
    ? 'border-l-[8px] border-l-miro-rose border-miro-hairline-strong bg-gradient-to-br from-white to-miro-rose/[0.04] dark:border-cyber-border dark:border-l-cyber-magenta dark:from-slate-900/90 dark:to-cyber-magenta/5 dark:hover:shadow-neon-magenta/10'
    : 'border-l-[8px] border-l-miro-teal border-miro-hairline-strong bg-gradient-to-br from-white to-miro-teal/[0.04] dark:border-cyber-border dark:border-l-cyber-cyan dark:from-slate-900/90 dark:to-cyber-cyan/5 dark:hover:shadow-neon-cyan/10';

  return (
    <div 
      onMouseUp={handleMouseUp}
      className={`p-6 rounded-[24px] border-2 transition-[background-color,border-color,box-shadow] duration-300 w-80 glass-panel select-text hover:shadow-xl cursor-grab active:cursor-grabbing ${themeCardStyle} ${
        selected ? 'ring-4 ring-miro-blue/20 dark:ring-cyber-cyan/20 border-miro-blue dark:border-cyber-cyan' : ''
      }`}
    >
      <CardinalHandles />

      {/* Title */}
      <div className="flex items-center justify-between mb-3 select-none">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4.5 h-4.5 text-miro-blue dark:text-cyber-cyan" />
          <h5 className="font-extrabold text-sm tracking-tight text-[var(--text-primary)] dark:text-white">
            {toPlainString(data.title) || 'Concept'}
          </h5>
        </div>
        <div className="flex items-center gap-1.5">
          {onRefreshNode && (
            <button
              onClick={(e) => { e.stopPropagation(); onRefreshNode(id); }}
              title="Refresh / Retry explanation"
              className="nodrag p-1 rounded-full hover:bg-miro-surface dark:hover:bg-cyber-bg/60 text-miro-ink/40 dark:text-cyber-text/40 hover:text-miro-blue dark:hover:text-cyber-cyan transition-all"
            >
              <RotateCw className="w-3 h-3" />
            </button>
          )}
          <span className={`text-[9px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full ${
            isAdvanced 
              ? 'bg-miro-rose/20 text-red-700 dark:bg-cyber-magenta/20 dark:text-cyber-magenta'
              : 'bg-miro-teal/20 text-teal-800 dark:bg-cyber-cyan/20 dark:text-cyber-cyan'
          }`}>
            {data.depth || 'basic'}
          </span>
        </div>
      </div>

      {/* Definition */}
      <div className="mb-3.5">
        <p className="text-[9px] uppercase font-bold tracking-wider text-miro-ink/40 dark:text-cyber-text/40 mb-1 select-none">
          Definition
        </p>
        <div className="nodrag cursor-text text-[15px] text-[var(--text-primary)] dark:text-cyber-text leading-relaxed handwritten">
          {data.definition ? renderFormattedText(renderSafeText(data.definition), data.concepts || [], handleConceptClick, id) : ''}
        </div>
      </div>

      {/* Intuition */}
      {data.intuition && (
        <div className="mb-3.5">
          <p className="text-[9px] uppercase font-bold tracking-wider text-miro-ink/40 dark:text-cyber-text/40 mb-1 select-none">
            Analogy / Intuition
          </p>
          <div className="nodrag cursor-text text-[15px] italic text-[var(--text-secondary)] dark:text-cyber-text/80 leading-relaxed bg-miro-surface/75 dark:bg-cyber-bg/50 p-3 rounded-xl border border-miro-hairline-soft dark:border-cyber-border/40 handwritten">
            {renderFormattedText(renderSafeText(data.intuition), data.concepts || [], handleConceptClick, id)}
          </div>
        </div>
      )}

      {/* Role */}
      {data.contextRole && (
        <div className="mb-3.5">
          <p className="text-[9px] uppercase font-bold tracking-wider text-miro-ink/40 dark:text-cyber-text/40 mb-1 select-none">
            Role in Context
          </p>
          <div className="nodrag cursor-text text-[15px] text-[var(--text-secondary)] dark:text-cyber-text/95 leading-relaxed handwritten">
            {renderFormattedText(renderSafeText(data.contextRole), data.concepts || [], handleConceptClick, id)}
          </div>
        </div>
      )}

      {/* Subpoints Bullets - Click to Expand Sideboard Trajectory */}
      {data.subpoints && data.subpoints.length > 0 && (
        <div className="mt-4 pt-3 border-t border-miro-hairline-strong/40 dark:border-cyber-border/40 select-none">
          <p className="text-[9px] uppercase font-black text-miro-ink/40 dark:text-cyber-text/40 tracking-wider mb-2">
            Subpoints (Click to branch)
          </p>
          <ul className="flex flex-col gap-1.5">
            {data.subpoints.map(toPlainString).filter(Boolean).map((subStr, idx) => {
              const subHandleId = `handle-${id}-${slugify(subStr)}`;
              return (
                <li 
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSubpointSelect) {
                      onSubpointSelect(id, subStr, e.clientX, e.clientY);
                    }
                  }}
                  className="relative text-xs text-miro-blue hover:text-miro-blue-pressed dark:text-cyber-cyan cursor-pointer flex items-center gap-2 p-1.5 rounded-lg hover:bg-miro-blue/5 dark:hover:bg-cyber-cyan/10 font-bold transition-all border border-transparent hover:border-miro-blue/10 dark:hover:border-cyber-cyan/10 group"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-miro-blue dark:text-cyber-cyan" />
                  <span className="flex-1">{subStr}</span>
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={subHandleId}
                    className="!bg-miro-blue dark:!bg-cyber-cyan !w-2.5 !h-2.5 !border-2 !border-white dark:!border-slate-950 opacity-80 group-hover:opacity-100 transition-opacity"
                    style={{ right: -6, top: '50%', transform: 'translateY(-50%)' }}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export const SubtopicNode: React.FC<CustomNodeProps> = ({ 
  id, 
  data, 
  selected, 
  onTextSelect,
  onRefreshNode
}) => {
  const handleMouseUp = createSelectionHandler(id, onTextSelect);
  const updateNodeInternals = useUpdateNodeInternals();
  useEffect(() => {
    updateNodeInternals(id);
  }, [data.concepts, data.subpoints, id, updateNodeInternals]);

  const handleConceptClick = (e: React.MouseEvent, concept: string) => {
    e.stopPropagation();
    if (onTextSelect) {
      onTextSelect(id, concept, e.clientX, e.clientY);
    }
  };

  return (
    <div 
      onMouseUp={handleMouseUp}
      className={`p-6 rounded-[24px] border-2 border-l-[8px] transition-[background-color,border-color,box-shadow] duration-300 w-72 glass-panel select-text hover:shadow-xl border-l-miro-yellow border-miro-hairline-strong bg-gradient-to-br from-white to-miro-yellow/[0.04] dark:border-cyber-border dark:border-l-cyber-yellow dark:from-slate-900/90 dark:to-cyber-yellow/5 dark:hover:shadow-neon-yellow/10 cursor-grab active:cursor-grabbing ${
        selected ? 'ring-4 ring-miro-yellow/30 border-miro-yellow dark:border-cyber-yellow' : ''
      }`}
    >
      <CardinalHandles />

      {/* Header */}
      <div className="flex items-center gap-1.5 mb-3 pb-2 border-b border-miro-yellow/30 dark:border-cyber-yellow/30 select-none">
        <HelpCircle className="w-4 h-4 text-miro-yellow-dark dark:text-cyber-yellow" />
        <span className="text-[10px] uppercase font-black tracking-wider text-miro-yellow-dark dark:text-cyber-yellow">
          Subtopic
        </span>
        {data.parentConcept && (
          <span className="text-[9px] text-miro-ink/40 dark:text-cyber-text/40 truncate max-w-[90px] font-bold">
            under {data.parentConcept}
          </span>
        )}
        {onRefreshNode && (
          <button
            onClick={(e) => { e.stopPropagation(); onRefreshNode(id); }}
            title="Refresh / Retry subtopic"
            className="nodrag ml-auto p-1 rounded-full hover:bg-miro-surface dark:hover:bg-cyber-bg/60 text-miro-ink/40 dark:text-cyber-text/40 hover:text-miro-yellow-dark dark:hover:text-cyber-yellow transition-all"
          >
            <RotateCw className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Title */}
      <h6 className="nodrag cursor-text font-extrabold text-sm text-[var(--text-primary)] dark:text-white mb-3 tracking-tight">
        {toPlainString(data.title)}
      </h6>

      {/* Definition */}
      <div className="mb-3">
        <p className="text-[9px] uppercase font-bold tracking-wider text-miro-ink/40 dark:text-cyber-text/40 mb-1 select-none">
          What it is
        </p>
        <div className="nodrag cursor-text text-[15px] text-[var(--text-primary)] dark:text-cyber-text leading-relaxed handwritten">
          {data.definition ? renderFormattedText(renderSafeText(data.definition), data.concepts || [], handleConceptClick, id) : ''}
        </div>
      </div>

      {/* Why it matters */}
      {data.whyItMatters && (
        <div className="mb-3 bg-miro-yellow-light/25 dark:bg-cyber-yellow/10 p-3 rounded-xl border border-miro-yellow/20 dark:border-cyber-yellow/20 select-text">
          <p className="text-[9px] uppercase font-bold tracking-wider text-miro-yellow-dark dark:text-cyber-yellow mb-1 select-none">
            Why it matters
          </p>
          <div className="nodrag cursor-text text-[14px] font-bold text-miro-yellow-dark dark:text-cyber-yellow/90 leading-snug handwritten">
            {renderFormattedText(renderSafeText(data.whyItMatters), data.concepts || [], handleConceptClick, id)}
          </div>
        </div>
      )}

      {/* Intuition */}
      {data.intuition && (
        <div>
          <p className="text-[9px] uppercase font-bold tracking-wider text-miro-ink/40 dark:text-cyber-text/40 mb-1 select-none">
            Quick Analogy
          </p>
          <div className="nodrag cursor-text text-[15px] text-[var(--text-secondary)] dark:text-cyber-text/85 italic leading-relaxed handwritten">
            {renderFormattedText(renderSafeText(data.intuition), data.concepts || [], handleConceptClick, id)}
          </div>
        </div>
      )}
    </div>
  );
};

export const CodeNode: React.FC<CustomNodeProps & { onLineSelect?: (nodeId: string, lineText: string, clientX: number, clientY: number) => void }> = ({
  id,
  data,
  selected,
  onLineSelect
}) => {
  const handleLineClick = (e: React.MouseEvent, lineText: string) => {
    e.stopPropagation();
    if (onLineSelect && lineText.trim()) {
      onLineSelect(id, lineText, e.clientX, e.clientY);
    }
  };

  const codeLines = (data.code || '').split('\n');

  return (
    <div className={`p-0 rounded-2xl border-2 overflow-hidden transition-[background-color,border-color,box-shadow] duration-300 w-[470px] glass-panel select-text hover:shadow-xl border-l-[8px] border-l-miro-blue dark:border-l-cyber-cyan cursor-grab active:cursor-grabbing ${
      selected 
        ? 'border-miro-blue shadow-lg dark:border-cyber-cyan dark:shadow-neon-cyan/20' 
        : 'border-miro-hairline-strong dark:border-cyber-border'
    }`}>
      <CardinalHandles />

      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-miro-surface dark:bg-cyber-bg/60 border-b border-miro-hairline dark:border-cyber-border/40 select-none">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-miro-blue dark:text-cyber-cyan" />
          <span className="text-xs font-bold text-[var(--text-secondary)] dark:text-cyber-text">
            {data.title || 'Code Snippet'}
          </span>
        </div>
        <span className="text-[9px] uppercase font-black text-miro-ink/40 dark:text-cyber-text/40 bg-miro-hairline-strong/30 dark:bg-cyber-border px-2 py-0.5 rounded-full">
          {data.language || 'code'}
        </span>
      </div>

      {/* Code Body */}
      <div className="nodrag cursor-text p-4 bg-slate-950 text-gray-100 font-mono text-[11px] leading-relaxed overflow-x-auto select-text">
        {codeLines.map((line, index) => (
          <div 
            key={index} 
            onClick={(e) => handleLineClick(e, line)}
            className="flex group cursor-pointer hover:bg-slate-900 py-0.5 px-1.5 rounded-lg transition-all"
          >
            {/* Line Number */}
            <span className="w-8 text-right text-slate-500 mr-4 select-none border-r border-slate-900 pr-2 group-hover:text-cyber-cyan">
              {index + 1}
            </span>
            <span className="flex-1 whitespace-pre group-hover:text-white">
              {line || ' '}
            </span>
          </div>
        ))}
      </div>

      {/* Hint Footer */}
      <div className="px-4 py-2 bg-miro-surface dark:bg-cyber-bg/40 text-[9px] text-miro-ink/50 dark:text-cyber-text/50 flex items-center gap-1.5 select-none border-t border-miro-hairline dark:border-cyber-border/20">
        <AlertCircle className="w-3.5 h-3.5 text-miro-blue dark:text-cyber-cyan" />
        Click or drag highlights on code lines to analyze logic blocks.
      </div>
    </div>
  );
};

export const DocumentNode: React.FC<CustomNodeProps> = ({ 
  id, 
  data, 
  selected, 
  onTextSelect 
}) => {
  const handleMouseUp = createSelectionHandler(id, onTextSelect);

  return (
    <div 
      onMouseUp={handleMouseUp}
      className={`p-5 rounded-2xl border-2 border-l-[8px] border-l-purple-500 border-miro-hairline-strong bg-gradient-to-br from-white to-purple-500/[0.04] dark:border-cyber-border dark:border-l-purple-500 dark:from-slate-900/90 dark:to-purple-500/5 select-text hover:shadow-xl transition-[background-color,border-color,box-shadow] duration-300 w-64 cursor-grab active:cursor-grabbing ${
        selected ? 'ring-4 ring-purple-500/20 border-purple-500 dark:border-purple-500' : ''
      }`}
    >
      <CardinalHandles />

      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-miro-hairline dark:border-cyber-border/40 select-none">
        <FileText className="w-4 h-4 text-purple-500 dark:text-purple-400" />
        <span className="text-[10px] uppercase font-black tracking-wider text-purple-600 dark:text-purple-400">
          Source Material
        </span>
      </div>

      {/* Title */}
      <h6 className="nodrag cursor-text font-extrabold text-sm text-[var(--text-primary)] dark:text-white mb-2 leading-tight tracking-tight">
        {data.title}
      </h6>

      {/* Traceability link */}
      {data.fileSource && (
        <span className="text-[9px] text-miro-ink/40 dark:text-cyber-text/40 block italic select-none font-bold mt-2">
          Page {data.pageNumber || 1} of {data.fileSource}
        </span>
      )}
    </div>
  );
};
