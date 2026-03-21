from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, extract
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import Spending, FamilyMember, Category, Card, MemberRole
from app.schemas.spending import SpendingCreate, SpendingUpdate, SpendingOut
from typing import List, Optional
import uuid
from uuid import UUID as PyUUID

router = APIRouter(prefix="/families/{family_id}/spendings", tags=["spendings"])


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


def _enrich_spending(s: Spending) -> SpendingOut:
    out = SpendingOut.model_validate(s)
    if s.category:
        out.category_name = s.category.name
        out.category_color = s.category.color
    if s.card:
        out.card_name = s.card.name
    return out


@router.get("", response_model=List[SpendingOut])
async def list_spendings(
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
        select(Spending)
        .options(selectinload(Spending.category), selectinload(Spending.card))
        .where(Spending.family_id == family_id)
        .order_by(Spending.date.desc(), Spending.created_at.desc())
    )

    if month:
        query = query.where(extract("month", Spending.date).in_(month))
    if year:
        query = query.where(extract("year", Spending.date).in_(year))
    if category_id:
        query = query.where(Spending.category_id.in_(category_id))
    if user_id:
        query = query.where(Spending.user_id.in_([uuid.UUID(u) for u in user_id]))

    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    spendings = result.scalars().all()
    return [_enrich_spending(s) for s in spendings]


@router.post("", response_model=SpendingOut, status_code=201)
async def create_spending(
    family_id: uuid.UUID,
    body: SpendingCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_member(family_id, current_user["id"], db)

    spending = Spending(
        family_id=family_id,
        user_id=uuid.UUID(current_user["id"]),
        user_email=current_user["email"],
        user_name=current_user.get("name") or None,
        amount=body.amount,
        category_id=body.category_id,
        payment_method=body.payment_method,
        card_id=body.card_id,
        date=body.date,
        notes=body.notes,
    )
    db.add(spending)
    await db.commit()

    result = await db.execute(
        select(Spending)
        .options(selectinload(Spending.category), selectinload(Spending.card))
        .where(Spending.id == spending.id)
    )
    s = result.scalar_one()
    return _enrich_spending(s)


@router.patch("/{spending_id}", response_model=SpendingOut)
async def update_spending(
    family_id: uuid.UUID,
    spending_id: uuid.UUID,
    body: SpendingUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    member = await _get_member(family_id, current_user["id"], db)

    result = await db.execute(
        select(Spending).where(
            Spending.id == spending_id, Spending.family_id == family_id
        )
    )
    spending = result.scalar_one_or_none()
    if not spending:
        raise HTTPException(status_code=404, detail="Spending not found")

    # Only owner or the spending owner can edit
    if (
        member.role != MemberRole.owner
        and spending.user_id != uuid.UUID(current_user["id"])
    ):
        raise HTTPException(status_code=403, detail="Permission denied")

    if body.amount is not None:
        spending.amount = body.amount
    if body.category_id is not None:
        spending.category_id = body.category_id
    if body.payment_method is not None:
        spending.payment_method = body.payment_method
    if body.card_id is not None:
        spending.card_id = body.card_id
    if body.date is not None:
        spending.date = body.date
    if body.notes is not None:
        spending.notes = body.notes

    await db.commit()

    result = await db.execute(
        select(Spending)
        .options(selectinload(Spending.category), selectinload(Spending.card))
        .where(Spending.id == spending_id)
    )
    s = result.scalar_one()
    return _enrich_spending(s)


@router.delete("/{spending_id}", status_code=204)
async def delete_spending(
    family_id: uuid.UUID,
    spending_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    member = await _get_member(family_id, current_user["id"], db)

    result = await db.execute(
        select(Spending).where(
            Spending.id == spending_id, Spending.family_id == family_id
        )
    )
    spending = result.scalar_one_or_none()
    if not spending:
        raise HTTPException(status_code=404, detail="Spending not found")

    if (
        member.role != MemberRole.owner
        and spending.user_id != uuid.UUID(current_user["id"])
    ):
        raise HTTPException(status_code=403, detail="Permission denied")

    await db.delete(spending)
    await db.commit()
