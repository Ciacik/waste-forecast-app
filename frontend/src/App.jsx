import { useCallback, useEffect, useState } from 'react';
import { LineChart as LineChartIcon } from 'lucide-react';
import Header from './components/Header';
import ControlPanel from './components/ControlPanel';
import CleaningSummary from './components/CleaningSummary';
import MetricsSection from './components/MetricsSection';
import ForecastChart from './components/ForecastChart';
import WeekdayPatternChart from './components/WeekdayPatternChart';
import ForecastTable from './components/ForecastTable';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

export default function App() {
  const [health, setHealth] = useState({ status: 'checking', message: '' });

  // Form parameters
  const [file, setFile] = useState(null);
  const [forecastDays, setForecastDays] = useState(30);
  const [modelType, setModelType] = useState('random_forest');
  const [excludeWeekends, setExcludeWeekends] = useState(true);

  // Request state & result
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const checkHealth = useCallback(async () => {
    setHealth({ status: 'checking', message: 'Memeriksa koneksi backend...' });
    try {
      const resp = await fetch(`${API_BASE_URL}/api/health`);
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      const data = await resp.json();
      setHealth({
        status: data.status === 'ok' ? 'online' : 'offline',
        message: data.message || 'Server berjalan normal.',
      });
    } catch {
      setHealth({
        status: 'offline',
        message: `Tidak dapat terhubung ke ${API_BASE_URL}/api/health`,
      });
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  const handlePredict = async () => {
    if (!file) {
      setError('Silakan pilih file CSV terlebih dahulu sebelum memproses.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('forecast_days', String(forecastDays));
      formData.append('exclude_weekends', String(excludeWeekends));
      formData.append('model_type', modelType);

      const response = await fetch(`${API_BASE_URL}/api/predict`, {
        method: 'POST',
        body: formData,
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        let message = `Terjadi kesalahan pada server (HTTP ${response.status}).`;
        if (payload?.detail) {
          if (typeof payload.detail === 'string') {
            message = payload.detail;
          } else if (Array.isArray(payload.detail)) {
            message = payload.detail.map((d) => d.msg || JSON.stringify(d)).join('; ');
          }
        }
        throw new Error(message);
      }

      setResult(payload);
    } catch (err) {
      if (err instanceof TypeError) {
        setError(
          `Tidak dapat terhubung ke server backend (${API_BASE_URL}). Pastikan server FastAPI sedang aktif.`
        );
      } else {
        setError(err.message || 'Terjadi kesalahan yang tidak terduga saat memproses file.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header health={health} onRefreshHealth={checkHealth} />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <ControlPanel
          file={file}
          onFileChange={setFile}
          forecastDays={forecastDays}
          onForecastDaysChange={setForecastDays}
          modelType={modelType}
          onModelTypeChange={setModelType}
          excludeWeekends={excludeWeekends}
          onExcludeWeekendsChange={setExcludeWeekends}
          loading={loading}
          error={error}
          onClearError={() => setError(null)}
          onSubmit={handlePredict}
          backendOnline={health.status === 'online'}
          apiBaseUrl={API_BASE_URL}
        />

        {result ? (
          <div className="space-y-6">
            <CleaningSummary summary={result.summary} />

            <MetricsSection
              metrics={result.metrics}
              comparisonMetrics={result.comparison_metrics}
              summary={result.summary}
            />

            <ForecastChart
              chartData={result.chart_data}
              modelName={result.summary?.model_name}
              forecastDays={result.summary?.forecast_days}
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <WeekdayPatternChart
                weekdayPattern={result.weekday_pattern}
                excludeWeekends={result.summary?.exclude_weekends}
              />
              <ForecastTable
                forecastTable={result.forecast_table}
                modelType={result.summary?.model_type}
                forecastDays={result.summary?.forecast_days}
              />
            </div>
          </div>
        ) : (
          <section className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <LineChartIcon className="h-7 w-7" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">
              Belum Ada Hasil Prediksi
            </h3>
            <p className="mt-1.5 max-w-md text-sm text-slate-500">
              Unggah file CSV limbah harian di panel atas, atur parameter model, lalu klik{' '}
              <span className="font-semibold text-slate-700">Proses &amp; Prediksi</span> untuk
              melihat evaluasi metrik, grafik time-series, pola mingguan, dan tabel forecast.
            </p>
          </section>
        )}
      </main>

      <footer className="mt-12 border-t border-slate-200/70 bg-white/60 py-5 text-center text-xs text-slate-400">
        Dashboard Prediksi Limbah Harian
      </footer>
    </div>
  );
}
