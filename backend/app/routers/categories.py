from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_
from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import Category, CategoryType, FamilyMember, UserHiddenCategory
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryOut
from typing import List, Optional
import uuid

router = APIRouter(prefix="/families/{family_id}/categories", tags=["categories"])


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


@router.get("", response_model=List[CategoryOut])
async def list_categories(
    family_id: uuid.UUID,
    type: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_member(family_id, current_user["id"], db)
    uid = uuid.UUID(current_user["id"])

    # Subquery: category IDs this user has hidden
    hidden_sq = select(UserHiddenCategory.category_id).where(
        UserHiddenCategory.user_id == uid
    )

    query = select(Category).where(
        or_(
            # Default categories not hidden by this user
            and_(Category.is_default == True, Category.id.not_in(hidden_sq)),
            # This user's own custom categories
            Category.user_id == uid,
        )
    )

    if type:
        query = query.where(Category.type == type)

    query = query.order_by(Category.is_default.desc(), Category.name)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=CategoryOut, status_code=201)
async def create_category(
    family_id: uuid.UUID,
    body: CategoryCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_member(family_id, current_user["id"], db)

    cat_type = CategoryType.income if body.type == "income" else CategoryType.expense
    cat = Category(
        user_id=uuid.UUID(current_user["id"]),
        name=body.name,
        color=body.color,
        type=cat_type,
        is_default=False,
    )
    db.add(cat)
    await db.commit()
    await db.refresh(cat)
    return cat


@router.patch("/{category_id}", response_model=CategoryOut)
async def update_category(
    family_id: uuid.UUID,
    category_id: uuid.UUID,
    body: CategoryUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_member(family_id, current_user["id"], db)
    uid = uuid.UUID(current_user["id"])

    result = await db.execute(
        select(Category).where(Category.id == category_id)
    )
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    if cat.is_default:
        raise HTTPException(status_code=400, detail="Cannot modify default categories")
    if cat.user_id != uid:
        raise HTTPException(status_code=403, detail="Permission denied")

    if body.name is not None:
        cat.name = body.name
    if body.color is not None:
        cat.color = body.color
    await db.commit()
    await db.refresh(cat)
    return cat


@router.delete("/{category_id}", status_code=204)
async def delete_category(
    family_id: uuid.UUID,
    category_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_member(family_id, current_user["id"], db)
    uid = uuid.UUID(current_user["id"])

    result = await db.execute(
        select(Category).where(Category.id == category_id)
    )
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    if cat.is_default:
        # Don't delete — hide it for this user only
        existing = await db.execute(
            select(UserHiddenCategory).where(
                UserHiddenCategory.user_id == uid,
                UserHiddenCategory.category_id == category_id,
            )
        )
        if not existing.scalar_one_or_none():
            db.add(UserHiddenCategory(user_id=uid, category_id=category_id))
            await db.commit()
    elif cat.user_id == uid:
        await db.delete(cat)
        await db.commit()
    else:
        raise HTTPException(status_code=403, detail="Permission denied")
