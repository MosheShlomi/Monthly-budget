import asyncio
import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import resend
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import Family, FamilyInvite, FamilyMember, MemberRole
from app.schemas.family import InviteCreate, InviteOut, MemberOut

logger = logging.getLogger(__name__)
router = APIRouter(tags=["invites"])


@router.post("/families/{family_id}/invites", response_model=InviteOut, status_code=201)
async def create_invite(
    family_id: uuid.UUID,
    body: InviteCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Only owner of family can invite
    result = await db.execute(
        select(FamilyMember).where(
            FamilyMember.family_id == family_id,
            FamilyMember.user_id == uuid.UUID(current_user["id"]),
        )
    )
    requester = result.scalar_one_or_none()
    if not requester:
        raise HTTPException(status_code=403, detail="Not a family member")
    if requester.role != MemberRole.owner:
        raise HTTPException(status_code=403, detail="Only owner can invite members")

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    invite = FamilyInvite(
        token=token,
        email=body.email,
        family_id=family_id,
        expires_at=expires_at,
    )
    db.add(invite)
    await db.commit()
    await db.refresh(invite)

    # Send email invitation if Resend is configured
    if not settings.RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set — skipping invite email to %s", body.email)
    else:
        try:
            resend.api_key = settings.RESEND_API_KEY
            invite_url = f"{settings.FRONTEND_URL}/invite?token={token}"

            family_result = await db.execute(select(Family).where(Family.id == family_id))
            family = family_result.scalar_one_or_none()
            family_name = family.name if family else "המשפחה"
            sender_name = current_user.get("name") or current_user["email"]

            html = f"""<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center;">
            <p style="margin:0;font-size:28px;">&#x1F4B0;</p>
            <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:700;">&#x05EA;&#x05E7;&#x05E6;&#x05D9;&#x05D1; &#x05DE;&#x05E9;&#x05E4;&#x05D7;&#x05EA;&#x05D9;</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;">
            <h2 style="margin:0 0 16px;color:#1e293b;font-size:20px;">&#x05D4;&#x05D5;&#x05D6;&#x05DE;&#x05E0;&#x05EA; &#x05DC;&#x05D4;&#x05E6;&#x05D8;&#x05E8;&#x05E3;!</h2>
            <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 12px;">
              <strong>{sender_name}</strong> &#x05DE;&#x05D6;&#x05DE;&#x05D9;&#x05DF; &#x05D0;&#x05D5;&#x05EA;&#x05DA; &#x05DC;&#x05D4;&#x05E6;&#x05D8;&#x05E8;&#x05E3; &#x05DC;&#x05DE;&#x05E9;&#x05E4;&#x05D7;&#x05D4; <strong>{family_name}</strong> &#x05D1;&#x05D0;&#x05E4;&#x05DC;&#x05D9;&#x05E7;&#x05E6;&#x05D9;&#x05D9;&#x05EA; &#x05EA;&#x05E7;&#x05E6;&#x05D9;&#x05D1; &#x05DE;&#x05E9;&#x05E4;&#x05D7;&#x05EA;&#x05D9;.
            </p>
            <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 28px;">
              &#x05DC;&#x05D7;&#x05E5; &#x05E2;&#x05DC; &#x05D4;&#x05DB;&#x05E4;&#x05EA;&#x05D5;&#x05E8; &#x05DC;&#x05DE;&#x05D8;&#x05D4; &#x05DB;&#x05D3;&#x05D9; &#x05DC;&#x05E7;&#x05D1;&#x05DC; &#x05D0;&#x05EA; &#x05D4;&#x05D4;&#x05D6;&#x05DE;&#x05E0;&#x05D4;:
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
              <tr>
                <td style="background:#6366f1;border-radius:10px;">
                  <a href="{invite_url}" style="display:inline-block;padding:14px 32px;color:#fff;text-decoration:none;font-size:16px;font-weight:600;">
                    &#x05E7;&#x05D1;&#x05DC; &#x05D4;&#x05D6;&#x05DE;&#x05E0;&#x05D4; &rarr;
                  </a>
                </td>
              </tr>
            </table>
            <p style="color:#94a3b8;font-size:13px;margin:0;text-align:center;">
              &#x05D4;&#x05E7;&#x05D9;&#x05E9;&#x05D5;&#x05E8; &#x05EA;&#x05E7;&#x05E3; &#x05DC;-7 &#x05D9;&#x05DE;&#x05D9;&#x05DD;. &#x05D0;&#x05DD; &#x05DC;&#x05D0; &#x05D1;&#x05D9;&#x05E7;&#x05E9;&#x05EA; &#x05D4;&#x05D6;&#x05DE;&#x05E0;&#x05D4; &#x05D6;&#x05D5;, &#x05E0;&#x05D9;&#x05EA;&#x05DF; &#x05DC;&#x05D4;&#x05EA;&#x05E2;&#x05DC;&#x05DD; &#x05DE;&#x05D4;&#x05DE;&#x05D9;&#x05D9;&#x05DC;.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

            await asyncio.to_thread(
                resend.Emails.send,
                {
                    "from": f"Budget Family <{settings.FROM_EMAIL}>",
                    "to": body.email,
                    "subject": f"{sender_name} invited you to join {family_name}",
                    "html": html,
                },
            )
            logger.info("Invite email sent to %s", body.email)
        except Exception as e:
            logger.error("Failed to send invite email: %s", e)

    return invite


@router.get("/invites/{token}", response_model=InviteOut)
async def get_invite(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(FamilyInvite).where(FamilyInvite.token == token)
    )
    invite = result.scalar_one_or_none()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    if invite.used:
        raise HTTPException(status_code=400, detail="Invite already used")
    if invite.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invite expired")
    return invite


@router.post("/invites/{token}/accept", response_model=MemberOut)
async def accept_invite(
    token: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(FamilyInvite).where(FamilyInvite.token == token)
    )
    invite = result.scalar_one_or_none()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    if invite.used:
        raise HTTPException(status_code=400, detail="Invite already used")
    if invite.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invite expired")

    # Check not already a member
    result = await db.execute(
        select(FamilyMember).where(
            FamilyMember.family_id == invite.family_id,
            FamilyMember.user_id == uuid.UUID(current_user["id"]),
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already a member of this family")

    member = FamilyMember(
        family_id=invite.family_id,
        user_id=uuid.UUID(current_user["id"]),
        user_email=current_user["email"],
        user_name=current_user.get("name") or None,
        role=MemberRole.member,
    )
    db.add(member)
    invite.used = True
    await db.commit()
    await db.refresh(member)
    return member
