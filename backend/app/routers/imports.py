from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import FamilyMember
from app.services.excel_import import parse_excel_preview, import_spendings_bulk
from sqlalchemy import select
import uuid

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
