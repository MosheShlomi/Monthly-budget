from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, extract
from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import BudgetGoal, FamilyMember, Category, Spending, Income
from app.schemas.budget_goal import BudgetGoalUpsert, BudgetGoalOut
from typing import List
from decimal import Decimal
import uuid

router = APIRouter(prefix="/families/{family_id}/budget-goals", tags=["budget_goals"])


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


def _build_goal_out(goal: BudgetGoal, category: Category, spent_map: dict, income_map: dict) -> BudgetGoalOut:
    cat_type = category.type.value if hasattr(category.type, "value") else str(category.type)
    if cat_type == "income":
        actual = Decimal(str(income_map.get(str(goal.category_id), 0)))
    else:
        actual = Decimal(str(spent_map.get(str(goal.category_id), 0)))
    return BudgetGoalOut(
        id=goal.id,
        family_id=goal.family_id,
        category_id=goal.category_id,
        month=goal.month,
        year=goal.year,
        limit_amount=goal.limit_amount,
        spent=actual,
        category_name=category.name,
        category_color=category.color,
        category_type=cat_type,
    )


@router.get("", response_model=List[BudgetGoalOut])
async def list_budget_goals(
    family_id: uuid.UUID,
    month: int = Query(...),
    year: int = Query(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_member(family_id, current_user["id"], db)

    result = await db.execute(
        select(BudgetGoal, Category)
        .join(Category, BudgetGoal.category_id == Category.id)
        .where(
            BudgetGoal.family_id == family_id,
            BudgetGoal.month == month,
            BudgetGoal.year == year,
        )
    )
    rows = result.all()

    spent_result = await db.execute(
        select(Spending.category_id, func.sum(Spending.amount).label("total"))
        .where(
            Spending.family_id == family_id,
            extract("month", Spending.date) == month,
            extract("year", Spending.date) == year,
        )
        .group_by(Spending.category_id)
    )
    spent_map = {str(r.category_id): r.total for r in spent_result.all()}

    income_result = await db.execute(
        select(Income.category_id, func.sum(Income.amount).label("total"))
        .where(
            Income.family_id == family_id,
            Income.category_id.isnot(None),
            extract("month", Income.date) == month,
            extract("year", Income.date) == year,
        )
        .group_by(Income.category_id)
    )
    income_map = {str(r.category_id): r.total for r in income_result.all()}

    return [_build_goal_out(goal, category, spent_map, income_map) for goal, category in rows]


@router.put("", response_model=BudgetGoalOut)
async def upsert_budget_goal(
    family_id: uuid.UUID,
    body: BudgetGoalUpsert,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_member(family_id, current_user["id"], db)

    result = await db.execute(
        select(BudgetGoal).where(
            BudgetGoal.family_id == family_id,
            BudgetGoal.category_id == body.category_id,
            BudgetGoal.month == body.month,
            BudgetGoal.year == body.year,
        )
    )
    goal = result.scalar_one_or_none()

    if goal:
        goal.limit_amount = body.limit_amount
    else:
        goal = BudgetGoal(
            family_id=family_id,
            category_id=body.category_id,
            month=body.month,
            year=body.year,
            limit_amount=body.limit_amount,
        )
        db.add(goal)

    await db.commit()
    await db.refresh(goal)

    cat_result = await db.execute(select(Category).where(Category.id == goal.category_id))
    category = cat_result.scalar_one_or_none()

    cat_type = category.type.value if category and hasattr(category.type, "value") else str(category.type) if category else "expense"

    if cat_type == "income":
        actual_result = await db.execute(
            select(func.sum(Income.amount)).where(
                Income.family_id == family_id,
                Income.category_id == goal.category_id,
                extract("month", Income.date) == body.month,
                extract("year", Income.date) == body.year,
            )
        )
    else:
        actual_result = await db.execute(
            select(func.sum(Spending.amount)).where(
                Spending.family_id == family_id,
                Spending.category_id == goal.category_id,
                extract("month", Spending.date) == body.month,
                extract("year", Spending.date) == body.year,
            )
        )
    actual = actual_result.scalar() or Decimal("0")

    return BudgetGoalOut(
        id=goal.id,
        family_id=goal.family_id,
        category_id=goal.category_id,
        month=goal.month,
        year=goal.year,
        limit_amount=goal.limit_amount,
        spent=Decimal(str(actual)),
        category_name=category.name if category else None,
        category_color=category.color if category else None,
        category_type=cat_type,
    )


@router.delete("/{goal_id}", status_code=204)
async def delete_budget_goal(
    family_id: uuid.UUID,
    goal_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_member(family_id, current_user["id"], db)

    result = await db.execute(
        select(BudgetGoal).where(BudgetGoal.id == goal_id, BudgetGoal.family_id == family_id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Budget goal not found")

    await db.delete(goal)
    await db.commit()
