/**
 * app.js - Lógica principal de la aplicación VWallet
 * Navegación, modal, utilidades globales y arranque.
 */

// Estado global
let _seccionActual = 'dashboard';
let _categorias = [];
let _editandoId = null;
window._monedaSimbol = '€';

// Navegación
const SECCIONES = {
  dashboard:    { titulo: 'Dashboard',      render: renderDashboard },
  movimientos:  { titulo: 'Movimientos',    render: renderMovimientos },
  historial:    { titulo: 'Historial',      render: renderHistorial },
  analisis:     { titulo: 'Análisis',       render: renderAnalisis },
  ia:           { titulo: 'Asistente IA',   render: renderIA },
  ajustes:      { titulo: 'Ajustes',        render: renderAjustes },
};

async function irA(seccion) {
  if (!SECCIONES[seccion]) return;

  // Ocultar todas las secciones
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Mostrar la sección destino
  document.getElementById(`section-${seccion}`).classList.add('active');
  document.querySelector(`.nav-item[data-section="${seccion}"]`)?.classList.add('active');
  document.getElementById('topbarTitle').textContent = SECCIONES[seccion].titulo;

  _seccionActual = seccion;

  // Destruir gráficos anteriores para evitar conflictos
  Charts.destroyAll();

  // Renderizar contenido
  try {
    await SECCIONES[seccion].render();
  } catch (e) {
    console.error('Error al renderizar sección:', e);
  }

  // Cerrar sidebar en mobile
  document.getElementById('sidebar').classList.remove('mobile-open');
}

// Sidebar
function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const main    = document.getElementById('mainContent');
  const toggle  = document.getElementById('sidebarToggle');
  const mobileBtn = document.getElementById('mobileMenuBtn');

  // Sidebar siempre desplegado al iniciar
  localStorage.removeItem('sidebarCollapsed');

  toggle.addEventListener('click', () => {
    const isCollapsed = sidebar.classList.toggle('collapsed');
    main.classList.toggle('sidebar-collapsed', isCollapsed);
    localStorage.setItem('sidebarCollapsed', isCollapsed);
    // ResizeObserver se encarga del resize (ver initSidebar)
  });

  mobileBtn.addEventListener('click', () => {
    sidebar.classList.toggle('mobile-open');
  });

  // Cerrar sidebar al hacer clic fuera (mobile)
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 640 &&
        !sidebar.contains(e.target) &&
        !mobileBtn.contains(e.target)) {
      sidebar.classList.remove('mobile-open');
    }
  });

  // Navegación
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      irA(item.dataset.section);
    });
  });

  // ResizeObserver: redimensiona gráficos cuando el contenedor cambia de ancho
  // Cubre sidebar toggle, resize de ventana y cualquier otro cambio de layout
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => {
      Object.values(Charts._instances).forEach(chart => {
        if (chart && chart.canvas) chart.resize();
      });
    });
    ro.observe(main);
  }
}

// Tema claro/oscuro
function setTema(tema) {
  document.documentElement.setAttribute('data-theme', tema);
  localStorage.setItem('tema', tema);
  Charts.updateTheme();
  API.guardarAjustes({ tema }).catch(() => {});
}

function initTema() {
  // Prioridad: localStorage > ajustes guardados > dark
  const guardado = localStorage.getItem('tema') || 'dark';
  document.documentElement.setAttribute('data-theme', guardado);

  document.getElementById('themeToggle').addEventListener('click', () => {
    const actual = document.documentElement.getAttribute('data-theme');
    setTema(actual === 'dark' ? 'light' : 'dark');
  });
}

// Modal de Movimiento (crear / editar)
function initModal() {
  const overlay = document.getElementById('modalOverlay');
  const cerrar  = () => {
    overlay.classList.remove('open');
    _editandoId = null;
  };

  document.getElementById('modalClose').addEventListener('click', cerrar);
  document.getElementById('btnCancelar').addEventListener('click', cerrar);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(); });

  // Tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) cerrar();
  });

  // Tipo gasto/ingreso - usar delegación de eventos para evitar problemas con re-renders
  // Solo reaccionar a los botones de tipo dentro del .tipo-selector del modal
  document.querySelector('#modal .tipo-selector').addEventListener('click', (e) => {
    const btn = e.target.closest('.tipo-btn');
    if (!btn) return;
    setTipoModal(btn.dataset.tipo);
  });

  // Guardar
  document.getElementById('btnGuardar').addEventListener('click', guardarMovimiento);
}

function setTipoModal(tipo) {
  document.getElementById('btnTipoGasto').classList.toggle('active', tipo === 'gasto');
  document.getElementById('btnTipoIngreso').classList.toggle('active', tipo === 'ingreso');
  _actualizarCategoriasModal(tipo);
}

function _actualizarCategoriasModal(tipo) {
  const sel = document.getElementById('fCategoria');
  const filtradas = _categorias.filter(c => c.tipo === tipo || c.tipo === 'ambos');
  sel.innerHTML = filtradas.map(c => `<option value="${c.nombre}">${c.icono} ${c.nombre}</option>`).join('');
}

async function abrirModal(movimiento = null) {
  // Garantizar que _categorias está cargado ANTES de abrir el modal
  if (_categorias.length === 0) {
    try { _categorias = await API.getListaCategorias(); } catch (e) {}
  }

  const overlay = document.getElementById('modalOverlay');
  document.getElementById('modalTitle').textContent = movimiento ? 'Editar Movimiento' : 'Nuevo Movimiento';

  // Rellenar formulario
  const tipo = movimiento?.tipo || 'gasto';
  setTipoModal(tipo);
  document.getElementById('fNombre').value   = movimiento?.nombre  || '';
  document.getElementById('fImporte').value  = movimiento?.importe || '';
  document.getElementById('fFecha').value    = movimiento?.fecha   || hoy();
  document.getElementById('fNotas').value    = movimiento?.notas   || '';

  if (movimiento) {
    _editandoId = movimiento.id;
    setTimeout(() => {
      document.getElementById('fCategoria').value = movimiento.categoria;
    }, 50);
  } else {
    _editandoId = null;
  }

  overlay.classList.add('open');
  setTimeout(() => document.getElementById('fNombre').focus(), 100);
}

async function guardarMovimiento() {
  const tipo = document.getElementById('btnTipoGasto').classList.contains('active') ? 'gasto' : 'ingreso';
  const datos = {
    tipo,
    nombre:    document.getElementById('fNombre').value.trim(),
    importe:   parseFloat(document.getElementById('fImporte').value),
    fecha:     document.getElementById('fFecha').value,
    categoria: document.getElementById('fCategoria').value,
    notas:     document.getElementById('fNotas').value.trim(),
  };

  if (!datos.nombre)   return showToast('El nombre es obligatorio', 'error');
  if (!datos.importe || datos.importe <= 0) return showToast('Introduce un importe válido', 'error');
  if (!datos.fecha)    return showToast('La fecha es obligatoria', 'error');

  const btn = document.getElementById('btnGuardar');
  btn.disabled = true;
  btn.textContent = 'Guardando...';

  try {
    if (_editandoId) {
      await API.actualizarMovimiento(_editandoId, datos);
      showToast('Movimiento actualizado ✓', 'success');
    } else {
      await API.crearMovimiento(datos);
      showToast(`${tipo === 'gasto' ? 'Gasto' : 'Ingreso'} registrado ✓`, 'success');
    }

    document.getElementById('modalOverlay').classList.remove('open');
    _editandoId = null;

    // Refrescar la sección actual
    await SECCIONES[_seccionActual]?.render();
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Guardar';
  }
}

// Botón FAB de nueva transacción (barra superior)
document.getElementById('btnNuevoMovimiento').addEventListener('click', () => {
  abrirModal(null);
});

// Utilidades globales

/** Formatea un número como moneda */
function formatMoney(valor) {
  const simbolo = window._monedaSimbol || '€';
  if (valor == null || isNaN(valor)) return `0${simbolo}`;
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor) + simbolo;
}

function hoy() { return new Date().toISOString().split('T')[0]; } // fecha hoy en YYYY-MM-DD

function formatFecha(s) {
  // "2025-04-15" → "15 abr. 2025"
  if (!s) return '—';
  return new Date(s + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatMes(mesStr) {
  // "2025-04" → "Abr 25"
  if (!mesStr) return '';
  const [y, m] = mesStr.split('-');
  return new Date(+y, +m-1, 1).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
}

function escapeHtml(str) {
  // Evita inyección de HTML convirtiendo caracteres especiales en entidades
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/** Devuelve un emoji/icono para cada categoría */
function getCategoriaIcon(categoria) {
  const iconos = {
    'Alimentación': '🛒', 'Transporte': '🚗', 'Vivienda': '🏠',
    'Salud': '❤️', 'Educación': '📚', 'Ocio': '🎮', 'Ropa': '👗',
    'Tecnología': '💻', 'Restaurantes': '🍽️', 'Suscripciones': '📱',
    'Viajes': '✈️', 'Salario': '💼', 'Freelance': '💡',
    'Inversiones': '📈', 'Alquiler': '🏘️', 'Otros gastos': '📦',
    'Otros ingresos': '💵',
  };
  // Buscar en categorías cargadas
  const cat = _categorias.find(c => c.nombre === categoria);
  return cat?.icono || iconos[categoria] || '💰';
}

function showToast(mensaje, tipo = 'info') {
  // Muestra una notificación flotante que desaparece sola a los 3.5s
  const iconos = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = Object.assign(document.createElement('div'), {
    className: `toast ${tipo}`,
    innerHTML: `<span class="toast-icon">${iconos[tipo]}</span><span>${escapeHtml(mensaje)}</span>`,
  });
  document.getElementById('toastContainer').appendChild(toast);
  setTimeout(() => {
    Object.assign(toast.style, { opacity: '0', transform: 'translateX(40px)', transition: 'all 0.3s ease' });
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function errorMsg(msg) {
  return `<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>Error de conexión</h3><p>${escapeHtml(msg)}</p></div>`;
}

// Arranque
async function init() {
  // Inicializar UI
  initTema();
  initSidebar();
  initModal();

  // Cargar categorías globales para el modal
  try {
    _categorias = await API.getListaCategorias();
    _actualizarCategoriasModal('gasto');

    // Cargar ajustes guardados (moneda, etc.)
    const ajustes = await API.getAjustes();
    if (ajustes.simbolo_moneda) window._monedaSimbol = ajustes.simbolo_moneda;
    if (ajustes.tema) {
      document.documentElement.setAttribute('data-theme', ajustes.tema);
      localStorage.setItem('tema', ajustes.tema);
    }
  } catch (e) {
    console.warn('No se pudieron cargar categorías:', e);
  }

  // Cargar sección inicial
  await irA('dashboard');
}

// Arrancar la app cuando el HTML esté cargado
document.addEventListener('DOMContentLoaded', init);
