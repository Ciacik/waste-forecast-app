import { useState } from 'react';
import {
  AlertTriangle,
  Sparkles,
  Calendar,
  ChevronDown,
  ChevronUp,
  Cpu,
  Database,
} from 'lucide-react';
import { formatDateId, formatInt, formatKg } from '../utils/formatters';

export default function CleaningSummary({ summary }) {
  const [previewOpen, setPreviewOpen] = useState(false);

  if (!summary) return null;

  const cleaning = summary.cleaning || {};
  const warnings = Array.isArray(summary.warnings) ? summary.warnings : [];
  const features = Array.isArray(summary.features) ? summary.features : [];
  const preview = Array.isArray(summary.preview) ? summary.preview : [];

  const stats = [
    {
      label: 'Baris Awal',
      value: formatInt(cleaning.initial_rows),
      sub: 'Total baris CSV',
    },
    {
      label: 'Duplikat Digabung',
      value: formatInt(cleaning.duplicates_merged),
      sub: 'Agregasi rata-rata',
    },
    {
      label: 'Baris ≤ 0 kg / NaN',
      value: formatInt(cleaning.non_positive_removed),
      sub: 'Dihapus otomatis',
    },
    {
      label: 'Akhir Pekan Dihapus',
      value: formatInt(cleaning.weekend_removed ?? summary.weekend_removed),
      sub: summary.exclude_weekends ? 'Filter Senin–Jumat' : 'Mode 7 hari aktif',
    },
    {
      label: 'Jumlah Data Bersih',
      value: formatInt(cleaning.clean_rows ?? summary.total_rows),
      sub: 'Siap untuk pemodelan',
      highlight: true,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Banner Peringatan Kuning jika summary.warnings tidak kosong */}
      {warnings.length > 0 && (
        <div
          role="alert"
          className="rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-xs"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-amber-900">
                Peringatan Kualitas &amp; Ketersediaan Data
              </h3>
              <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-amber-800 sm:text-sm">
                {warnings.map((warn, idx) => (
                  <li key={idx}>{warn}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Panel Ringkas Pembersihan Data */}
      <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Ringkasan Data Cleaning &amp; Fitur Model
              </h2>
              <p className="text-xs text-slate-500">
                Kolom terdeteksi:{' '}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
                  {summary.date_column}
                </code>{' '}
                &amp;{' '}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
                  {summary.value_column}
                </code>
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700">
            <Calendar className="h-3.5 w-3.5 text-slate-500" />
            <span>
              {formatDateId(summary.start_date)} &ndash; {formatDateId(summary.end_date)}
            </span>
          </div>
        </div>

        {/* Grid Statistik Cleaning */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map((item) => (
            <div
              key={item.label}
              className={`rounded-xl border p-3.5 ${
                item.highlight
                  ? 'border-emerald-200 bg-emerald-50/60'
                  : 'border-slate-200/80 bg-slate-50/50'
              }`}
            >
              <p className="text-[11px] font-medium text-slate-500">{item.label}</p>
              <p
                className={`mt-1 text-lg font-bold tracking-tight ${
                  item.highlight ? 'text-emerald-700' : 'text-slate-900'
                }`}
              >
                {item.value}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">{item.sub}</p>
            </div>
          ))}
        </div>

        {/* Daftar Fitur yang Dipakai */}
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/70 bg-slate-50/60 px-3.5 py-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <Cpu className="h-3.5 w-3.5 text-slate-500" />
            <span>Fitur yang dipakai:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {features.map((feat) => {
              const isLag = feat.startsWith('lag_') || feat.startsWith('rolling_');
              return (
                <span
                  key={feat}
                  className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-medium ${
                    isLag
                      ? 'bg-violet-100/80 text-violet-800'
                      : 'bg-sky-100/80 text-sky-800'
                  }`}
                >
                  {feat}
                </span>
              );
            })}
          </div>
        </div>

        {/* Collapsible Preview 5 Baris Awal */}
        {preview.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setPreviewOpen((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <span className="flex items-center gap-2">
                <Database className="h-3.5 w-3.5 text-slate-500" />
                Preview 5 Baris Pertama Dataset Bersih
              </span>
              {previewOpen ? (
                <ChevronUp className="h-4 w-4 text-slate-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-500" />
              )}
            </button>

            {previewOpen && (
              <div className="mt-2.5 overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">#</th>
                      <th className="px-4 py-2.5 font-semibold">Tanggal</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Berat Bersih (kg)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {preview.map((row, index) => (
                      <tr key={`${row.date}-${index}`} className="hover:bg-slate-50/70">
                        <td className="px-4 py-2 text-slate-400">{index + 1}</td>
                        <td className="px-4 py-2 font-medium text-slate-800">
                          {row.date}{' '}
                          <span className="ml-1 text-slate-400">({formatDateId(row.date)})</span>
                        </td>
                        <td className="px-4 py-2 text-right font-mono font-medium text-slate-800">
                          {formatKg(row.weight_kg, 2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
