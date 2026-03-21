from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
import uuid
from decimal import Decimal


class IncomeCreate(BaseModel):
    amount: Decimal
    category_id: Optional[uuid.UUID] = None
    date: date
    notes: Optional[str] = None


class IncomeUpdate(BaseModel):
    amount: Optional[Decimal] = None
    category_id: Optional[uuid.UUID] = None
    date: Optional[date] = None
    notes: Optional[str] = None


class IncomeOut(BaseModel):
    id: uuid.UUID
    family_id: uuid.UUID
    user_id: uuid.UUID
    user_email: str
    user_name: Optional[str] = None
    amount: Decimal
    category_id: Optional[uuid.UUID]
    date: date
    notes: Optional[str]
    created_at: datetime
    category_name: Optional[str] = None
    category_color: Optional[str] = None

    model_config = {"from_attributes": True}
