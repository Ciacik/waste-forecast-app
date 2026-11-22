import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { formatAxisKg, formatInt, formatKg } from '../utils/formatters';

function PatternTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0]?.payload;
  if (!item) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-xs">
      <p className="text-xs font-bold text-slate-900">Hari {item.day_name}</p>
      <div className="mt-1.5 space-y-1 text-xs">
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500">Rata-rata limbah:</span>
          <span className="font-mono font-semibold text-slate-900">
            {item.avg_kg !== null && item.avg_kg !== undefined
              ? formatKg(item.avg_kg, 2)
              : 'Tidak ada data'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500">Jumlah data:</span>
          <span className="font-mono font-semibold text-emerald-700">
            {formatInt(item.data_count)} hari
          </span>
        </div>
      </div>
    </div>
  );
}

export default function WeekdayPatternChart({ weekdayPattern, excludeWeekends }) {
  if (!Array.isArray(weekdayPattern) || weekdayPattern.length === 0) return null;

  const chartItems = weekdayPattern.map((item) => ({
    ...item,
    plotValue: item.avg_kg ?? 0,
  }));

  const maxAvg = Math.max(...chartItems.map((d) => d.plotValue), 0);

  return (
    <section className="flex flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
          <BarChart3 className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Pola Rata-Rata Mingguan</h2>
          <p className="text-xs text-slate-500">
            Rata-rata berat limbah per hari (
            {excludeWeekends ? 'Senin–Jumat' : 'Senin–Minggu'}) &bull; hover bar untuk jumlah data
          </p>
        </div>
      </div>

      <div className="h-[340px] w-full flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartItems} margin={{ top: 10, right: 12, left: 4, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="day_name"
              tick={{ fontSize: 12, fill: '#475569', fontWeight: 500 }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatAxisKg}
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              width={58}
            />
            <Tooltip content={<PatternTooltip />} cursor={{ fill: '#f1f5f9' }} />
            <Bar dataKey="plotValue" radius={[8, 8, 0, 0]} maxBarSize={52}>
              {chartItems.map((entry) => {
                const isPeak = entry.plotValue > 0 && entry.plotValue === maxAvg;
                const isEmpty = entry.data_count === 0;
                const fill = isEmpty ? '#cbd5e1' : isPeak ? '#0d9488' : '#34d399';
                return <Cell key={entry.day_name} fill={fill} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
