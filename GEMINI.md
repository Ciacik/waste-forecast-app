# Project Rules: Daily Waste Forecasting Web App

## Tech Stack
- **Backend (`/backend`):** Python 3.11+, FastAPI, Uvicorn, Pandas, NumPy, Scikit-Learn, Python-Multipart.
- **Frontend (`/frontend`):** React (Vite), Tailwind CSS, Recharts, Lucide-React.

## Machine Learning & Data Rules (WAJIB)
1. **Fleksibilitas CSV:** Default membaca kolom `ticket_date` dan `net_weight_kg`, tetapi tetap mendukung auto-detect jika user meng-upload CSV lain dengan 1 kolom tanggal dan 1 kolom angka.
2. **Data Cleaning Otomatis:**
   - Parse tanggal ke `datetime` dan urutkan secara kronologis (ascending).
   - Jika ada tanggal duplikat, gabungkan menggunakan **rata-rata (`mean`)**, JANGAN `sum`.
   - Hapus baris dengan nilai berat `<= 0` atau `NaN` (agar perhitungan MAPE tidak division-by-zero).
3. **Split Data:** Wajib **80% Training : 20% Validation** secara kronologis (`shuffle=False`). Dilarang keras mengacak data time-series.
4. **Model & Feature Engineering:** Gunakan `RandomForestRegressor` (dan opsional `LinearRegression` sebagai baseline pembanding) dengan fitur: `day_of_week`, `day_of_month`, `month`, `lag_1`, `lag_5`, `rolling_mean_5`, dan `rolling_mean_20`.
5. **Future Forecasting:** Generate tanggal masa depan untuk hari kerja (Senin–Jumat) menggunakan `pd.bdate_range()` dan lakukan prediksi secara rekursif (hasil prediksi hari ke-t dipakai untuk menghitung lag hari ke-(t+1)).

## Code & UI Standards
- Bahasa antarmuka (UI) menggunakan **Bahasa Indonesia** yang profesional dan bersih.
- Pastikan tidak ada nilai `NaN` atau `Infinity` pada JSON response FastAPI (konversi ke `null` / `None`).
- Aktifkan CORS di FastAPI agar bisa diakses dari Vite (`http://localhost:5173`).