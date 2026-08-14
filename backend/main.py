import json
import os
import time
from pathlib import Path
from dotenv import load_dotenv
# Load .env from the project root (one level above the backend/ folder)
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_env_path, override=True)

from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, Header, Request, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlmodel import Session, select

from database import engine, get_session, create_db_and_tables
from models import User, Session as DbSession, Node, Edge, RevisionItem
from auth import get_current_user
from ai_service import query_llm
from logger import get_logger

log = get_logger("canvas.api")

# Allowlist of models available on the Groq endpoint
# X-User-Model values outside this list are silently ignored and the env default is used
VALID_GROQ_MODELS = {
    "llama-3.3-70b-versatile",
    "llama-3.1-70b-versatile",
    "llama-3.1-8b-instant",
    "llama3-70b-8192",
    "llama3-8b-8192",
    "mixtral-8x7b-32768",
    "gemma2-9b-it",
}

def sanitize_model(x_user_model: Optional[str]) -> Optional[str]:
    """Return the model override only if it's a known valid Groq model."""
    if x_user_model and x_user_model.strip() in VALID_GROQ_MODELS:
        return x_user_model.strip()
    return None  # Falls back to LLM_MODEL env var in ai_service

app = FastAPI(title="Conversational Concept Canvas Backend", version="0.1.0")

# Enable CORS for the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup DB tables creation
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log every HTTP request with method, path, status code, and response time."""
    start = time.perf_counter()
    response = await call_next(request)
    elapsed = (time.perf_counter() - start) * 1000
    log.info(f"{request.method} {request.url.path}  -> {response.status_code}  ({elapsed:.1f}ms)")
    return response

@app.on_event("startup")
def on_startup():
    log.info("** Concept Canvas API starting up...")
    create_db_and_tables()
    log.info(">> Database tables ready")
    log.info(f"   LLM: {os.getenv('LLM_MODEL', 'llama-3.3-70b-versatile')} via {os.getenv('LLM_BASE_URL', 'https://api.groq.com/openai/v1')}")
    log.info(f"   API Key configured: {'yes' if os.getenv('LLM_API_KEY') else 'NO KEY SET - check .env'}")

# Pydantic schemas for request payloads
class SessionCreate(BaseModel):
    title: str

class NodeSchema(BaseModel):
    id: str
    type: str
    position: dict  # contains x, y coordinates
    data: dict      # visual node labels, answers, definitions

class EdgeSchema(BaseModel):
    id: str
    source: str
    target: str
    label: Optional[str] = None
    animated: Optional[bool] = True

class CanvasSyncSchema(BaseModel):
    session_id: str
    nodes: List[NodeSchema]
    edges: List[EdgeSchema]

class RevisionCreate(BaseModel):
    title: str
    type: str
    summary: str
    original_node_id: str

class AskAIRequest(BaseModel):
    session_id: str
    prompt: str

class ExplainRequest(BaseModel):
    session_id: str
    node_id: str
    selection_text: str
    option: str  # 'basic' | 'advanced' | 'custom'
    custom_text: Optional[str] = None

# Helper to seed a default session if the user is new and has no sessions
def seed_default_session(db: Session, user_id: str):
    # Check if user already has sessions
    existing = db.exec(select(DbSession).where(DbSession.user_id == user_id)).first()
    if existing:
        return

    # Seed SESS-1: Neural Networks Basics
    sess = DbSession(
        id=f"sess-1-{user_id[:8]}",
        title="Neural Networks Basics",
        user_id=user_id,
        created_at="2026-07-31"
    )
    db.add(sess)
    db.commit()

    # Seed Nodes
    nodes = [
        Node(
            id=f"node-1-{user_id[:8]}",
            session_id=sess.id,
            type="conversation",
            x=100.0,
            y=150.0,
            data=json.dumps({
                "question": "Explain backpropagation in deep learning.",
                "answer": "**Backpropagation** is the fundamental algorithm used to train artificial neural networks. It works by computing the gradient of the loss function with respect to the network weights, moving backward through the network layers.\n\nKey concepts in this process include:\n- **Forward Pass**: The input data passes through the network to generate a prediction and calculate the loss.\n- **Chain Rule**: The mathematical calculus tool used to calculate gradients of nested composite functions, passing derivatives backward from the output layer.\n- **Gradient Descent**: The optimization step where weights are adjusted in the opposite direction of the gradient to minimize the loss.\n\nBy training weights recursively, the model matches desired outputs.",
                "concepts": ["Forward Pass", "Chain Rule", "Gradient Descent"]
            })
        ),
        Node(
            id=f"node-concept-1-{user_id[:8]}",
            session_id=sess.id,
            type="concept",
            x=550.0,
            y=50.0,
            data=json.dumps({
                "title": "Backpropagation Core",
                "depth": "basic",
                "definition": "A method used in artificial neural networks to calculate a gradient that is needed in the calculation of the weights to be used in the network.",
                "intuition": "Imagine correcting a series of falling dominos. You trace back from the last fallen domino to see which ones in the middle were misaligned, and nudge them into place.",
                "contextRole": "Backpropagation computes the loss gradients, enabling optimization algorithms to update weights and reduce error.",
                "subpoints": ["Chain rule", "Gradient descent", "Loss function"]
            })
        ),
        Node(
            id=f"node-subtopic-1-{user_id[:8]}",
            session_id=sess.id,
            type="subtopic",
            x=920.0,
            y=-20.0,
            data=json.dumps({
                "title": "Chain rule",
                "parentConcept": "Backpropagation Core",
                "definition": "A formula for computing the derivative of the composition of two or more functions.",
                "whyItMatters": "Without the Chain Rule, hidden layers inside a deep neural network would not know how they contributed to the final error, making deep learning impossible.",
                "intuition": "If you push a gear (A), it rotates gear (B), which rotates gear (C). The rate of change of C relative to A is the multiplication of C-to-B and B-to-A rates."
            })
        ),
        Node(
            id=f"node-code-1-{user_id[:8]}",
            session_id=sess.id,
            type="code",
            x=100.0,
            y=580.0,
            data=json.dumps({
                "title": "PyTorch Backpropagation Loop",
                "language": "python",
                "code": "import torch\nimport torch.nn as nn\n\n# 1. Initialize simple model, loss, and optimizer\nmodel = nn.Linear(10, 2)\ncriterion = nn.MSELoss()\noptimizer = torch.optim.SGD(model.parameters(), lr=0.01)\n\n# 2. Mock forward pass\ninputs = torch.randn(8, 10)\ntargets = torch.randn(8, 2)\noutputs = model(inputs)\nloss = criterion(outputs, targets)\n\n# 3. Backpropagation step\noptimizer.zero_grad() # Clear previous gradients\nloss.backward()       # Compute gradients via Chain Rule\noptimizer.step()      # Update weights using Gradient Descent"
            })
        )
    ]
    for n in nodes:
        db.add(n)

    # Seed Edges
    edges = [
        Edge(
            id=f"edge-1-{user_id[:8]}",
            session_id=sess.id,
            source=nodes[0].id,
            target=nodes[1].id,
            label="explains core",
            animated=True
        ),
        Edge(
            id=f"edge-2-{user_id[:8]}",
            session_id=sess.id,
            source=nodes[1].id,
            target=nodes[2].id,
            label="subpoint of",
            animated=True
        )
    ]
    for e in edges:
        db.add(e)
        
    db.commit()

# --- SESSIONS ENDPOINTS ---

@app.get("/api/sessions")
def get_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    # Seed default workspace if empty
    seed_default_session(db, current_user.id)
    
    sessions = db.exec(select(DbSession).where(DbSession.user_id == current_user.id)).all()
    return sessions

@app.post("/api/sessions")
def create_session(
    payload: SessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    import datetime
    sess_id = f"sess-{int(datetime.datetime.now().timestamp() * 1000)}"
    new_sess = DbSession(
        id=sess_id,
        title=payload.title.strip(),
        user_id=current_user.id,
        created_at=datetime.date.today().isoformat()
    )
    db.add(new_sess)
    
    # Create a starter node
    starter = Node(
        id=f"node-start-{int(datetime.datetime.now().timestamp() * 1000)}",
        session_id=sess_id,
        type="conversation",
        x=100.0,
        y=150.0,
        data=json.dumps({
            "question": f"Welcome to '{payload.title.strip()}'!",
            "answer": "This is your blank whiteboard canvas.\n\nType a question in the top prompt bar or upload outlines to start mapping!",
            "concepts": []
        })
    )
    db.add(starter)
    db.commit()
    return new_sess

@app.delete("/api/sessions/{session_id}")
def delete_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    sess = db.get(DbSession, session_id)
    if not sess or sess.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    
    db.delete(sess)
    db.commit()
    return {"status": "deleted"}

# --- CANVAS LAYOUT SYNC ENDPOINTS ---

@app.get("/api/canvas")
def get_canvas(
    sessionId: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    sess = db.get(DbSession, sessionId)
    if not sess or sess.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
        
    db_nodes = db.exec(select(Node).where(Node.session_id == sessionId)).all()
    db_edges = db.exec(select(Edge).where(Edge.session_id == sessionId)).all()
    
    nodes = []
    for n in db_nodes:
        nodes.append({
            "id": n.id,
            "type": n.type,
            "position": {"x": n.x, "y": n.y},
            "data": json.loads(n.data)
        })
        
    edges = []
    for e in db_edges:
        edges.append({
            "id": e.id,
            "source": e.source,
            "target": e.target,
            "label": e.label,
            "animated": e.animated
        })
        
    return {"nodes": nodes, "edges": edges}

@app.post("/api/canvas/sync")
def sync_canvas(
    payload: CanvasSyncSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    sess = db.get(DbSession, payload.session_id)
    if not sess or sess.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized session sync")

    # Clear existing session nodes and edges to perform clean bulk synchronization
    old_nodes = db.exec(select(Node).where(Node.session_id == payload.session_id)).all()
    old_edges = db.exec(select(Edge).where(Edge.session_id == payload.session_id)).all()
    
    for o_n in old_nodes:
        db.delete(o_n)
    for o_e in old_edges:
        db.delete(o_e)

    # Batch insert new nodes & edges
    new_nodes = [
        Node(
            id=n.id,
            session_id=payload.session_id,
            type=n.type,
            x=n.position.get("x", 0.0),
            y=n.position.get("y", 0.0),
            data=json.dumps(n.data)
        )
        for n in payload.nodes
    ]
    new_edges = [
        Edge(
            id=e.id,
            session_id=payload.session_id,
            source=e.source,
            target=e.target,
            label=e.label,
            animated=e.animated
        )
        for e in payload.edges
    ]

    if new_nodes:
        db.add_all(new_nodes)
    if new_edges:
        db.add_all(new_edges)

    db.commit()
    return {"status": "synchronized"}

# --- REVISION LIST ENDPOINTS ---

@app.get("/api/revision")
def get_revision(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    items = db.exec(select(RevisionItem).where(RevisionItem.user_id == current_user.id)).all()
    return items

@app.post("/api/revision")
def add_revision(
    payload: RevisionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    import datetime
    item_id = f"rev-{int(datetime.datetime.now().timestamp() * 1000)}"
    new_item = RevisionItem(
        id=item_id,
        user_id=current_user.id,
        title=payload.title.strip(),
        type=payload.type,
        summary=payload.summary.strip(),
        original_node_id=payload.original_node_id,
        added_at=datetime.date.today().isoformat()
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@app.delete("/api/revision/{revision_id}")
def delete_revision(
    revision_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    item = db.get(RevisionItem, revision_id)
    if not item or item.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Item not found")
        
    db.delete(item)
    db.commit()
    return {"status": "deleted"}

# --- DYNAMIC AI GENERATION ENDPOINTS ---

@app.post("/api/ai/ask")
def ask_ai(
    payload: AskAIRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
    x_user_key: Optional[str] = Header(None, alias="X-User-Key"),
    x_user_model: Optional[str] = Header(None, alias="X-User-Model")
):
    sess = db.get(DbSession, payload.session_id)
    if not sess or sess.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized session context")

    # Fetch recent nodes inside this session to provide learning trajectory details
    db_nodes = db.exec(select(Node).where(Node.session_id == payload.session_id)).all()
    history_ctx = ""
    for idx, n in enumerate(db_nodes[:3]):
        try:
            n_data = json.loads(n.data)
            if "question" in n_data and "answer" in n_data:
                history_ctx += f"Q: {n_data['question']}\nA: {n_data['answer'][:200]}...\n\n"
        except Exception:
            pass

    system_message = """You are a supportive, friendly private tutor explaining technical concepts on a whiteboard in tuition class.
Expose answers using concise, bold bullet items. Keep answers brief.

You MUST respond with a JSON object containing:
1. "answer": The markdown response content explaining the question. Highlight important sub-concepts in double asterisks (e.g. **Chain Rule**).
2. "concepts": A JSON array of 3-5 key terms as plain strings (e.g. ["Chain Rule", "Gradient Descent"]). Each item MUST be a plain string, NOT an object.

CRITICAL: Return valid JSON ONLY. Do not wrap in markdown codeblocks. Ensure all string values are properly escaped."""

    prompt = f"Student Question: {payload.prompt}\n\nSession Context:\n{history_ctx}"
    ai_json = query_llm(prompt, system_message, custom_key=x_user_key, model_override=sanitize_model(x_user_model))
    return ai_json

@app.post("/api/ai/explain")
def explain_concept(
    payload: ExplainRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
    x_user_key: Optional[str] = Header(None, alias="X-User-Key"),
    x_user_model: Optional[str] = Header(None, alias="X-User-Model")
):
    sess = db.get(DbSession, payload.session_id)
    if not sess or sess.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized session context")

    parent_node = db.get(Node, payload.node_id)
    parent_ctx = ""
    if parent_node:
        try:
            parent_ctx = f"Parent context: {json.loads(parent_node.data)}"
        except Exception:
            pass

    log.info(f"Explain  term='{payload.selection_text}'  depth={payload.option}  node={payload.node_id}")

    system_message = """You are a computer science whiteboard tutor explaining concepts to a student.
Provide structured details in JSON.

You MUST return a JSON object with ALL of the following fields:
1. "title": A clean short name for this concept (2-5 words).
2. "definition": A 2-line precise explanation of what the term is.
3. "intuition": A real-world metaphor starting with "Think of this like...".
4. "contextRole": Why this concept matters in the context of the parent topic.
5. "whyItMatters": A one-sentence reason this is important in the broader subject.
6. "concepts": A JSON array of 3-5 key sub-terms as plain strings (e.g. ["Backpropagation", "Loss Function"]). Each item MUST be a plain string, NOT an object.

CRITICAL: Return valid JSON ONLY. Do not wrap in markdown codeblocks. Ensure all string values are properly escaped."""

    prompt = f"Term to explain: {payload.selection_text}\nParent node: {parent_ctx}\nDepth: {payload.option}"
    if payload.custom_text:
        prompt += f"\nCustom student query: {payload.custom_text}"

    ai_json = query_llm(prompt, system_message, custom_key=x_user_key, model_override=sanitize_model(x_user_model))
    return ai_json
