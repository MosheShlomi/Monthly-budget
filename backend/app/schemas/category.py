from pydantic import BaseModel
from typing import Optional
import uuid


class CategoryCreate(BaseModel):
    name: str
    color: str = "#6366f1"
    type: str = "expense"


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None


class CategoryOut(BaseModel):
    id: uuid.UUID
    family_id: Optional[uuid.UUID]
    user_id: Optional[uuid.UUID]
    name: str
    color: str
    is_default: bool
    type: str

    model_config = {"from_attributes": True}
