/**
 * movimientos.js - Sección Nuevo Movimiento
 * Formulario rápido para registrar gastos e ingresos.
 * Nota: usa _categorias definida globalmente en app.js
 */

async function renderMovimientos() {
  const el = document.getElementById('section-movimientos');
  
  // Cargar categorías si no están cargadas
  if (_categorias.length === 0) {
    try { _categorias = await API.getListaCategorias(); } catch (e) { _categorias = []; }
  }

  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Nuevo Movimiento</h1>
      <p class="page-subtitle">Registra un gasto o ingreso rápidamente</p>
    </div>

    <div style="max-width: 560px; margin: 0 auto;">
      <div class="card">
        <!-- Tipo -->
        <div class="tipo-selector" style="margin-bottom: 22px;">
          <button class="tipo-btn active" data-tipo="gasto" id="mvTipoGasto">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
            Gasto
          </button>
          <button class="tipo-btn" data-tipo="ingreso" id="mvTipoIngreso">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
            Ingreso
          </button>
        </div>

        <div class="form-grid">
          <div class="form-group full">
            <label>Nombre / Descripción *</label>
            <input type="text" id="mvNombre" placeholder="ej. Supermercado, Nómina..." autofocus />
          </div>
          <div class="form-group">
            <label>Importe (€) *</label>
            <input type="number" id="mvImporte" placeholder="0.00" step="0.01" min="0.01" />
          </div>
          <div class="form-group">
            <label>Fecha *</label>
            <input type="date" id="mvFecha" />
          </div>
          <div class="form-group full">
            <label>Categoría *</label>
            <select id="mvCategoria"></select>
          </div>
          <div class="form-group full">
            <label>Notas (opcional)</label>
            <textarea id="mvNotas" placeholder="Información adicional..." rows="3"></textarea>
          </div>
        </div>

        <div style="margin-top: 22px; display: flex; gap: 10px; justify-content: flex-end;">
          <button class="btn btn-ghost" id="mvBtnLimpiar">Limpiar</button>
          <button class="btn btn-primary" id="mvBtnGuardar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            Guardar
          </button>
        </div>
      </div>

      <!-- Atajos de categorías más usadas -->
      <div class="card" style="margin-top: 20px;">
        <div class="card-title">Categorías frecuentes</div>
        <div id="mvCategoriasRapidas" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;"></div>
      </div>
    </div>
  `;

  // Inicializar
  let tipoActual = 'gasto';
  document.getElementById('mvFecha').value = hoy();
  _actualizarCategoriasMv(tipoActual);

  // Botones tipo
  document.getElementById('mvTipoGasto').addEventListener('click', () => {
    tipoActual = 'gasto';
    document.getElementById('mvTipoGasto').classList.add('active');
    document.getElementById('mvTipoIngreso').classList.remove('active');
    _actualizarCategoriasMv('gasto');
  });
  document.getElementById('mvTipoIngreso').addEventListener('click', () => {
    tipoActual = 'ingreso';
    document.getElementById('mvTipoIngreso').classList.add('active');
    document.getElementById('mvTipoGasto').classList.remove('active');
    _actualizarCategoriasMv('ingreso');
  });

  // Limpiar
  document.getElementById('mvBtnLimpiar').addEventListener('click', () => {
    document.getElementById('mvNombre').value = '';
    document.getElementById('mvImporte').value = '';
    document.getElementById('mvFecha').value = hoy();
    document.getElementById('mvNotas').value = '';
  });

  // Guardar
  document.getElementById('mvBtnGuardar').addEventListener('click', async () => {
    const datos = {
      tipo: tipoActual,
      nombre: document.getElementById('mvNombre').value.trim(),
      importe: parseFloat(document.getElementById('mvImporte').value),
      fecha: document.getElementById('mvFecha').value,
      categoria: document.getElementById('mvCategoria').value,
      notas: document.getElementById('mvNotas').value.trim(),
    };

    if (!datos.nombre) return showToast('El nombre es obligatorio', 'error');
    if (!datos.importe || datos.importe <= 0) return showToast('El importe debe ser mayor que 0', 'error');
    if (!datos.fecha) return showToast('La fecha es obligatoria', 'error');
    if (!datos.categoria) return showToast('Selecciona una categoría', 'error');

    const btn = document.getElementById('mvBtnGuardar');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
      await API.crearMovimiento(datos);
      showToast(`${tipoActual === 'gasto' ? 'Gasto' : 'Ingreso'} registrado correctamente ✓`, 'success');
      document.getElementById('mvNombre').value = '';
      document.getElementById('mvImporte').value = '';
      document.getElementById('mvNotas').value = '';
      document.getElementById('mvFecha').value = hoy();
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Guardar`;
    }
  });
}

function _actualizarCategoriasMv(tipo) {
  const select = document.getElementById('mvCategoria');
  const rapidas = document.getElementById('mvCategoriasRapidas');
  if (!select) return;

  const filtradas = _categorias.filter(c => c.tipo === tipo || c.tipo === 'ambos');
  select.innerHTML = filtradas.map(c => `<option value="${c.nombre}">${c.icono} ${c.nombre}</option>`).join('');

  // Botones rápidos
  if (rapidas) {
    rapidas.innerHTML = filtradas.slice(0, 8).map(c => `
      <button class="chat-suggestion" onclick="document.getElementById('mvCategoria').value='${c.nombre}'">
        ${c.icono} ${c.nombre}
      </button>
    `).join('');
  }
}
