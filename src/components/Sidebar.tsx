import React, { useState } from 'react';
import { Upload, FileText, Star, Trash2, Crosshair, ChevronRight, Play, BookOpen } from 'lucide-react';
import { MockRevisionItem } from '../lib/dummyData';

// Sample syllabus outlines — replace with real document parsing API when ready
const SYLLABUS_OUTLINES: Record<string, { root: string; topics: { name: string; subtopics: string[] }[] }> = {
  'deep-learning-101.pdf': {
    root: 'Deep Learning Core Syllabus',
    topics: [
      { name: 'Neural Networks Basics', subtopics: ['Perceptrons', 'Activation Functions', 'Loss Functions', 'Forward Pass'] },
      { name: 'Optimization Algorithms', subtopics: ['Stochastic Gradient Descent', 'Momentum', 'Adam Optimizer', 'Learning Rate Schedulers'] },
    ],
  },
  'transformers-deep-dive.pptx': {
    root: 'Transformers & LLM Architecture',
    topics: [
      { name: 'Attention Mechanisms', subtopics: ['Scaled Dot-Product Attention', 'Multi-Head Attention', 'Self-Attention vs Cross-Attention'] },
      { name: 'Sequence-to-Sequence Modeling', subtopics: ['Encoder-Decoder Stack', 'Positional Encoding'] },
    ],
  },
};

interface SidebarProps {
  revisionItems: MockRevisionItem[];
  onRemoveRevision: (id: string) => void;
  onRecallNode: (nodeId: string) => void;
  onAddDocumentToCanvas: (docName: string, topicName: string, subtopics: string[]) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  revisionItems,
  onRemoveRevision,
  onRecallNode,
  onAddDocumentToCanvas
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'revision'>('upload');
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [customFiles, setCustomFiles] = useState<string[]>([]);

  const handleMockUpload = (fileName: string) => {
    setUploading(true);
    setSelectedDoc(null);
    setTimeout(() => {
      setUploading(false);
      setSelectedDoc(fileName);
      if (!customFiles.includes(fileName)) {
        setCustomFiles(prev => [...prev, fileName]);
      }
    }, 1200);
  };

  const handleCustomFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      handleMockUpload(file.name);
    }
  };

  return (
    <aside className="w-80 h-[calc(100vh-64px)] flex flex-col border-l border-miro-hairline-strong dark:border-cyber-border bg-white/95 dark:bg-slate-950/80 backdrop-blur-md z-10 transition-colors duration-300">
      {/* Sidebar Tabs */}
      <div className="flex border-b border-miro-hairline dark:border-cyber-border p-2 gap-2">
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'upload'
              ? 'bg-miro-ink text-white dark:bg-cyber-cyan dark:text-cyber-bg'
              : 'hover:bg-miro-surface dark:hover:bg-cyber-bg/60 text-miro-ink/60 dark:text-cyber-text/60'
          }`}
        >
          <Upload className="w-4 h-4" />
          Study Materials
        </button>
        <button
          onClick={() => setActiveTab('revision')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'revision'
              ? 'bg-miro-ink text-white dark:bg-cyber-cyan dark:text-cyber-bg shadow-sm'
              : 'hover:bg-miro-surface dark:hover:bg-cyber-bg/60 text-miro-ink/60 dark:text-cyber-text/60'
          }`}
        >
          <Star className="w-4 h-4" />
          Revision List ({revisionItems.length})
        </button>
      </div>

      {/* Sidebar Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'upload' && (
          <div className="flex flex-col gap-5">
            {/* File Upload Selector */}
            <div className="border-2 border-dashed border-miro-hairline-strong dark:border-cyber-border rounded-2xl p-6 text-center hover:border-miro-blue dark:hover:border-cyber-cyan transition-colors relative">
              <input
                type="file"
                onChange={handleCustomFileUpload}
                accept=".pdf,.ppt,.pptx,image/*"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="w-8 h-8 mx-auto mb-3 text-miro-ink/40 dark:text-cyber-text/40 animate-pulse-slow" />
              <p className="text-xs font-bold mb-1 text-[var(--text-primary)] dark:text-white">
                Upload study material
              </p>
              <p className="text-[10px] text-miro-ink/40 dark:text-cyber-text/40">
                Supports PDF, PPT, Images
              </p>
            </div>

            {/* Ingested Document Mocks */}
            <div>
              <h4 className="text-xs uppercase font-bold text-miro-ink/40 dark:text-cyber-text/50 tracking-wider mb-3">
                Pre-loaded Study Guides
              </h4>
              <div className="flex flex-col gap-2">
                {Object.keys(SYLLABUS_OUTLINES).map(fileName => (
                  <button
                    key={fileName}
                    onClick={() => handleMockUpload(fileName)}
                    disabled={uploading}
                    className={`flex items-center justify-between text-left p-3 rounded-xl border text-xs font-semibold transition-all ${
                      selectedDoc === fileName
                        ? 'border-miro-blue bg-miro-blue/5 text-miro-blue dark:border-cyber-cyan dark:bg-cyber-cyan/5 dark:text-cyber-cyan'
                        : 'border-miro-hairline hover:bg-miro-surface dark:border-cyber-border dark:hover:bg-cyber-bg/40 text-[var(--text-primary)] dark:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 shrink-0" />
                      <span className="truncate">{fileName}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-70" />
                  </button>
                ))}
              </div>
            </div>

            {/* Material Processing Status */}
            {uploading && (
              <div className="p-4 rounded-xl border border-miro-yellow bg-miro-yellow-light/20 text-center text-xs text-miro-yellow-dark dark:border-cyber-yellow dark:text-cyber-yellow flex flex-col items-center gap-2 animate-pulse">
                <Play className="w-4 h-4 animate-spin text-miro-yellow-dark dark:text-cyber-yellow" />
                Parsing material structure with AI...
              </div>
            )}

            {/* Render Ingested Topic Tree */}
            {selectedDoc && !uploading && (
              <div className="border border-miro-hairline-strong dark:border-cyber-border rounded-xl p-3 bg-miro-surface dark:bg-cyber-bg/30 animate-in fade-in slide-in-from-top-2 duration-300">
                <h5 className="text-[11px] font-bold text-miro-ink/50 dark:text-cyber-cyan uppercase mb-3 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  Syllabus Outline
                </h5>
                <p className="text-xs font-black text-[var(--text-primary)] dark:text-white mb-4">
                  {SYLLABUS_OUTLINES[selectedDoc]?.root || 'Course Outline'}
                </p>

                <div className="flex flex-col gap-4">
                  {(SYLLABUS_OUTLINES[selectedDoc]?.topics || []).map((topic, i) => (
                    <div key={i} className="border-l-2 border-miro-blue/30 dark:border-cyber-cyan/35 pl-3 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--text-primary)] dark:text-white">
                          {topic.name}
                        </span>
                        <button
                          onClick={() => onAddDocumentToCanvas(selectedDoc, topic.name, topic.subtopics)}
                          className="text-[10px] font-bold text-miro-blue dark:text-cyber-cyan hover:underline"
                        >
                          + Add Map
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {topic.subtopics.map((sub: string, k: number) => (
                          <span
                            key={k}
                            className="text-[10px] bg-white dark:bg-slate-900 border border-miro-hairline dark:border-cyber-border text-miro-ink/65 dark:text-cyber-text/80 px-2 py-0.5 rounded-full"
                          >
                            {sub}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'revision' && (
          <div className="flex flex-col gap-3">
            {revisionItems.length === 0 ? (
              <div className="text-center p-8 text-xs text-miro-ink/40 dark:text-cyber-text/40">
                No items in your revision list yet. Highlight concepts or code inside nodes and select "Add to revision" to save them.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-[10px] text-miro-ink/50 dark:text-cyber-text/50 uppercase tracking-wide font-semibold">
                  Spaced Repetition items
                </p>
                {revisionItems.map(item => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-miro-hairline-strong dark:border-cyber-border bg-white dark:bg-slate-900 shadow-sm flex flex-col gap-2 relative group hover:border-miro-blue dark:hover:border-cyber-cyan transition-all"
                  >
                    {/* Item type badge */}
                    <span className={`text-[8px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full self-start ${
                      item.type === 'concept'
                        ? 'bg-miro-rose/25 text-red-800 dark:bg-cyber-magenta/20 dark:text-cyber-magenta'
                        : 'bg-miro-teal/25 text-teal-800 dark:bg-cyber-cyan/20 dark:text-cyber-cyan'
                    }`}>
                      {item.type}
                    </span>

                    {/* Title */}
                    <h6 className="text-xs font-bold text-[var(--text-primary)] dark:text-white pr-6">
                      {item.title}
                    </h6>

                    {/* Summary */}
                    <p className="text-[11px] text-miro-ink/60 dark:text-cyber-text/75 leading-relaxed">
                      {item.summary}
                    </p>

                    {/* Recall & Delete actions */}
                    <div className="flex items-center gap-3 mt-2 pt-2 border-t border-miro-hairline dark:border-cyber-border/40">
                      <button
                        onClick={() => onRecallNode(item.originalNodeId)}
                        className="flex items-center gap-1 text-[10px] font-bold text-miro-blue dark:text-cyber-cyan hover:underline"
                      >
                        <Crosshair className="w-3.5 h-3.5" />
                        Recall Node
                      </button>
                      <button
                        onClick={() => onRemoveRevision(item.id)}
                        className="flex items-center gap-1 text-[10px] font-bold text-red-500 hover:text-red-700 ml-auto hover:underline"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
