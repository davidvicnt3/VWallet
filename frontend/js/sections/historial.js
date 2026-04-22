/**
 * historial.js - Sección Historial
 * Lista completa de movimientos con filtros y paginación.
 */

const Historial = {
  pagina: 1,
  porPagina: 20,
  total: 0,
  filtros: {},

  async render() {
    const el = document.getElementById('section-historial');
    let cats = [];
    try { cats = await API.getListaCategorias(); } catch (e) {}

    el.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Historial</h1>
        <p class="page-subtitle">Todos tus movimientos registrados</p>
      </div>

      <!-- Filtros -->
      <div class="filters-bar">
        <div class="search-input-wrap" style="flex:2;min-width:200px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="text" id="fBuscar" placeholder="Buscar por nombre..." />
        </div>
        <div class="filter-group">
          <label>Tipo</label>
          <select id="fTipo">
            <option value="">Todos</option>
            <option value="gasto">Gastos</option>
            <option value="ingreso">Ingresos</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Categoría</label>
          <select id="hCategoria">
            <option value="">Todas</option>
            ${cats.map(c => `<option value="${c.nombre}">${c.nombre}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label>Desde</label>
          <input type="date" id="fDesde" />
        </div>
        <div class="filter-group">
          <label>Hasta</label>
          <input type="date" id="fHasta" />
        </div>
        <button class="btn btn-ghost btn-sm" id="fBtnLimpiar">Limpiar</button>
        <button class="btn btn-primary btn-sm" id="fBtnAplicar">Filtrar</button>
      </div>

      <!-- Tabla -->
      <div id="historialTabla"></div>

      <!-- Paginación -->
      <div class="pagination" id="historialPag"></div>
    `;

    this.pagina = 1;
    this.filtros = {};
    await this._cargar();

    // Eventos
    document.getElementById('fBtnAplicar').addEventListener('click', () => {
      this.pagina = 1;
      this.filtros = {
        buscar: document.getElementById('fBuscar').value.trim() || undefined,
        tipo: document.getElementById('fTipo').value || undefined,
        categoria: document.getElementById('hCategoria').value || undefined,
        fecha_inicio: document.getElementById('fDesde').value || undefined,
        fecha_fin: document.getElementById('fHasta').value || undefined,
      };
      this._cargar();
    });

    document.getElementById('fBuscar').addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('fBtnAplicar').click();
    });

    document.getElementById('fBtnLimpiar').addEventListener('click', () => {
      ['fBuscar','fDesde','fHasta'].forEach(id => document.getElementById(id).value = '');
      ['fTipo','hCategoria'].forEach(id => document.getElementById(id).value = '');
      this.filtros = {};
      this.pagina = 1;
      this._cargar();
    });
  },

  async _cargar() {
    const tablaEl = document.getElementById('historialTabla');
    tablaEl.innerHTML = `<div class="loader"><div class="spinner"></div></div>`;

    try {
      const params = {
        ...this.filtros,
        limite: this.porPagina,
        offset: (this.pagina - 1) * this.porPagina,
      };
      const { movimientos, total } = await API.getMovimientos(params);
      this.total = total;

      if (movimientos.length === 0) {
        tablaEl.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">🗂️</div>
            <h3>Sin movimientos</h3>
            <p>No hay registros que coincidan con los filtros aplicados.</p>
          </div>
        `;
      } else {
        tablaEl.innerHTML = `
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th>Tipo</th>
                  <th style="text-align:right">Importe</th>
                  <th>Notas</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${movimientos.map(m => `
                  <tr data-id="${m.id}">
                    <td class="font-mono" style="font-size:0.8rem;color:var(--text-2)">${formatFecha(m.fecha)}</td>
                    <td style="font-weight:600">${escapeHtml(m.nombre)}</td>
                    <td><span class="tag">${getCategoriaIcon(m.categoria)} ${escapeHtml(m.categoria)}</span></td>
                    <td><span class="badge badge-${m.tipo}">${m.tipo === 'gasto' ? '↓ Gasto' : '↑ Ingreso'}</span></td>
                    <td style="text-align:right" class="${m.tipo === 'gasto' ? 'importe-gasto' : 'importe-ingreso'}">
                      ${m.tipo === 'gasto' ? '-' : '+'}${formatMoney(m.importe)}
                    </td>
                    <td style="color:var(--text-3);font-size:0.8rem;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                      ${escapeHtml(m.notas || '—')}
                    </td>
                    <td>
                      <div class="actions-cell">
                        <button class="btn btn-icon btn-ghost" title="Editar" onclick="Historial._editar(${m.id})">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button class="btn btn-icon btn-danger" title="Eliminar" onclick="Historial._eliminar(${m.id}, this)">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }

      this._renderPaginacion();
    } catch (e) {
      tablaEl.innerHTML = errorMsg(e.message);
    }
  },

  _renderPaginacion() {
    const pagEl = document.getElementById('historialPag');
    const totalPags = Math.ceil(this.total / this.porPagina);
    const inicio = (this.pagina - 1) * this.porPagina + 1;
    const fin = Math.min(this.pagina * this.porPagina, this.total);

    pagEl.innerHTML = `
      <span>${this.total > 0 ? `${inicio}–${fin} de ${this.total} registros` : '0 registros'}</span>
      <div class="pagination-btns">
        <button class="btn btn-ghost btn-sm" ${this.pagina === 1 ? 'disabled' : ''} onclick="Historial._irA(${this.pagina - 1})">← Anterior</button>
        <span style="font-weight:700;color:var(--accent)">${this.pagina} / ${totalPags || 1}</span>
        <button class="btn btn-ghost btn-sm" ${this.pagina >= totalPags ? 'disabled' : ''} onclick="Historial._irA(${this.pagina + 1})">Siguiente →</button>
      </div>
    `;
  },

  async _irA(pag) {
    this.pagina = pag;
    await this._cargar();
    document.getElementById('section-historial').scrollTop = 0;
  },

  async _eliminar(id, btn) {
    if (!confirm('¿Eliminar este movimiento?')) return;
    try {
      await API.eliminarMovimiento(id);
      showToast('Movimiento eliminado', 'success');
      await this._cargar();
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  },

  _editar(id) {
    // Buscar el movimiento en la tabla y abrir modal
    const row = document.querySelector(`tr[data-id="${id}"]`);
    if (!row) return;

    // Cargar datos del movimiento desde la API y abrir modal
    API.getMovimientos({ limite: 1 }).then(() => {
      // Obtener por ID buscando en los datos ya cargados
      _abrirModalEdicion(id);
    });
  },
};

async function _abrirModalEdicion(id) {
  // Obtener el movimiento específico de la fila actual
  try {
    const { movimientos } = await API.getMovimientos({
      limite: 500, offset: 0,
    });
    const mov = movimientos.find(m => m.id === id);
    if (!mov) return showToast('Movimiento no encontrado', 'error');
    abrirModal(mov);
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  }
}

async function renderHistorial() {
  await Historial.render();
}
