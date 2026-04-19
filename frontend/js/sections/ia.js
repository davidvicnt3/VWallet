/**
 * ia.js - Sección Asistente IA
 * Chat con Groq para consejos financieros personalizados.
 */

const IA = {
  historial: [],
  apiKey: '',
  cargando: false,

  async render() {
    const el = document.getElementById('section-ia');

    // Cargar API key guardada
    try {
      const ajustes = await API.getAjustes();
      this.apiKey = ajustes.grok_api_key || '';
    } catch (e) {
      this.apiKey = '';
    }

    el.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Asistente IA</h1>
        <p class="page-subtitle">Tu asesor financiero personal con IA</p>
      </div>

      <div class="chat-wrapper">

        <!-- Banner API Key -->
        <div class="api-key-banner" id="iaBanner">
          <div class="banner-icon">🔑</div>
          <div class="banner-text">
            <strong>Groq API Key (gratuita)</strong>
            <span>Obtén tu clave gratis en <a href="https://console.groq.com" target="_blank" style="color:var(--accent)">console.groq.com</a> → API Keys</span>
          </div>
          <div class="banner-input">
            <input type="password" id="iaApiKey" placeholder="gsk_..." value="${escapeHtml(this.apiKey)}" />
            <button class="btn btn-primary btn-sm" id="iaBtnGuardarKey">Guardar</button>
          </div>
        </div>

        <!-- Mensajes del chat -->
        <div class="chat-messages" id="chatMessages">
          <div class="chat-empty" id="chatEmpty">
            <div class="chat-empty-icon">🤖</div>
            <h3>Hola, soy VBot</h3>
            <p>Tu asistente financiero personal. Pregúntame sobre tus gastos, cómo ahorrar más o cualquier duda financiera.</p>
            <div class="chat-suggestions">
              <button class="chat-suggestion" onclick="IA.enviarSugerencia(this)">¿Cómo puedo ahorrar más este mes?</button>
              <button class="chat-suggestion" onclick="IA.enviarSugerencia(this)">Analiza mis gastos por categoría</button>
              <button class="chat-suggestion" onclick="IA.enviarSugerencia(this)">¿En qué gasto demasiado?</button>
              <button class="chat-suggestion" onclick="IA.enviarSugerencia(this)">Dame consejos de finanzas personales</button>
            </div>
          </div>
        </div>

        <!-- Barra de entrada -->
        <div class="chat-input-bar">
          <textarea id="iaInput" placeholder="${this.apiKey ? 'Escribe tu mensaje...' : 'Guarda tu API Key de Grok para chatear'}" rows="1"
            ${!this.apiKey ? 'disabled' : ''}></textarea>
          <button class="chat-send-btn" id="iaBtnEnviar" ${!this.apiKey ? 'disabled' : ''} title="Enviar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>

      </div>
    `;

    // Guardar API Key
    document.getElementById('iaBtnGuardarKey').addEventListener('click', async () => {
      const key = document.getElementById('iaApiKey').value.trim();
      this.apiKey = key;
      try {
        await API.guardarAjustes({ grok_api_key: key });
        showToast('API Key guardada correctamente', 'success');
        document.getElementById('iaInput').disabled = !key;
        document.getElementById('iaBtnEnviar').disabled = !key;
        if (key) document.getElementById('iaInput').placeholder = 'Escribe tu mensaje...';
      } catch (e) {
        showToast('Error al guardar: ' + e.message, 'error');
      }
    });

    // Enviar mensaje con Enter (Shift+Enter para nueva línea)
    document.getElementById('iaInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this._enviar();
      }
    });

    document.getElementById('iaBtnEnviar').addEventListener('click', () => this._enviar());

    // Auto-resize textarea
    document.getElementById('iaInput').addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
  },

  enviarSugerencia(btn) {
    const texto = btn.textContent.trim();
    const input = document.getElementById('iaInput');
    if (!input || input.disabled) {
      showToast('Guarda tu API Key de Grok primero', 'info');
      document.getElementById('iaApiKey')?.focus();
      return;
    }
    input.value = texto;
    this._enviar();
  },

  async _enviar() {
    const input = document.getElementById('iaInput');
    const mensaje = input?.value?.trim();
    if (!mensaje || this.cargando) return;

    if (!this.apiKey) {
      showToast('Introduce y guarda tu API Key de Grok', 'info');
      return;
    }

    // Ocultar empty state
    const emptyEl = document.getElementById('chatEmpty');
    if (emptyEl) emptyEl.remove();

    // Agregar mensaje del usuario
    this._agregarMensaje('user', mensaje);
    input.value = '';
    input.style.height = 'auto';
    this.cargando = true;

    // Mostrar indicador de carga
    const loadingId = 'loading-' + Date.now();
    this._agregarLoading(loadingId);

    try {
      const respuesta = await API.chatIA(mensaje, this.apiKey, this.historial);

      // Eliminar loading
      document.getElementById(loadingId)?.remove();

      // Agregar respuesta
      this._agregarMensaje('assistant', respuesta.respuesta);

      // Actualizar historial
      this.historial.push({ role: 'user', content: mensaje });
      this.historial.push({ role: 'assistant', content: respuesta.respuesta });

      // Mantener historial manejable (últimas 20 entradas = 10 intercambios)
      if (this.historial.length > 20) this.historial = this.historial.slice(-20);

    } catch (e) {
      document.getElementById(loadingId)?.remove();
      const msg = e.message.includes('inválida') || e.message.includes('401')
        ? '❌ API Key inválida. Verifica tu clave de Grok.'
        : '❌ Error: ' + e.message;
      this._agregarMensaje('assistant', msg);
    } finally {
      this.cargando = false;
    }
  },

  _agregarMensaje(role, contenido) {
    const container = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = `chat-msg ${role}`;
    div.innerHTML = `
      <div class="chat-avatar">${role === 'user' ? '👤' : '🤖'}</div>
      <div class="chat-bubble">${this._formatearTexto(contenido)}</div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  },

  _agregarLoading(id) {
    const container = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = 'chat-msg assistant chat-loading';
    div.id = id;
    div.innerHTML = `
      <div class="chat-avatar">🤖</div>
      <div class="chat-bubble">
        <div class="chat-dot"></div>
        <div class="chat-dot"></div>
        <div class="chat-dot"></div>
      </div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  },

  _formatearTexto(texto) {
    // Formateo básico de markdown
    return escapeHtml(texto)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code style="font-family:var(--font-mono);background:var(--bg-3);padding:1px 5px;border-radius:4px">$1</code>')
      .replace(/\n/g, '<br>');
  },
};

async function renderIA() {
  await IA.render();
}
