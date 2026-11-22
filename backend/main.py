"""
FastAPI backend untuk aplikasi Prediksi Limbah Harian.

Jalankan:
    uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import io
import logging
import os

import pandas as pd
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware

from ml_pipeline import (
    DEFAULT_MODEL_TYPE,
    FORECAST_DEFAULT_DAYS,
    FORECAST_MAX_DAYS,
    FORECAST_MIN_DAYS,
    MODEL_TYPES,
    PipelineError,
    run_pipeline,
)

logger = logging.getLogger("waste_forecast")

MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20 MB

app = FastAPI(
    title="API Prediksi Limbah Harian",
    description="Prediksi berat limbah harian menggunakan Random Forest.",
    version="1.0.0",
)

_raw_origins = os.getenv("ALLOWED_ORIGINS", "").strip()
ALLOWED_ORIGINS = (
    [origin.strip().rstrip("/") for origin in _raw_origins.split(",") if origin.strip()]
    if _raw_origins
    else ["*"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=ALLOWED_ORIGINS != ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _read_csv(content: bytes) -> pd.DataFrame:
    """Baca CSV dengan deteksi delimiter otomatis dan fallback encoding."""
    last_error: Exception | None = None
    for encoding in ("utf-8-sig", "latin-1"):
        try:
            return pd.read_csv(io.BytesIO(content), sep=None, engine="python", encoding=encoding)
        except UnicodeDecodeError as exc:
            last_error = exc
        except (pd.errors.ParserError, pd.errors.EmptyDataError, ValueError) as exc:
            raise HTTPException(status_code=400, detail=f"Gagal membaca file CSV: {exc}") from exc
    raise HTTPException(status_code=400, detail=f"Encoding file tidak didukung: {last_error}")


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "message": "Server prediksi limbah berjalan normal."}


@app.post("/api/predict")
async def predict(
    file: UploadFile = File(..., description="File CSV berisi kolom tanggal dan berat limbah"),
    forecast_days: int = Form(FORECAST_DEFAULT_DAYS),
    exclude_weekends: bool = Form(
        True, description="True: hanya Senin–Jumat (lag 5, bdate_range); False: Senin–Minggu (lag 7)"
    ),
    model_type: str = Form(
        DEFAULT_MODEL_TYPE, description="Model utama: 'random_forest' atau 'linear_regression'"
    ),
) -> dict:
    if not (file.filename or "").lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Format file harus .csv")

    if not FORECAST_MIN_DAYS <= forecast_days <= FORECAST_MAX_DAYS:
        raise HTTPException(
            status_code=400,
            detail=f"Jumlah hari prediksi harus di antara {FORECAST_MIN_DAYS} dan {FORECAST_MAX_DAYS}.",
        )

    model_type = model_type.strip().lower()
    if model_type not in MODEL_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Pilihan model tidak valid. Gunakan salah satu: {', '.join(MODEL_TYPES)}.",
        )

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="File CSV kosong.")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Ukuran file melebihi batas 20 MB.")

    df = _read_csv(content)

    try:
        # Training model bersifat CPU-bound -> jalankan di threadpool
        return await run_in_threadpool(
            run_pipeline, df, forecast_days, exclude_weekends, model_type
        )
    except PipelineError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("Gagal memproses prediksi")
        raise HTTPException(
            status_code=500, detail="Terjadi kesalahan internal saat memproses data."
        ) from exc
