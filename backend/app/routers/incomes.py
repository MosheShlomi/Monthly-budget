from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, extract
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import Income, FamilyMember, Category, MemberRole
from app.schemas.income import IncomeCreate, IncomeUpdate, IncomeOut
from typing import List, Optional
import uuid

router = APIRouter(prefix="/families/{family_id}/incomes", tags=["incomes"])


async def _get_member(family_id: uuid.UUID, user_id: str, db: AsyncSession) -> FamilyMember:
    result = await db.execute(
        select(FamilyMember).where(
            FamilyMember.family_id == family_id,
            FamilyMember.user_id == uuid.UUID(user_id),
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=403, detail="Not a family member")
    return member


def _enrich_income(i: Income) -> IncomeOut:
    out = IncomeOut.model_validate(i)
    if i.category:
        out.category_name = i.category.name
        out.category_color = i.category.color
    return out


@router.get("", response_model=List[IncomeOut])
async def list_incomes(
    family_id: uuid.UUID,
    month: Optional[List[int]] = Query(None),
    year: Optional[List[int]] = Query(None),
    category_id: Optional[List[uuid.UUID]] = Query(None),
    user_id: Optional[List[str]] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_member(family_id, current_user["id"], db)

    query = (
        select(Income)
        .options(selectinload(Income.category))
        .where(Income.family_id == family_id)
        .order_by(Income.date.desc(), Income.created_at.desc())
    )

    if month:
        query = query.where(extract("month", Income.date).in_(month))
    if year:
        query = query.where(extract("year", Income.date).in_(year))
    if category_id:
        query = query.where(Income.category_id.in_(category_id))
    if user_id:
        query = query.where(Income.user_id.in_([uuid.UUID(u) for u in user_id]))

    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    incomes = result.scalars().all()
    return [_enrich_income(i) for i in incomes]


@router.post("", response_model=IncomeOut, status_code=201)
async def create_income(
    family_id: uuid.UUID,
    body: IncomeCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_member(family_id, current_user["id"], db)

    income = Income(
        family_id=family_id,
        user_id=uuid.UUID(current_user["id"]),
        user_email=current_user["email"],
        user_name=current_user.get("name") or None,
        amount=body.amount,
        category_id=body.category_id,
        date=body.date,
        notes=body.notes,
    )
    db.add(income)
    await db.commit()

    result = await db.execute(
        select(Income)
        .options(selectinload(Income.category))
        .where(Income.id == income.id)
    )
    i = result.scalar_one()
    return _enrich_income(i)


@router.patch("/{income_id}", response_model=IncomeOut)
async def update_income(
    family_id: uuid.UUID,
    income_id: uuid.UUID,
    body: IncomeUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    member = await _get_member(family_id, current_user["id"], db)

    result = await db.execute(
        select(Income).where(Income.id == income_id, Income.family_id == family_id)
    )
    income = result.scalar_one_or_none()
    if not income:
        raise HTTPException(status_code=404, detail="Income not found")

    if (
        member.role != MemberRole.owner
        and income.user_id != uuid.UUID(current_user["id"])
    ):
        raise HTTPException(status_code=403, detail="Permission denied")

    if body.amount is not None:
        income.amount = body.amount
    if body.category_id is not None:
        income.category_id = body.category_id
    if body.date is not None:
        income.date = body.date
    if body.notes is not None:
        income.notes = body.notes

    await db.commit()

    result = await db.execute(
        select(Income)
        .options(selectinload(Income.category))
        .where(Income.id == income_id)
    )
    i = result.scalar_one()
    return _enrich_income(i)


@router.delete("/{income_id}", status_code=204)
async def delete_income(
    family_id: uuid.UUID,
    income_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    member = await _get_member(family_id, current_user["id"], db)

    result = await db.execute(
        select(Income).where(Income.id == income_id, Income.family_id == family_id)
    )
    income = result.scalar_one_or_none()
    if not income:
        raise HTTPException(status_code=404, detail="Income not found")

    if (
        member.role != MemberRole.owner
        and income.user_id != uuid.UUID(current_user["id"])
    ):
        raise HTTPException(status_code=403, detail="Permission denied")

    await db.delete(income)
    await db.commit()
