'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNodesState, useEdgesState, addEdge, Node, Edge, Connection } from '@xyflow/react';
import { Sparkles, Moon, Sun, Send, Key, CreditCard, Lock, CheckCircle2, ChevronDown, Plus, LogOut, Trash2, AlertTriangle } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { createLogger } from '../../lib/logger';

const log = createLogger('Canvas');

/** Normalize the AI-returned concepts field — can be string[] or {name,description}[] */
const normalizeConcepts = (raw: unknown): string[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map((item: unknown) => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object') {
      const obj = item as Record<string, unknown>;
      return String(obj.name || obj.title || obj.term || JSON.stringify(item));
    }
    return String(item);
  }).filter(Boolean);
};

import { Canvas } from '../../components/Canvas';
import { Sidebar } from '../../components/Sidebar';
import { ContextMenu } from '../../components/ContextMenu';
import { slugify, toPlainString } from '../../components/CustomNodes';
import {
  MockRevisionItem,
  DUMMY_MODELS,
  LearningSession,
} from '../../lib/dummyData';

export default function LearningCanvas() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect to landing page if unauthenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  // Theme State
  const [isDark, setIsDark] = useState(false);

  // Connection health indicator
  const [backendOffline, setBackendOffline] = useState(false);

  // Sessions States
  const [sessions, setSessions] = useState<LearningSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');

  // React Flow Canvas States
  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);

  // Revision List State
  const [revisionItems, setRevisionItems] = useState<MockRevisionItem[]>([]);

  // Model Selector States
  const [activeModel, setActiveModel] = useState(DUMMY_MODELS[0]);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [selectedLockModel, setSelectedLockModel] = useState<any>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [userKeys, setUserKeys] = useState<Record<string, string>>({});

  // Chat Input State
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Clear whiteboard confirmation dialog state
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    selectionText: string;
    nodeId: string;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    selectionText: '',
    nodeId: ''
  });

  // API base URL configuration
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Shared authenticated fetch helper — throws on network error (callers should .catch)
  const apiFetch = useCallback(async (path: string, options: RequestInit = {}) => {
    const url = `${API_URL}${path}`;
    const headers = new Headers(options.headers || {});
    
    if ((session as any)?.accessToken) {
      headers.set('Authorization', `Bearer ${(session as any).accessToken}`);
    } else {
      headers.set('Authorization', 'Bearer mock-developer-token');
    }
    
    try {
      const res = await fetch(url, { ...options, headers });
      if (backendOffline) {
        log.info('Backend reconnected');
      }
      setBackendOffline(false);
      return res;
    } catch (err) {
      log.warn(`Network error on ${path}`, err);
      setBackendOffline(true);
      throw err;
    }
  }, [session, API_URL, backendOffline]);

  // Sync current canvas elements to the FastAPI backend database (fire-and-forget — never throws)
  const syncCanvasToBackend = useCallback((currentNodes: Node[], currentEdges: Edge[]) => {
    if (!activeSessionId || !activeSessionId.trim()) return;

    const nodesPayload = currentNodes.map(n => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: n.data
    }));

    const edgesPayload = currentEdges.map(e => ({
      id: e.id,
      source: e.source,
      sourceHandle: e.sourceHandle || null,
      target: e.target,
      targetHandle: e.targetHandle || null,
      label: e.label || null,
      animated: e.animated !== false
    }));

    const token = (session as any)?.accessToken ? `Bearer ${(session as any).accessToken}` : 'Bearer mock-developer-token';
    fetch(`${API_URL}/api/canvas/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify({
        session_id: activeSessionId,
        nodes: nodesPayload,
        edges: edgesPayload
      })
    }).catch(() => {/* silent — background autosave is best-effort */});
  }, [activeSessionId, session, API_URL]);

  // Debounced synchronization tracker to prevent request flood during active card dragging
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const debounceSync = useCallback((currentNodes: Node[], currentEdges: Edge[]) => {
    if (backendOffline) return;
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    syncTimeoutRef.current = setTimeout(() => {
      syncCanvasToBackend(currentNodes, currentEdges);
    }, 1200);
  }, [syncCanvasToBackend, backendOffline]);

  // Fetch workspaces list on startup
  useEffect(() => {
    if (status !== 'authenticated') return;
    log.info('Fetching sessions...');
    apiFetch('/api/sessions')
      .then(r => r.json())
      .then(data => {
        if (data && data.length > 0) {
          log.info(`Loaded ${data.length} session(s)`, data.map((s: any) => s.title));
          setSessions(data);
          setActiveSessionId(data[0].id);
        } else {
          log.warn('No sessions returned from backend');
        }
      })
      .catch(err => {
        log.error('Failed to fetch sessions — backend offline?', err);
        setBackendOffline(true);
      });
  }, [status, apiFetch]);

  // Fetch revision items on startup
  useEffect(() => {
    if (status !== 'authenticated') return;
    apiFetch('/api/revision')
      .then(r => r.json())
      .then(data => {
        if (data) setRevisionItems(data);
      })
      .catch(err => {
        console.error('Failed to load revision items:', err);
      });
  }, [status, apiFetch]);

  // Fetch specific session's nodes/edges on session switch
  useEffect(() => {
    if (status !== 'authenticated' || !activeSessionId) return;
    log.info(`Loading canvas for session: ${activeSessionId}`);
    apiFetch(`/api/canvas?sessionId=${activeSessionId}`)
      .then(r => r.json())
      .then(data => {
        const rawNodes = data.nodes || [];
        const sanitizedNodes = rawNodes.map((n: any) => ({
          ...n,
          data: {
            ...n.data,
            concepts: normalizeConcepts(n.data?.concepts),
            subpoints: normalizeConcepts(n.data?.subpoints),
          }
        }));
        const backendEdges = (data.edges || []).map((e: any) => ({
          id: e.id,
          source: e.source,
          sourceHandle: e.sourceHandle || undefined,
          target: e.target,
          targetHandle: e.targetHandle || undefined,
          label: e.label || '',
          animated: e.animated !== false,
          style: { strokeWidth: 2, stroke: isDark ? 'rgba(0, 240, 255, 0.4)' : '#a5a8b5' },
          type: 'smoothstep',
          zIndex: 3
        }));
        log.info(`Canvas loaded: ${sanitizedNodes.length} nodes, ${(data.edges || []).length} edges`);
        setNodes(sanitizedNodes);
        setEdges(backendEdges);
      })
      .catch(err => {
        log.error(`Failed to load canvas for session: ${activeSessionId}`, err);
        setNodes([]);
        setEdges([]);
      });
  }, [activeSessionId, status, apiFetch]);

  // Wrapped canvas change handlers to autosave layout changes locally and trigger debounced sync
  const handleNodesChangeWrapped = useCallback((changes: any) => {
    onNodesChange(changes);
    setNodes((nds) => {
      debounceSync(nds, edges);
      return nds;
    });
  }, [onNodesChange, edges, debounceSync]);

  const handleEdgesChangeWrapped = useCallback((changes: any) => {
    onEdgesChange(changes);
    setEdges((eds) => {
      debounceSync(nodes, eds);
      return eds;
    });
  }, [onEdgesChange, nodes, debounceSync]);

  const switchSession = (newSessionId: string) => {
    setActiveSessionId(newSessionId);
  };

  const handleCreateSession = () => {
    const title = window.prompt("Enter learning session title:", "New Study Topic");
    if (!title || !title.trim()) return;

    if (backendOffline) {
      const newSessId = `sess-${Date.now()}`;
      setSessions(prev => [...prev, { id: newSessId, title: title.trim(), createdAt: new Date().toISOString().split('T')[0] }]);
      setActiveSessionId(newSessId);
      return;
    }

    apiFetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim() })
    })
      .then(r => r.json())
      .then(newSess => {
        setSessions(prev => [...prev, newSess]);
        setActiveSessionId(newSess.id);
      })
      .catch(err => console.error("Failed to create session:", err));
  };

  // Apply dark mode class to HTML
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  // Connect handler for custom manual whiteboard connections
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => {
      const next = addEdge(params, eds);
      syncCanvasToBackend(nodes, next);
      return next;
    }),
    [nodes, syncCanvasToBackend]
  );

  // Click handler inside node content to spawn context menu
  const handleConceptSelect = useCallback((nodeId: string, concept: string, x: number, y: number) => {
    setContextMenu({
      isOpen: true,
      x,
      y,
      selectionText: concept,
      nodeId
    });
  }, []);

  const handleLineSelect = useCallback((nodeId: string, line: string, x: number, y: number) => {
    setContextMenu({
      isOpen: true,
      x,
      y,
      selectionText: line.trim(),
      nodeId
    });
  }, []);

  // Node Refresh / Retry handler to allow re-fetching AI explanations for stuck/loading nodes
  const handleRefreshNode = useCallback((nodeId: string) => {
    setNodes(currentNodes => {
      const targetNode = currentNodes.find(n => n.id === nodeId);
      if (!targetNode) return currentNodes;

      log.info('Refreshing node', { nodeId, type: targetNode.type });

      if (targetNode.type === 'conversation') {
        const promptText = targetNode.data.question;
        if (!promptText) return currentNodes;

        apiFetch('/api/ai/ask', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Key': userKeys[activeModel.id] || '',
            'X-User-Model': activeModel.id
          },
          body: JSON.stringify({
            session_id: activeSessionId,
            prompt: promptText
          })
        })
          .then(r => r.json())
          .then(data => {
            setNodes(prev => {
              const next = prev.map(n => n.id === nodeId ? {
                ...n,
                data: {
                  ...n.data,
                  answer: data.answer || data.error || 'No response generated.',
                  concepts: normalizeConcepts(data.concepts)
                }
              } : n);
              syncCanvasToBackend(next, edges);
              return next;
            });
          })
          .catch(err => {
            setNodes(prev => prev.map(n => n.id === nodeId ? {
              ...n,
              data: { ...n.data, answer: `❌ Refresh error: ${err.message || 'Failed to refresh'}` }
            } : n));
          });

        return currentNodes.map(n => n.id === nodeId ? {
          ...n,
          data: { ...n.data, answer: '⏳ Refreshing tutor answer...', concepts: [] }
        } : n);

      } else if (targetNode.type === 'concept' || targetNode.type === 'subtopic') {
        const termToExplain = targetNode.data.title;
        if (!termToExplain) return currentNodes;

        const depthOption = targetNode.data.depth || 'basic';

        apiFetch('/api/ai/explain', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Key': userKeys[activeModel.id] || '',
            'X-User-Model': activeModel.id
          },
          body: JSON.stringify({
            session_id: activeSessionId,
            node_id: nodeId,
            selection_text: termToExplain,
            option: depthOption
          })
        })
          .then(r => r.json())
          .then(data => {
            setNodes(prev => {
              const next = prev.map(n => n.id === nodeId ? {
                ...n,
                data: {
                  ...n.data,
                  title: data.title || termToExplain,
                  definition: data.definition,
                  intuition: data.intuition,
                  contextRole: data.contextRole,
                  whyItMatters: data.whyItMatters || data.contextRole || '',
                  subpoints: normalizeConcepts(data.concepts)
                }
              } : n);
              syncCanvasToBackend(next, edges);
              return next;
            });
          })
          .catch(err => {
            setNodes(prev => prev.map(n => n.id === nodeId ? {
              ...n,
              data: { ...n.data, definition: `❌ Refresh error: ${err.message || 'Failed to refresh'}` }
            } : n));
          });

        return currentNodes.map(n => n.id === nodeId ? {
          ...n,
          data: { ...n.data, definition: '⏳ Retrying explanation...' }
        } : n);
      }

      return currentNodes;
    });
  }, [activeModel, userKeys, activeSessionId, apiFetch, syncCanvasToBackend, edges]);

  // Top Bar Question Submit triggers Q&A node creation and calls FastAPI AI API
  const handleAskAI = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    const userPrompt = prompt;
    setPrompt('');

    // Pre-spawn tutor node locally in thinking state
    const tempNodeId = `node-chat-${Date.now()}`;
    const tempNode: Node = {
      id: tempNodeId,
      type: 'conversation',
      position: { x: 100, y: nodes.length > 0 ? nodes[nodes.length - 1].position.y + 260 : 200 },
      data: {
        question: userPrompt,
        answer: '⏳ Tutor is thinking on the whiteboard...',
        concepts: []
      }
    };

    log.info('Sending AI ask', { prompt: userPrompt, model: activeModel.id, session: activeSessionId });
    setNodes(prev => [...prev, tempNode]);

    apiFetch('/api/ai/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Key': userKeys[activeModel.id] || '',
        'X-User-Model': activeModel.id
      },
      body: JSON.stringify({
        session_id: activeSessionId,
        prompt: userPrompt
      })
    })
      .then(r => r.json())
      .then(data => {
        log.info('AI ask response received', { concepts: data.concepts });
        setNodes(prev => {
          const next = prev.map(n => n.id === tempNodeId ? {
            ...n,
            data: {
              question: userPrompt,
              answer: data.answer || data.error || 'No response generated.',
              concepts: normalizeConcepts(data.concepts)
            }
          } : n);
          syncCanvasToBackend(next, edges);
          return next;
        });
      })
      .catch(err => {
        console.error("AI prompt call failed:", err);
        setNodes(prev => prev.map(n => n.id === tempNodeId ? {
          ...n,
          data: {
            question: userPrompt,
            answer: `Tutor connection error: ${err.message || 'Internal failure'}`,
            concepts: []
          }
        } : n));
      })
      .finally(() => {
        setIsGenerating(false);
      });
  };

  // Context Menu Option Select triggers concept explaining child cards creation
  const handleContextMenuOption = (
    option: 'basic' | 'advanced' | 'revision' | 'custom',
    customText?: string
  ) => {
    const { nodeId, selectionText } = contextMenu;
    setContextMenu(prev => ({ ...prev, isOpen: false }));

    const parentNode = nodes.find(n => n.id === nodeId);
    if (!parentNode) return;

    // Calculate node coordinates near parent
    const offsetDirection = option === 'basic' ? -1 : 1;
    const childX = parentNode.position.x + 390;
    const childY = parentNode.position.y + (offsetDirection * 140) + (Math.random() * 40);

    const childNodeId = `node-child-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Ensure parent node registers selectionText in concepts array so an inline handle is rendered for it
    setNodes(currentNodes => {
      return currentNodes.map(n => {
        if (n.id === nodeId) {
          const currentConcepts = (n.data as any).concepts || [];
          const exists = currentConcepts.some((c: string) => toPlainString(c).toLowerCase() === selectionText.toLowerCase());
          if (!exists) {
            return {
              ...n,
              data: {
                ...n.data,
                concepts: [...currentConcepts, selectionText]
              }
            };
          }
        }
        return n;
      });
    });

    if (option === 'basic' || option === 'advanced' || (option === 'custom' && customText)) {
      const sourceHandleId = `handle-${nodeId}-${slugify(selectionText)}`;
      const newEdge: Edge = {
        id: `edge-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        source: nodeId,
        sourceHandle: sourceHandleId,
        target: childNodeId,
        targetHandle: 'left-in',
        label: option === 'basic' ? 'explains' : 'deepens',
        animated: true,
        type: 'smoothstep',
        zIndex: 3
      };

      // Add a loading placeholder node immediately so user sees instant feedback
      const loadingNode: Node = {
        id: childNodeId,
        type: 'concept',
        position: { x: childX, y: childY },
        data: {
          title: selectionText,
          depth: option as 'basic' | 'advanced',
          definition: '⏳ Loading explanation...',
          intuition: '',
          contextRole: '',
          subpoints: []
        }
      };
      setNodes(prev => [...prev, loadingNode]);
      setEdges(prevEds => {
        const combined = [...prevEds, newEdge];
        return Array.from(new Map(combined.map(e => [e.id, e])).values());
      });

      log.info('Explain requested', { term: selectionText, option, nodeId, session: activeSessionId });

      apiFetch('/api/ai/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Key': userKeys[activeModel.id] || '',
          'X-User-Model': activeModel.id
        },
        body: JSON.stringify({
          session_id: activeSessionId,
          node_id: nodeId,
          selection_text: selectionText,
          option: option,
          custom_text: customText
        })
      })
        .then(r => r.json())
        .then(data => {
          log.info('Explain response received', { title: data.title, concepts: data.concepts });
          // Replace the loading placeholder with real data
          // Let the AI response determine type — subtopic if it returns whyItMatters, concept otherwise
          const isSubtopic = option === 'basic' && data.whyItMatters;
          let finalNode: Node;

          if (isSubtopic) {
            finalNode = {
              id: childNodeId,
              type: 'subtopic',
              position: { x: childX, y: childY },
              data: {
                title: data.title || selectionText,
                parentConcept: (parentNode.data as any).title || 'Parent Core',
                definition: data.definition,
                whyItMatters: data.whyItMatters || data.contextRole || '',
                intuition: data.intuition
              }
            };
          } else {
            finalNode = {
              id: childNodeId,
              type: 'concept',
              position: { x: childX, y: childY },
              data: {
                title: data.title || selectionText,
                depth: option as 'basic' | 'advanced',
                definition: data.definition,
                intuition: data.intuition,
                contextRole: data.contextRole,
                subpoints: normalizeConcepts(data.concepts)
              }
            };
          }

          setNodes(prev => {
            const next = prev.map(n => n.id === childNodeId ? finalNode : n);
            // Edge is already created; just sync to backend with updated node
            setEdges(prevEds => {
              syncCanvasToBackend(next, prevEds);
              return prevEds;
            });
            return next;
          });
        })
        .catch(err => {
          log.error('Explain call failed', err);
          // Update placeholder with error
          setNodes(prev => prev.map(n => n.id === childNodeId ? {
            ...n,
            data: { ...n.data, definition: `❌ Error: ${err.message || 'Failed to load explanation'}` }
          } : n));
        });

    } else if (option === 'revision') {
      if (backendOffline) {
        const newItemId = `rev-${Date.now()}`;
        setRevisionItems(prev => [{
          id: newItemId,
          title: selectionText,
          type: parentNode.type === 'code' ? 'code' : (parentNode.type === 'subtopic' ? 'subtopic' : 'concept'),
          summary: `Offline saved: ${parentNode.data.question || parentNode.data.title}`,
          originalNodeId: nodeId,
          addedAt: new Date().toISOString().split('T')[0]
        }, ...prev]);
        return;
      }

      apiFetch('/api/revision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selectionText,
          type: parentNode.type === 'code' ? 'code' : (parentNode.type === 'subtopic' ? 'subtopic' : 'concept'),
          summary: `Saved from whiteboard: ${parentNode.data.question || parentNode.data.title || 'Canvas Note'}`,
          original_node_id: nodeId
        })
      })
        .then(r => r.json())
        .then(newItem => {
          setRevisionItems(prev => [newItem, ...prev]);
        })
        .catch(err => console.error("Failed to add revision item:", err));
    }
  };

  // Sidebar Syllabus Map Adder
  const handleAddSyllabusMap = (docName: string, topicName: string, subtopics: string[]) => {
    const rootNodeId = `node-doc-root-${Date.now()}`;
    const topicNodeId = `node-doc-topic-${Date.now()}`;
    
    const startX = 600 + (Math.random() * 100);
    const startY = 600 + (Math.random() * 100);

    const rootNode: Node = {
      id: rootNodeId,
      type: 'document',
      position: { x: startX, y: startY },
      data: {
        title: docName,
        fileSource: docName,
        pageNumber: Math.floor(Math.random() * 12) + 1
      }
    };

    const topicNode: Node = {
      id: topicNodeId,
      type: 'concept',
      position: { x: startX + 320, y: startY },
      data: {
        title: topicName,
        depth: 'basic',
        definition: `Module topic covering ${topicName} inside ${docName}.`,
        intuition: `This serves as a high-level course checkpoint.`,
        contextRole: `Groups subtopics: ${subtopics.join(', ')}`,
        subpoints: subtopics
      }
    };

    const connectorEdge: Edge = {
      id: `edge-doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      source: rootNodeId,
      target: topicNodeId,
      label: 'contains topic',
      animated: true,
      zIndex: 3
    };

    const childNodes: Node[] = [];
    const childEdges: Edge[] = [];

    subtopics.forEach((sub, idx) => {
      const subId = `node-doc-sub-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`;
      const subX = startX + 680;
      const subY = startY - 150 + (idx * 150);

      childNodes.push({
        id: subId,
        type: 'subtopic',
        position: { x: subX, y: subY },
        data: {
          title: sub,
          parentConcept: topicName,
          definition: `Core module concept: ${sub}. Evaluated in course assessments.`,
          whyItMatters: `Required syllabus benchmark for ${topicName}.`,
          intuition: `A fundamental sub-concept to review in this course block.`
        }
      });

      childEdges.push({
        id: `edge-doc-sub-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
        source: topicNodeId,
        sourceHandle: 'right-out',
        target: subId,
        targetHandle: 'left-in',
        label: 'subtopic of',
        animated: true,
        type: 'smoothstep',
        zIndex: 3
      });
    });

    const addedNodes = [rootNode, topicNode, ...childNodes];
    const addedEdges = [connectorEdge, ...childEdges];

    setNodes(prev => {
      const next = [...prev, ...addedNodes];
      setEdges(prevEds => {
        const combined = [...prevEds, ...addedEdges];
        const nextEds = Array.from(new Map(combined.map(e => [e.id, e])).values());
        syncCanvasToBackend(next, nextEds);
        return nextEds;
      });
      return next;
    });
  };

  // Revision List "Recall Node" triggers focusing canvas coordinate
  const handleRecallNode = (nodeId: string) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, selected: true } : { ...n, selected: false }));
  };

  const handleRemoveRevision = (id: string) => {
    if (backendOffline) {
      setRevisionItems(prev => prev.filter(item => item.id !== id));
      return;
    }

    apiFetch(`/api/revision/${id}`, { method: 'DELETE' })
      .then(r => r.json())
      .then(() => {
        setRevisionItems(prev => prev.filter(item => item.id !== id));
      })
      .catch(err => console.error("Failed to delete revision item:", err));
  };

  // Model selection unlock mock logic
  const handleModelSelect = (model: any) => {
    setShowModelDropdown(false);
    if (model.keyRequired && !userKeys[model.id]) {
      setSelectedLockModel(model);
      setApiKeyInput('');
      setShowKeyModal(true);
    } else {
      setActiveModel(model);
    }
  };

  const handleSaveApiKey = () => {
    if (selectedLockModel && apiKeyInput.trim()) {
      setUserKeys(prev => ({ ...prev, [selectedLockModel.id]: apiKeyInput }));
      setActiveModel({ ...selectedLockModel, status: 'active', keyRequired: false });
      setShowKeyModal(false);
    }
  };

  const handleClearWhiteboard = () => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    setNodes([]);
    setEdges([]);
    setShowClearConfirm(false);
    // Also sync the cleared state to backend
    if (activeSessionId) {
      syncCanvasToBackend([], []);
    }
  };

  if (status === 'loading') {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-miro-surface dark:bg-cyber-bg">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-miro-blue dark:border-cyber-cyan border-t-transparent"></div>
        <p className="mt-4 text-xs font-bold text-miro-ink/50 dark:text-cyber-text/50 uppercase tracking-widest text-[9px]">Loading tutoring canvas...</p>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex flex-col h-screen overflow-hidden text-[var(--text-primary)]">
      {/* Miro / Cyberpunk Top Header */}
      <header className="h-16 px-4 border-b border-miro-hairline-strong dark:border-cyber-border bg-white dark:bg-slate-950 flex items-center justify-between z-20 shrink-0 transition-colors">
        
        {/* Logo, title, and session selector */}
        <div className="flex items-center gap-4 select-none">
          <div className="flex items-center gap-2">
            <div className="bg-miro-yellow text-miro-ink w-8 h-8 rounded-lg flex items-center justify-center font-black shadow-md dark:shadow-neon-yellow">
              C
            </div>
            <div>
              <h1 className="font-extrabold text-xs tracking-tight leading-none text-miro-ink dark:text-white uppercase select-none">
                Concept Canvas
              </h1>
              <span className="text-[9px] text-miro-ink/50 dark:text-cyber-cyan select-none">
                AI Whiteboard
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 border-l border-miro-hairline-strong dark:border-cyber-border pl-4">
            <span className="text-[10px] text-miro-ink/40 dark:text-cyber-text/40 font-bold uppercase select-none mr-1.5 hidden md:inline">
              Session:
            </span>
            <select
              value={activeSessionId}
              onChange={(e) => switchSession(e.target.value)}
              className="text-xs font-bold bg-miro-surface dark:bg-cyber-bg border border-miro-hairline-strong dark:border-cyber-border rounded-xl px-2.5 py-1.5 outline-none text-[var(--text-primary)] dark:text-white cursor-pointer"
            >
              {sessions.map((s, idx) => (
                <option key={`${s.id}-${idx}`} value={s.id}>{s.title}</option>
              ))}
            </select>
            <button
              onClick={handleCreateSession}
              title="Create new learning session"
              className="p-1.5 rounded-xl border border-miro-hairline-strong dark:border-cyber-border bg-miro-surface dark:bg-cyber-bg text-[var(--text-primary)] dark:text-white hover:bg-miro-hairline/40 dark:hover:bg-cyber-border/40 transition-all ml-1 flex items-center justify-center"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Global Prompt Bar */}
        <form onSubmit={handleAskAI} className="flex-1 max-w-xl mx-8 flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Explain self-attention, backpropagation, or any topic..."
            className="flex-1 text-xs px-4 py-2 border rounded-full bg-miro-surface dark:bg-cyber-bg border-miro-hairline-strong dark:border-cyber-border focus:outline-none focus:border-miro-blue dark:focus:border-cyber-cyan text-[var(--text-primary)] dark:text-white transition-all shadow-inner"
          />
          <button
            type="submit"
            disabled={!prompt.trim() || isGenerating}
            className="bg-miro-ink text-white dark:bg-cyber-cyan dark:text-cyber-bg text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50 transition-all shadow-md active:scale-95"
          >
            {isGenerating ? (
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Ask AI
          </button>
        </form>

        {/* Header Actions */}
        <div className="flex items-center gap-3">
          
          {/* Model Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowModelDropdown(!showModelDropdown)}
              className="flex items-center gap-2 border border-miro-hairline-strong dark:border-cyber-border px-3 py-1.5 rounded-full text-xs font-bold bg-miro-surface dark:bg-cyber-bg hover:bg-miro-hairline/40 dark:hover:bg-cyber-border/40 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-miro-yellow-dark dark:text-cyber-cyan" />
              <span className="text-miro-ink dark:text-white truncate max-w-[100px]">
                {activeModel.name}
              </span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {showModelDropdown && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl border shadow-xl bg-white dark:bg-slate-900 border-miro-hairline dark:border-cyber-border p-2 z-50 animate-in fade-in slide-in-from-top-1">
                <p className="text-[9px] uppercase font-black text-miro-ink/40 dark:text-cyber-text/50 px-2.5 py-1">
                  Choose LLM Provider
                </p>
                {DUMMY_MODELS.map(m => {
                  const isLocked = m.keyRequired && !userKeys[m.id];
                  return (
                    <button
                      key={m.id}
                      onClick={() => handleModelSelect(m)}
                      className={`flex items-center justify-between w-full text-left px-3 py-2 text-xs font-bold rounded-xl hover:bg-miro-surface dark:hover:bg-cyber-border/30 transition-colors ${
                        activeModel.id === m.id 
                          ? 'text-miro-blue dark:text-cyber-cyan bg-miro-blue/5 dark:bg-cyber-cyan/5' 
                          : 'text-[var(--text-primary)] dark:text-white'
                      }`}
                    >
                      <div>
                        <p>{m.name}</p>
                        <p className="text-[9px] font-normal text-miro-ink/50 dark:text-cyber-text/50">{m.cost}</p>
                      </div>
                      {isLocked ? (
                        <Lock className="w-3.5 h-3.5 text-miro-ink/40 dark:text-cyber-text/40" />
                      ) : activeModel.id === m.id ? (
                        <CheckCircle2 className="w-4 h-4 text-miro-blue dark:text-cyber-cyan" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Theme switcher */}
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-full border border-miro-hairline-strong dark:border-cyber-border bg-miro-surface dark:bg-cyber-bg text-miro-ink dark:text-white hover:bg-miro-hairline/40 dark:hover:bg-cyber-border/40 transition-all active:scale-95 shadow-sm"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-cyber-yellow" />
            ) : (
              <Moon className="w-4 h-4 text-miro-ink" />
            )}
          </button>

          {/* Clear Whiteboard button */}
          <button
            onClick={() => setShowClearConfirm(true)}
            title="Clear all nodes from whiteboard"
            className="p-2 rounded-full border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all active:scale-95 shadow-sm"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* User Profile & Sign Out Link */}
          <div className="flex items-center gap-2 border-l border-miro-hairline-strong dark:border-cyber-border pl-3 select-none">
            {session.user?.image ? (
              <img
                src={session.user.image}
                alt={session.user.name || 'User'}
                className="w-7 h-7 rounded-full border border-miro-hairline-strong dark:border-cyber-border shadow-sm shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-miro-blue/15 text-miro-blue dark:bg-cyber-cyan/20 dark:text-cyber-cyan flex items-center justify-center text-[10px] font-extrabold uppercase shrink-0 border border-miro-blue/10">
                {session.user?.name?.slice(0, 2) || 'US'}
              </div>
            )}
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              title="Log Out session"
              className="p-2 rounded-full border border-miro-hairline-strong dark:border-cyber-border bg-miro-surface dark:bg-cyber-bg text-red-500 hover:bg-red-500/10 transition-all active:scale-95 shadow-sm flex items-center justify-center shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Clear Whiteboard Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-miro-hairline-strong dark:border-cyber-border shadow-2xl p-6 w-full max-w-sm mx-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h2 className="font-extrabold text-sm text-[var(--text-primary)] dark:text-white">Clear Whiteboard?</h2>
                <p className="text-[11px] text-miro-ink/50 dark:text-cyber-text/50 mt-0.5">This will remove all nodes and connections from the current session.</p>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2 text-xs font-bold rounded-xl border border-miro-hairline-strong dark:border-cyber-border bg-miro-surface dark:bg-cyber-bg text-[var(--text-primary)] dark:text-white hover:bg-miro-hairline/40 dark:hover:bg-cyber-border/40 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleClearWhiteboard}
                className="flex-1 py-2 text-xs font-bold rounded-xl bg-red-500 hover:bg-red-600 text-white transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace split into Canvas and Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* React Flow Infinite Canvas */}
        <main className="flex-1 h-full relative">
          
          {backendOffline && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-500/90 text-slate-950 text-[10px] font-black uppercase tracking-wider px-5 py-2.5 rounded-full shadow-xl z-50 flex items-center gap-2 backdrop-blur animate-bounce select-none border border-amber-600/30">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
              FastAPI Backend Offline (http://localhost:8000). Running in local sandbox.
            </div>
          )}

          <Canvas
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChangeWrapped}
            onEdgesChange={handleEdgesChangeWrapped}
            onConnect={onConnect}
            onConceptSelect={handleConceptSelect}
            onLineSelect={handleLineSelect}
            onRefreshNode={handleRefreshNode}
            isDark={isDark}
          />

          {/* Floating Context Selection Menu */}
          <ContextMenu
            isOpen={contextMenu.isOpen}
            x={contextMenu.x}
            y={contextMenu.y}
            selectionText={contextMenu.selectionText}
            onClose={() => setContextMenu(prev => ({ ...prev, isOpen: false }))}
            onOptionSelect={handleContextMenuOption}
          />
        </main>

        {/* Right Collapsible Panel */}
        <Sidebar
          revisionItems={revisionItems}
          onRemoveRevision={handleRemoveRevision}
          onRecallNode={handleRecallNode}
          onAddDocumentToCanvas={handleAddSyllabusMap}
        />
      </div>

      {/* API Key Entry Custom Modal */}
      {showKeyModal && selectedLockModel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-miro-hairline-strong dark:border-cyber-cyan/30 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-[var(--text-primary)] dark:text-white">
            
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-miro-blue/15 text-miro-blue dark:bg-cyber-cyan/20 dark:text-cyber-cyan">
                <Key className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base leading-tight">
                  Unlock {selectedLockModel.name}
                </h3>
                <p className="text-xs text-miro-ink/50 dark:text-cyber-text/50">
                  Add API key or upgrade workspace plan
                </p>
              </div>
            </div>

            <p className="text-xs text-miro-ink/70 dark:text-cyber-text/80 mb-5 leading-relaxed">
              To utilize <strong>{selectedLockModel.name}</strong>, you can either provide your own personal API key (stored safely in local memory) or upgrade your canvas subscription.
            </p>

            <div className="flex flex-col gap-4 mb-6">
              {/* Option A: Enter Key */}
              <div className="border border-miro-hairline-strong dark:border-cyber-border rounded-xl p-3.5 bg-miro-surface/50 dark:bg-cyber-bg/40">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-miro-ink/60 dark:text-cyber-cyan mb-2">
                  Option A: Add API Key
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder={`Enter ${selectedLockModel.provider} API Key`}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="flex-1 text-xs px-3 py-2 border rounded-lg bg-white dark:bg-slate-950 border-miro-hairline-strong dark:border-cyber-border focus:outline-none focus:border-miro-blue dark:focus:border-cyber-cyan text-[var(--text-primary)] dark:text-white"
                  />
                  <button
                    onClick={handleSaveApiKey}
                    disabled={!apiKeyInput.trim()}
                    className="bg-miro-ink text-white dark:bg-cyber-cyan dark:text-cyber-bg text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    Save
                  </button>
                </div>
              </div>

              {/* Option B: Purchase Credits */}
              <div className="border border-miro-hairline-strong dark:border-cyber-border rounded-xl p-3.5 bg-miro-surface/50 dark:bg-cyber-bg/40 flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-miro-ink/60 dark:text-cyber-text/60 mb-0.5">
                    Option B: Buy Canvas Credits
                  </span>
                  <span className="text-[11px] text-miro-ink/80 dark:text-cyber-text/80">
                    Get 100k tokens for $1.50
                  </span>
                </div>
                <button
                  onClick={() => {
                    alert('Token billing simulation: Workspace subscription updated!');
                    setUserKeys(prev => ({ ...prev, [selectedLockModel.id]: 'mock-purchased-key' }));
                    setActiveModel({ ...selectedLockModel, status: 'active', keyRequired: false });
                    setShowKeyModal(false);
                  }}
                  className="bg-miro-yellow text-miro-ink text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 hover:opacity-95 transition-opacity"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  Upgrade
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setShowKeyModal(false)}
                className="px-4 py-2 border rounded-xl text-xs font-bold hover:bg-miro-surface dark:hover:bg-cyber-border/40 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
