import io
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Any

import openpyxl
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Spending
import uuid


async def parse_excel_preview(content: bytes) -> dict:
    """Parse Excel file and return column headers + first 10 rows as preview."""
    wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    ws = wb.active

    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return {"headers": [], "rows": [], "total_rows": 0}

    headers = [str(h) if h is not None else f"עמודה {i+1}" for i, h in enumerate(rows[0])]
    preview_rows = []
    for row in rows[1:11]:  # First 10 data rows
        preview_rows.append([str(cell) if cell is not None else "" for cell in row])

    wb.close()
    return {
        "headers": headers,
        "rows": preview_rows,
        "total_rows": len(rows) - 1,
    }


async def import_spendings_bulk(
    db: AsyncSession,
    family_id: uuid.UUID,
    user_id: uuid.UUID,
    user_email: str,
    rows: list[dict[str, Any]],
) -> int:
    """
    Bulk insert spendings from imported rows.
    Each row must have: amount, category_id, date, payment_method, notes (optional)
    """
    count = 0
    for row in rows:
        try:
            amount_raw = row.get("amount")
            if amount_raw is None:
                continue
            amount = Decimal(str(amount_raw))

            category_id_raw = row.get("category_id")
            if not category_id_raw:
                continue
            category_id = uuid.UUID(str(category_id_raw))

            date_raw = row.get("date")
            if isinstance(date_raw, str):
                from datetime import datetime
                parsed_date = datetime.strptime(date_raw, "%Y-%m-%d").date()
            elif isinstance(date_raw, date):
                parsed_date = date_raw
            else:
                parsed_date = date.today()

            payment_method = row.get("payment_method", "cash")
            card_id_raw = row.get("card_id")
            card_id = uuid.UUID(str(card_id_raw)) if card_id_raw else None
            notes = row.get("notes")

            spending = Spending(
                family_id=family_id,
                user_id=user_id,
                user_email=user_email,
                amount=amount,
                category_id=category_id,
                payment_method=payment_method,
                card_id=card_id,
                date=parsed_date,
                notes=notes,
            )
            db.add(spending)
            count += 1
        except (ValueError, InvalidOperation, AttributeError):
            continue

    if count > 0:
        await db.commit()
    return count
