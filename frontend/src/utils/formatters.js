const MONTHS_SHORT_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

export function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(value));
}

export function formatInt(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }
  return new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function formatKg(value, decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }
  return `${formatNumber(value, decimals)} kg`;
}

export function formatPercent(value, decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }
  return `${formatNumber(value, decimals)}%`;
}

export function formatAxisKg(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '';
  }
  const num = Number(value);
  if (Math.abs(num) >= 1_000_000) {
    return `${formatNumber(num / 1_000_000, 1)} jt`;
  }
  if (Math.abs(num) >= 1_000) {
    return `${formatInt(Math.round(num / 1_000))} rb`;
  }
  return formatInt(num);
}

export function formatDateId(isoDate) {
  if (!isoDate || typeof isoDate !== 'string') return '—';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const [year, month, day] = parts;
  const monthIdx = parseInt(month, 10) - 1;
  if (monthIdx < 0 || monthIdx > 11) return isoDate;
  return `${parseInt(day, 10)} ${MONTHS_SHORT_ID[monthIdx]} ${year}`;
}

export function formatDateMonthYear(isoDate) {
  if (!isoDate || typeof isoDate !== 'string') return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const [year, month] = parts;
  const monthIdx = parseInt(month, 10) - 1;
  if (monthIdx < 0 || monthIdx > 11) return isoDate;
  return `${MONTHS_SHORT_ID[monthIdx]} ${year}`;
}

export function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Filter chart_data by historical range while ALWAYS preserving all forecast points
 * at the right end of the chart.
 */
export function filterChartData(chartData, rangeKey) {
  if (!Array.isArray(chartData) || chartData.length === 0) return [];
  if (rangeKey === 'all') return chartData;

  const historical = chartData.filter((d) => d.forecast === null || d.forecast === undefined);
  const forecast = chartData.filter((d) => d.forecast !== null && d.forecast !== undefined);

  if (historical.length === 0) return forecast;

  const lastHistDateStr = historical[historical.length - 1].date;
  const [y, m, d] = lastHistDateStr.split('-').map(Number);
  const cutoff = new Date(Date.UTC(y, m - 1, d));

  if (rangeKey === '6m') {
    cutoff.setUTCMonth(cutoff.getUTCMonth() - 6);
  } else if (rangeKey === '1y') {
    cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
  } else if (rangeKey === '3y') {
    cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 3);
  }

  const cutoffIso = cutoff.toISOString().slice(0, 10);
  const filteredHist = historical.filter((item) => item.date >= cutoffIso);

  return [...filteredHist, ...forecast];
}

/**
 * Export forecast_table to downloadable UTF-8 CSV (with BOM for Excel).
 */
export function downloadForecastCsv(forecastTable, meta = {}) {
  if (!Array.isArray(forecastTable) || forecastTable.length === 0) return;

  const headers = ['Tanggal', 'Hari', 'Estimasi Limbah (kg)'];
  const rows = forecastTable.map((row) => [
    row.date,
    row.day_name,
    row.predicted_kg !== null && row.predicted_kg !== undefined ? row.predicted_kg : '',
  ]);

  const csvContent =
    '\uFEFF' +
    [headers, ...rows]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const modelTag = meta.modelType || 'forecast';
  const daysTag = meta.forecastDays ? `${meta.forecastDays}hari` : '';
  const suffix = [modelTag, daysTag].filter(Boolean).join('_');
  a.href = url;
  a.download = `prediksi_limbah_${suffix || 'hasil'}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
