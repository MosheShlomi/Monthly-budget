from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional
import uuid


class FamilyCreate(BaseModel):
    name: str


class FamilyUpdate(BaseModel):
    name: str


class FamilyOut(BaseModel):
    id: uuid.UUID
    name: str
    owner_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class MemberOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    user_email: str
    user_name: Optional[str] = None
    role: str
    joined_at: datetime

    model_config = {"from_attributes": True}


class InviteCreate(BaseModel):
    email: EmailStr
    family_id: uuid.UUID


class InviteOut(BaseModel):
    id: uuid.UUID
    token: str
    email: str
    family_id: uuid.UUID
    expires_at: datetime
    used: bool

    model_config = {"from_attributes": True}
