from typing import List

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, extract
from app.models.models import Spending, Income, Category, FamilyMember
from app.schemas.dashboard import (
    DashboardSummary,
    CategoryTotal,
    MemberTotal,
    MonthlyBar,
)
from decimal import Decimal
import uuid


async def _verify_member(db: AsyncSession, family_id: uuid.UUID, user_id: str) -> None:
    result = await db.execute(
        select(FamilyMember).where(
            FamilyMember.family_id == family_id,
            FamilyMember.user_id == uuid.UUID(user_id),
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a family member")


async def get_dashboard_summary(
    db: AsyncSession,
    family_id: uuid.UUID,
    months: List[int],
    years: List[int],
    user_ids: List[str],
    user_id: str,
) -> DashboardSummary:
    await _verify_member(db, family_id, user_id)

    parsed_user_ids = [uuid.UUID(uid) for uid in user_ids] if user_ids else []

    def _month_year_filter(model: type) -> list:
        filters = [
            extract("month", model.date).in_(months),
            extract("year", model.date).in_(years),
        ]
        if parsed_user_ids:
            filters.append(model.user_id.in_(parsed_user_ids))
        return filters

    # Total spent
    total_spent_result = await db.execute(
        select(func.coalesce(func.sum(Spending.amount), 0)).where(
            Spending.family_id == family_id,
            *_month_year_filter(Spending),
        )
    )
    total_spent = Decimal(str(total_spent_result.scalar()))

    # Total income
    total_income_result = await db.execute(
        select(func.coalesce(func.sum(Income.amount), 0)).where(
            Income.family_id == family_id,
            *_month_year_filter(Income),
        )
    )
    total_income = Decimal(str(total_income_result.scalar()))
    net_savings = total_income - total_spent

    # Expenses by category
    cat_result = await db.execute(
        select(
            Category.id.label("category_id"),
            Category.name.label("category_name"),
            Category.color.label("category_color"),
            func.sum(Spending.amount).label("total"),
        )
        .join(Category, Spending.category_id == Category.id)
        .where(
            Spending.family_id == family_id,
            *_month_year_filter(Spending),
        )
        .group_by(Category.id, Category.name, Category.color)
        .order_by(func.sum(Spending.amount).desc())
    )
    by_category = [
        CategoryTotal(
            category_id=str(row.category_id),
            category_name=row.category_name,
            category_color=row.category_color,
            total=Decimal(str(row.total)),
        )
        for row in cat_result.all()
    ]

    # Income by category
    income_cat_result = await db.execute(
        select(
            Category.id.label("category_id"),
            Category.name.label("category_name"),
            Category.color.label("category_color"),
            func.sum(Income.amount).label("total"),
        )
        .join(Category, Income.category_id == Category.id)
        .where(
            Income.family_id == family_id,
            *_month_year_filter(Income),
        )
        .group_by(Category.id, Category.name, Category.color)
        .order_by(func.sum(Income.amount).desc())
    )
    income_by_category = [
        CategoryTotal(
            category_id=str(row.category_id),
            category_name=row.category_name,
            category_color=row.category_color,
            total=Decimal(str(row.total)),
        )
        for row in income_cat_result.all()
    ]

    # By member (expenses)
    member_result = await db.execute(
        select(
            Spending.user_id,
            Spending.user_email,
            func.max(Spending.user_name).label("user_name"),
            func.sum(Spending.amount).label("total"),
        )
        .where(
            Spending.family_id == family_id,
            *_month_year_filter(Spending),
        )
        .group_by(Spending.user_id, Spending.user_email)
        .order_by(func.sum(Spending.amount).desc())
    )
    by_member = [
        MemberTotal(
            user_id=str(row.user_id),
            user_email=row.user_email,
            user_name=row.user_name or None,
            total=Decimal(str(row.total)),
        )
        for row in member_result.all()
    ]

    # By payment method
    pm_result = await db.execute(
        select(
            Spending.payment_method,
            func.sum(Spending.amount).label("total"),
        )
        .where(
            Spending.family_id == family_id,
            *_month_year_filter(Spending),
        )
        .group_by(Spending.payment_method)
    )
    by_payment_method = {
        row.payment_method: Decimal(str(row.total)) for row in pm_result.all()
    }

    # Monthly bars — last 6 months of expenses + income combined
    spending_monthly = await db.execute(
        select(
            extract("month", Spending.date).label("month"),
            extract("year", Spending.date).label("year"),
            func.sum(Spending.amount).label("total"),
        )
        .where(Spending.family_id == family_id)
        .group_by(extract("month", Spending.date), extract("year", Spending.date))
    )
    spending_map: dict[tuple, Decimal] = {
        (int(row.month), int(row.year)): Decimal(str(row.total))
        for row in spending_monthly.all()
    }

    income_monthly = await db.execute(
        select(
            extract("month", Income.date).label("month"),
            extract("year", Income.date).label("year"),
            func.sum(Income.amount).label("total"),
        )
        .where(Income.family_id == family_id)
        .group_by(extract("month", Income.date), extract("year", Income.date))
    )
    income_map: dict[tuple, Decimal] = {
        (int(row.month), int(row.year)): Decimal(str(row.total))
        for row in income_monthly.all()
    }

    # Union of all month/year keys, take last 6
    all_keys = sorted(spending_map.keys() | income_map.keys())[-6:]
    monthly_bars = [
        MonthlyBar(
            month=m,
            year=y,
            total=spending_map.get((m, y), Decimal("0")),
            income=income_map.get((m, y), Decimal("0")),
        )
        for m, y in all_keys
    ]

    return DashboardSummary(
        total_spent=total_spent,
        total_income=total_income,
        net_savings=net_savings,
        by_category=by_category,
        income_by_category=income_by_category,
        by_member=by_member,
        by_payment_method=by_payment_method,
        monthly_bars=monthly_bars,
    )


async def get_yearly_summary(
    db: AsyncSession,
    family_id: uuid.UUID,
    year: int,
    user_id: str,
) -> list:
    await _verify_member(db, family_id, user_id)

    result = await db.execute(
        select(
            extract("month", Spending.date).label("month"),
            func.sum(Spending.amount).label("total"),
        )
        .where(
            Spending.family_id == family_id,
            extract("year", Spending.date) == year,
        )
        .group_by(extract("month", Spending.date))
        .order_by(extract("month", Spending.date))
    )
    return [
        {"month": int(row.month), "year": year, "total": Decimal(str(row.total))}
        for row in result.all()
    ]
