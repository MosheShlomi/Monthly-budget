from pydantic import BaseModel
from typing import Optional
import uuid


class CardCreate(BaseModel):
    name: str


class CardUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None


class CardOut(BaseModel):
    id: uuid.UUID
    family_id: uuid.UUID
    name: str
    is_active: bool

    model_config = {"from_attributes": True}
