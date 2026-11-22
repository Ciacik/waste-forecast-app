"""
Uji endpoint /api/health dan /api/predict (hanya memakai library standar).

Menjalankan 4 skenario: exclude_weekends (True/False) x model_type
(random_forest/linear_regression), lalu memvalidasi struktur & konsistensi response.

Pemakaian (server harus sudah berjalan di port 8000):
    python test_api.py [path_csv] [forecast_days]
"""

from __future__ import annotations

import json
import sys
import uuid
from datetime import date
from pathlib import Path
from urllib.request import Request, urlopen

BASE_URL = "http://127.0.0.1:8000"
DEFAULT_CSV = Path(__file__).resolve().parent.parent / "open_source_ballarat_daily_waste_2000_jul_2015_mar.csv"

SCENARIOS = [
    {"exclude_weekends": "true", "model_type": "random_forest"},
    {"exclude_weekends": "true", "model_type": "linear_regression"},
    {"exclude_weekends": "false", "model_type": "random_forest"},
    {"exclude_weekends": "false", "model_type": "linear_regression"},
]


def build_multipart(file_path: Path, fields: dict[str, str]) -> tuple[bytes, str]:
    boundary = uuid.uuid4().hex
    parts: list[bytes] = []
    for name, value in fields.items():
        parts.append(
            f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode()
        )
    parts.append(
        (
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; "
            f"filename=\"{file_path.name}\"\r\nContent-Type: text/csv\r\n\r\n"
        ).encode()
        + file_path.read_bytes()
        + b"\r\n"
    )
    parts.append(f"--{boundary}--\r\n".encode())
    return b"".join(parts), f"multipart/form-data; boundary={boundary}"


def post_predict(csv_path: Path, fields: dict[str, str]) -> tuple[int, dict, bytes]:
    body, content_type = build_multipart(csv_path, fields)
    req = Request(f"{BASE_URL}/api/predict", data=body, headers={"Content-Type": content_type})
    with urlopen(req, timeout=300) as resp:
        raw = resp.read()
        return resp.status, json.loads(raw), raw


def check(cond: bool, msg: str, failures: list[str]) -> None:
    if not cond:
        failures.append(msg)


def validate(data: dict, raw: bytes, fields: dict[str, str], forecast_days: int) -> list[str]:
    """Validasi konsistensi response terhadap parameter yang dikirim."""
    failures: list[str] = []
    excl = fields["exclude_weekends"] == "true"
    s = data["summary"]
    weekly_lag = 5 if excl else 7

    # json.loads Python menerima NaN/Infinity, jadi cek manual agar response valid untuk browser
    check(b"NaN" not in raw and b"Infinity" not in raw, "Response mengandung NaN/Infinity", failures)
    for key in ("summary", "metrics", "comparison_metrics", "chart_data", "forecast_table", "weekday_pattern"):
        check(key in data, f"Key '{key}' tidak ada", failures)

    check(s["exclude_weekends"] is excl, "summary.exclude_weekends tidak sesuai", failures)
    check(s["model_type"] == fields["model_type"], "summary.model_type tidak sesuai", failures)
    check(
        f"lag_{weekly_lag}" in s["features"] and f"rolling_mean_{weekly_lag}" in s["features"],
        f"Fitur lag_{weekly_lag}/rolling_mean_{weekly_lag} tidak dipakai",
        failures,
    )
    check(len(data["forecast_table"]) == forecast_days, "Jumlah forecast_table salah", failures)

    weekend_fc = sum(r["day_name"] in ("Sabtu", "Minggu") for r in data["forecast_table"])
    if excl:
        check(weekend_fc == 0, "Forecast mengandung akhir pekan padahal exclude_weekends=True", failures)
        check(s["weekend_removed"] > 0, "weekend_removed seharusnya > 0", failures)
        hist_weekend = sum(
            date.fromisoformat(r["date"]).weekday() >= 5
            for r in data["chart_data"]
            if r["forecast"] is None
        )
        check(hist_weekend == 0, "chart_data historis mengandung akhir pekan", failures)
    else:
        check(s["weekend_removed"] == 0, "weekend_removed seharusnya 0", failures)
        dates = [date.fromisoformat(r["date"]) for r in data["forecast_table"]]
        check(
            all((b - a).days == 1 for a, b in zip(dates, dates[1:])),
            "Forecast tidak berurutan harian (pd.date_range)",
            failures,
        )

    expected_days = 5 if excl else 7
    check(len(data["weekday_pattern"]) == expected_days, f"weekday_pattern harus {expected_days} hari", failures)

    cmp_ = data["comparison_metrics"]
    check(cmp_["selected_model"]["model_type"] == fields["model_type"], "selected_model salah", failures)
    check(cmp_["alternative_model"]["model_type"] != fields["model_type"], "alternative_model salah", failures)
    check(cmp_["selected_model"]["metrics"] == data["metrics"], "metrics != selected_model.metrics", failures)
    return failures


def main() -> None:
    csv_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_CSV
    forecast_days = int(sys.argv[2]) if len(sys.argv) > 2 else 30

    with urlopen(f"{BASE_URL}/api/health") as resp:
        print("GET /api/health ->", resp.status, json.loads(resp.read()))

    results = []
    all_failures = 0
    for fields in SCENARIOS:
        params = {**fields, "forecast_days": str(forecast_days)}
        status, data, raw = post_predict(csv_path, params)
        failures = validate(data, raw, fields, forecast_days)
        all_failures += len(failures)
        s, c, m = data["summary"], data["summary"]["cleaning"], data["metrics"]
        alt = data["comparison_metrics"]["alternative_model"]

        print("\n" + "=" * 72)
        print(f"POST /api/predict -> {status} | exclude_weekends={fields['exclude_weekends']} "
              f"| model_type={fields['model_type']}")
        print("-" * 72)
        print(f"  Baris awal {c['initial_rows']} | duplikat digabung {c['duplicates_merged']} | "
              f"<=0 dihapus {c['non_positive_removed']} | akhir pekan dihapus {c['weekend_removed']} | "
              f"bersih {c['clean_rows']}")
        print(f"  Train / val : {s['train_size']} / {s['val_size']}  | fitur: {', '.join(s['features'][3:])}")
        print(f"  Model terpilih  ({s['model_name']}): MAE {m['mae']:,.2f} kg | "
              f"RMSE {m['rmse']:,.2f} kg | MAPE {m['mape']:.2f} %")
        am = alt["metrics"]
        print(f"  Model pembanding ({alt['model_name']}): MAE {am['mae']:,.2f} kg | "
              f"RMSE {am['rmse']:,.2f} kg | MAPE {am['mape']:.2f} %")
        fc = data["forecast_table"]
        print(f"  Forecast: {fc[0]['date']} ({fc[0]['day_name']}) s/d {fc[-1]['date']} ({fc[-1]['day_name']}), "
              f"{len(fc)} hari")
        print("  Pola: " + " | ".join(
            f"{p['day_name']} {p['avg_kg']:,.0f}" if p["avg_kg"] is not None else f"{p['day_name']} -"
            for p in data["weekday_pattern"]
        ))
        for w in s["warnings"]:
            print(f"  [!] {w}")
        print(f"  Validasi: {'LULUS' if not failures else 'GAGAL'}")
        for f in failures:
            print(f"    - {f}")
        results.append((fields, m))

    print("\n" + "=" * 72)
    print("RINGKASAN METRIK MODEL TERPILIH")
    print(f"  {'exclude_weekends':<17}{'model_type':<20}{'MAE (kg)':>12}{'RMSE (kg)':>12}{'MAPE (%)':>10}")
    for fields, m in results:
        print(f"  {fields['exclude_weekends']:<17}{fields['model_type']:<20}"
              f"{m['mae']:>12,.2f}{m['rmse']:>12,.2f}{m['mape']:>10.2f}")
    print("=" * 72)
    print("SEMUA SKENARIO LULUS" if all_failures == 0 else f"ADA {all_failures} PEMERIKSAAN GAGAL")
    sys.exit(1 if all_failures else 0)


if __name__ == "__main__":
    main()
