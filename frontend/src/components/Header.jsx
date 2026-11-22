import { RefreshCw, Recycle, Wifi, WifiOff, Loader2 } from 'lucide-react';

export default function Header({ health, onRefreshHealth }) {
  const { status, message } = health;

  const badgeStyles = {
    online: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    checking: 'bg-amber-50 text-amber-700 border-amber-200',
    offline: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  const statusLabels = {
    online: 'Sistem Aktif',
    checking: 'Memeriksa Sistem...',
    offline: 'Sistem Terputus',
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-sm shadow-emerald-600/20">
            <Recycle className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
              Prediksi Limbah Harian
            </h1>
            <p className="text-xs text-slate-500 sm:text-sm">
              Dashboard Forecasting Time-Series Berbasis Machine Learning
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            title={message || statusLabels[status]}
            className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
              badgeStyles[status] || badgeStyles.offline
            }`}
          >
            {status === 'online' && (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <Wifi className="h-3.5 w-3.5" />
              </>
            )}
            {status === 'checking' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {status === 'offline' && <WifiOff className="h-3.5 w-3.5" />}
            <span>{statusLabels[status]}</span>
          </div>

          <button
            type="button"
            onClick={onRefreshHealth}
            disabled={status === 'checking'}
            title="Cek ulang koneksi server backend"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${status === 'checking' ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
}
