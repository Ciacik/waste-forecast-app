import { Download, Table2 } from 'lucide-react';
import { downloadForecastCsv, formatDateId, formatKg } from '../utils/formatters';

export default function ForecastTable({ forecastTable, modelType, forecastDays }) {
  if (!Array.isArray(forecastTable) || forecastTable.length === 0) return null;

  const validValues = forecastTable
    .map((r) => r.predicted_kg)
    .filter((v) => v !== null && v !== undefined);
  const totalKg = validValues.reduce((acc, v) => acc + v, 0);
  const avgKg = validValues.length > 0 ? totalKg / validValues.length : null;

  return (
    <section className="flex flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
            <Table2 className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Tabel Hasil Prediksi</h2>
            <p className="text-xs text-slate-500">
              {forecastTable.length} hari ke depan &bull; Rata-rata:{' '}
              <span className="font-semibold text-slate-700">{formatKg(avgKg, 2)}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => downloadForecastCsv(forecastTable, { modelType, forecastDays })}
          className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3.5 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 hover:text-violet-900"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Download Hasil Prediksi (.CSV)</span>
        </button>
      </div>

      <div className="custom-scrollbar max-h-[340px] flex-1 overflow-y-auto rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-left text-xs sm:text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wider text-slate-500 shadow-[0_1px_0_0_#e2e8f0]">
            <tr>
              <th className="px-4 py-3 font-semibold">Tanggal</th>
              <th className="px-4 py-3 font-semibold">Hari</th>
              <th className="px-4 py-3 text-right font-semibold">Estimasi Limbah (kg)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {forecastTable.map((row) => (
              <tr key={row.date} className="transition hover:bg-violet-50/30">
                <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-800">
                  <span>{formatDateId(row.date)}</span>
                  <span className="ml-1.5 hidden font-mono text-[11px] text-slate-400 sm:inline">
                    ({row.date})
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-2.5">
                  <span
                    className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
                      row.day_name === 'Sabtu' || row.day_name === 'Minggu'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {row.day_name}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono font-semibold text-violet-700">
                  {formatKg(row.predicted_kg, 2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
