/**
 * dashboard.js - Sección Dashboard
 * Muestra resumen financiero con gráficos y estadísticas.
 */

async function renderDashboard() {
  const el = document.getElementById('section-dashboard');
  el.innerHTML = `<div class="loader"><div class="spinner"></div></div>`;

  try {
    const [resumen, tendencia, categorias] = await Promise.all([
      API.getDashboard(),
      API.getTendencia(6),
      API.getCategorias(),
    ]);

    const mes = resumen.mes_actual
      ? new Date(resumen.mes_actual + '-01').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
      : '';

    el.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">Resumen financiero · ${mes}</p>
      </div>

      <!-- Stats principales -->
      <div class="stats-grid">
        ${statCard('Saldo Total', formatMoney(resumen.saldo_total), '💰', resumen.saldo_total >= 0 ? 'var(--accent-ingreso)' : 'var(--accent-gasto)', '', resumen.saldo_total >= 0 ? 'up' : 'down')}
        ${statCard('Gastos del Mes', formatMoney(resumen.gastos_mes_actual), '💸', 'var(--accent-gasto)',
          cambioTexto(resumen.variacion_gastos), resumen.variacion_gastos <= 0 ? 'up' : 'down')}
        ${statCard('Ingresos del Mes', formatMoney(resumen.ingresos_mes_actual), '💵', 'var(--accent-ingreso)',
          cambioTexto(resumen.variacion_ingresos), resumen.variacion_ingresos >= 0 ? 'up' : 'down')}
        ${statCard('Movimientos', resumen.total_movimientos.toString(), '📊', 'var(--accent-2)', 'en total', 'neutral')}
      </div>

      <!-- Gráficos fila 1 -->
      <div class="charts-grid-3">
        <div class="card">
          <div class="card-title">Tendencia — Últimos 6 meses</div>
          <div class="chart-container"><canvas id="chartTendencia"></canvas></div>
        </div>
        <div class="card">
          <div class="card-title">Gastos por Categoría (mes actual)</div>
          <div class="chart-container"><canvas id="chartCategorias"></canvas></div>
        </div>
      </div>

      <!-- Gráficos fila 2 -->
      <div class="charts-grid">
        <div class="card">
          <div class="card-title">Balance Mensual</div>
          <div class="chart-container"><canvas id="chartBalance"></canvas></div>
        </div>
        <div class="card">
          <div class="card-title">Últimas Transacciones</div>
          <div class="tx-list" id="txList"></div>
        </div>
      </div>
    `;

    // Gráfico tendencia (barras)
    if (tendencia.length > 0) {
      const labels = tendencia.map(m => formatMes(m.mes));
      Charts.barras('chartTendencia', labels, [
        {
          label: 'Ingresos',
          data: tendencia.map(m => m.ingresos),
          backgroundColor: 'rgba(52,211,153,0.7)',
          borderColor: '#34d399',
          borderWidth: 1.5,
        },
        {
          label: 'Gastos',
          data: tendencia.map(m => m.gastos),
          backgroundColor: 'rgba(248,113,113,0.7)',
          borderColor: '#f87171',
          borderWidth: 1.5,
        },
      ]);
    } else {
      document.getElementById('chartTendencia').closest('.card').innerHTML += emptySmall('Sin datos de tendencia');
    }

    // Gráfico dona categorías
    const gastosCateg = categorias.filter(c => c.tipo === 'gasto');
    if (gastosCateg.length > 0) {
      Charts.dona(
        'chartCategorias',
        gastosCateg.map(c => c.categoria),
        gastosCateg.map(c => c.total),
      );
    } else {
      document.getElementById('chartCategorias').closest('.card').innerHTML += emptySmall('Sin gastos este mes');
    }

    // Gráfico balance (línea neto)
    if (tendencia.length > 0) {
      const labels = tendencia.map(m => formatMes(m.mes));
      Charts.linea('chartBalance', labels, [
        {
          label: 'Neto',
          data: tendencia.map(m => m.ingresos - m.gastos),
          borderColor: '#6ee7b7',
          backgroundColor: 'rgba(110,231,183,0.08)',
          fill: true,
        },
      ]);
    }

    // Últimas transacciones
    const txList = document.getElementById('txList');
    if (resumen.ultimas_transacciones.length === 0) {
      txList.innerHTML = emptySmall('Sin transacciones registradas');
    } else {
      txList.innerHTML = resumen.ultimas_transacciones.map(tx => `
        <div class="tx-item">
          <div class="tx-icon">${getCategoriaIcon(tx.categoria)}</div>
          <div class="tx-info">
            <div class="tx-name">${escapeHtml(tx.nombre)}</div>
            <div class="tx-meta">${formatFecha(tx.fecha)} · ${escapeHtml(tx.categoria)}</div>
          </div>
          <div class="tx-amount ${tx.tipo === 'gasto' ? 'importe-gasto' : 'importe-ingreso'}">
            ${tx.tipo === 'gasto' ? '-' : '+'}${formatMoney(tx.importe)}
          </div>
        </div>
      `).join('');
    }

  } catch (e) {
    el.innerHTML = errorMsg(e.message);
  }
}

// ── Helpers locales ──────────────────────────────────────────────────────────
function statCard(label, value, icon, color, changeText, changeDir) {
  const arrowUp   = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><path d="M18 15l-6-6-6 6"/></svg>`;
  const arrowDown = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><path d="M6 9l6 6 6-6"/></svg>`;

  return `
    <div class="stat-card" style="--stat-color:${color}">
      <div class="stat-icon" style="background:${color}18">${icon}</div>
      <div class="stat-label">${label}</div>
      <div class="stat-value">${value}</div>
      ${changeText ? `
      <div class="stat-change ${changeDir}">
        ${changeDir === 'up' ? arrowUp : changeDir === 'down' ? arrowDown : ''}
        ${changeText}
      </div>` : ''}
    </div>
  `;
}

function cambioTexto(pct) {
  if (pct === 0) return 'Sin cambios';
  return `${Math.abs(pct).toFixed(1)}% vs mes anterior`;
}

function emptySmall(msg) {
  return `<div class="empty-state" style="padding:30px"><div class="empty-state-icon">📭</div><p>${msg}</p></div>`;
}
