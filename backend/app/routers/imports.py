from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import Category, FamilyMember
from app.services.excel_import import (
    import_incomes_bulk,
    import_spendings_bulk,
    parse_budget_excel,
    parse_excel_preview,
)
import uuid

DEFAULT_CATEGORY_COLOR = "#6366f1"


async def _resolve_category(
    db: AsyncSession,
    family_id: uuid.UUID,
    name: str,
    cat_type: str,
    cache: dict[str, str],
) -> str:
    """Return category id for the given name, creating it if it doesn't exist."""
    key = f"{name.strip().lower()}:{cat_type}"
    if key in cache:
        return cache[key]

    result = await db.execute(
        select(Category).where(
            ((Category.family_id == family_id) | (Category.is_default == True)),  # noqa: E712
            Category.type == cat_type,
        )
    )
    for cat in result.scalars().all():
        if cat.name.strip().lower() == name.strip().lower():
            cache[key] = str(cat.id)
            return cache[key]

    # Not found — create it (UUID is generated Python-side; no flush needed yet)
    new_cat = Category(
        family_id=family_id,
        name=name.strip(),
        color=DEFAULT_CATEGORY_COLOR,
        type=cat_type,
        is_default=False,
    )
    db.add(new_cat)
    cache[key] = str(new_cat.id)
    return cache[key]

router = APIRouter(prefix="/families/{family_id}/import", tags=["imports"])


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


@router.post("/preview")
async def preview_import(
    family_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_member(family_id, current_user["id"], db)

    if not file.filename or not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Only Excel files are supported")

    content = await file.read()
    preview = await parse_excel_preview(content)
    return preview


@router.post("/confirm")
async def confirm_import(
    family_id: uuid.UUID,
    payload: dict,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_member(family_id, current_user["id"], db)

    rows = payload.get("rows", [])
    if not rows:
        raise HTTPException(status_code=400, detail="No rows to import")

    count = await import_spendings_bulk(
        db,
        family_id=family_id,
        user_id=uuid.UUID(current_user["id"]),
        user_email=current_user["email"],
        rows=rows,
    )
    return {"imported": count}


@router.post("/budget-preview")
async def budget_preview(
    family_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_member(family_id, current_user["id"], db)

    if not file.filename or not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Only Excel files are supported")

    content = await file.read()
    parsed = await parse_budget_excel(content)

    # Look up categories for this family and build a name → id mapping
    result = await db.execute(
        select(Category).where(
            (Category.family_id == family_id) | (Category.is_default == True)  # noqa: E712
        )
    )
    cats = result.scalars().all()
    matched_categories: dict[str, str] = {
        cat.name.strip().lower(): str(cat.id) for cat in cats
    }

    return {
        "sheets": parsed["sheets"],
        "all_category_names": parsed["all_category_names"],
        "matched_categories": matched_categories,
    }


@router.post("/budget-confirm")
async def budget_confirm(
    family_id: uuid.UUID,
    payload: dict,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_member = await _get_member(family_id, current_user["id"], db)

    sheets = payload.get("sheets", [])
    if not sheets:
        raise HTTPException(status_code=400, detail="No sheets to import")

    # Phase 1: resolve / create all missing categories up front, then commit once.
    # This ensures FK constraints are satisfied before bulk inserts.
    category_cache: dict[str, str] = {}
    for sheet in sheets:
        for row in sheet.get("expenses", []):
            if not row.get("category_id") and row.get("category_name"):
                row["category_id"] = await _resolve_category(
                    db, family_id, row["category_name"], "expense", category_cache
                )
        for row in sheet.get("incomes", []):
            if not row.get("category_id") and row.get("category_name"):
                row["category_id"] = await _resolve_category(
                    db, family_id, row["category_name"], "income", category_cache
                )

    # Commit any newly created categories before inserting rows that reference them
    await db.commit()

    # Phase 2: bulk import rows per sheet
    total_expenses = 0
    total_incomes = 0

    for sheet in sheets:
        member_user_id = sheet.get("member_user_id")
        member_user_email = sheet.get("member_user_email")
        member_user_name = sheet.get("member_user_name")
        expenses = sheet.get("expenses", [])
        incomes = sheet.get("incomes", [])

        if not member_user_id or not member_user_email:
            raise HTTPException(status_code=400, detail="member_user_id and member_user_email are required per sheet")

        if member_user_id != current_user["id"] and current_member.role != "owner":
            raise HTTPException(status_code=403, detail="Only the family owner can import on behalf of other members")

        target_user_id = uuid.UUID(member_user_id)

        if expenses:
            total_expenses += await import_spendings_bulk(
                db,
                family_id=family_id,
                user_id=target_user_id,
                user_email=member_user_email,
                user_name=member_user_name,
                rows=expenses,
            )

        if incomes:
            total_incomes += await import_incomes_bulk(
                db,
                family_id=family_id,
                user_id=target_user_id,
                user_email=member_user_email,
                user_name=member_user_name,
                rows=incomes,
            )

    return {"expenses_imported": total_expenses, "incomes_imported": total_incomes}
