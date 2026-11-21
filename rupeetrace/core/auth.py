import secrets
import time
from typing import Dict, Any, Optional
from fastapi import Request, HTTPException, Depends
from pydantic import BaseModel

# Demo user credentials & profiles
DEMO_USERS = {
    "citizen": {
        "username": "citizen",
        "password": "citizen123",
        "name": "Sunita Sharma",
        "role": "citizen",
        "designation": "Active Citizen & Ward Resident",
        "ward_code": "K/E",
        "locality": "Andheri East, Marol"
    },
    "officer": {
        "username": "officer",
        "password": "officer123",
        "name": "Er. R. K. Patil",
        "role": "officer",
        "designation": "Executive Engineer (Roads & Infrastructure)",
        "ward_code": "K/E",
        "office": "BMC Assistant Commissioner Office, K/East Ward"
    }
}

# In-memory session token store (token -> user profile)
ACTIVE_SESSIONS: Dict[str, Dict[str, Any]] = {}

# Pre-populate default static tokens for seamless demo execution
STATIC_DEMO_TOKENS = {
    "demo-citizen-token": DEMO_USERS["citizen"],
    "demo-officer-token": DEMO_USERS["officer"]
}
ACTIVE_SESSIONS.update(STATIC_DEMO_TOKENS)

def create_session(user_profile: Dict[str, Any]) -> str:
    token = f"rt_sess_{secrets.token_hex(16)}"
    user_copy = dict(user_profile)
    user_copy.pop("password", None)
    user_copy["created_at"] = time.time()
    ACTIVE_SESSIONS[token] = user_copy
    return token

def get_current_user(request: Request) -> Optional[Dict[str, Any]]:
    """
    Extracts and validates user session from Authorization header or X-Session-Token.
    Format: 'Authorization: Bearer <token>' or 'X-Session-Token: <token>'
    """
    auth_header = request.headers.get("Authorization")
    token = None
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
    if not token:
        token = request.headers.get("X-Session-Token")

    if not token:
        return None

    user = ACTIVE_SESSIONS.get(token)
    return user

def require_auth(request: Request) -> Dict[str, Any]:
    user = get_current_user(request)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please sign in with a valid RupeeTrace session."
        )
    return user

def require_role(allowed_role: str):
    """
    FastAPI dependency enforcing strict role authorization.
    """
    def dependency(request: Request):
        user = require_auth(request)
        if user.get("role") != allowed_role:
            raise HTTPException(
                status_code=403,
                detail=f"Access forbidden: '{allowed_role.capitalize()}' authorization required. Current role is '{user.get('role')}'."
            )
        return user
    return dependency
