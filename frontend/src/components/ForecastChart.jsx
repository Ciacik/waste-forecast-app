import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import {
  filterChartData,
  formatAxisKg,
  formatDateId,
  formatDateMonthYear,
  formatKg,
} from '../utils/formatters';

const RANGE_OPTIONS = [
  { key: '6m', label: '6 Bulan Terakhir' },
  { key: '1y', label: '1 Tahun Terakhir' },
  { key: '3y', label: '3 Tahun Terakhir' },
  { key: 'all', label: 'Semua Data' },
];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;

  const validItems = payload.filter(
    (entry) => entry.value !== null && entry.value !== undefined
  );
  if (validItems.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 p-3.5 shadow-lg backdrop-blur-xs">
      <p className="mb-2 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-800">
        {formatDateId(label)}{' '}
        <span className="font-normal text-slate-400">({label})</span>
      </p>
      <div className="space-y-1.5">
        {validItems.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-5 text-xs">
            <span className="flex items-center gap-2 text-slate-600">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}
            </span>
            <span className="font-mono font-semibold text-slate-900">
              {formatKg(entry.value, 2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ForecastChart({ chartData, modelName, forecastDays }) {
  const [range, setRange] = useState('1y');

  const visibleData = useMemo(() => filterChartData(chartData, range), [chartData, range]);

  if (!Array.isArray(chartData) || chartData.length === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Grafik Prediksi Limbah Harian
            </h2>
            <p className="text-xs text-slate-500">
              Model aktif: <span className="font-semibold text-slate-700">{modelName}</span> &bull;
              Forecast {forecastDays} hari selalu ditampilkan di sisi kanan
            </p>
          </div>
        </div>

        {/* Filter Rentang Tampilan Grafik */}
        <div className="inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1">
          {RANGE_OPTIONS.map((opt) => {
            const active = range === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setRange(opt.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-[380px] w-full sm:h-[430px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={visibleData} margin={{ top: 10, right: 20, left: 6, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(val) =>
                range === '6m' ? formatDateId(val) : formatDateMonthYear(val)
              }
              minTickGap={36}
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatAxisKg}
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              width={62}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="plainline"
              wrapperStyle={{ fontSize: '12px', paddingBottom: '8px' }}
            />
            <Line
              type="monotone"
              dataKey="train_actual"
              name="Data Training (80%)"
              stroke="#38bdf8"
              strokeWidth={1.75}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="val_actual"
              name="Aktual Validasi (20%)"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="val_predicted"
              name="Prediksi Validasi (20%)"
              stroke="#f97316"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="forecast"
              name="Prediksi Masa Depan (Forecast)"
              stroke="#7c3aed"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: '#ffffff' }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
