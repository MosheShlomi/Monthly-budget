from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.config import settings
from app.routers import auth, families, members, invites, categories, cards, spendings, budget_goals, dashboard, imports, incomes

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Monthly Budget API", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000", "https://mosheshlomi.github.io"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(families.router, prefix="/api/v1")
app.include_router(members.router, prefix="/api/v1")
app.include_router(invites.router, prefix="/api/v1")
app.include_router(categories.router, prefix="/api/v1")
app.include_router(cards.router, prefix="/api/v1")
app.include_router(spendings.router, prefix="/api/v1")
app.include_router(budget_goals.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(imports.router, prefix="/api/v1")
app.include_router(incomes.router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok"}
