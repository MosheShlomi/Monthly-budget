# מעקב תקציב משפחתי חודשי

אפליקציית ווב לניהול תקציב משפחתי - מעקב הוצאות, קטגוריות, כרטיסי אשראי ויעדי תקציב.

## טכנולוגיות

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend:** FastAPI (Python)
- **מסד נתונים:** PostgreSQL על Supabase
- **אימות:** Supabase Auth
- **גרפים:** Recharts

## התקנה מהירה

### דרישות מוקדמות
- Node.js 18+
- Python 3.11+
- חשבון Supabase

### הגדרת סביבה

1. **שכפל את הפרויקט:**
```bash
git clone <repo>
cd monthly-budget
```

2. **הגדר משתני סביבה:**
```bash
cp .env.example .env
# ערוך את .env עם הפרטים שלך
```

3. **הפעל עם Docker:**
```bash
docker-compose up
```

### הפעלה ידנית

**Backend:**
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

## מבנה הפרויקט

```
monthly-budget/
├── frontend/          # Next.js 14 App
├── backend/           # FastAPI
├── supabase/          # SQL migrations
└── docker-compose.yml
```

## תכונות

- ✅ אימות משתמשים עם Supabase Auth
- ✅ ניהול משפחה עם הזמנות
- ✅ מעקב הוצאות עם קטגוריות
- ✅ תמיכה במזומן וכרטיסי אשראי
- ✅ יעדי תקציב חודשיים עם סרגל התקדמות
- ✅ Dashboard עם גרפים אינטראקטיביים
- ✅ ייבוא מ-Excel
- ✅ ממשק בעברית עם תמיכה ב-RTL
- ✅ עיצוב מותאם לנייד

## רישיון

MIT
