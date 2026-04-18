/**
 * analisis.js - Sección Análisis
 * Análisis detallado de la economía del usuario.
 */

async function renderAnalisis() {
  const el = document.getElementById('section-analisis');
  el.innerHTML = `<div class="loader"><div class="spinner"></div></div>`;

  try {
    const [analisis, tendencia] = await Promise.all([
      API.getAnalisis(),
      API.getTendencia(12),
    ]);

    // Calcular métricas extra
    const totalGastos = analisis.top_categorias_gasto.reduce((s, c) => s + c.total, 0);
    const totalIngresos = analisis.top_categorias_ingreso.reduce((s, c) => s + c.total, 0);
    const tasaAhorro = totalIngresos > 0 ? ((totalIngresos - totalGastos) / totalIngresos * 100) : 0;

    el.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Análisis Financiero</h1>
        <p class="page-subtitle">Análisis detallado de tu economía personal</p>
      </div>

      <!-- Métricas clave -->
      <div class="analisis-grid">
        <div class="analisis-stat">
          <div class="label">Gasto promedio diario</div>
          <div class="big-number text-gasto">${formatMoney(analisis.gasto_promedio_diario)}</div>
          <div style="font-size:0.78rem;color:var(--text-3)">últimos 30 días</div>
        </div>
        <div class="analisis-stat">
          <div class="label">Tasa de ahorro</div>
          <div class="big-number" style="color:${tasaAhorro >= 0 ? 'var(--accent-ingreso)' : 'var(--accent-gasto)'}">${tasaAhorro.toFixed(1)}%</div>
          <div style="font-size:0.78rem;color:var(--text-3)">ingresos vs gastos totales</div>
        </div>
        <div class="analisis-stat">
          <div class="label">Día de mayor gasto</div>
          <div class="big-number text-accent" style="font-size:1.5rem">${analisis.dia_mayor_gasto}</div>
          <div style="font-size:0.78rem;color:var(--text-3)">día de la semana</div>
        </div>
      </div>

      <!-- Evolución anual (línea) -->
      <div class="card" style="margin-bottom:20px">
        <div class="card-title">Evolución Anual — Últimos 12 meses</div>
        <div class="chart-container" style="height:280px"><canvas id="chartAnual"></canvas></div>
      </div>

      <!-- Gráficos + ranking -->
      <div class="charts-grid" style="margin-bottom:20px">
        <div class="card">
          <div class="card-title">Top Categorías de Gasto (histórico)</div>
          <div class="chart-container" style="height:260px"><canvas id="chartTopGastos"></canvas></div>
        </div>
        <div class="card">
          <div class="card-title">Distribución Total de Gastos</div>
          <div class="chart-container" style="height:260px"><canvas id="chartDistribucion"></canvas></div>
        </div>
      </div>

      <!-- Tabla top categorías -->
      <div class="charts-grid">
        <div class="card">
          <div class="card-title">Top Fuentes de Gasto</div>
          <div class="progress-list" id="listaGastos"></div>
        </div>
        <div class="card">
          <div class="card-title">Top Fuentes de Ingreso</div>
          <div class="progress-list" id="listaIngresos"></div>
        </div>
      </div>
    `;

    // Gráfico evolución anual
    if (tendencia.length > 0) {
      Charts.linea('chartAnual', tendencia.map(m => formatMes(m.mes)), [
        { label: 'Ingresos', data: tendencia.map(m => m.ingresos), borderColor: '#34d399', backgroundColor: 'rgba(52,211,153,0.06)', fill: true },
        { label: 'Gastos',   data: tendencia.map(m => m.gastos),   borderColor: '#f87171', backgroundColor: 'rgba(248,113,113,0.06)', fill: true },
        { label: 'Neto',     data: tendencia.map(m => m.ingresos - m.gastos), borderColor: '#6ee7b7', backgroundColor: 'rgba(110,231,183,0.04)', fill: true },
      ]);
    }

    // Barras horizontales top gastos
    if (analisis.top_categorias_gasto.length > 0) {
      Charts.barrasHoriz(
        'chartTopGastos',
        analisis.top_categorias_gasto.map(c => c.categoria),
        analisis.top_categorias_gasto.map(c => c.total),
      );
    }

    // Dona distribución
    if (analisis.distribucion_categorias.length > 0) {
      Charts.dona(
        'chartDistribucion',
        analisis.distribucion_categorias.map(c => c.categoria),
        analisis.distribucion_categorias.map(c => c.total),
      );
    }

    // Progress bars gastos
    const maxGasto = analisis.top_categorias_gasto[0]?.total || 1;
    document.getElementById('listaGastos').innerHTML = analisis.top_categorias_gasto.length > 0
      ? analisis.top_categorias_gasto.map((c, i) => progressBar(
          c.categoria, c.total, (c.total / maxGasto * 100),
          Charts.colors.palette[i], `${c.veces} transacciones`
        )).join('')
      : '<p style="color:var(--text-3);font-size:0.85rem">Sin datos</p>';

    // Progress bars ingresos
    const maxIngreso = analisis.top_categorias_ingreso[0]?.total || 1;
    document.getElementById('listaIngresos').innerHTML = analisis.top_categorias_ingreso.length > 0
      ? analisis.top_categorias_ingreso.map((c, i) => progressBar(
          c.categoria, c.total, (c.total / maxIngreso * 100),
          '#34d399', `${c.veces} transacciones`
        )).join('')
      : '<p style="color:var(--text-3);font-size:0.85rem">Sin datos</p>';

  } catch (e) {
    el.innerHTML = errorMsg(e.message);
  }
}

function progressBar(label, value, pct, color, subtitle = '') {
  return `
    <div class="progress-item">
      <div class="progress-header">
        <div>
          <div class="progress-label">${escapeHtml(label)}</div>
          ${subtitle ? `<div style="font-size:0.72rem;color:var(--text-3)">${subtitle}</div>` : ''}
        </div>
        <div class="progress-value" style="color:${color}">${formatMoney(value)}</div>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${Math.min(pct, 100)}%;background:${color}"></div>
      </div>
    </div>
  `;
}
