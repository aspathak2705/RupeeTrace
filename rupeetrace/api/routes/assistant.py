from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List, Optional

router = APIRouter(prefix="/assistant", tags=["Evidence-Grounded AI Assistant"])

class ChatRequest(BaseModel):
    question: str
    default_ward: Optional[str] = "K/E"

class ChatResponse(BaseModel):
    answer: str
    language: str
    retrieved_context: Dict[str, Any]
    cited_records: List[Dict[str, str]]
    missing_evidence: List[str]
    recommended_action: str

@router.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(request: Request, body: ChatRequest):
    assistant_service = request.app.state.assistant_service
    if not body.question or not body.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    result = await assistant_service.answer_question(body.question.strip(), default_ward=body.default_ward)
    return result
