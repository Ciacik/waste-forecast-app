import { Activity, Target, Percent, GitBranch, Award, CheckCircle2 } from 'lucide-react';
import { formatDateId, formatInt, formatKg, formatPercent } from '../utils/formatters';

function getMoreAccurateType(selected, alternative) {
  if (!selected || !alternative) return null;
  const selMape = selected.metrics?.mape;
  const altMape = alternative.metrics?.mape;

  if (selMape !== null && selMape !== undefined && altMape !== null && altMape !== undefined) {
    if (selMape === altMape) return null;
    return selMape < altMape ? selected.model_type : alternative.model_type;
  }
  const selMae = selected.metrics?.mae;
  const altMae = alternative.metrics?.mae;
  if (selMae !== null && selMae !== undefined && altMae !== null && altMae !== undefined) {
    if (selMae === altMae) return null;
    return selMae < altMae ? selected.model_type : alternative.model_type;
  }
  return null;
}

export default function MetricsSection({ metrics, comparisonMetrics, summary }) {
  if (!metrics || !summary) return null;

  const selectedModel = comparisonMetrics?.selected_model;
  const alternativeModel = comparisonMetrics?.alternative_model;
  const bestModelType = getMoreAccurateType(selectedModel, alternativeModel);

  const comparisonRows = [selectedModel, alternativeModel].filter(Boolean);

  const kpiCards = [
    {
      title: 'MAE (Mean Absolute Error)',
      value: formatKg(metrics.mae, 2),
      subtitle: 'Rata-rata selisih absolut prediksi',
      icon: Target,
      accent: 'bg-sky-50 text-sky-600 ring-sky-100',
    },
    {
      title: 'RMSE (Root Mean Squared Error)',
      value: formatKg(metrics.rmse, 2),
      subtitle: 'Sensitif terhadap deviasi ekstrem',
      icon: Activity,
      accent: 'bg-amber-50 text-amber-600 ring-amber-100',
    },
    {
      title: 'MAPE (Mean Absolute % Error)',
      value: formatPercent(metrics.mape, 2),
      subtitle: 'Persentase rata-rata kesalahan',
      icon: Percent,
      accent: 'bg-violet-50 text-violet-600 ring-violet-100',
    },
    {
      title: 'Proporsi Split (Kronologis)',
      value: '80% / 20%',
      subtitle: `${formatInt(summary.train_size)} Train • ${formatInt(summary.val_size)} Validasi`,
      extra:
        summary.train_period && summary.val_period
          ? `Val: ${formatDateId(summary.val_period.start)} – ${formatDateId(summary.val_period.end)}`
          : null,
      icon: GitBranch,
      accent: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    },
  ];

  return (
    <div className="space-y-4">
      {/* 4 Kartu KPI Utama */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:border-slate-300"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold text-slate-500">{card.title}</p>
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${card.accent}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{card.value}</p>
              <p className="mt-1 text-xs font-medium text-slate-600">{card.subtitle}</p>
              {card.extra && <p className="mt-0.5 text-[11px] text-slate-400">{card.extra}</p>}
            </div>
          );
        })}
      </div>

      {/* Tabel Perbandingan Model */}
      {comparisonRows.length > 0 && (
        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Award className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Perbandingan Performa Model (Data Validasi 20%)
                </h2>
                <p className="text-xs text-slate-500">
                  Perbandingan langsung model yang sedang aktif dengan model pembanding pada split
                  data yang sama.
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Model Machine Learning</th>
                  <th className="px-4 py-3 text-right font-semibold">MAE (kg)</th>
                  <th className="px-4 py-3 text-right font-semibold">RMSE (kg)</th>
                  <th className="px-4 py-3 text-right font-semibold">MAPE (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {comparisonRows.map((row) => {
                  const isSelected = row.model_type === selectedModel?.model_type;
                  const isBest = row.model_type === bestModelType;
                  return (
                    <tr
                      key={row.model_type}
                      className={isSelected ? 'bg-slate-50/70' : 'hover:bg-slate-50/40'}
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-900">{row.model_name}</span>
                          {isSelected && (
                            <span className="inline-flex items-center rounded-full bg-slate-200/80 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                              Model Dipilih
                            </span>
                          )}
                          {isBest && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                              <CheckCircle2 className="h-3 w-3" />
                              Lebih Akurat
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-sm font-medium text-slate-800">
                        {formatKg(row.metrics?.mae, 2)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-sm font-medium text-slate-800">
                        {formatKg(row.metrics?.rmse, 2)}
                      </td>
                      <td
                        className={`px-4 py-3.5 text-right font-mono text-sm font-bold ${
                          isBest ? 'text-emerald-700' : 'text-slate-800'
                        }`}
                      >
                        {formatPercent(row.metrics?.mape, 2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
