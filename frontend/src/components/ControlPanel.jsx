import { useRef, useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  X,
  SlidersHorizontal,
  Play,
  Loader2,
  AlertCircle,
  Info,
} from 'lucide-react';
import { formatFileSize } from '../utils/formatters';

export default function ControlPanel({
  file,
  onFileChange,
  forecastDays,
  onForecastDaysChange,
  modelType,
  onModelTypeChange,
  excludeWeekends,
  onExcludeWeekendsChange,
  loading,
  error,
  onClearError,
  onSubmit,
  backendOnline,
  apiBaseUrl,
}) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const selected = fileList[0];
    onFileChange(selected);
    if (error) onClearError();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
          <SlidersHorizontal className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Upload Dataset &amp; Konfigurasi Model
          </h2>
          <p className="text-xs text-slate-500">
            Unggah file CSV historis limbah harian dan atur parameter prediksi sesuai kebutuhan.
          </p>
        </div>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-5">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Kolom Kiri: Upload CSV */}
          <div className="lg:col-span-5">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-600">
              File Dataset (.CSV)
            </label>

            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
              disabled={loading}
            />

            {!file ? (
              <div
                role="button"
                tabIndex={0}
                onClick={() => !loading && inputRef.current?.click()}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && !loading) {
                    e.preventDefault();
                    inputRef.current?.click();
                  }
                }}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`flex min-h-[172px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 text-center transition ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-50/70'
                    : 'border-slate-300 bg-slate-50/60 hover:border-emerald-400 hover:bg-emerald-50/30'
                } ${loading ? 'pointer-events-none opacity-60' : ''}`}
              >
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200/80">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-slate-800">
                  Tarik &amp; lepas file CSV di sini, atau{' '}
                  <span className="text-emerald-600 underline decoration-emerald-400 underline-offset-2">
                    pilih file
                  </span>
                </p>
                <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-slate-500">
                  Mendukung kolom standar{' '}
                  <code className="rounded bg-slate-200/70 px-1 py-0.5 font-mono text-[11px] text-slate-700">
                    ticket_date
                  </code>{' '}
                  &amp;{' '}
                  <code className="rounded bg-slate-200/70 px-1 py-0.5 font-mono text-[11px] text-slate-700">
                    net_weight_kg
                  </code>{' '}
                  atau deteksi otomatis kolom tanggal &amp; berat lainnya.
                </p>
              </div>
            ) : (
              <div className="flex min-h-[172px] flex-col justify-between rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 overflow-hidden">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900" title={file.name}>
                        {file.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatFileSize(file.size)} &bull; Siap diproses
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onFileChange(null);
                      if (inputRef.current) inputRef.current.value = '';
                    }}
                    disabled={loading}
                    title="Hapus file"
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-rose-600 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-emerald-200/60 pt-3">
                  <span className="text-xs text-emerald-700">
                    Format CSV terdeteksi otomatis saat diproses
                  </span>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={loading}
                    className="text-xs font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-900 disabled:opacity-50"
                  >
                    Ganti File
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Kolom Kanan: Kontrol Parameter Model */}
          <div className="flex flex-col justify-between space-y-5 lg:col-span-7">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {/* Slider Hari Prediksi */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <label
                    htmlFor="forecast-days-slider"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Jumlah Hari Prediksi ke Depan
                  </label>
                  <span className="inline-flex items-center rounded-md bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700">
                    {forecastDays} hari
                  </span>
                </div>
                <input
                  id="forecast-days-slider"
                  type="range"
                  min={7}
                  max={90}
                  step={1}
                  value={forecastDays}
                  onChange={(e) => onForecastDaysChange(Number(e.target.value))}
                  disabled={loading}
                  className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-violet-600 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <div className="mt-1.5 flex justify-between text-[11px] text-slate-500">
                  <span>7 hari</span>
                  <span>30 hari</span>
                  <span>60 hari</span>
                  <span>90 hari</span>
                </div>
              </div>

              {/* Dropdown Model ML */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
                <label
                  htmlFor="model-type-select"
                  className="mb-2 block text-xs font-semibold text-slate-700"
                >
                  Pilih Model ML
                </label>
                <select
                  id="model-type-select"
                  value={modelType}
                  onChange={(e) => onModelTypeChange(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-xs transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="random_forest">Random Forest Regressor</option>
                  <option value="linear_regression">Linear Regression</option>
                </select>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                  Kedua model tetap dievaluasi pada data validasi 20% untuk perbandingan otomatis.
                </p>
              </div>
            </div>

            {/* Checkbox Filter Hari Kerja */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={excludeWeekends}
                  onChange={(e) => onExcludeWeekendsChange(e.target.checked)}
                  disabled={loading}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:cursor-not-allowed"
                />
                <div className="space-y-1">
                  <span className="block text-sm font-semibold text-slate-800">
                    Filter Hari Kerja Saja (Senin–Jumat)
                  </span>
                  <p className="flex items-start gap-1.5 text-xs leading-relaxed text-slate-500">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span>
                      Disarankan jika dataset dominan hari kerja (operasional Senin–Jumat). Saat
                      aktif, data akhir pekan dihapus dan sistem memakai lag mingguan 5 hari; jika
                      nonaktif, seluruh hari (Senin–Minggu) diproses dengan lag mingguan 7 hari.
                    </span>
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Pesan Error */}
        {error && (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <div>
                <p className="font-semibold text-rose-900">Gagal Memproses Prediksi</p>
                <p className="mt-0.5 text-xs leading-relaxed text-rose-700">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClearError}
              className="rounded-md p-1 text-rose-500 hover:bg-rose-100 hover:text-rose-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Tombol Submit */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">
            {!backendOnline
              ? `Pastikan server FastAPI sudah berjalan di ${apiBaseUrl} sebelum memproses.`
              : file
                ? `Siap melatih ${modelType === 'random_forest' ? 'Random Forest Regressor' : 'Linear Regression'} & memprediksi ${forecastDays} hari ${excludeWeekends ? 'kerja' : 'kalender'} ke depan.`
                : 'Pilih file CSV terlebih dahulu untuk memulai pelatihan dan prediksi.'}
          </p>

          <button
            type="submit"
            disabled={loading || !file}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Memproses &amp; Melatih Model...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                <span>Proses &amp; Prediksi</span>
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
