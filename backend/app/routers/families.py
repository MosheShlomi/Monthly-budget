from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import Family, FamilyMember, MemberRole
from app.schemas.family import FamilyCreate, FamilyUpdate, FamilyOut
import uuid

router = APIRouter(prefix="/families", tags=["families"])


@router.post("", response_model=FamilyOut, status_code=status.HTTP_201_CREATED)
async def create_family(
    body: FamilyCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check if user already belongs to a family
    result = await db.execute(
        select(FamilyMember).where(
            FamilyMember.user_id == uuid.UUID(current_user["id"])
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already belongs to a family",
        )

    family = Family(
        name=body.name,
        owner_id=uuid.UUID(current_user["id"]),
    )
    db.add(family)
    await db.flush()

    member = FamilyMember(
        family_id=family.id,
        user_id=uuid.UUID(current_user["id"]),
        user_email=current_user["email"],
        user_name=current_user.get("name") or None,
        role=MemberRole.owner,
    )
    db.add(member)
    await db.commit()
    await db.refresh(family)
    return family


@router.get("/me", response_model=FamilyOut)
async def get_my_family(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Family)
        .join(FamilyMember, FamilyMember.family_id == Family.id)
        .where(FamilyMember.user_id == uuid.UUID(current_user["id"]))
    )
    family = result.scalar_one_or_none()
    if not family:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No family found",
        )
    return family


@router.patch("/{family_id}", response_model=FamilyOut)
async def update_family(
    family_id: uuid.UUID,
    body: FamilyUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Family).where(Family.id == family_id)
    )
    family = result.scalar_one_or_none()
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    if family.owner_id != uuid.UUID(current_user["id"]):
        raise HTTPException(status_code=403, detail="Only owner can update family")

    family.name = body.name
    await db.commit()
    await db.refresh(family)
    return family


@router.delete("/{family_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_family(
    family_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Family).where(Family.id == family_id)
    )
    family = result.scalar_one_or_none()
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    if family.owner_id != uuid.UUID(current_user["id"]):
        raise HTTPException(status_code=403, detail="Only owner can delete family")

    await db.delete(family)
    await db.commit()
