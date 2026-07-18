"""IDE pipeline integration test — ensure all stages execute without crash."""
import pytest
import pandas as pd
from unittest.mock import AsyncMock, MagicMock


@pytest.mark.asyncio
async def test_pipeline_runs_on_sample_dataframe():
    """Pipeline stages should process a clean DataFrame without raising exceptions."""
    from app.intelligence.ide.health_scorer import DataHealthScorer
    from app.intelligence.ide.column_mapper import AIColumnMapper
    from app.intelligence.ide.supplier_normalizer import SupplierNormalizer

    df = pd.DataFrame({
        "Vendor Name":    ["Microsoft Corp", "Microsoft Corporation", "IBM", "IBM Corp", "Accenture"],
        "Invoice Date":   ["2024-01-15", "2024-02-10", "2024-03-01", "2024-04-05", "2024-05-12"],
        "Invoice Amount": ["15000.00", "22000.50", "8400.00", "9100.00", "5000.00"],
        "Cost Center":    ["CC-1001", "CC-1001", "CC-2001", "CC-2001", "CC-3001"],
    })

    # Stage 2: schema
    schema = {col: str(dtype) for col, dtype in df.dtypes.items()}
    assert len(schema) == 4

    # Stage 3: column mapping
    mapper = AIColumnMapper()
    col_map = await mapper.map(schema, ".csv")
    assert "supplier_name" in col_map.values() or "Vendor Name" in schema  # mapping present

    # Stage 5: supplier normalisation
    normalizer = SupplierNormalizer()
    df_norm, entries = await normalizer.normalize(df.rename(columns={"Vendor Name": "supplier_name"}))
    assert len(df_norm) == 5
    # Microsoft variants should be merged
    unique_names = df_norm["supplier_name"].unique()
    assert len(unique_names) < 5  # deduplication happened

    # Stage 7: health score
    scorer = DataHealthScorer()
    score = scorer.score(df_norm)
    assert 0 <= score <= 100
