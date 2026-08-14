import httpx
from fastapi import HTTPException, Security, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session
from database import get_session
from models import User

security = HTTPBearer()

# Simple in-memory cache to avoid hitting Google's endpoints on every single layout drag event
token_cache = {}

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_session)
) -> User:
    token = credentials.credentials
    
    # Offline developer fallback
    if token.startswith("mock-") or token == "undefined" or token == "null":
        mock_email = "developer@conceptcanvas.internal"
        user = db.query(User).filter(User.email == mock_email).first()
        if not user:
            user = User(
                id="mock-dev-user-id",
                email=mock_email,
                name="Developer Tutor",
                image=None
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        return user

    if token in token_cache:
        user_info = token_cache[token]
    else:
        # Verify the standard Google ID Token using Google's tokeninfo service
        try:
            response = httpx.get(
                f"https://oauth2.googleapis.com/tokeninfo?id_token={token}",
                timeout=5.0
            )
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired Google OAuth Token"
                )
            
            user_info = response.json()
            token_cache[token] = user_info
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Verification service unavailable"
            )

    email = user_info.get("email")
    sub = user_info.get("sub")  # Google User unique identifier
    name = user_info.get("name", "Google User")
    picture = user_info.get("picture")

    if not email or not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google Token lacks identification claims"
        )

    user = db.get(User, sub)
    if not user:
        user = User(
            id=sub,
            email=email,
            name=name,
            image=picture
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Sync profile image changes
        if user.name != name or user.image != picture:
            user.name = name
            user.image = picture
            db.add(user)
            db.commit()
            db.refresh(user)

    return user
