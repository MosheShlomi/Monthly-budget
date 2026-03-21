from fastapi import APIRouter, Depends
from app.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/verify")
async def verify_token(current_user: dict = Depends(get_current_user)):
    return {"user_id": current_user["id"], "email": current_user["email"]}
