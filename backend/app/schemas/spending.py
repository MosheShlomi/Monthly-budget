from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
import uuid
from decimal import Decimal


class SpendingCreate(BaseModel):
    amount: Decimal
    category_id: uuid.UUID
    payment_method: str = "cash"
    card_id: Optional[uuid.UUID] = None
    date: date
    notes: Optional[str] = None


class SpendingUpdate(BaseModel):
    amount: Optional[Decimal] = None
    category_id: Optional[uuid.UUID] = None
    payment_method: Optional[str] = None
    card_id: Optional[uuid.UUID] = None
    date: Optional[date] = None
    notes: Optional[str] = None


class SpendingOut(BaseModel):
    id: uuid.UUID
    family_id: uuid.UUID
    user_id: uuid.UUID
    user_email: str
    user_name: Optional[str] = None
    amount: Decimal
    category_id: uuid.UUID
    payment_method: str
    card_id: Optional[uuid.UUID]
    date: date
    notes: Optional[str]
    created_at: datetime
    category_name: Optional[str] = None
    category_color: Optional[str] = None
    card_name: Optional[str] = None

    model_config = {"from_attributes": True}
