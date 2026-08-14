import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, GraduationCap, Star, HelpCircle, ArrowRight, X } from 'lucide-react';

interface ContextMenuProps {
  isOpen: boolean;
  x: number;
  y: number;
  selectionText: string;
  onClose: () => void;
  onOptionSelect: (option: 'basic' | 'advanced' | 'revision' | 'custom', customQuestion?: string) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  isOpen,
  x,
  y,
  selectionText,
  onClose,
  onOptionSelect
}) => {
  const [customQuestion, setCustomQuestion] = useState('');
  const [showQuestionInput, setShowQuestionInput] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reset state when selection changes or opens
    if (isOpen) {
      setShowQuestionInput(false);
      setCustomQuestion('');
    }
  }, [isOpen, selectionText]);

  useEffect(() => {
    // Click outside to close helper
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Truncate selected text for preview
  const truncatedText = selectionText.length > 35 
    ? `"${selectionText.slice(0, 35)}..."` 
    : `"${selectionText}"`;

  return (
    <div
      ref={menuRef}
      style={{ top: `${y + 10}px`, left: `${x + 10}px` }}
      className="fixed z-50 w-72 rounded-2xl border shadow-xl bg-white/95 dark:bg-slate-900/95 border-miro-hairline-strong dark:border-cyber-cyan/30 backdrop-blur-md text-[var(--text-primary)] dark:text-white p-3 animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header Info */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-miro-hairline dark:border-cyber-border">
        <span className="text-[10px] uppercase font-bold tracking-wider text-miro-ink/50 dark:text-cyber-cyan truncate max-w-[200px]">
          Selection: {truncatedText}
        </span>
        <button onClick={onClose} className="p-0.5 rounded-full hover:bg-miro-surface dark:hover:bg-cyber-bg/60 text-miro-ink/40 dark:text-cyber-text/40">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Menu Actions */}
      {!showQuestionInput ? (
        <div className="flex flex-col gap-1">
          {/* Learn Basics */}
          <button
            onClick={() => onOptionSelect('basic')}
            className="flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs font-medium rounded-xl hover:bg-miro-teal/15 hover:text-teal-800 dark:hover:bg-cyber-cyan/15 dark:hover:text-cyber-cyan transition-colors"
          >
            <BookOpen className="w-4 h-4 text-miro-teal dark:text-cyber-cyan" />
            <div className="flex-1">
              <p className="font-bold">Learn Basics</p>
              <p className="text-[10px] text-miro-ink/50 dark:text-cyber-text/50">2-line definition & intuition</p>
            </div>
          </button>

          {/* Learn In Depth */}
          <button
            onClick={() => onOptionSelect('advanced')}
            className="flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs font-medium rounded-xl hover:bg-miro-rose/15 hover:text-red-700 dark:hover:bg-cyber-magenta/15 dark:hover:text-cyber-magenta transition-colors"
          >
            <GraduationCap className="w-4 h-4 text-miro-rose dark:text-cyber-magenta" />
            <div className="flex-1">
              <p className="font-bold">Learn in Depth</p>
              <p className="text-[10px] text-miro-ink/50 dark:text-cyber-text/50">Detailed equations & examples</p>
            </div>
          </button>

          {/* Add to Revision */}
          <button
            onClick={() => onOptionSelect('revision')}
            className="flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs font-medium rounded-xl hover:bg-miro-yellow/20 hover:text-miro-yellow-dark dark:hover:bg-cyber-yellow/15 dark:hover:text-cyber-yellow transition-colors"
          >
            <Star className="w-4 h-4 text-miro-yellow-dark dark:text-cyber-yellow" />
            <div className="flex-1">
              <p className="font-bold">Add to Revision List</p>
              <p className="text-[10px] text-miro-ink/50 dark:text-cyber-text/50">Save for spaced repetition recall</p>
            </div>
          </button>

          {/* Ask Custom Question */}
          <button
            onClick={() => setShowQuestionInput(true)}
            className="flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs font-medium rounded-xl hover:bg-miro-blue/15 hover:text-miro-blue dark:hover:bg-cyber-cyan/15 dark:hover:text-cyber-cyan transition-colors border-t border-dashed border-miro-hairline dark:border-cyber-border mt-1 pt-2"
          >
            <HelpCircle className="w-4 h-4 text-miro-blue dark:text-cyber-cyan" />
            <div className="flex-1">
              <p className="font-bold">Ask Custom Question...</p>
              <p className="text-[10px] text-miro-ink/50 dark:text-cyber-text/50">Type your own prompt for this selection</p>
            </div>
          </button>
        </div>
      ) : (
        /* Custom Question Input UI */
        <div className="p-1 animate-in slide-in-from-bottom-2 duration-200">
          <label className="block text-[10px] font-bold text-miro-ink/65 dark:text-cyber-cyan mb-2">
            Ask about {truncatedText}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              placeholder="e.g. Convert this to code..."
              autoFocus
              className="flex-1 text-xs px-2.5 py-1.5 rounded-xl border bg-miro-surface dark:bg-cyber-bg border-miro-hairline-strong dark:border-cyber-border text-[var(--text-primary)] dark:text-white focus:outline-none focus:border-miro-blue dark:focus:border-cyber-cyan"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customQuestion.trim()) {
                  onOptionSelect('custom', customQuestion);
                }
              }}
            />
            <button
              onClick={() => {
                if (customQuestion.trim()) {
                  onOptionSelect('custom', customQuestion);
                }
              }}
              disabled={!customQuestion.trim()}
              className="p-1.5 rounded-xl bg-miro-ink dark:bg-cyber-cyan text-white dark:text-cyber-bg hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            onClick={() => setShowQuestionInput(false)}
            className="mt-2.5 text-[10px] text-miro-ink/40 dark:text-cyber-text/40 hover:underline"
          >
            ← Back to options
          </button>
        </div>
      )}
    </div>
  );
};
