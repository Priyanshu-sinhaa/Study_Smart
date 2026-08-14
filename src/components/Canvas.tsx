import React, { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  Panel,
  Node,
  Edge,
  OnConnect,
  addEdge,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { ConversationNode, ConceptNode, SubtopicNode, CodeNode, DocumentNode } from './CustomNodes';

interface CanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: any;
  onEdgesChange: any;
  onConnect: OnConnect;
  onConceptSelect: (nodeId: string, concept: string, x: number, y: number) => void;
  onLineSelect: (nodeId: string, line: string, x: number, y: number) => void;
  onRefreshNode?: (nodeId: string) => void;
  isDark: boolean;
}

export const Canvas: React.FC<CanvasProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onConceptSelect,
  onLineSelect,
  onRefreshNode,
  isDark
}) => {
  // Memoize nodeTypes so React Flow does not trigger unnecessary node re-renders
  const nodeTypes = useMemo(() => ({
    conversation: (props: any) => (
      <ConversationNode 
        {...props} 
        onConceptSelect={onConceptSelect} 
        onTextSelect={onConceptSelect}
        onRefreshNode={onRefreshNode}
      />
    ),
    concept: (props: any) => (
      <ConceptNode 
        {...props} 
        onTextSelect={onConceptSelect} 
        onSubpointSelect={onConceptSelect}
        onRefreshNode={onRefreshNode}
      />
    ),
    subtopic: (props: any) => (
      <SubtopicNode 
        {...props} 
        onTextSelect={onConceptSelect}
        onRefreshNode={onRefreshNode}
      />
    ),
    code: (props: any) => (
      <CodeNode 
        {...props} 
        onLineSelect={onLineSelect} 
      />
    ),
    document: (props: any) => (
      <DocumentNode 
        {...props} 
        onTextSelect={onConceptSelect}
      />
    ),
  }), [onConceptSelect, onLineSelect, onRefreshNode]);

  const defaultEdgeOptions = useMemo(() => ({
    style: { strokeWidth: 2, stroke: isDark ? 'rgba(0, 240, 255, 0.4)' : '#a5a8b5' },
    animated: true,
    zIndex: 3,
  }), [isDark]);

  return (
    <div className="w-full h-full bg-[var(--canvas-bg)] relative transition-colors duration-300">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        minZoom={0.01}
        maxZoom={100}
        colorMode={isDark ? 'dark' : 'light'}
        className="w-full h-full"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={18}
          size={1.5}
          color={isDark ? 'rgba(0, 240, 255, 0.15)' : 'rgba(5, 0, 56, 0.08)'}
        />
        <Controls 
          className="!bg-white dark:!bg-slate-900 !border-miro-hairline-strong dark:!border-cyber-border !rounded-xl !shadow-md [&_button]:!border-miro-hairline dark:[&_button]:!border-cyber-border [&_button]:!text-miro-ink dark:[&_button]:!text-white [&_button]:hover:!bg-miro-surface dark:[&_button]:hover:!bg-cyber-bg/60"
        />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case 'conversation':
                return '#ffd02f';
              case 'concept':
                return node.data.depth === 'advanced' ? '#ff9999' : '#0fbcb0';
              case 'subtopic':
                return '#fcb900';
              case 'code':
                return '#4262ff';
              case 'document':
                return '#5b76fe';
              default:
                return '#eee';
            }
          }}
          className="!bg-white/80 dark:!bg-slate-950/80 !border-miro-hairline-strong dark:!border-cyber-border !rounded-xl !shadow-md hidden sm:block"
        />

        <Panel position="bottom-center" className="flex gap-2">
          <div className="px-4 py-2 text-[10px] sm:text-xs font-bold rounded-2xl glass-panel text-[var(--text-secondary)] bg-white/90 dark:bg-slate-950/90 dark:text-cyber-text shadow-md flex gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-miro-yellow"></span>
              Q&A
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-miro-teal"></span>
              Basic Concept
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-miro-rose"></span>
              Advanced Concept
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-miro-yellow-light border border-miro-yellow-dark"></span>
              Subtopic
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-miro-blue"></span>
              Code Snippet
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};
