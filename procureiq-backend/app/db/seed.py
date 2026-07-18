"""
Demo data seeder — generates a realistic procurement dataset for ProcureIQ.
Run:  poetry run python -m app.db.seed
"""
from __future__ import annotations
import asyncio
import uuid
import random
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import text
from app.db.session import async_session_factory
from app.models.user import User
from app.models.supplier import Supplier
from app.models.spend import SpendTransaction
from app.models.contract import Contract
from app.core.security import hash_password

TENANT_ID = "demo-tenant-001"

# ── Realistic supplier master ──────────────────────────────────────────────────
SUPPLIERS_DATA = [
    ("Microsoft Corporation",    "USA", "Software & Cloud",       1, 8.2,  18_500_000),
    ("IBM Corporation",          "USA", "IT Services",            1, 7.1,  14_200_000),
    ("Accenture PLC",            "IRL", "Consulting",             1, 6.8,  12_800_000),
    ("SAP SE",                   "DEU", "Software & Cloud",       1, 7.5,  11_400_000),
    ("Oracle Corporation",       "USA", "Software & Cloud",       1, 8.0,  10_100_000),
    ("Salesforce Inc",           "USA", "Software & Cloud",       2, 6.5,   8_900_000),
    ("Deloitte LLP",             "USA", "Consulting",             1, 5.9,   8_400_000),
    ("Amazon Web Services",      "USA", "Software & Cloud",       1, 7.8,   7_600_000),
    ("Cognizant Technology",     "USA", "IT Services",            2, 5.4,   6_200_000),
    ("Wipro Limited",            "IND", "IT Services",            2, 4.9,   5_800_000),
    ("Infosys Limited",          "IND", "IT Services",            2, 5.1,   5_400_000),
    ("Capgemini SE",             "FRA", "Consulting",             2, 6.2,   4_900_000),
    ("KPMG LLP",                 "USA", "Consulting",             2, 5.7,   4_600_000),
    ("PwC Advisory",             "USA", "Consulting",             2, 5.5,   4_200_000),
    ("Cisco Systems",            "USA", "Hardware & Networking",  1, 7.2,   3_900_000),
    ("Dell Technologies",        "USA", "Hardware & Networking",  2, 6.8,   3_500_000),
    ("HP Inc",                   "USA", "Hardware & Networking",  2, 6.1,   3_200_000),
    ("ServiceNow Inc",           "USA", "Software & Cloud",       2, 6.9,   2_800_000),
    ("Workday Inc",              "USA", "Software & Cloud",       2, 7.0,   2_600_000),
    ("Snowflake Inc",            "USA", "Software & Cloud",       2, 7.4,   2_300_000),
    ("Gartner Inc",              "USA", "Research & Advisory",    3, 5.0,   1_900_000),
    ("Bloomberg LP",             "USA", "Data & Analytics",       3, 5.2,   1_700_000),
    ("Refinitiv Ltd",            "GBR", "Data & Analytics",       3, 4.8,   1_500_000),
    ("Iron Mountain Inc",        "USA", "Facilities & Real Estate", 3, 4.3, 1_300_000),
    ("Regus Group",              "GBR", "Facilities & Real Estate", 3, 3.9, 1_100_000),
    ("Staples Inc",              "USA", "Office Supplies",        3, 3.5,     850_000),
    ("Office Depot",             "USA", "Office Supplies",        3, 3.4,     740_000),
    ("Grainger Inc",             "USA", "MRO & Facilities",       3, 4.0,     680_000),
    ("FedEx Corporation",        "USA", "Logistics",              3, 4.2,     590_000),
    ("UPS Inc",                  "USA", "Logistics",              3, 4.1,     540_000),
    # Tail spend suppliers (many small vendors)
    ("TechSpark LLC",            "USA", "Software & Cloud",       3, 3.1,     210_000),
    ("DataStream Inc",           "USA", "Data & Analytics",       3, 2.8,     185_000),
    ("CloudNova Corp",           "USA", "Software & Cloud",       3, 3.0,     170_000),
    ("Apex Consulting",          "USA", "Consulting",             3, 2.5,     145_000),
    ("ProServ Solutions",        "GBR", "IT Services",            3, 2.7,     130_000),
    ("Nexus Technologies",       "IND", "IT Services",            3, 2.4,     118_000),
    ("Global Dynamics LLC",      "USA", "Consulting",             3, 2.6,     105_000),
    ("Vertex Systems",           "USA", "Hardware & Networking",  3, 2.9,      98_000),
    ("Pinnacle Software",        "CAN", "Software & Cloud",       3, 2.3,      87_000),
    ("Meridian Analytics",       "USA", "Data & Analytics",       3, 2.1,      76_000),
    ("Summit Group Inc",         "USA", "Consulting",             3, 2.2,      68_000),
    ("Pacific IT Services",      "USA", "IT Services",            3, 2.0,      61_000),
    ("Atlas Procurement",        "USA", "Office Supplies",        3, 1.8,      54_000),
    ("BrightPath Corp",          "USA", "IT Services",            3, 1.9,      49_000),
    ("Quantum Advisors",         "USA", "Research & Advisory",    3, 2.0,      43_000),
    ("CoreLogic Inc",            "AUS", "Data & Analytics",       3, 2.1,      38_000),
    ("NorthStar Consulting",     "USA", "Consulting",             3, 1.7,      33_000),
    ("Elara Systems",            "USA", "Software & Cloud",       3, 1.6,      29_000),
    ("Solaris Ventures",         "USA", "Consulting",             3, 1.5,      24_000),
    ("Horizon Tech Ltd",         "GBR", "IT Services",            3, 1.4,      19_000),
]

COST_CENTERS = ["CC-1001-IT", "CC-2001-Finance", "CC-3001-HR", "CC-4001-Operations",
                "CC-5001-Marketing", "CC-6001-Legal", "CC-7001-Supply Chain"]
GL_ACCOUNTS  = ["6100-IT-Software", "6200-Consulting", "6300-Hardware", "6400-MRO",
                "6500-Facilities", "6600-Professional-Svcs", "6700-Data-Analytics"]
COMMODITY_CODES = ["IT-SW-001", "IT-HW-002", "CONS-003", "MRO-004", "FAC-005",
                   "DATA-006", "LOG-007", "OFF-008"]


def rand_date(start: date, end: date) -> date:
    return start + timedelta(days=random.randint(0, (end - start).days))


async def seed() -> None:
    async with async_session_factory() as db:
        # Clear existing demo data
        for tbl in ["spend_transactions", "contracts", "suppliers", "users"]:
            await db.execute(text(f"DELETE FROM {tbl} WHERE tenant_id = '{TENANT_ID}'"))

        # ── Users ─────────────────────────────────────────────────────────────
        users = [
            User(id=str(uuid.uuid4()), email="admin@procureiq.ai",      full_name="Alex Rivera",      role="admin",               tenant_id=TENANT_ID, hashed_password=hash_password("Admin@123!"), is_active=True, status="active"),
            User(id=str(uuid.uuid4()), email="cpo@procureiq.ai",         full_name="Sarah Chen",       role="procurement_manager", tenant_id=TENANT_ID, hashed_password=hash_password("Admin@123!"), is_active=True, status="active"),
            User(id=str(uuid.uuid4()), email="analyst@procureiq.ai",     full_name="James Okonkwo",    role="analyst",             tenant_id=TENANT_ID, hashed_password=hash_password("Admin@123!"), is_active=True, status="active"),
            User(id=str(uuid.uuid4()), email="viewer@procureiq.ai",      full_name="Maria Santos",     role="viewer",              tenant_id=TENANT_ID, hashed_password=hash_password("Admin@123!"), is_active=True, status="active"),
        ]
        db.add_all(users)

        # ── Suppliers ─────────────────────────────────────────────────────────
        supplier_ids: list[str] = []
        for name, country, category, tier, risk, spend in SUPPLIERS_DATA:
            sid = str(uuid.uuid4())
            supplier_ids.append(sid)
            db.add(Supplier(
                id=sid, canonical_name=name, country=country, category=category,
                tier=tier, risk_score=Decimal(str(risk)),
                total_spend_usd=Decimal(str(spend)),
                aliases=[], tenant_id=TENANT_ID,
            ))

        # ── Spend Transactions (12 months, ~3600 records) ────────────────────
        start_date = date(2024, 1, 1)
        end_date   = date(2024, 12, 31)
        for i, (sid, (name, *_, spend)) in enumerate(zip(supplier_ids, SUPPLIERS_DATA)):
            # Number of transactions scales with spend
            n_tx = max(2, min(120, int(spend / 80_000)))
            for _ in range(n_tx):
                tx_amount = Decimal(str(round(random.uniform(spend * 0.005, spend * 0.05), 2)))
                inv_date  = rand_date(start_date, end_date)
                db.add(SpendTransaction(
                    id=str(uuid.uuid4()),
                    supplier_id=sid,
                    po_number=f"PO-2024-{random.randint(10000,99999)}",
                    po_date=inv_date - timedelta(days=random.randint(5, 30)),
                    invoice_number=f"INV-{random.randint(100000,999999)}",
                    invoice_date=inv_date,
                    amount_usd=tx_amount,
                    cost_center=random.choice(COST_CENTERS),
                    gl_account=random.choice(GL_ACCOUNTS),
                    commodity_code=random.choice(COMMODITY_CODES),
                    country=SUPPLIERS_DATA[i][1],
                    payment_terms=random.choice(["Net 30", "Net 45", "Net 60", "Net 90"]),
                    ingestion_id="seed-run-001",
                    tenant_id=TENANT_ID,
                ))

        # ── Contracts ─────────────────────────────────────────────────────────
        statuses = ["active", "active", "active", "expiring_soon", "expired", "draft"]
        for i, (sid, (name, *_, spend)) in enumerate(zip(supplier_ids[:30], SUPPLIERS_DATA[:30])):
            cs = random.choice(statuses)
            if cs == "expired":
                s, e = date(2023, 1, 1), date(2023, 12, 31)
            elif cs == "expiring_soon":
                s, e = date(2024, 1, 1), date(2025, 1, 31)
            elif cs == "draft":
                s, e = date(2025, 1, 1), date(2026, 12, 31)
            else:
                s, e = date(2024, 1, 1), date(2025, 12, 31)
            db.add(Contract(
                id=str(uuid.uuid4()),
                supplier_id=sid,
                title=f"Master Services Agreement — {name}",
                start_date=s, end_date=e,
                value_usd=Decimal(str(round(spend * random.uniform(0.8, 1.2), 2))),
                status=cs,
                tenant_id=TENANT_ID,
            ))

        await db.commit()
        print(f"[OK] Seeded {len(users)} users, {len(supplier_ids)} suppliers, contracts, and spend transactions.")


async def auto_seed_if_empty() -> None:
    """Called on startup. Seeds demo data only if the tenant has zero spend transactions.
    This ensures the dashboard is never blank — demo data is shown until a real
    Excel is uploaded, at which point /upload-dataset clears it and replaces it.
    """
    from sqlalchemy import select, func
    from app.models.spend import SpendTransaction
    async with async_session_factory() as db:
        q = await db.execute(
            select(func.count(SpendTransaction.id))
            .where(SpendTransaction.tenant_id == TENANT_ID)
        )
        count = q.scalar_one() or 0
        if count == 0:
            print("[ProcureIQ] DB is empty — seeding demo dataset…")
            await seed()
            print("[ProcureIQ] Demo seed complete.")
        else:
            print(f"[ProcureIQ] DB has {count} spend records — skipping auto-seed.")


if __name__ == "__main__":
    asyncio.run(seed())
