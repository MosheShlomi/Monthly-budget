from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import Card, FamilyMember
from app.schemas.card import CardCreate, CardUpdate, CardOut
from typing import List
import uuid

router = APIRouter(prefix="/families/{family_id}/cards", tags=["cards"])


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


@router.get("", response_model=List[CardOut])
async def list_cards(
    family_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_member(family_id, current_user["id"], db)
    uid = uuid.UUID(current_user["id"])
    result = await db.execute(
        select(Card).where(
            Card.family_id == family_id,
            Card.user_id == uid,
        ).order_by(Card.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=CardOut, status_code=201)
async def create_card(
    family_id: uuid.UUID,
    body: CardCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_member(family_id, current_user["id"], db)

    card = Card(
        family_id=family_id,
        user_id=uuid.UUID(current_user["id"]),
        name=body.name,
    )
    db.add(card)
    await db.commit()
    await db.refresh(card)
    return card


@router.patch("/{card_id}", response_model=CardOut)
async def update_card(
    family_id: uuid.UUID,
    card_id: uuid.UUID,
    body: CardUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_member(family_id, current_user["id"], db)
    uid = uuid.UUID(current_user["id"])

    result = await db.execute(
        select(Card).where(Card.id == card_id, Card.family_id == family_id)
    )
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    if card.user_id != uid:
        raise HTTPException(status_code=403, detail="Permission denied")

    if body.name is not None:
        card.name = body.name
    if body.is_active is not None:
        card.is_active = body.is_active
    await db.commit()
    await db.refresh(card)
    return card


@router.delete("/{card_id}", status_code=204)
async def delete_card(
    family_id: uuid.UUID,
    card_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_member(family_id, current_user["id"], db)
    uid = uuid.UUID(current_user["id"])

    result = await db.execute(
        select(Card).where(Card.id == card_id, Card.family_id == family_id)
    )
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    if card.user_id != uid:
        raise HTTPException(status_code=403, detail="Permission denied")

    await db.delete(card)
    await db.commit()
