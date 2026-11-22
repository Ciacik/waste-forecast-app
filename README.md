# Sistem Prediksi Limbah Harian Berbasis Machine Learning

Aplikasi web *full-stack* untuk menganalisis data historis timbulan limbah harian dan memprediksi volume limbah di masa depan menggunakan **Random Forest Regressor** dan **Linear Regression**. Pengguna dapat mengunggah dataset `.csv`, mengatur horizon prediksi (7–90 hari), memilih model, serta mengunduh hasil prediksi.

## Teknologi yang Digunakan
- **Backend:** Python 3.11+, FastAPI, Uvicorn, Pandas, NumPy, Scikit-Learn
- **Frontend:** React (Vite), Tailwind CSS, Recharts, Lucide-React

## Fitur Utama
1. **Upload Dataset Fleksibel:** Mendukung format `ticket_date` & `net_weight_kg` maupun deteksi otomatis untuk nama kolom tanggal dan angka lainnya.
2. **Data Cleaning Otomatis:** Menggabungkan tanggal duplikat menggunakan rata-rata (*mean*), menghapus nilai `<= 0 kg`, serta menyediakan opsi filter khusus hari kerja (Senin–Jumat).
3. **Evaluasi Kronologis 80:20:** Membagi data secara berurutan (80% *Training*, 20% *Validation*) tanpa pengacakan (*no shuffle*) untuk mencegah *data leakage*.
4. **Perbandingan Model:** Membandingkan performa **Random Forest Regressor** dan **Linear Regression** secara langsung melalui metrik **MAE**, **RMSE**, dan **MAPE**.
5. **Visualisasi Interaktif & Ekspor:** Grafik 4 zona (*Training*, *Validation Actual*, *Validation Predicted*, *Future Forecast*), filter rentang waktu, grafik pola mingguan, dan ekspor hasil prediksi ke `.csv`.

## Cara Menjalankan Proyek

### 1. Menjalankan Backend (FastAPI)
```bash
cd backend
python -m venv venv

# Aktifkan virtual environment:
# Windows:
venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000