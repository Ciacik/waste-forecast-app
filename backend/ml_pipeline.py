"""
Pipeline Machine Learning untuk prediksi limbah harian.

Alur:
    CSV (DataFrame) -> deteksi kolom -> data cleaning (opsional filter Senin–Jumat)
    -> feature engineering -> split kronologis 80:20
    -> Random Forest & Linear Regression -> evaluasi (MAE, RMSE, MAPE)
    -> retrain model terpilih pada seluruh data -> forecast rekursif
    -> pola rata-rata limbah per hari.

Mode `exclude_weekends`:
    True  : data Senin–Jumat, lag mingguan 5 hari (lag_5, rolling_mean_5),
            tanggal forecast via pd.bdate_range().
    False : data Senin–Minggu, lag mingguan 7 hari (lag_7, rolling_mean_7),
            tanggal forecast via pd.date_range().
"""

from __future__ import annotations

import math
import warnings
from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.model_selection import train_test_split

# --------------------------------------------------------------------------- #
# Konstanta
# --------------------------------------------------------------------------- #
DEFAULT_DATE_COL = "ticket_date"
DEFAULT_VALUE_COL = "net_weight_kg"

FORECAST_MIN_DAYS = 7
FORECAST_MAX_DAYS = 90
FORECAST_DEFAULT_DAYS = 30

WEEKLY_LAG_WORKDAYS = 5  # exclude_weekends=True  -> 1 minggu = 5 hari kerja
WEEKLY_LAG_ALLDAYS = 7  # exclude_weekends=False -> 1 minggu = 7 hari kalender
LONG_ROLLING_WINDOW = 20
MAX_LAG_WINDOW = LONG_ROLLING_WINDOW  # window terbesar yang dipakai fitur
MIN_MODEL_ROWS = 30  # jumlah minimum baris setelah feature engineering
LOW_SAMPLE_THRESHOLD = 30  # batas jumlah data per hari untuk memunculkan peringatan

DAY_NAMES_ID = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]

RF_PARAMS = {"n_estimators": 150, "random_state": 42, "n_jobs": -1}

DEFAULT_MODEL_TYPE = "random_forest"
MODEL_REGISTRY: dict[str, dict[str, Any]] = {
    "random_forest": {
        "name": "Random Forest Regressor",
        "factory": lambda: RandomForestRegressor(**RF_PARAMS),
    },
    "linear_regression": {
        "name": "Linear Regression",
        "factory": LinearRegression,
    },
}
MODEL_TYPES = tuple(MODEL_REGISTRY)


def get_weekly_lag(exclude_weekends: bool) -> int:
    return WEEKLY_LAG_WORKDAYS if exclude_weekends else WEEKLY_LAG_ALLDAYS


def get_feature_columns(weekly_lag: int) -> list[str]:
    return [
        "day_of_week",
        "day_of_month",
        "month",
        "lag_1",
        f"lag_{weekly_lag}",
        f"rolling_mean_{weekly_lag}",
        f"rolling_mean_{LONG_ROLLING_WINDOW}",
    ]


class PipelineError(ValueError):
    """Error yang pesannya aman ditampilkan ke pengguna."""


# --------------------------------------------------------------------------- #
# Utilitas
# --------------------------------------------------------------------------- #
def _safe_float(value: Any, ndigits: int | None = 2) -> float | None:
    """Konversi ke float Python; NaN/Infinity menjadi None."""
    if value is None:
        return None
    try:
        f = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(f) or math.isinf(f):
        return None
    return round(f, ndigits) if ndigits is not None else f


def sanitize_for_json(obj: Any) -> Any:
    """Rekursif: ubah tipe NumPy/Pandas ke tipe Python, NaN/Inf -> None."""
    if isinstance(obj, dict):
        return {str(k): sanitize_for_json(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [sanitize_for_json(v) for v in obj]
    if isinstance(obj, (pd.Timestamp, np.datetime64)):
        ts = pd.Timestamp(obj)
        return None if pd.isna(ts) else ts.strftime("%Y-%m-%d")
    if obj is None or obj is pd.NaT:
        return None
    if isinstance(obj, (bool, np.bool_)):
        return bool(obj)
    if isinstance(obj, (int, np.integer)):
        return int(obj)
    if isinstance(obj, (float, np.floating)):
        f = float(obj)
        return None if (math.isnan(f) or math.isinf(f)) else f
    try:
        if pd.isna(obj):
            return None
    except (TypeError, ValueError):
        pass
    return obj


def _parse_dates(series: pd.Series) -> pd.Series:
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        return pd.to_datetime(series, errors="coerce")


# --------------------------------------------------------------------------- #
# 1. Deteksi kolom
# --------------------------------------------------------------------------- #
def detect_columns(df: pd.DataFrame) -> tuple[str, str]:
    """
    Default memakai `ticket_date` & `net_weight_kg`. Jika tidak ada,
    auto-detect 1 kolom tanggal dan 1 kolom angka.
    """
    if df.empty or len(df.columns) < 2:
        raise PipelineError(
            "File CSV harus memiliki minimal 2 kolom (1 kolom tanggal dan 1 kolom angka)."
        )

    lower_map = {str(c).strip().lower(): c for c in df.columns}
    if DEFAULT_DATE_COL in lower_map and DEFAULT_VALUE_COL in lower_map:
        return lower_map[DEFAULT_DATE_COL], lower_map[DEFAULT_VALUE_COL]

    sample = df.head(500)

    # Kandidat kolom tanggal: kolom non-numerik dengan rasio parse tanggal tertinggi
    best_date_col, best_date_ratio = None, 0.0
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            continue
        ratio = _parse_dates(sample[col]).notna().mean()
        if ratio > best_date_ratio:
            best_date_col, best_date_ratio = col, ratio

    if best_date_col is None or best_date_ratio < 0.8:
        raise PipelineError(
            "Kolom tanggal tidak ditemukan. Pastikan CSV memiliki kolom tanggal "
            "(misal: 'ticket_date') dengan format tanggal yang valid."
        )

    # Kandidat kolom angka: rasio konversi numerik tertinggi (selain kolom tanggal)
    best_val_col, best_val_ratio = None, 0.0
    for col in df.columns:
        if col == best_date_col:
            continue
        ratio = pd.to_numeric(sample[col], errors="coerce").notna().mean()
        if ratio > best_val_ratio:
            best_val_col, best_val_ratio = col, ratio

    if best_val_col is None or best_val_ratio < 0.8:
        raise PipelineError(
            "Kolom angka (berat limbah) tidak ditemukan. Pastikan CSV memiliki "
            "kolom numerik (misal: 'net_weight_kg')."
        )

    return best_date_col, best_val_col


# --------------------------------------------------------------------------- #
# 2. Data cleaning
# --------------------------------------------------------------------------- #
def clean_data(
    df: pd.DataFrame, date_col: str, value_col: str, exclude_weekends: bool = True
) -> tuple[pd.DataFrame, dict[str, Any]]:
    """
    - Parse tanggal ke datetime, urutkan ascending.
    - Hapus baris dengan tanggal tidak valid, berat NaN, atau berat <= 0.
    - Gabungkan tanggal duplikat dengan rata-rata (mean).
    - Jika `exclude_weekends=True`: filter khusus hari kerja (Senin–Jumat, day_of_week < 5)
      SEBELUM feature engineering & split, agar konsisten dengan forecast pd.bdate_range
      dan fitur lag hari Senin tidak terganggu data akhir pekan.

    Mengembalikan DataFrame [date, value] dan ringkasan cleaning.
    """
    initial_rows = int(len(df))

    data = pd.DataFrame(
        {
            "date": _parse_dates(df[date_col]),
            "value": pd.to_numeric(df[value_col], errors="coerce"),
        }
    )
    # Hilangkan komponen jam agar duplikat per hari terdeteksi
    data["date"] = data["date"].dt.normalize()

    invalid_date_mask = data["date"].isna()
    invalid_dates_removed = int(invalid_date_mask.sum())
    data = data[~invalid_date_mask]

    invalid_value_mask = data["value"].isna() | ~np.isfinite(data["value"]) | (data["value"] <= 0)
    non_positive_removed = int(invalid_value_mask.sum())
    data = data[~invalid_value_mask]

    rows_before_merge = len(data)
    data = (
        data.groupby("date", as_index=False)["value"]
        .mean()  # WAJIB mean, bukan sum
        .sort_values("date")
        .reset_index(drop=True)
    )
    duplicates_merged = int(rows_before_merge - len(data))

    # Filter hari kerja (Senin–Jumat) SEBELUM feature engineering & split
    weekend_removed = 0
    if exclude_weekends:
        weekend_mask = data["date"].dt.day_of_week >= 5
        weekend_removed = int(weekend_mask.sum())
        data = data[~weekend_mask].reset_index(drop=True)

    if data.empty:
        raise PipelineError(
            "Tidak ada data hari kerja (Senin–Jumat) yang valid setelah proses cleaning."
            if exclude_weekends
            else "Tidak ada data valid setelah proses cleaning."
        )

    summary = {
        "initial_rows": initial_rows,
        "invalid_dates_removed": invalid_dates_removed,
        "duplicates_merged": duplicates_merged,
        "non_positive_removed": non_positive_removed,
        "weekend_removed": weekend_removed,
        "clean_rows": int(len(data)),
        "start_date": data["date"].iloc[0].strftime("%Y-%m-%d"),
        "end_date": data["date"].iloc[-1].strftime("%Y-%m-%d"),
    }
    return data, summary


# --------------------------------------------------------------------------- #
# 3. Feature engineering
# --------------------------------------------------------------------------- #
def build_features(data: pd.DataFrame, weekly_lag: int) -> pd.DataFrame:
    """Fitur kalender + lag. Lag/rolling memakai shift(1) agar tidak bocor (leakage)."""
    feat = data.copy()
    feat["day_of_week"] = feat["date"].dt.day_of_week
    feat["day_of_month"] = feat["date"].dt.day
    feat["month"] = feat["date"].dt.month

    shifted = feat["value"].shift(1)
    feat["lag_1"] = shifted
    feat[f"lag_{weekly_lag}"] = feat["value"].shift(weekly_lag)
    feat[f"rolling_mean_{weekly_lag}"] = shifted.rolling(window=weekly_lag).mean()
    feat[f"rolling_mean_{LONG_ROLLING_WINDOW}"] = shifted.rolling(window=LONG_ROLLING_WINDOW).mean()

    return feat.dropna(subset=get_feature_columns(weekly_lag)).reset_index(drop=True)


def _features_from_history(
    history: list[float], date: pd.Timestamp, weekly_lag: int
) -> list[float]:
    """Hitung vektor fitur untuk satu tanggal berdasarkan riwayat nilai sebelumnya.
    Urutan harus sama dengan get_feature_columns()."""
    return [
        date.day_of_week,
        date.day,
        date.month,
        history[-1],
        history[-weekly_lag],
        float(np.mean(history[-weekly_lag:])),
        float(np.mean(history[-LONG_ROLLING_WINDOW:])),
    ]


# --------------------------------------------------------------------------- #
# 4. Metrik
# --------------------------------------------------------------------------- #
def compute_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, float | None]:
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    mae = mean_absolute_error(y_true, y_pred)
    rmse = math.sqrt(mean_squared_error(y_true, y_pred))
    nonzero = y_true != 0
    mape = (
        float(np.mean(np.abs((y_true[nonzero] - y_pred[nonzero]) / y_true[nonzero])) * 100)
        if nonzero.any()
        else None
    )
    return {"mae": _safe_float(mae), "rmse": _safe_float(rmse), "mape": _safe_float(mape)}


# --------------------------------------------------------------------------- #
# 5. Forecast rekursif
# --------------------------------------------------------------------------- #
def generate_future_dates(
    last_date: pd.Timestamp, forecast_days: int, exclude_weekends: bool
) -> pd.DatetimeIndex:
    start = last_date + pd.Timedelta(days=1)
    if exclude_weekends:
        return pd.bdate_range(start=start, periods=forecast_days)  # Senin–Jumat
    return pd.date_range(start=start, periods=forecast_days, freq="D")  # Senin–Minggu


def recursive_forecast(
    model: Any,
    history_values: list[float],
    future_dates: pd.DatetimeIndex,
    weekly_lag: int,
) -> pd.DataFrame:
    """Prediksi rekursif: hasil prediksi hari ke-t dipakai sebagai lag hari ke-(t+1)."""
    feature_cols = get_feature_columns(weekly_lag)
    history = list(history_values)
    preds: list[float] = []

    for date in future_dates:
        x = pd.DataFrame([_features_from_history(history, date, weekly_lag)], columns=feature_cols)
        y_hat = max(float(model.predict(x)[0]), 0.0)  # berat limbah tidak mungkin negatif
        preds.append(y_hat)
        history.append(y_hat)

    return pd.DataFrame({"date": future_dates, "predicted": preds})


# --------------------------------------------------------------------------- #
# 6. Pola mingguan
# --------------------------------------------------------------------------- #
def weekday_pattern(data: pd.DataFrame, exclude_weekends: bool) -> list[dict[str, Any]]:
    """Rata-rata limbah per hari: Senin–Jumat (exclude_weekends) atau Senin–Minggu."""
    grouped = data.groupby(data["date"].dt.day_of_week)["value"]
    avg, count = grouped.mean(), grouped.size()
    n_days = 5 if exclude_weekends else 7
    return [
        {
            "day_name": DAY_NAMES_ID[i],
            "avg_kg": _safe_float(avg.get(i, np.nan)),
            "data_count": int(count.get(i, 0)),
        }
        for i in range(n_days)
    ]


def _pattern_warnings(pattern: list[dict[str, Any]]) -> list[str]:
    """Peringatan transparansi jika ada hari dengan data historis sangat sedikit/kosong."""
    notes = []
    for row in pattern:
        if row["data_count"] == 0:
            notes.append(
                f"Tidak ada data historis untuk hari {row['day_name']}; "
                f"prediksi pada hari tersebut kurang andal."
            )
        elif row["data_count"] < LOW_SAMPLE_THRESHOLD:
            notes.append(
                f"Data hari {row['day_name']} hanya {row['data_count']} baris; "
                f"prediksi pada hari tersebut kurang andal."
            )
    return notes


# --------------------------------------------------------------------------- #
# Pipeline utama
# --------------------------------------------------------------------------- #
def _validate_params(forecast_days: Any, model_type: Any) -> tuple[int, str]:
    try:
        forecast_days = int(forecast_days)
    except (TypeError, ValueError) as exc:
        raise PipelineError("Parameter forecast_days harus berupa bilangan bulat.") from exc
    if not FORECAST_MIN_DAYS <= forecast_days <= FORECAST_MAX_DAYS:
        raise PipelineError(
            f"Parameter forecast_days harus di antara {FORECAST_MIN_DAYS} dan "
            f"{FORECAST_MAX_DAYS} hari."
        )

    model_type = str(model_type or DEFAULT_MODEL_TYPE).strip().lower()
    if model_type not in MODEL_REGISTRY:
        raise PipelineError(
            f"Parameter model_type tidak valid. Pilihan: {', '.join(MODEL_TYPES)}."
        )
    return forecast_days, model_type


def run_pipeline(
    df: pd.DataFrame,
    forecast_days: int = FORECAST_DEFAULT_DAYS,
    exclude_weekends: bool = True,
    model_type: str = DEFAULT_MODEL_TYPE,
) -> dict[str, Any]:
    forecast_days, model_type = _validate_params(forecast_days, model_type)
    exclude_weekends = bool(exclude_weekends)
    weekly_lag = get_weekly_lag(exclude_weekends)
    feature_cols = get_feature_columns(weekly_lag)

    # --- Deteksi kolom & cleaning ---
    date_col, value_col = detect_columns(df)
    clean, cleaning_summary = clean_data(df, date_col, value_col, exclude_weekends)

    # --- Feature engineering ---
    feat = build_features(clean, weekly_lag)
    if len(feat) < MIN_MODEL_ROWS:
        raise PipelineError(
            f"Data terlalu sedikit untuk pemodelan. Dibutuhkan minimal "
            f"{MIN_MODEL_ROWS + MAX_LAG_WINDOW} baris data valid, "
            f"tersedia {cleaning_summary['clean_rows']} baris."
        )

    X = feat[feature_cols]
    y = feat["value"]

    # --- Split kronologis 80:20 (TANPA shuffle) ---
    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, shuffle=False)
    train_dates = feat.loc[X_train.index, "date"]
    val_dates = feat.loc[X_val.index, "date"]

    # --- Latih & evaluasi kedua model (terpilih + pembanding) ---
    evaluations: dict[str, dict[str, Any]] = {}
    for key, spec in MODEL_REGISTRY.items():
        model = spec["factory"]()
        model.fit(X_train, y_train)
        val_pred = model.predict(X_val)
        evaluations[key] = {
            "val_pred": val_pred,
            "metrics": compute_metrics(y_val.values, val_pred),
        }

    selected = evaluations[model_type]
    alternative_type = next(k for k in MODEL_TYPES if k != model_type)
    metrics = selected["metrics"]
    val_pred = selected["val_pred"]

    comparison_metrics = {
        "selected_model": {
            "model_type": model_type,
            "model_name": MODEL_REGISTRY[model_type]["name"],
            "metrics": metrics,
        },
        "alternative_model": {
            "model_type": alternative_type,
            "model_name": MODEL_REGISTRY[alternative_type]["name"],
            "metrics": evaluations[alternative_type]["metrics"],
        },
    }

    # --- Retrain model terpilih pada seluruh data untuk forecast masa depan ---
    final_model = MODEL_REGISTRY[model_type]["factory"]()
    final_model.fit(X, y)
    future_dates = generate_future_dates(clean["date"].iloc[-1], forecast_days, exclude_weekends)
    forecast_df = recursive_forecast(
        final_model,
        history_values=clean["value"].tolist(),
        future_dates=future_dates,
        weekly_lag=weekly_lag,
    )

    # --- Chart data ---
    val_pred_map = dict(zip(val_dates, val_pred))
    val_actual_map = dict(zip(val_dates, y_val.values))
    val_start = val_dates.iloc[0]

    chart_data: list[dict[str, Any]] = []
    for date, value in zip(clean["date"], clean["value"]):
        is_val = date in val_actual_map
        chart_data.append(
            {
                "date": date.strftime("%Y-%m-%d"),
                # baris warm-up (sebelum fitur lag lengkap) termasuk periode historis training
                "train_actual": _safe_float(value) if (not is_val and date < val_start) else None,
                "val_actual": _safe_float(val_actual_map[date]) if is_val else None,
                "val_predicted": _safe_float(val_pred_map[date]) if is_val else None,
                "forecast": None,
            }
        )
    for date, pred in zip(forecast_df["date"], forecast_df["predicted"]):
        chart_data.append(
            {
                "date": date.strftime("%Y-%m-%d"),
                "train_actual": None,
                "val_actual": None,
                "val_predicted": None,
                "forecast": _safe_float(pred),
            }
        )

    forecast_table = [
        {
            "date": date.strftime("%Y-%m-%d"),
            "day_name": DAY_NAMES_ID[date.day_of_week],
            "predicted_kg": _safe_float(pred),
        }
        for date, pred in zip(forecast_df["date"], forecast_df["predicted"])
    ]

    pattern = weekday_pattern(clean, exclude_weekends)

    preview = (
        clean.head(5)
        .assign(date=lambda d: d["date"].dt.strftime("%Y-%m-%d"))
        .rename(columns={"value": "weight_kg"})
        .to_dict(orient="records")
    )

    summary = {
        "total_rows": cleaning_summary["clean_rows"],
        "weekend_removed": cleaning_summary["weekend_removed"],
        "start_date": cleaning_summary["start_date"],
        "end_date": cleaning_summary["end_date"],
        "train_size": int(len(X_train)),
        "val_size": int(len(X_val)),
        "train_period": {
            "start": train_dates.iloc[0].strftime("%Y-%m-%d"),
            "end": train_dates.iloc[-1].strftime("%Y-%m-%d"),
        },
        "val_period": {
            "start": val_dates.iloc[0].strftime("%Y-%m-%d"),
            "end": val_dates.iloc[-1].strftime("%Y-%m-%d"),
        },
        "forecast_days": forecast_days,
        "exclude_weekends": exclude_weekends,
        "model_type": model_type,
        "model_name": MODEL_REGISTRY[model_type]["name"],
        "features": feature_cols,
        "date_column": str(date_col),
        "value_column": str(value_col),
        "cleaning": cleaning_summary,
        "warnings": _pattern_warnings(pattern),
        "preview": preview,
    }

    return sanitize_for_json(
        {
            "summary": summary,
            "metrics": metrics,
            "comparison_metrics": comparison_metrics,
            "chart_data": chart_data,
            "forecast_table": forecast_table,
            "weekday_pattern": pattern,
        }
    )
