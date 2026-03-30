from pydantic import BaseModel
from typing import Optional
import uuid
from decimal import Decimal


class BudgetGoalUpsert(BaseModel):
    category_id: uuid.UUID
    month: int
    year: int
    limit_amount: Decimal


class BudgetGoalOut(BaseModel):
    id: uuid.UUID
    family_id: uuid.UUID
    category_id: uuid.UUID
    month: int
    year: int
    limit_amount: Decimal
    spent: Optional[Decimal] = None
    category_name: Optional[str] = None
    category_color: Optional[str] = None
    category_type: Optional[str] = None

    model_config = {"from_attributes": True}
