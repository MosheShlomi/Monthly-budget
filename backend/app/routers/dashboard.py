from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import get_current_user
from app.schemas.dashboard import DashboardSummary
from app.services.dashboard_queries import get_dashboard_summary, get_yearly_summary
import uuid

router = APIRouter(prefix="/families/{family_id}/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
async def dashboard_summary(
    family_id: uuid.UUID,
    months: List[int] = Query(...),
    years: List[int] = Query(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_dashboard_summary(db, family_id, months, years, current_user["id"])


@router.get("/yearly")
async def dashboard_yearly(
    family_id: uuid.UUID,
    year: int = Query(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_yearly_summary(db, family_id, year, current_user["id"])
