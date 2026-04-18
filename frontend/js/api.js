/**
 * api.js - Cliente para comunicarse con el backend de VWallet
 * Todas las llamadas HTTP a la API de Python están aquí.
 */

const API = {
  base: '',  // Mismo origen que el frontend

  async _fetch(url, options = {}) {
    try {
      const res = await fetch(this.base + url, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || 'Error en la petición');
      }
      return await res.json();
    } catch (e) {
      console.error('API Error:', e);
      throw e;
    }
  },

  // ── Movimientos ─────────────────────────────────────────────────────────
  async getMovimientos(params = {}) {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
    ).toString();
    return this._fetch(`/api/movimientos${qs ? '?' + qs : ''}`);
  },

  async crearMovimiento(datos) {
    return this._fetch('/api/movimientos', { method: 'POST', body: JSON.stringify(datos) });
  },

  async actualizarMovimiento(id, datos) {
    return this._fetch(`/api/movimientos/${id}`, { method: 'PUT', body: JSON.stringify(datos) });
  },

  async eliminarMovimiento(id) {
    return this._fetch(`/api/movimientos/${id}`, { method: 'DELETE' });
  },

  // ── Dashboard ────────────────────────────────────────────────────────────
  async getDashboard()       { return this._fetch('/api/dashboard'); },
  async getTendencia(meses)  { return this._fetch(`/api/dashboard/tendencia?meses=${meses}`); },
  async getCategorias()      { return this._fetch('/api/dashboard/categorias'); },

  // ── Análisis ─────────────────────────────────────────────────────────────
  async getAnalisis()        { return this._fetch('/api/analisis'); },

  // ── Categorías ───────────────────────────────────────────────────────────
  async getListaCategorias() { return this._fetch('/api/categorias'); },

  // ── Ajustes ──────────────────────────────────────────────────────────────
  async getAjustes()         { return this._fetch('/api/ajustes'); },
  async guardarAjustes(d)    { return this._fetch('/api/ajustes', { method: 'PUT', body: JSON.stringify(d) }); },
  async exportarDatos()      { window.location.href = '/api/ajustes/exportar'; },

  async importarDatos(datos) {
    return this._fetch('/api/ajustes/importar', { method: 'POST', body: JSON.stringify(datos) });
  },

  async borrarTodo() {
    return this._fetch('/api/ajustes/borrar-todo', { method: 'DELETE' });
  },

  // ── IA ───────────────────────────────────────────────────────────────────
  async chatIA(mensaje, apiKey, historial = []) {
    return this._fetch('/api/ia/chat', {
      method: 'POST',
      body: JSON.stringify({ mensaje, api_key: apiKey, historial }),
    });
  },
};
