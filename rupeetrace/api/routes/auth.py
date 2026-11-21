from typing import Dict, Any, Optional
from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel
from rupeetrace.core.auth import DEMO_USERS, ACTIVE_SESSIONS, create_session, get_current_user, require_auth

router = APIRouter(prefix="/auth", tags=["Authentication & Session"])

class LoginRequest(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    demo_role: Optional[str] = None  # "citizen" or "officer"

@router.post("/login")
def login(body: LoginRequest):
    # Quick demo login by role
    if body.demo_role in DEMO_USERS:
        user_profile = DEMO_USERS[body.demo_role]
        token = create_session(user_profile)
        user_info = dict(user_profile)
        user_info.pop("password", None)
        return {
            "token": token,
            "user": user_info,
            "message": f"Successfully authenticated as {user_info['role'].capitalize()} ({user_info['name']})"
        }

    # Standard username/password
    if body.username and body.password:
        user_profile = DEMO_USERS.get(body.username)
        if user_profile and user_profile["password"] == body.password:
            token = create_session(user_profile)
            user_info = dict(user_profile)
            user_info.pop("password", None)
            return {
                "token": token,
                "user": user_info,
                "message": f"Successfully authenticated as {user_info['role'].capitalize()} ({user_info['name']})"
            }

    raise HTTPException(
        status_code=401,
        detail="Invalid credentials. Use demo accounts: citizen/citizen123 or officer/officer123."
    )

@router.get("/me")
def get_me(request: Request):
    user = require_auth(request)
    return {
        "authenticated": True,
        "user": user
    }

@router.post("/logout")
def logout(request: Request):
    auth_header = request.headers.get("Authorization")
    token = None
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
    if not token:
        token = request.headers.get("X-Session-Token")

    if token and token in ACTIVE_SESSIONS:
        del ACTIVE_SESSIONS[token]

    return {"message": "Session terminated successfully"}

@router.get("/demo-accounts")
def get_demo_accounts():
    accounts = []
    for k, v in DEMO_USERS.items():
        acc = dict(v)
        acc.pop("password", None)
        accounts.append(acc)
    return accounts
