from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship

class User(SQLModel, table=True):
    id: str = Field(primary_key=True)
    email: str = Field(unique=True, index=True)
    name: str
    image: Optional[str] = None
    
    sessions: List["Session"] = Relationship(back_populates="user", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    revisions: List["RevisionItem"] = Relationship(back_populates="user", sa_relationship_kwargs={"cascade": "all, delete-orphan"})

class Session(SQLModel, table=True):
    id: str = Field(primary_key=True)
    title: str
    user_id: str = Field(foreign_key="user.id")
    created_at: str
    
    user: User = Relationship(back_populates="sessions")
    nodes: List["Node"] = Relationship(back_populates="session", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    edges: List["Edge"] = Relationship(back_populates="session", sa_relationship_kwargs={"cascade": "all, delete-orphan"})

class Node(SQLModel, table=True):
    id: str = Field(primary_key=True)
    session_id: str = Field(foreign_key="session.id")
    type: str
    x: float
    y: float
    data: str  # JSON-encoded dictionary of visual content details (e.g. question, answer, title, definition)
    
    session: Session = Relationship(back_populates="nodes")

class Edge(SQLModel, table=True):
    id: str = Field(primary_key=True)
    session_id: str = Field(foreign_key="session.id")
    source: str
    target: str
    label: Optional[str] = None
    animated: bool = True
    
    session: Session = Relationship(back_populates="edges")

class RevisionItem(SQLModel, table=True):
    id: str = Field(primary_key=True)
    user_id: str = Field(foreign_key="user.id")
    title: str
    type: str
    summary: str
    original_node_id: str
    added_at: str
    
    user: User = Relationship(back_populates="revisions")
