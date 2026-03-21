from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from decimal import Decimal


class CategoryTotal(BaseModel):
    category_id: str
    category_name: str
    category_color: str
    total: Decimal


class MemberTotal(BaseModel):
    user_id: str
    user_email: str
    user_name: Optional[str] = None
    total: Decimal


class MonthlyBar(BaseModel):
    month: int
    year: int
    total: Decimal
    income: Decimal


class DashboardSummary(BaseModel):
    total_spent: Decimal
    total_income: Decimal
    net_savings: Decimal
    by_category: List[CategoryTotal]
    income_by_category: List[CategoryTotal]
    by_member: List[MemberTotal]
    by_payment_method: Dict[str, Any]
    monthly_bars: List[MonthlyBar]
