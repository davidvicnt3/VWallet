/**
 * ajustes.js - Sección de Ajustes
 * Exportar/importar datos, borrar todo y personalización.
 */

async function renderAjustes() {
  const el = document.getElementById('section-ajustes');
  el.innerHTML = `<div class="loader"><div class="spinner"></div></div>`;

  let ajustes = {};
  try { ajustes = await API.getAjustes(); } catch (e) {}

  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Ajustes</h1>
      <p class="page-subtitle">Configuración y gestión de datos</p>
    </div>

    <div class="settings-grid">

      <!-- Perfil -->
      <div class="settings-card">
        <div class="settings-card-title">👤 Perfil</div>
        <div class="settings-card-desc">Personaliza cómo se muestra la aplicación</div>
        <div class="settings-actions">
          <div class="form-group">
            <label>Nombre de usuario</label>
            <input type="text" id="ajNombre" placeholder="Tu nombre" value="${escapeHtml(ajustes.nombre_usuario || '')}" />
          </div>
          <div class="form-group">
            <label>Moneda</label>
            <select id="ajMoneda">
              <option value="EUR" ${ajustes.moneda === 'EUR' ? 'selected' : ''}>€ Euro (EUR)</option>
              <option value="USD" ${ajustes.moneda === 'USD' ? 'selected' : ''}>$ Dólar (USD)</option>
              <option value="GBP" ${ajustes.moneda === 'GBP' ? 'selected' : ''}>£ Libra (GBP)</option>
              <option value="MXN" ${ajustes.moneda === 'MXN' ? 'selected' : ''}>$ Peso Mexicano (MXN)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Presupuesto mensual (€)</label>
            <input type="number" id="ajPresupuesto" placeholder="Sin límite" step="10" min="0"
              value="${ajustes.presupuesto_mensual || ''}" />
          </div>
          <button class="btn btn-primary" id="ajBtnGuardarPerfil">Guardar cambios</button>
        </div>
      </div>

      <!-- Exportar/Importar -->
      <div class="settings-card">
        <div class="settings-card-title">📦 Datos</div>
        <div class="settings-card-desc">Exporta o importa todos tus datos en formato JSON</div>
        <div class="settings-actions">
          <button class="btn btn-ghost" id="ajBtnExportar" style="justify-content:center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Exportar datos (.json)
          </button>
          <div>
            <label class="btn btn-ghost" style="cursor:pointer;width:100%;justify-content:center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Importar datos (.json)
              <input type="file" id="ajArchivoImportar" accept=".json" style="display:none" />
            </label>
          </div>
          <div class="divider"></div>
          <div style="font-size:0.8rem;color:var(--text-3)">
            ℹ️ La exportación incluye todos tus movimientos y configuración.<br>
            Al importar, los datos existentes se conservan y se añaden los nuevos.
          </div>
        </div>
      </div>

      <!-- Tema -->
      <div class="settings-card">
        <div class="settings-card-title">🎨 Apariencia</div>
        <div class="settings-card-desc">Cambia el aspecto visual de la aplicación</div>
        <div class="settings-actions">
          <div style="display:flex;gap:10px">
            <button class="tipo-btn ${document.documentElement.getAttribute('data-theme') === 'dark' ? 'active' : ''}"
              id="ajTemaOscuro" data-tipo="gasto" style="flex:1">
              🌙 Tema Oscuro
            </button>
            <button class="tipo-btn ${document.documentElement.getAttribute('data-theme') === 'light' ? 'active' : ''}"
              id="ajTemaClaro" data-tipo="ingreso" style="flex:1">
              ☀️ Tema Claro
            </button>
          </div>
        </div>
      </div>

      <!-- Zona de peligro -->
      <div class="settings-card danger-zone">
        <div class="settings-card-title">⚠️ Zona de peligro</div>
        <div class="settings-card-desc">Acciones irreversibles sobre tus datos</div>
        <div class="settings-actions">
          <button class="btn btn-danger" id="ajBtnBorrar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            Borrar TODOS los datos
          </button>
          <div style="font-size:0.78rem;color:var(--text-3)">
            ⚡ Esta acción eliminará permanentemente todos tus movimientos.<br>
            Se recomienda exportar antes de borrar.
          </div>
        </div>
      </div>

    </div>

    <!-- Info de la app -->
    <div style="margin-top:24px;text-align:center;color:var(--text-3);font-size:0.78rem">
      <span>VWallet v1.0 · Gestor de Gastos Personal · Hecho con Python + FastAPI</span>
    </div>
  `;

  // Guardar perfil
  document.getElementById('ajBtnGuardarPerfil').addEventListener('click', async () => {
    const monedas = { EUR: '€', USD: '$', GBP: '£', MXN: '$' };
    const moneda = document.getElementById('ajMoneda').value;
    const datos = {
      nombre_usuario: document.getElementById('ajNombre').value.trim() || null,
      moneda,
      simbolo_moneda: monedas[moneda] || '€',
      presupuesto_mensual: parseFloat(document.getElementById('ajPresupuesto').value) || null,
    };
    try {
      await API.guardarAjustes(datos);
      showToast('Ajustes guardados correctamente', 'success');
      // Actualizar símbolo global
      window._monedaSimbol = monedas[moneda] || '€';
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  });

  // Exportar
  document.getElementById('ajBtnExportar').addEventListener('click', () => {
    API.exportarDatos();
    showToast('Exportando datos...', 'info');
  });

  // Importar
  document.getElementById('ajArchivoImportar').addEventListener('change', async (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const datos = JSON.parse(ev.target.result);
        const resultado = await API.importarDatos(datos);
        showToast(resultado.mensaje, 'success');
      } catch (err) {
        showToast('Error al importar: ' + err.message, 'error');
      }
      e.target.value = '';
    };
    reader.readAsText(archivo);
  });

  // Borrar todo
  document.getElementById('ajBtnBorrar').addEventListener('click', async () => {
    const confirmacion = prompt('Escribe "BORRAR TODO" para confirmar la eliminación de todos los datos:');
    if (confirmacion !== 'BORRAR TODO') {
      if (confirmacion !== null) showToast('Texto incorrecto. Datos conservados.', 'info');
      return;
    }
    try {
      await API.borrarTodo();
      showToast('Todos los datos han sido eliminados', 'success');
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  });

  // Temas
  document.getElementById('ajTemaOscuro').addEventListener('click', () => {
    setTema('dark');
    document.getElementById('ajTemaOscuro').classList.add('active');
    document.getElementById('ajTemaClaro').classList.remove('active');
  });
  document.getElementById('ajTemaClaro').addEventListener('click', () => {
    setTema('light');
    document.getElementById('ajTemaClaro').classList.add('active');
    document.getElementById('ajTemaOscuro').classList.remove('active');
  });
}
