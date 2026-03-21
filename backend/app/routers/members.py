from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import FamilyMember, Family, MemberRole
from app.schemas.family import MemberOut
from typing import List
import uuid

router = APIRouter(prefix="/families", tags=["members"])


@router.get("/{family_id}/members", response_model=List[MemberOut])
async def list_members(
    family_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify current user is a member
    result = await db.execute(
        select(FamilyMember).where(
            FamilyMember.family_id == family_id,
            FamilyMember.user_id == uuid.UUID(current_user["id"]),
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a family member")

    result = await db.execute(
        select(FamilyMember).where(FamilyMember.family_id == family_id)
    )
    return result.scalars().all()


@router.delete("/{family_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    family_id: uuid.UUID,
    member_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Get requesting user's membership
    result = await db.execute(
        select(FamilyMember).where(
            FamilyMember.family_id == family_id,
            FamilyMember.user_id == uuid.UUID(current_user["id"]),
        )
    )
    requester = result.scalar_one_or_none()
    if not requester:
        raise HTTPException(status_code=403, detail="Not a family member")

    # Get target member
    result = await db.execute(
        select(FamilyMember).where(
            FamilyMember.id == member_id,
            FamilyMember.family_id == family_id,
        )
    )
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")

    # Only owner can remove others, members can remove themselves
    if requester.role != MemberRole.owner and target.user_id != uuid.UUID(current_user["id"]):
        raise HTTPException(status_code=403, detail="Only owner can remove members")

    if target.role == MemberRole.owner:
        raise HTTPException(status_code=400, detail="Cannot remove the owner")

    await db.delete(target)
    await db.commit()
