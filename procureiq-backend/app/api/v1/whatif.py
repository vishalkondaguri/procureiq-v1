"""What-if Analysis / Scenario Simulation API — Phase 3."""
from __future__ import annotations
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_current_user, get_async_session
from app.models.user import User
from app.services.scenario_service import ScenarioEngine

router = APIRouter()


class ScenarioRequest(BaseModel):
    name: str = "Custom Scenario"
    supplier_consolidation_pct:          float = Field(0,   ge=0, le=80)
    price_reduction_pct:                 float = Field(0,   ge=0, le=30)
    tail_spend_reduction_pct:            float = Field(0,   ge=0, le=100)
    payment_terms_extension_days:        float = Field(0,   ge=0, le=90)
    contract_compliance_improvement_pct: float = Field(0,   ge=0, le=100)


@router.post("/simulate")
async def simulate_scenario(
    request: ScenarioRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession   = Depends(get_async_session),
):
    """Run a What-if scenario simulation and return projected impact."""
    engine = ScenarioEngine(db, current_user.tenant_id)
    return await engine.simulate(request.model_dump())


@router.get("/presets")
async def get_presets(
    current_user: User = Depends(get_current_user),
    db: AsyncSession   = Depends(get_async_session),
):
    """Return standard benchmark scenario presets."""
    engine = ScenarioEngine(db, current_user.tenant_id)
    return {"presets": await engine.get_preset_scenarios()}
