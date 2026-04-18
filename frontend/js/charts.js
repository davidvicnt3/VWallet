/**
 * charts.js - Helpers para crear y destruir gráficos con Chart.js
 */

const Charts = {
  _instances: {},

  // Paleta de colores coherente con el diseño
  colors: {
    accent:   '#6ee7b7',
    accent2:  '#818cf8',
    gasto:    '#f87171',
    ingreso:  '#34d399',
    warn:     '#fbbf24',
    palette: [
      '#6ee7b7','#818cf8','#f87171','#fbbf24','#38bdf8',
      '#e879f9','#fb923c','#84cc16','#14b8a6','#f43f5e',
      '#a78bfa','#2dd4bf','#facc15','#60a5fa',
    ],
  },

  // Opciones globales según tema
  _getDefaultOptions(theme = 'dark') {
    const textColor  = theme === 'dark' ? '#94a3b8' : '#64748b';
    const gridColor  = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: textColor,
            font: { family: 'Outfit', size: 12 },
            usePointStyle: true,
            pointStyleWidth: 8,
            padding: 16,
          },
        },
        tooltip: {
          backgroundColor: theme === 'dark' ? '#1a2234' : '#fff',
          borderColor:    theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          borderWidth: 1,
          titleColor:  theme === 'dark' ? '#f1f5f9' : '#0f172a',
          bodyColor:   textColor,
          padding: 12,
          cornerRadius: 10,
          titleFont: { family: 'Outfit', weight: '700' },
          bodyFont:  { family: 'Outfit' },
        },
      },
      scales: {
        x: {
          grid: { color: gridColor, drawTicks: false },
          ticks: { color: textColor, font: { family: 'Outfit', size: 11 } },
          border: { display: false },
        },
        y: {
          grid: { color: gridColor, drawTicks: false },
          ticks: { color: textColor, font: { family: 'Outfit', size: 11 }, callback: v => Charts._formatMoney(v) },
          border: { display: false },
        },
      },
    };
  },

  _formatMoney(v) {
    if (Math.abs(v) >= 1000) return (v / 1000).toFixed(1) + 'k€';
    return v.toFixed(0) + '€';
  },

  _theme() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  },

  destroy(id) {
    if (this._instances[id]) {
      this._instances[id].destroy();
      delete this._instances[id];
    }
  },

  // ── Barras de Tendencia (ingresos vs gastos por mes) ─────────────────────
  barras(canvasId, labels, datasets) {
    this.destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const opts = this._getDefaultOptions(this._theme());

    this._instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        ...opts,
        plugins: {
          ...opts.plugins,
          legend: { ...opts.plugins.legend, position: 'top' },
        },
        scales: {
          ...opts.scales,
          x: { ...opts.scales.x, stacked: false },
          y: { ...opts.scales.y, stacked: false },
        },
        borderRadius: 6,
        borderSkipped: false,
      },
    });
    return this._instances[canvasId];
  },

  // ── Dona (distribución de categorías) ────────────────────────────────────
  dona(canvasId, labels, data, colores) {
    this.destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const opts = this._getDefaultOptions(this._theme());

    this._instances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colores || this.colors.palette.slice(0, data.length),
          borderWidth: 2,
          borderColor: this._theme() === 'dark' ? '#141b2d' : '#ffffff',
          hoverBorderWidth: 0,
          hoverOffset: 8,
        }],
      },
      options: {
        ...opts,
        cutout: '70%',
        plugins: {
          ...opts.plugins,
          legend: { ...opts.plugins.legend, position: 'right' },
        },
        scales: {},
      },
    });
    return this._instances[canvasId];
  },

  // ── Línea (evolución en el tiempo) ───────────────────────────────────────
  linea(canvasId, labels, datasets) {
    this.destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const opts = this._getDefaultOptions(this._theme());

    const styledDatasets = datasets.map(ds => ({
      ...ds,
      tension: 0.4,
      fill: false,
      pointRadius: 4,
      pointHoverRadius: 7,
      borderWidth: 2.5,
    }));

    this._instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets: styledDatasets },
      options: opts,
    });
    return this._instances[canvasId];
  },

  // ── Barras Horizontales (ranking categorías) ──────────────────────────────
  barrasHoriz(canvasId, labels, data, color = '#6ee7b7') {
    this.destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const opts = this._getDefaultOptions(this._theme());
    const textColor = this._theme() === 'dark' ? '#94a3b8' : '#64748b';
    const gridColor = this._theme() === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';

    this._instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: data.map((_, i) => this.colors.palette[i % this.colors.palette.length] + '99'),
          borderColor:     data.map((_, i) => this.colors.palette[i % this.colors.palette.length]),
          borderWidth: 1.5,
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        ...opts,
        indexAxis: 'y',
        plugins: { ...opts.plugins, legend: { display: false } },
        scales: {
          x: {
            grid: { color: gridColor }, ticks: { color: textColor, font: { family: 'Outfit', size: 11 }, callback: v => Charts._formatMoney(v) },
            border: { display: false },
          },
          y: {
            grid: { display: false }, ticks: { color: textColor, font: { family: 'Outfit', size: 11 } },
            border: { display: false },
          },
        },
      },
    });
    return this._instances[canvasId];
  },

  // Destruir todos los gráficos (al cambiar sección)
  destroyAll() {
    Object.keys(this._instances).forEach(id => this.destroy(id));
  },

  // Actualizar tema en todos los gráficos
  updateTheme() {
    // Re-renderizar los gráficos visibles con el nuevo tema
    Object.entries(this._instances).forEach(([id, chart]) => {
      const theme = this._theme();
      const textColor = theme === 'dark' ? '#94a3b8' : '#64748b';
      const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
      if (chart.options.scales?.x) chart.options.scales.x.ticks.color = textColor;
      if (chart.options.scales?.y) chart.options.scales.y.ticks.color = textColor;
      if (chart.options.scales?.x?.grid) chart.options.scales.x.grid.color = gridColor;
      if (chart.options.scales?.y?.grid) chart.options.scales.y.grid.color = gridColor;
      chart.update();
    });
  },
};
