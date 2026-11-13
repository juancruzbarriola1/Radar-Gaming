/* Radar Gaming: lógica del tablero.
   Todo el contenido sale de data/indice.json, data/ediciones/*.json,
   data/referencias.json y data/tendencias.json.
   Ningún texto de noticias ni de tendencias está escrito acá: solo rótulos de la interfaz. */
(function () {
  'use strict';

  // ---------- Catálogos de la interfaz (rótulos, no datos) ----------
  var TEMAS = {
    cloud_gaming: { nombre: 'Cloud gaming', icono: '<path d="M7 18h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.4 1.5A3.3 3.3 0 0 0 7 18z"/>' },
    digitalizacion: { nombre: 'Digitalización', icono: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>' },
    ia_clonacion_pirateria: { nombre: 'IA, clonación y piratería', icono: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 4H6a2 2 0 0 0-2 2v10"/>' },
    ia_desarrollo: { nombre: 'IA en desarrollo', icono: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><circle cx="12" cy="12" r="4"/>' },
    regulacion_pi: { nombre: 'Regulación y PI', icono: '<path d="M12 4v16M5 8h14M7 8l-3 7h6zM17 8l-3 7h6z"/>' },
    mercado: { nombre: 'Mercado', icono: '<path d="M4 18l6-6 4 4 6-8M15 8h5v5"/>' }
  };
  var ORDEN_TEMAS = Object.keys(TEMAS);
  var HORIZONTES = {
    promedio_actual: { nombre: 'Promedio actual', plazo: 'Hoy', desc: 'Lo que la mayoría de las empresas ya hace.' },
    corto: { nombre: 'Corto plazo', plazo: '0–1 años', desc: 'Adopción temprana.' },
    mediano: { nombre: 'Mediano plazo', plazo: '1–3 años', desc: 'Camino a ser el nuevo estándar.' },
    largo: { nombre: 'Largo plazo', plazo: '3+ años', desc: 'Disruptivo, experimental.' }
  };
  var ESTADOS = {
    ok: { nombre: 'Respondió', icono: '✓' },
    sin_novedades: { nombre: 'Sin novedades', icono: '–' },
    bloqueada: { nombre: 'Bloqueada', icono: '✕' },
    requiere_js: { nombre: 'Requiere JavaScript', icono: '!' },
    manual: { nombre: 'Carga manual', icono: '✎' }
  };
  var FASES = { disparador: 'Disparador', pico: 'Pico de expectativas', abismo: 'Desilusión', pendiente: 'Pendiente de aprendizaje', meseta: 'Meseta de productividad' };
  var CUADRANTES = { estrella: 'Estrella', interrogante: 'Interrogante', vaca_lechera: 'Vaca lechera', perro: 'Perro' };
  var TIPOS = { noticia: 'Noticia', analisis: 'Análisis', reporte: 'Reporte', encuesta: 'Encuesta', opinion: 'Opinión' };
  var EVIDENCIAS = {
    dato_medido: { nombre: 'Dato medido', insignia: null },
    pronostico: { nombre: 'Pronóstico', insignia: 'Pronóstico' },
    opinion: { nombre: 'Opinión', insignia: 'Opinión' },
    especulacion: { nombre: 'Especulación', insignia: 'Especulativa' }
  };
  var CERTEZAS = { alta: 'Alta', media: 'Media', baja: 'Baja' };
  var TIPOS_DOC = {
    prensa_datos: 'Nota con datos', reporte: 'Reporte', paper: 'Paper', analisis: 'Análisis',
    opinion_experta: 'Opinión experta', analisis_legal: 'Análisis legal',
    posicionamiento_industria: 'Posición de la industria', secundaria: 'Fuente secundaria'
  };
  var GEOGRAFIAS = { global: 'Global', latam: 'Latinoamérica' };
  // Los 4 perfiles son fijos (CLAUDE.md).
  var PERFILES = {
    indie: { nombre: 'Estudio indie', corto: 'Indie', articulo: 'un estudio indie', desc: 'Estudio chico o independiente, con pocos recursos y audiencia propia limitada.' },
    publisher_aaa: { nombre: 'Publisher / AAA', corto: 'Publisher / AAA', articulo: 'un publisher o estudio AAA', desc: 'Editor o estudio de grandes lanzamientos, con catálogo propio y presupuesto alto.' },
    plataforma_distribuidor: { nombre: 'Plataforma o distribuidor', corto: 'Plataforma', articulo: 'una plataforma o distribuidor', desc: 'Tiendas, consolas, servicios de nube y suscripción, o distribuidores.' },
    latam: { nombre: 'Empresa con foco Latam', corto: 'Foco Latam', articulo: 'una empresa con foco en Latinoamérica', desc: 'Empresa cuyo mercado principal es Latinoamérica: mira la brecha regional.' }
  };
  var ORDEN_PERFILES = Object.keys(PERFILES);
  var URGENCIAS = {
    ahora: { nombre: 'Ahora', desc: 'Actuar este trimestre.', icono: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>' },
    preparar: { nombre: 'Preparar', desc: 'Planificar en los próximos 6 a 12 meses.', icono: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>' },
    vigilar: { nombre: 'Vigilar', desc: 'Seguir la evidencia sin comprometer recursos.', icono: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>' }
  };
  var ORDEN_URGENCIA = { ahora: 0, preparar: 1, vigilar: 2 };
  var POSICIONES = {
    atrasada: { nombre: 'Atrasada', icono: '◀', desc: 'La demanda, el riesgo o la regulación van por delante de la respuesta de la industria.' },
    en_linea: { nombre: 'En línea', icono: '＝', desc: 'Oferta y demanda avanzan a la par.' },
    adelantada: { nombre: 'Adelantada', icono: '▶', desc: 'La oferta de la industria va por delante de la demanda o de la regulación.' }
  };
  var AYUDA_POSICION = 'Adelantada: la oferta de la industria va por delante de la demanda o de la regulación. ' +
    'En línea: oferta y demanda avanzan a la par. ' +
    'Atrasada: la demanda, el riesgo o la regulación van por delante de la respuesta de la industria.';
  var INVERSIONES = { baja: 'Baja', media: 'Media', alta: 'Alta', sin_dato: 'Sin dato' };
  var SIN_DATO = 'sin dato';
  var ICONO_EXTERNO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>';
  var CLAVE_PERFIL = 'rg-perfil';

  // ---------- Estado ----------
  var estado = {
    indice: [],          // entradas del índice, ordenadas de más nueva a más vieja
    ediciones: {},       // fecha -> edición cargada (o null si falló)
    actual: null,        // edición seleccionada
    todas: [],           // noticias de todas las ediciones + referencias (Evidencia)
    referencias: [],     // biblioteca de referencias (data/referencias.json)
    refsMeta: null,
    refsError: null,
    tendencias: [],      // capa de tendencias (data/tendencias.json)
    tendMeta: null,      // { actualizado } o null si el archivo no existe
    tendError: null,
    pertenencia: {},     // clave de evidencia -> [ids de tendencia]
    perfil: 'indie',
    graficos: {},
    ultimoFoco: null,
    volverA: null        // id de tendencia para volver desde el detalle de una evidencia
  };

  // ---------- Utilidades ----------
  var $ = function (sel) { return document.querySelector(sel); };
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function vacio(v) { return v === null || v === undefined || (typeof v === 'string' && v.trim() === ''); }
  function sd() { return '<span class="sin-dato">' + SIN_DATO + '</span>'; }
  function texto(v) { return vacio(v) ? sd() : esc(v); }
  function num(v) { return typeof v === 'number' && isFinite(v) ? v : null; }
  function lista(v) { return Array.isArray(v) ? v : []; }
  function urlSegura(u) { return typeof u === 'string' && /^https?:\/\//i.test(u) ? u : null; }
  function parseFecha(s) {
    if (typeof s !== 'string') return null;
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }
  var fmtLarga = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric' });
  var fmtCorta = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' });
  function fecha(s, corta) { var d = parseFecha(s); return d ? (corta ? fmtCorta : fmtLarga).format(d) : SIN_DATO; }
  function fmtNum(n, dec) { return n == null ? SIN_DATO : n.toLocaleString('es', { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 }); }
  function promedio(vals) {
    var v = vals.filter(function (x) { return x != null; });
    if (!v.length) return null;
    return v.reduce(function (a, b) { return a + b; }, 0) / v.length;
  }
  function css(nombre) { return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim(); }
  function temaInfo(t) { return TEMAS[t] || { nombre: vacio(t) ? 'Sin tema' : String(t), icono: '<circle cx="12" cy="12" r="3"/>' }; }
  function horizonteInfo(h) { return HORIZONTES[h] || { nombre: vacio(h) ? SIN_DATO : String(h), plazo: '', desc: '' }; }
  function plural(n, s, p) { return n + ' ' + (n === 1 ? s : p); }
  function marcaCerteza(c) { return CERTEZAS[c] ? '<i class="punto-certeza punto-certeza--' + c + '" aria-hidden="true"></i>' : ''; }
  function svg(path, clase) { return '<svg class="' + (clase || 'ico') + '" viewBox="0 0 24 24" aria-hidden="true">' + path + '</svg>'; }

  function chipTema(t) {
    var info = temaInfo(t);
    var color = TEMAS[t] ? 'var(--t-' + t + ')' : 'var(--tinta-suave)';
    return '<span class="tema" style="--c:' + color + '"><span class="tema__icono"><svg viewBox="0 0 24 24" aria-hidden="true">' +
      info.icono + '</svg></span><span class="tema__texto">' + esc(info.nombre) + '</span></span>';
  }
  function enlaceFuente(nombre, url, rotulo) {
    var u = urlSegura(url);
    if (!u) return texto(nombre) + ' <span class="sin-dato">(sin enlace)</span>';
    return '<a class="enlace-fuente" href="' + esc(u) + '" target="_blank" rel="noopener noreferrer" data-no-abrir>' + esc(rotulo || nombre || 'Fuente') + ICONO_EXTERNO + '</a>';
  }
  function puntos(valor, max, etiqueta) {
    var v = num(valor);
    if (v == null) return sd();
    var s = '<span class="puntos" role="img" aria-label="' + esc(etiqueta || '') + ' ' + v + ' de ' + max + '" title="' + esc(etiqueta || '') + ' ' + v + ' de ' + max + '">';
    for (var i = 1; i <= max; i++) s += '<i class="' + (i <= v ? 'lleno' : '') + '"></i>';
    return s + '</span>';
  }
  function medidor(valor, max, color) {
    var v = num(valor);
    if (v == null) return sd();
    var s = '<span class="medidor" role="img" aria-label="' + v + ' de ' + max + '"><span class="medidor__barras" style="--c:' + (color || 'var(--acento)') + '">';
    for (var i = 1; i <= max; i++) s += '<i class="' + (i <= Math.round(v) ? 'lleno' : '') + '"></i>';
    return s + '</span><span class="medidor__num">' + fmtNum(v, v % 1 ? 1 : 0) + '</span></span>';
  }
  function insigniaVerificada(n) {
    if (n.verificada === true) return '<span class="insignia insignia--ok">✓ Verificada</span>';
    return '<span class="insignia insignia--no">⚠ Sin verificar</span>';
  }
  function clave(n) { return (n._ref ? 'ref' : n._edicion) + '/' + n.id; }
  function esRef(n) { return !!(n && n._ref); }
  function refsOk() { return estado.referencias.filter(function (r) { return r.estado === 'ok'; }); }
  function insigniaRef(n) {
    return '<span class="insignia insignia--ref" title="Referencia de la biblioteca: fuera de la ventana semanal">Referencia · ' +
      (vacio(n.fecha_publicacion) ? 'sin fecha' : esc(fecha(n.fecha_publicacion, true))) + '</span>';
  }
  function insigniaEvidencia(n) {
    var e = EVIDENCIAS[n.tipo_evidencia];
    if (!e || !e.insignia) return '';
    return '<span class="insignia insignia--evidencia insignia--' + esc(n.tipo_evidencia) + '" title="Tipo de evidencia: ' + esc(e.nombre) +
      (n.certeza ? ' · certeza ' + esc(CERTEZAS[n.certeza] || n.certeza) : '') + '">' + esc(e.insignia) + '</span>';
  }
  function insigniaCerteza(n) {
    if (!CERTEZAS[n.certeza]) return '<span class="insignia">Certeza: ' + SIN_DATO + '</span>';
    return '<span class="insignia insignia--certeza insignia--certeza-' + esc(n.certeza) + '" title="Certeza ' + esc(CERTEZAS[n.certeza].toLowerCase()) + '">' +
      marcaCerteza(n.certeza) + ' Certeza ' + esc(CERTEZAS[n.certeza].toLowerCase()) + '</span>';
  }
  function chipUrgencia(u, grande) {
    var info = URGENCIAS[u];
    if (!info) return '<span class="urgencia urgencia--sin">Urgencia: ' + SIN_DATO + '</span>';
    return '<span class="urgencia urgencia--' + u + (grande ? ' urgencia--grande' : '') + '">' + svg(info.icono) + esc(info.nombre) + '</span>';
  }
  // Ícono de ayuda junto a la posición: "adelantada" no significa "mejor".
  function ayudaPosicion() {
    return '<span class="ayuda" role="img" tabindex="-1" title="' + esc(AYUDA_POSICION) + '" aria-label="' + esc(AYUDA_POSICION) + '" data-tip="' + esc(AYUDA_POSICION) + '">?</span>';
  }
  function chipPosicion(p, sinAyuda) {
    var info = POSICIONES[p];
    if (!info) return '<span class="posicion">Posición: ' + SIN_DATO + '</span>';
    return '<span class="posicion-grupo"><span class="posicion posicion--' + p + '" title="Posición de la industria: ' + esc(info.desc) + '"><span aria-hidden="true">' + info.icono + '</span> ' + esc(info.nombre) + '</span>' +
      (sinAyuda ? '' : ayudaPosicion()) + '</span>';
  }
  function geoNombre(g) { return vacio(g) ? SIN_DATO : (GEOGRAFIAS[g] || String(g)); }
  function normalizar(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

  // ---------- Carga de datos ----------
  function cargarJSON(ruta) {
    return fetch(ruta, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' en ' + ruta);
      return r.json();
    });
  }
  function aviso(html, tipo) {
    $('#aviso').insertAdjacentHTML('beforeend', '<div class="aviso-caja' + (tipo === 'error' ? ' aviso-caja--error' : '') + '">' + html + '</div>');
  }

  function iniciar() {
    configurarTema();
    configurarPerfil();
    configurarCajon();
    configurarNavegacion();
    configurarRevelado();
    renderDefiniciones();

    cargarJSON('data/indice.json').then(function (idx) {
      estado.indice = lista(idx && idx.ediciones).filter(function (e) { return e && e.archivo; })
        .sort(function (a, b) { return String(b.fecha || '').localeCompare(String(a.fecha || '')); });
      if (!estado.indice.length) {
        $('#ventana').textContent = 'Todavía no hay ediciones publicadas.';
        return;
      }
      poblarSelector();
      return Promise.all(estado.indice.map(function (e) {
        return cargarJSON(e.archivo).then(function (d) { d._fecha = e.fecha; estado.ediciones[e.fecha] = d; })
          .catch(function (err) {
            estado.ediciones[e.fecha] = null;
            aviso('No se pudo cargar la edición del ' + esc(fecha(e.fecha)) + ' (' + esc(e.archivo) + '): ' + esc(err.message));
          });
      })).then(function () {
        Array.prototype.forEach.call($('#selector-edicion').options, function (o) {
          if (!estado.ediciones[o.value]) { o.disabled = true; o.textContent += ' (no disponible)'; }
        });
        return Promise.all([cargarReferencias(), cargarTendencias()]);
      }).then(function () {
        calcularPertenencia();
        armarEvidencia();
        var inicial = estado.indice.find(function (e) { return e.fecha === new URLSearchParams(location.search).get('edicion') && estado.ediciones[e.fecha]; }) ||
          estado.indice.find(function (e) { return estado.ediciones[e.fecha]; });
        if (!inicial) { $('#ventana').textContent = 'No se pudo cargar ninguna edición.'; return; }
        seleccionarEdicion(inicial.fecha, false);
        abrirDesdeHash();
      });
    }).catch(function (err) {
      $('#ventana').textContent = 'No se pudieron cargar los datos.';
      var extra = location.protocol === 'file:' ? ' Abrí el tablero con un servidor local (por ejemplo, <code>python -m http.server</code>) en lugar de hacer doble clic en el archivo.' : '';
      aviso('Error al leer <code>data/indice.json</code>: ' + esc(err.message) + '.' + extra, 'error');
    });
  }

  // La biblioteca y las tendencias son opcionales: si faltan, el tablero lo explica y sigue.
  function cargarReferencias() {
    return cargarJSON('data/referencias.json').then(function (d) {
      estado.refsMeta = { actualizado: d && d.actualizado };
      estado.referencias = lista(d && d.referencias).filter(function (r) { return r && typeof r === 'object' && !vacio(r.id); });
      estado.referencias.forEach(function (r) { Object.defineProperty(r, '_ref', { value: true, enumerable: false }); });
    }).catch(function (err) { estado.referencias = []; estado.refsMeta = null; estado.refsError = err.message; });
  }
  function cargarTendencias() {
    return cargarJSON('data/tendencias.json').then(function (d) {
      estado.tendMeta = { actualizado: d && d.actualizado };
      estado.tendencias = lista(d && d.tendencias).filter(function (t) { return t && typeof t === 'object' && !vacio(t.id); });
    }).catch(function (err) { estado.tendencias = []; estado.tendMeta = null; estado.tendError = err.message; });
  }
  function hayTendencias() { return estado.tendencias.length > 0; }
  function tendencia(id) { return estado.tendencias.find(function (t) { return t.id === id; }) || null; }

  // Cada ítem de evidencia sabe a qué tendencias respalda (por la lista de evidencia y por su tendencia_id).
  function calcularPertenencia() {
    var p = {};
    function sumar(k, tid) { (p[k] = p[k] || []); if (p[k].indexOf(tid) < 0) p[k].push(tid); }
    estado.tendencias.forEach(function (t) {
      lista(t.evidencia).forEach(function (e) {
        if (!e) return;
        sumar(e.tipo === 'referencia' ? 'ref/' + e.id : e.edicion + '/' + e.id, t.id);
      });
    });
    Object.keys(estado.ediciones).forEach(function (f) {
      var d = estado.ediciones[f];
      if (!d) return;
      noticiasDe(d).forEach(function (n) { if (!vacio(n.tendencia_id) && tendencia(n.tendencia_id)) sumar(clave(n), n.tendencia_id); });
    });
    estado.pertenencia = p;
  }
  function tendenciasDe(n) { return (estado.pertenencia[clave(n)] || []).map(tendencia).filter(Boolean); }

  // Evidencia resuelta de una tendencia: [{e, item}] (item null si no se encuentra).
  function evidenciaDe(t) {
    return lista(t.evidencia).filter(Boolean).map(function (e) {
      var item = null;
      if (e.tipo === 'referencia') item = estado.referencias.find(function (r) { return r.id === e.id; }) || null;
      else if (estado.ediciones[e.edicion]) item = noticiasDe(estado.ediciones[e.edicion]).find(function (n) { return n.id === e.id; }) || null;
      return { e: e, item: item };
    });
  }
  function nEvidenciaLatam(t) {
    return evidenciaDe(t).filter(function (x) {
      var n = x.item;
      return n && (num(n.brecha_latam) != null || num(n.adopcion_latam) != null || n.geografia === 'latam');
    }).length;
  }

  function poblarSelector() {
    var sel = $('#selector-edicion');
    sel.innerHTML = estado.indice.map(function (e) {
      var rot = (e.numero != null ? 'N.º ' + e.numero + ' · ' : '') + fecha(e.fecha, true);
      return '<option value="' + esc(e.fecha) + '">' + esc(rot) + '</option>';
    }).join('');
    sel.addEventListener('change', function () { seleccionarEdicion(sel.value, true); });
  }

  function seleccionarEdicion(f, actualizarUrl) {
    var d = estado.ediciones[f];
    if (!d) { aviso('La edición del ' + esc(fecha(f)) + ' no está disponible.'); return; }
    estado.actual = d;
    $('#selector-edicion').value = f;
    if (actualizarUrl) {
      var u = new URL(location.href); u.searchParams.set('edicion', f); u.hash = '';
      history.replaceState(null, '', u);
    }
    renderTodo();
  }

  function renderTodo() {
    var d = estado.actual;
    if (!d) return;
    renderResumen(d);
    renderMapa();
    renderIndicadores(d);
    renderTendenciasActuales();
    renderGraficoTemas(d);
    renderDatoSemana(d);
    renderFrente(d);
    renderLineaTiempo();
    renderAlertas(d);
    renderBrechas();
    renderLatam(d);
    renderRegulacion();
    renderMetodologia(d);
    renderReferenciasEstado();
  }

  // Perfil cambiado: solo se repintan las partes que dependen de él.
  function renderPorPerfil() {
    if (!estado.actual) return;
    renderResumen(estado.actual);
    renderTendenciasActuales();
    renderLineaTiempo();
    renderBrechas();
    var m = location.hash.match(/^#tendencia=(.+)$/);
    if (m && $('#cajon').classList.contains('abierto')) abrirTendencia(decodeURIComponent(m[1]), true);
  }

  function noticiasDe(d) {
    var f = d._fecha;
    return lista(d.noticias).filter(function (n) { return n && typeof n === 'object'; }).map(function (n) {
      if (!n._edicion) Object.defineProperty(n, '_edicion', { value: f, enumerable: false });
      if (n.id == null) Object.defineProperty(n, 'id', { value: 'sin-id-' + Math.random().toString(36).slice(2, 7), enumerable: false });
      return n;
    });
  }

  // ---------- Perfil ("Ver como") ----------
  function configurarPerfil() {
    var pedido = new URLSearchParams(location.search).get('perfil');
    var guardado = null;
    try { guardado = localStorage.getItem(CLAVE_PERFIL); } catch (e) {}
    estado.perfil = PERFILES[pedido] ? pedido : (PERFILES[guardado] ? guardado : ORDEN_PERFILES[0]);

    $('#selector-perfil').innerHTML = ORDEN_PERFILES.map(function (p) {
      return '<option value="' + p + '">' + esc(PERFILES[p].nombre) + '</option>';
    }).join('');
    $('#perfil-botones').innerHTML = '<span class="perfiles__rotulo">Ver como:</span>' + ORDEN_PERFILES.map(function (p) {
      return '<button type="button" role="radio" class="perfiles__boton" data-perfil="' + p + '" title="' + esc(PERFILES[p].desc) + '">' + esc(PERFILES[p].corto) + '</button>';
    }).join('');
    $('#selector-perfil').addEventListener('change', function (e) { cambiarPerfil(e.target.value); });
    $('#perfil-botones').addEventListener('click', function (e) {
      var b = e.target.closest('[data-perfil]');
      if (b) cambiarPerfil(b.getAttribute('data-perfil'));
    });
    $('#perfil-botones').addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var i = ORDEN_PERFILES.indexOf(estado.perfil) + (e.key === 'ArrowRight' ? 1 : -1);
      i = (i + ORDEN_PERFILES.length) % ORDEN_PERFILES.length;
      cambiarPerfil(ORDEN_PERFILES[i]);
      $('#perfil-botones [data-perfil="' + ORDEN_PERFILES[i] + '"]').focus();
      e.preventDefault();
    });
    marcarPerfil();
  }
  function marcarPerfil() {
    $('#selector-perfil').value = estado.perfil;
    Array.prototype.forEach.call(document.querySelectorAll('#perfil-botones [data-perfil]'), function (b) {
      var activo = b.getAttribute('data-perfil') === estado.perfil;
      b.setAttribute('aria-checked', activo ? 'true' : 'false');
      b.tabIndex = activo ? 0 : -1;
    });
    document.querySelectorAll('[data-perfil-nombre]').forEach(function (el) { el.textContent = PERFILES[estado.perfil].nombre; });
  }
  function cambiarPerfil(p) {
    if (!PERFILES[p] || p === estado.perfil) return;
    estado.perfil = p;
    try { localStorage.setItem(CLAVE_PERFIL, p); } catch (e) {}
    var u = new URL(location.href); u.searchParams.set('perfil', p);
    history.replaceState(null, '', u);
    marcarPerfil();
    renderPorPerfil();
  }
  function implicancia(t, p) {
    var imp = t && t.implicancias && t.implicancias[p || estado.perfil];
    return vacio(imp) ? null : imp;
  }
  // Convención documentada en CLAUDE.md: una implicancia puede decir "sin impacto relevante" o "sin base".
  function implicanciaNula(t, p) {
    var imp = implicancia(t, p);
    return !imp || /^sin (impacto relevante|base)/i.test(normalizar(imp).trim());
  }
  function sinBase(imp) { return !imp || /^sin base/i.test(normalizar(imp).trim()); }
  // Implicancia a mostrar para un perfil: si la del perfil no tiene base, se usa la lectura general
  // (implicancia "global" si existe; si no, la de Publisher / AAA; si no, la primera con contenido).
  function implicanciaVista(t, p) {
    p = p || estado.perfil;
    var propia = implicancia(t, p);
    if (!sinBase(propia)) return { texto: propia, general: false };
    var orden = ['global', 'publisher_aaa'].concat(ORDEN_PERFILES);
    for (var i = 0; i < orden.length; i++) {
      if (orden[i] === p) continue;
      var alt = implicancia(t, orden[i]);
      if (!sinBase(alt) && !/^sin impacto/i.test(normalizar(alt).trim())) return { texto: alt, general: true, origen: orden[i] };
    }
    return { texto: propia, general: false };
  }
  function implicanciaHTML(t, p) {
    var v = implicanciaVista(t, p);
    if (!v.general) return texto(v.texto);
    var de = PERFILES[v.origen] ? PERFILES[v.origen].nombre : 'la industria en general';
    return esc(v.texto) + ' <span class="etiqueta-general" title="Las fuentes no dan base para este perfil: se muestra la implicancia para ' + esc(de) + '.">lectura general, sin base regional</span>';
  }

  // ---------- A. Resumen ejecutivo ----------
  function botonTendencia(tid, rotulo) {
    var t = tendencia(tid);
    if (!t) return vacio(tid) ? '' : '<span class="sin-dato">tendencia ' + esc(tid) + ' no encontrada</span>';
    return '<button type="button" class="enlace-tendencia" data-tendencia="' + esc(t.id) + '">' + esc(rotulo || t.nombre) + ' <span aria-hidden="true">→</span></button>';
  }
  function explicarSinTendencias() {
    return '<div class="vacio vacio--explica vacio--caja"><strong>Todavía no hay tendencias.</strong> El tablero se organiza por tendencias, que se generan a partir de las ediciones y la biblioteca de referencias. ' +
      'Para crearlas, ejecutá <code>/analizar-tendencias</code> en Claude Code (o <code>/actualizar-noticias</code>, que lo hace al final de cada edición). ' +
      'Eso escribe <code>data/tendencias.json</code> y lo valida con <code>python scripts/validar.py</code>.' +
      (estado.tendError ? ' <span class="sin-dato">(' + esc(estado.tendError) + ')</span>' : '') + '</div>';
  }

  function renderResumen(d) {
    var ed = d.edicion || {};
    var desde = parseFecha(ed.desde), hasta = parseFecha(ed.hasta);
    var ventana = (desde && hasta) ? 'Semana del ' + fmtLarga.format(desde) + ' al ' + fmtLarga.format(hasta) : 'Ventana analizada: ' + SIN_DATO;
    $('#ventana').textContent = (ed.numero != null ? 'Edición ' + ed.numero + ' · ' : '') + ventana;
    var tema = d.tema_de_la_semana || {};
    $('#tema-titulo').textContent = vacio(tema.titulo) ? 'Edición del ' + fecha(d._fecha) : tema.titulo;

    var re = d.resumen_ejecutivo;
    if (!re || typeof re !== 'object') {
      var sinRe = '<p class="vacio vacio--explica">Esta edición no tiene resumen ejecutivo. Se genera con <code>/actualizar-noticias</code> (al cerrar la edición).</p>';
      $('#claves').innerHTML = '<li>' + sinRe + '</li>';
      $('#decisiones').innerHTML = hayTendencias() ? sinRe : explicarSinTendencias();
      $('#riesgos').innerHTML = '<li class="vacio">' + SIN_DATO + '</li>';
      $('#oportunidades').innerHTML = '<li class="vacio">' + SIN_DATO + '</li>';
      return;
    }

    var claves = lista(re.claves).filter(Boolean);
    $('#claves').innerHTML = claves.length ? claves.map(function (c) {
      return '<li><span class="claves__texto">' + texto(c.texto) + '</span>' + (vacio(c.tendencia_id) ? '' : botonTendencia(c.tendencia_id)) + '</li>';
    }).join('') : '<li class="vacio">' + SIN_DATO + '</li>';

    var dec = lista(re.decisiones).filter(Boolean).slice().sort(function (a, b) {
      return (ORDEN_URGENCIA[a.urgencia] != null ? ORDEN_URGENCIA[a.urgencia] : 9) - (ORDEN_URGENCIA[b.urgencia] != null ? ORDEN_URGENCIA[b.urgencia] : 9);
    });
    $('#decisiones').innerHTML = (hayTendencias() ? '' : explicarSinTendencias()) + (dec.length ? dec.map(function (x) {
      var t = tendencia(x.tendencia_id);
      return '<div class="decision decision--' + esc(URGENCIAS[x.urgencia] ? x.urgencia : 'sin') + '">' +
        '<p class="decision__accion">' + chipUrgencia(x.urgencia) + ' ' + texto(x.accion) + '</p>' +
        '<p class="decision__porque">' + texto(x.por_que) + (t ? ' ' + botonTendencia(t.id, 'Tendencia') : '') + '</p>' +
        (t ? '<p class="decision__perfil"><strong>' + esc(PERFILES[estado.perfil].nombre) + ':</strong> ' + implicanciaHTML(t) + '</p>' : '') +
        '</div>';
    }).join('') : '<p class="vacio">' + SIN_DATO + '</p>');

    function ro(arr) {
      arr = lista(arr).filter(Boolean);
      if (!arr.length) return '<li class="vacio">' + SIN_DATO + '</li>';
      return arr.map(function (r) {
        if (typeof r === 'string') return '<li>' + esc(r) + '</li>';
        return '<li>' + texto(r.texto) + (vacio(r.tendencia_id) ? '' : ' ' + botonTendencia(r.tendencia_id, 'ver tendencia')) + '</li>';
      }).join('');
    }
    $('#riesgos').innerHTML = ro(re.riesgos);
    $('#oportunidades').innerHTML = ro(re.oportunidades);
  }

  // ---------- B. Mapa de tendencias ----------
  function porUrgenciaYBrecha(a, b) {
    return (ORDEN_URGENCIA[a.urgencia] != null ? ORDEN_URGENCIA[a.urgencia] : 9) - (ORDEN_URGENCIA[b.urgencia] != null ? ORDEN_URGENCIA[b.urgencia] : 9) ||
      brechaMax(b) - brechaMax(a);
  }
  function brechaMax(t) { return Math.max(num(t.brecha_global) || 0, num(t.brecha_latam) || 0); }

  function tarjetaMapa(t) {
    return '<button type="button" class="tend-tarjeta" data-tendencia="' + esc(t.id) + '">' +
      '<span class="tend-tarjeta__arriba">' + chipTema(t.tema) + chipUrgencia(t.urgencia) + '</span>' +
      '<span class="tend-tarjeta__nombre">' + texto(t.nombre) + '</span>' +
      '<span class="tend-tarjeta__datos">' +
        '<span><small>Horizonte</small>' + esc(horizonteInfo(t.horizonte).nombre) + '</span>' +
        '<span><small>Industria</small>' + chipPosicion(t.posicion_industria) + '</span>' +
        '<span><small>Brecha global</small>' + medidor(t.brecha_global, 5, 'var(--serie-global)') + '</span>' +
        '<span><small>Brecha Latam</small>' + medidor(t.brecha_latam, 5, 'var(--serie-latam)') + '</span>' +
      '</span>' +
      '<span class="tend-tarjeta__pie">' + insigniaCerteza(t) + '<span class="sin-dato-suave">' + plural(lista(t.evidencia).length, 'evidencia', 'evidencias') + '</span></span>' +
      '</button>';
  }

  function renderMapa() {
    if (!hayTendencias()) {
      $('#mapa-tendencias').innerHTML = explicarSinTendencias();
      $('#barras-brecha').innerHTML = '<p class="vacio">' + SIN_DATO + '</p>';
      $('#leyenda-certeza').innerHTML = '';
      return;
    }
    $('#mapa-tendencias').innerHTML = estado.tendencias.slice().sort(porUrgenciaYBrecha).map(tarjetaMapa).join('');
    $('#leyenda-certeza').innerHTML = ['alta', 'media', 'baja'].map(function (c) {
      return '<span><i class="marca-certeza marca-certeza--' + c + '"></i>' + marcaCerteza(c) + ' Certeza ' + CERTEZAS[c].toLowerCase() + '</span>';
    }).join('') + '<span class="sin-dato">Barra con trama = certeza baja</span>';

    var orden = estado.tendencias.slice().sort(function (a, b) {
      var ga = num(a.brecha_global), gb = num(b.brecha_global);
      if (ga == null && gb == null) return 0;
      if (ga == null) return 1;
      if (gb == null) return -1;
      return gb - ga || (ORDEN_URGENCIA[a.urgencia] || 0) - (ORDEN_URGENCIA[b.urgencia] || 0);
    });
    $('#barras-brecha').innerHTML = orden.map(function (t) {
      var g = num(t.brecha_global);
      var c = CERTEZAS[t.certeza] ? t.certeza : null;
      var valor = g == null
        ? '<span class="barra__valor">' + sd() + (num(t.brecha_latam) != null ? ' <small>(regional: Latam ' + t.brecha_latam + ')</small>' : '') + '</span>'
        : '<span class="barra__valor">' + g + (c ? ' <span class="barra__certeza" title="Certeza ' + CERTEZAS[c].toLowerCase() + '">' + marcaCerteza(c) + ' ' + CERTEZAS[c].toLowerCase() + '</span>' : '') + '</span>';
      return '<button type="button" class="barra" data-tendencia="' + esc(t.id) + '" aria-label="' + esc(t.nombre) + ': brecha global ' + (g == null ? SIN_DATO : g + ' de 5') + ', certeza ' + (c ? CERTEZAS[c].toLowerCase() : SIN_DATO) + '">' +
        '<span class="barra__nombre">' + esc(t.nombre || t.id) + '</span>' +
        '<span class="barra__pista"><span class="barra__track">' + (g == null ? '' : '<span class="barra__relleno barra__relleno--' + (c || 'media') + '" style="--v:' + (g / 5 * 100) + '%;--c:var(--serie-global)"></span>') + '</span>' + valor + '</span>' +
        '</button>';
    }).join('');
  }

  // ---------- C. Hoy ----------
  function renderIndicadores(d) {
    var noticias = noticiasDe(d);
    var fuentes = lista(d.fuentes_consultadas);
    var respondieron = fuentes.filter(function (f) { return f && (f.estado === 'ok' || f.estado === 'sin_novedades'); }).length;
    var fallaron = fuentes.filter(function (f) { return f && (f.estado === 'bloqueada' || f.estado === 'requiere_js'); }).length;
    var conteo = {};
    noticias.forEach(function (n) { if (!vacio(n.tema)) conteo[n.tema] = (conteo[n.tema] || 0) + 1; });
    var max = 0, top = [];
    Object.keys(conteo).forEach(function (t) {
      if (conteo[t] > max) { max = conteo[t]; top = [t]; } else if (conteo[t] === max) top.push(t);
    });
    var verif = noticias.filter(function (n) { return n.verificada === true; }).length;
    var conTend = noticias.filter(function (n) { return tendenciasDe(n).length; }).length;
    var ahora = estado.tendencias.filter(function (t) { return t.urgencia === 'ahora'; }).length;
    var chico = function (v) { return '<span class="indicador__de"> / ' + v + '</span>'; };

    var html = '';
    html += '<a class="indicador" href="#evidencia" data-filtrar-edicion="' + esc(d._fecha) + '">' +
      '<span class="indicador__rotulo">Noticias de la edición</span>' +
      '<span class="indicador__valor">' + noticias.length + '</span>' +
      '<span class="indicador__detalle">' + verif + ' verificadas en la fuente original</span></a>';
    html += '<a class="indicador" href="#fuentes-tabla">' +
      '<span class="indicador__rotulo">Fuentes que respondieron</span>' +
      '<span class="indicador__valor">' + (fuentes.length ? respondieron + chico(fuentes.length) : sd()) + '</span>' +
      '<span class="indicador__detalle">' + (!fuentes.length ? 'La edición no registra fuentes' : fallaron ? fallaron + ' bloqueadas o ilegibles' : 'Ninguna bloqueada') + '</span></a>';
    html += '<div class="indicador">' +
      '<span class="indicador__rotulo">Tema más cubierto</span>' +
      '<span class="indicador__valor indicador__valor--texto">' + (top.length ? top.map(chipTema).join(' ') : sd()) + '</span>' +
      '<span class="indicador__detalle">' + (max ? max + ' de ' + noticias.length + ' noticias' : '') + '</span></div>';
    html += '<a class="indicador" href="#tendencias">' +
      '<span class="indicador__rotulo">Tendencias seguidas</span>' +
      '<span class="indicador__valor">' + (hayTendencias() ? estado.tendencias.length : sd()) + '</span>' +
      '<span class="indicador__detalle">' + (hayTendencias() ? plural(ahora, 'con urgencia “ahora”', 'con urgencia “ahora”') + ' · ' + conTend + ' de ' + noticias.length + ' noticias asignadas' : 'Generalas con /analizar-tendencias') + '</span></a>';
    $('#indicadores').innerHTML = html;
  }

  function tarjetaTendencia(t) {
    return '<button type="button" class="tend-mini" data-tendencia="' + esc(t.id) + '">' +
      '<span class="tend-mini__arriba">' + chipUrgencia(t.urgencia) + insigniaCerteza(t) + '</span>' +
      '<span class="tend-mini__nombre">' + texto(t.nombre) + '</span>' +
      '<span class="tend-mini__perfil"><strong>' + esc(PERFILES[estado.perfil].corto) + ':</strong> ' + implicanciaHTML(t) + '</span>' +
      '</button>';
  }

  function renderTendenciasActuales() {
    if (!hayTendencias()) { $('#tendencias-actuales').innerHTML = explicarSinTendencias(); return; }
    var ts = estado.tendencias.filter(function (t) { return t.horizonte === 'promedio_actual'; }).sort(porUrgenciaYBrecha);
    $('#tendencias-actuales').innerHTML = ts.length ? ts.map(tarjetaTendencia).join('') :
      '<p class="vacio vacio--explica">Ninguna tendencia está clasificada con horizonte “promedio actual”.</p>';
  }

  // ---------- Gráfico de temas (Chart.js) ----------
  function baseChart() {
    Chart.defaults.font.family = css('--fuente') || 'system-ui, sans-serif';
    Chart.defaults.color = css('--tinta-2');
    Chart.defaults.borderColor = css('--rejilla');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) Chart.defaults.animation = false;
  }
  function tooltipBase() {
    return {
      backgroundColor: css('--superficie'), titleColor: css('--tinta'), bodyColor: css('--tinta-2'),
      borderColor: css('--borde-fuerte'), borderWidth: 1, padding: 12, cornerRadius: 10, boxPadding: 4,
      titleFont: { weight: '700', size: 13 }, bodyFont: { size: 13 }, displayColors: true
    };
  }
  function destruir(nombre) { if (estado.graficos[nombre]) { estado.graficos[nombre].destroy(); estado.graficos[nombre] = null; } }

  function renderGraficoTemas(d) {
    destruir('temas');
    if (typeof Chart === 'undefined') { $('#grafico-temas').parentNode.innerHTML = '<p class="vacio">No se pudo cargar la librería de gráficos.</p>'; return; }
    baseChart();
    var noticias = noticiasDe(d);
    var conteo = {};
    noticias.forEach(function (n) { if (!vacio(n.tema)) conteo[n.tema] = (conteo[n.tema] || 0) + 1; });
    var temas = ORDEN_TEMAS.concat(Object.keys(conteo).filter(function (t) { return ORDEN_TEMAS.indexOf(t) < 0; }));
    var etiquetas = temas.map(function (t) { return temaInfo(t).nombre; });
    var valores = temas.map(function (t) { return conteo[t] || 0; });
    var colores = temas.map(function (t) { return TEMAS[t] ? css('--t-' + t) : css('--tinta-suave'); });
    var ctx = $('#grafico-temas');
    ctx.setAttribute('aria-label', 'Noticias por tema: ' + temas.map(function (t, i) { return etiquetas[i] + ' ' + valores[i]; }).join(', '));
    estado.graficos.temas = new Chart(ctx, {
      type: 'bar',
      data: { labels: etiquetas, datasets: [{ label: 'Noticias', data: valores, backgroundColor: colores, borderRadius: 4, borderSkipped: 'start', barPercentage: 0.7, categoryPercentage: 0.9, maxBarThickness: 26 }] },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        layout: { padding: { right: 28 } },
        onClick: function (e, el) { if (el.length) irAEvidencia({ tema: temas[el[0].index] }); },
        onHover: function (e, el) { e.native.target.style.cursor = el.length ? 'pointer' : 'default'; },
        plugins: {
          legend: { display: false },
          tooltip: Object.assign(tooltipBase(), { displayColors: false, callbacks: {
            label: function (c) { return c.raw + (c.raw === 1 ? ' noticia' : ' noticias') + ' · tocá para verlas'; }
          } })
        },
        scales: {
          x: { beginAtZero: true, ticks: { precision: 0, color: css('--tinta-suave') }, grid: { color: css('--rejilla') }, border: { display: false } },
          y: { grid: { display: false }, ticks: { color: css('--tinta'), font: { size: 13, weight: '600' } }, border: { color: css('--borde-fuerte') } }
        }
      },
      plugins: [{
        id: 'etiquetasValor',
        afterDatasetsDraw: function (chart) {
          var c = chart.ctx;
          c.save();
          c.font = '600 12px ' + (css('--fuente') || 'sans-serif');
          c.fillStyle = css('--tinta-2');
          c.textAlign = 'left'; c.textBaseline = 'middle';
          chart.getDatasetMeta(0).data.forEach(function (bar, i) { c.fillText(fmtNum(valores[i]), bar.x + 6, bar.y); });
          c.restore();
        }
      }]
    });
  }

  function renderDatoSemana(d) {
    var dato = d.dato_de_la_semana;
    var el = $('#dato-semana');
    if (!dato || (vacio(dato.cifra) && vacio(dato.texto))) {
      el.innerHTML = '<h3 class="tarjeta__titulo">Dato de la semana</h3><p class="vacio">Esta edición no destaca un dato.</p>';
      return;
    }
    el.innerHTML = '<h3 class="tarjeta__titulo">Dato de la semana</h3>' +
      '<div class="dato__cifra">' + texto(dato.cifra) + '</div>' +
      '<p class="dato__texto">' + texto(dato.texto) + '</p>' +
      '<p class="dato__fuente">Fuente: ' + enlaceFuente(dato.fuente, dato.url) + '</p>';
  }

  function renderFrente(d) {
    var f = d.frente_a_frente || {};
    var co = lista(f.coincidencias), di = lista(f.diferencias);
    var tarjeta = $('#frente-tarjeta');
    if (!co.length && !di.length) { tarjeta.hidden = true; return; }
    tarjeta.hidden = false;
    function items(arr, clase) {
      if (!arr.length) return '<p class="vacio">' + SIN_DATO + '</p>';
      return arr.map(function (x) {
        return '<div class="frente__item ' + clase + '"><strong>' + texto(x.titulo) + '</strong><p>' + texto(x.texto) + '</p>' +
          '<span class="frente__fuentes">Fuentes: ' + (lista(x.fuentes).length ? lista(x.fuentes).map(esc).join(', ') : SIN_DATO) + '</span></div>';
      }).join('');
    }
    $('#frente').innerHTML =
      '<div class="frente__grupo"><h4><span aria-hidden="true">＝</span> Coinciden</h4>' + items(co, 'frente__item--coincide') + '</div>' +
      '<div class="frente__grupo"><h4><span aria-hidden="true">≠</span> Difieren</h4>' + items(di, 'frente__item--difiere') + '</div>';
  }

  // ---------- D. Qué puede venir (tendencias por horizonte) ----------
  function renderLineaTiempo() {
    if (!hayTendencias()) { $('#linea-tiempo').innerHTML = explicarSinTendencias(); return; }
    var carriles = ['corto', 'mediano', 'largo'];
    var html = '<div class="lt__eje" aria-hidden="true">' + carriles.map(function (h) { return '<span>' + esc(HORIZONTES[h].plazo) + '</span>'; }).join('') + '</div>';
    html += '<div class="lt__carriles">' + carriles.map(function (h) {
      var info = HORIZONTES[h];
      var ts = estado.tendencias.filter(function (t) { return t.horizonte === h; }).sort(porUrgenciaYBrecha);
      return '<div class="lt__carril"><div class="lt__carril-cabecera"><span class="lt__carril-titulo">' + esc(info.nombre) + '</span>' +
        '<span class="lt__carril-plazo">' + esc(info.plazo) + '</span></div>' +
        '<p class="lt__carril-desc">' + esc(info.desc) + ' · ' + plural(ts.length, 'tendencia', 'tendencias') + '</p>' +
        '<div class="lt__items">' + (ts.length ? ts.map(function (t) {
          return '<button type="button" class="lt__item" style="--c:' + (TEMAS[t.tema] ? 'var(--t-' + t.tema + ')' : 'var(--borde-fuerte)') + '" data-tendencia="' + esc(t.id) + '">' +
            '<span class="lt__item-ref">' + chipUrgencia(t.urgencia) + insigniaCerteza(t) + '</span>' +
            '<span class="lt__item-titulo">' + texto(t.nombre) + '</span>' +
            '<span class="lt__item-perfil"><strong>' + esc(PERFILES[estado.perfil].corto) + ':</strong> ' + implicanciaHTML(t) + '</span>' +
            '</button>';
        }).join('') : '<p class="vacio vacio--explica">Ninguna tendencia está clasificada a ' + esc(info.plazo) + '.</p>') + '</div></div>';
    }).join('') + '</div>';
    $('#linea-tiempo').innerHTML = html;
  }

  function renderAlertas(d) {
    var al = lista(d.alertas);
    var tarjeta = $('#alertas-tarjeta');
    if (!al.length) { tarjeta.hidden = true; return; }
    tarjeta.hidden = false;
    al = al.slice().sort(function (a, b) { return (a.tipo === 'oportunidad' ? 0 : 1) - (b.tipo === 'oportunidad' ? 0 : 1); });
    $('#alertas').innerHTML = al.map(function (a) {
      var tipo = a.tipo === 'riesgo' ? 'riesgo' : (a.tipo === 'oportunidad' ? 'oportunidad' : null);
      return '<div class="alerta">' +
        (tipo ? '<span class="alerta__tipo alerta__tipo--' + tipo + '">' + (tipo === 'riesgo' ? '▼ Riesgo' : '▲ Oportunidad') + '</span>' : '') +
        '<h4>' + texto(a.titulo) + '</h4><p>' + texto(a.resumen) + '</p>' +
        (vacio(a.por_que_importa) ? '' : '<div class="alerta__importa"><strong>Por qué importa:</strong> ' + esc(a.por_que_importa) + '</div>') +
        '<div class="alerta__pie">' + enlaceFuente(a.fuente, a.url) + '<span>' + esc(fecha(a.fecha, true)) + '</span></div></div>';
    }).join('');
  }

  // ---------- E. Brechas por tendencia ----------
  function baseBrechas() {
    var casilla = $('#incluir-baja');
    var todas = estado.tendencias.filter(function (t) { return num(t.brecha_global) != null || num(t.brecha_latam) != null; });
    var bajas = todas.filter(function (t) { return t.certeza === 'baja'; });
    return { items: casilla.checked ? todas : todas.filter(function (t) { return t.certeza !== 'baja'; }), bajas: bajas, incluir: casilla.checked };
  }

  function renderBrechas() {
    var casilla = $('#incluir-baja');
    if (!casilla._listo) { casilla._listo = true; casilla.addEventListener('change', renderBrechas); }
    if (!hayTendencias()) {
      $('#conteo-baja').textContent = '';
      $('#lectura-perfil').innerHTML = explicarSinTendencias();
      $('#barras-gl').innerHTML = ''; $('#leyenda-brechas').innerHTML = ''; $('#muestra-latam').innerHTML = '';
      $('#ranking-brechas').innerHTML = '';
      return;
    }
    var base = baseBrechas();
    var ts = base.items;
    $('#conteo-baja').textContent = base.bajas.length ? '(' + base.bajas.length + (base.bajas.length === 1 ? ' excluida' : ' excluidas') + (base.incluir ? ', ahora incluidas' : '') + ': ' + base.bajas.map(function (t) { return t.nombre; }).join('; ') + ')' : '(no hay)';

    renderLecturaPerfil(ts, base);

    // Gráfico global vs Latam (barras HTML, una fila por tendencia, n = evidencia).
    var orden = ts.slice().sort(function (a, b) { return brechaMax(b) - brechaMax(a) || (num(b.brecha_global) || 0) - (num(a.brecha_global) || 0); });
    var nLatam = 0;
    $('#leyenda-brechas').innerHTML =
      '<span><i style="background:var(--serie-global)"></i>Brecha global</span>' +
      '<span><i style="background:var(--serie-latam)"></i>Brecha Latinoamérica</span>' +
      '<span class="sin-dato">n = ítems de evidencia que sostienen cada barra</span>';
    $('#barras-gl').innerHTML = orden.length ? orden.map(function (t) {
      var nG = lista(t.evidencia).length, nL = nEvidenciaLatam(t);
      if (num(t.brecha_latam) != null) nLatam++;
      function fila(v, color, n, rotulo) {
        v = num(v);
        return '<span class="barra__fila"><span class="barra__serie">' + rotulo + '</span><span class="barra__pista"><span class="barra__track">' +
          (v == null ? '' : '<span class="barra__relleno barra__relleno--' + (t.certeza || 'media') + '" style="--v:' + (v / 5 * 100) + '%;--c:' + color + '"></span>') + '</span>' +
          '<span class="barra__valor">' + (v == null ? sd() : v) + ' <small>n=' + n + '</small></span></span></span>';
      }
      return '<button type="button" class="barra barra--doble" data-tendencia="' + esc(t.id) + '" aria-label="' + esc(t.nombre) + ': brecha global ' + (num(t.brecha_global) == null ? SIN_DATO : t.brecha_global) +
        ' (n=' + nG + '), Latinoamérica ' + (num(t.brecha_latam) == null ? SIN_DATO : t.brecha_latam) + ' (n=' + nL + ')">' +
        '<span class="barra__nombre">' + esc(t.nombre || t.id) + (t.certeza === 'baja' ? ' ' + insigniaCerteza(t) : '') + '</span>' +
        fila(t.brecha_global, 'var(--serie-global)', nG, 'Global') +
        fila(t.brecha_latam, 'var(--serie-latam)', nL, 'Latam') +
        '</button>';
    }).join('') : '<p class="vacio">Ninguna tendencia con brecha valorada' + (base.bajas.length && !base.incluir ? ' y certeza suficiente; marcá la casilla para ver las de baja certeza.' : '.') + '</p>';
    $('#muestra-latam').innerHTML = '<strong>Latinoamérica: ' + plural(nLatam, 'tendencia', 'tendencias') + ' con brecha valorada</strong> de ' + orden.length + ' mostradas. ' +
      (nLatam < orden.length ? 'Donde dice “sin dato”, ninguna fuente de la evidencia da base para valorar la región.' : '');

    var rank = ts.slice().sort(function (a, b) { return brechaMax(b) - brechaMax(a) || porUrgenciaYBrecha(a, b); });
    $('#ranking-brechas').innerHTML = rank.length ? rank.map(function (t) {
      return '<li><button type="button" data-tendencia="' + esc(t.id) + '">' +
        '<span class="ranking__titulo">' + texto(t.nombre) + '</span>' +
        '<span class="ranking__insignias">' + chipPosicion(t.posicion_industria) + chipUrgencia(t.urgencia) + (t.certeza === 'baja' ? insigniaCerteza(t) : '') + '</span>' +
        '<span class="ranking__medidas"><span>' + chipTema(t.tema) + '</span>' +
        '<span>Global ' + medidor(t.brecha_global, 5, 'var(--serie-global)') + '</span>' +
        '<span>Latam ' + medidor(t.brecha_latam, 5, 'var(--serie-latam)') + '</span></span>' +
        '<span class="ranking__just"><strong>Posición:</strong> ' + texto(t.argumento_posicion) + '</span></button></li>';
    }).join('') : '<li class="vacio">Sin tendencias para mostrar.</li>';
  }

  // "Para un <perfil>, las brechas que más pesan son…": se toman las tendencias con implicancia
  // para el perfil (no "sin impacto relevante"/"sin base") y se ordenan por la brecha que mira
  // ese perfil (Latam para el perfil latam, global para el resto).
  function renderLecturaPerfil(ts, base) {
    var p = estado.perfil;
    var campo = p === 'latam' ? 'brecha_latam' : 'brecha_global';
    var cand = ts.filter(function (t) { return num(t[campo]) != null && !implicanciaNula(t, p); })
      .sort(function (a, b) { return num(b[campo]) - num(a[campo]) || porUrgenciaYBrecha(a, b); }).slice(0, 3);
    var titulo = '<h3 class="tarjeta__titulo">Lectura para <span data-perfil-nombre>' + esc(PERFILES[p].nombre) + '</span></h3>';
    if (!cand.length) {
      $('#lectura-perfil').innerHTML = titulo + '<p class="vacio vacio--explica">Para ' + esc(PERFILES[p].articulo) + ' no hay brechas ' + (campo === 'brecha_latam' ? 'regionales ' : '') +
        'con base suficiente en la evidencia' + (base.bajas.length && !base.incluir ? ' (las de baja certeza están excluidas)' : '') + '.</p>';
      return;
    }
    $('#lectura-perfil').innerHTML = titulo +
      '<p class="lectura__intro">Para ' + esc(PERFILES[p].articulo) + ', las brechas que más pesan son:</p>' +
      '<ol class="lectura">' + cand.map(function (t) {
        return '<li><button type="button" class="lectura__item" data-tendencia="' + esc(t.id) + '">' +
          '<span class="lectura__num">' + num(t[campo]) + '<small>/5</small></span>' +
          '<span><strong>' + texto(t.nombre) + '</strong> ' + chipPosicion(t.posicion_industria) + chipUrgencia(t.urgencia) +
          '<span class="lectura__imp">' + implicanciaHTML(t, p) + '</span></span></button></li>';
      }).join('') + '</ol>' +
      '<p class="tarjeta__ayuda">Brecha ' + (campo === 'brecha_latam' ? 'Latinoamérica' : 'global') + '. Se omiten las tendencias cuya implicancia para este perfil dice “sin impacto relevante” o “sin base”.</p>';
  }

  // ---------- F. Latam y Regulación (tarjetas de referencias) ----------
  function diferenciaBrecha(n) {
    var g = num(n.brecha_global), l = num(n.brecha_latam);
    if (g == null || l == null) return '';
    var dif = l - g;
    var txt = dif === 0 ? 'igual a la global' : (dif > 0 ? dif + (dif === 1 ? ' punto mayor' : ' puntos mayor') + ' que la global' : (-dif) + ((-dif) === 1 ? ' punto menor' : ' puntos menor') + ' que la global');
    return '<p class="ref-tarjeta__brecha"><span class="par">Brecha global ' + medidor(g, 5, 'var(--serie-global)') + '</span><span class="par">Latam ' + medidor(l, 5, 'var(--serie-latam)') + '</span>' +
      '<strong>→ en Latinoamérica es ' + txt + '</strong>' + (n.certeza === 'baja' ? ' ' + insigniaCerteza(n) : '') + '</p>';
  }
  function tendenciasChips(n) {
    var ts = tendenciasDe(n);
    return ts.length ? '<p class="ref-tarjeta__tend">Respalda: ' + ts.map(function (t) { return botonTendencia(t.id); }).join(' ') + '</p>' : '';
  }
  function tarjetaRef(n) {
    var u = urlSegura(n.url);
    if (n.estado === 'no_accesible') {
      return '<article class="ref-tarjeta ref-tarjeta--no">' +
        '<div class="ref-tarjeta__meta"><span class="insignia insignia--no">No accesible</span>' + (n.tipo_documento ? '<span>' + esc(TIPOS_DOC[n.tipo_documento] || n.tipo_documento) + '</span>' : '') + '</div>' +
        '<h3 class="ref-tarjeta__titulo">' + texto(n.titulo) + '</h3>' +
        '<p class="ref-tarjeta__nota">' + texto(n.nota_calidad) + '</p>' +
        '<div class="ref-tarjeta__pie">' + enlaceFuente(n.fuente, u, 'Ver la fuente') + '</div></article>';
    }
    return '<article class="ref-tarjeta">' +
      '<div class="ref-tarjeta__meta">' + (esRef(n) ? insigniaRef(n) : '<span class="insignia insignia--noticia">Noticia de la edición · ' + esc(fecha(n.fecha_publicacion, true)) + '</span>') +
        insigniaEvidencia(n) + chipTema(n.tema) + (esRef(n) ? '<span>' + esc(geoNombre(n.geografia)) + '</span>' : '') + '</div>' +
      '<h3 class="ref-tarjeta__titulo"><button type="button" class="enlace-boton" data-abrir="' + esc(clave(n)) + '">' + texto(n.titulo) + '</button></h3>' +
      '<p class="ref-tarjeta__dato">' + texto(n.dato_clave) + '</p>' +
      diferenciaBrecha(n) + tendenciasChips(n) +
      (esRef(n) && !vacio(n.nota_calidad) ? '<p class="ref-tarjeta__nota"><strong>Calidad:</strong> ' + esc(n.nota_calidad) + '</p>' : '') +
      '<div class="ref-tarjeta__pie"><span>Publica: <strong>' + texto(n.fuente) + '</strong></span>' + (u ? enlaceFuente(n.fuente, u, 'Fuente original') : '<span class="sin-dato">sin enlace</span>') + '</div></article>';
  }
  function latamItems(d) {
    var refs = refsOk().filter(function (r) { return r.geografia === 'latam' || r.foco === 'latam'; });
    var ns = d ? noticiasDe(d).filter(function (n) { return n.geografia === 'latam' || num(n.brecha_latam) != null || num(n.adopcion_latam) != null; }) : [];
    return refs.concat(ns);
  }
  function renderLatam(d) {
    var items = latamItems(d).sort(function (a, b) {
      return (esRef(a) ? 0 : 1) - (esRef(b) ? 0 : 1) || String(b.fecha_publicacion || '').localeCompare(String(a.fecha_publicacion || ''));
    });
    var pendientes = estado.referencias.filter(function (r) { return r.estado === 'no_accesible' && r.foco === 'latam'; });
    var html = items.length ? items.map(tarjetaRef).join('') :
      '<p class="vacio vacio--explica">' + (!estado.refsMeta ? 'No se encontró la biblioteca de referencias y ninguna noticia de esta edición tiene base para valorar Latinoamérica.' :
        'Ninguna referencia accesible tiene geografía Latinoamérica y ninguna noticia de esta edición da base para valorar la región.') + '</p>';
    $('#latam-tarjetas').innerHTML = html + pendientes.map(tarjetaRef).join('');
  }
  function renderRegulacion() {
    var refs = estado.referencias.filter(function (r) { return r.foco === 'regulacion_pi'; })
      .sort(function (a, b) { return (a.estado === 'ok' ? 0 : 1) - (b.estado === 'ok' ? 0 : 1) || String(b.fecha_publicacion || '').localeCompare(String(a.fecha_publicacion || '')); });
    $('#regulacion-tarjetas').innerHTML = refs.length ? refs.map(tarjetaRef).join('') :
      '<p class="vacio vacio--explica">' + (!estado.refsMeta ? 'No se encontró la biblioteca de referencias (data/referencias.json), que alimenta este bloque.' : 'La biblioteca no tiene referencias con foco en regulación y propiedad intelectual.') + '</p>';
  }

  // ---------- G. Evidencia ----------
  function armarEvidencia() {
    estado.todas = [];
    estado.indice.forEach(function (e) {
      var d = estado.ediciones[e.fecha];
      if (d) noticiasDe(d).forEach(function (n) { estado.todas.push(n); });
    });
    estado.referencias.forEach(function (r) { estado.todas.push(r); });
    estado.todas.sort(function (a, b) {
      return (esRef(a) ? 1 : 0) - (esRef(b) ? 1 : 0) || String(b.fecha_publicacion || '').localeCompare(String(a.fecha_publicacion || '')) ||
        (num(b.importancia) || 0) - (num(a.importancia) || 0);
    });

    function opciones(sel, valores, todos, rot) {
      sel.innerHTML = '<option value="">' + todos + '</option>' + valores.map(function (v) {
        return '<option value="' + esc(v) + '">' + esc(rot ? rot(v) : v) + '</option>';
      }).join('');
    }
    function unicos(campo) { return estado.todas.map(function (n) { return n[campo]; }).filter(function (v, i, a) { return !vacio(v) && a.indexOf(v) === i; }); }
    opciones($('#filtro-tendencia'), estado.tendencias.map(function (t) { return t.id; }).concat(['__ninguna']), 'Todas las tendencias',
      function (id) { if (id === '__ninguna') return 'Sin tendencia'; var t = tendencia(id); return t ? t.nombre : id; });
    opciones($('#filtro-tipo'), ['noticia', 'referencia'], 'Noticias y referencias', function (v) { return v === 'noticia' ? 'Solo noticias' : 'Solo referencias'; });
    var temas = ORDEN_TEMAS.filter(function (t) { return estado.todas.some(function (n) { return n.tema === t; }); })
      .concat(unicos('tema').filter(function (t) { return ORDEN_TEMAS.indexOf(t) < 0; }));
    opciones($('#filtro-tema'), temas, 'Todos los temas', function (t) { return temaInfo(t).nombre; });
    opciones($('#filtro-fuente'), unicos('fuente').sort(function (a, b) { return a.localeCompare(b, 'es'); }), 'Todas las fuentes');
    opciones($('#filtro-horizonte'), Object.keys(HORIZONTES).filter(function (h) { return estado.todas.some(function (n) { return n.horizonte === h; }); })
      .concat(unicos('horizonte').filter(function (h) { return !HORIZONTES[h]; })), 'Todos los horizontes', function (h) { return horizonteInfo(h).nombre; });
    opciones($('#filtro-edicion'), estado.indice.filter(function (e) { return estado.ediciones[e.fecha]; }).map(function (e) { return e.fecha; }),
      'Todas las ediciones', function (f) { var e = estado.indice.find(function (x) { return x.fecha === f; }); return (e && e.numero != null ? 'N.º ' + e.numero + ' · ' : '') + fecha(f, true); });

    FILTROS.forEach(function (s) { if (s !== '#filtro-texto') $(s).addEventListener('change', renderTabla); });
    var t;
    $('#filtro-texto').addEventListener('input', function () { clearTimeout(t); t = setTimeout(renderTabla, 120); });
    $('#filtro-limpiar').addEventListener('click', function () { FILTROS.forEach(function (s) { $(s).value = ''; }); renderTabla(); });
    $('#tabla-hemeroteca').classList.add('tabla--tarjetas');
    $('#tabla-hemeroteca tbody').addEventListener('keydown', function (e) {
      var tr = e.target.closest('tr[data-abrir]');
      if (tr && (e.key === 'Enter' || e.key === ' ') && e.target === tr) { e.preventDefault(); abrirDetalle(tr.getAttribute('data-abrir')); }
    });
    renderTabla();
  }
  var FILTROS = ['#filtro-tendencia', '#filtro-tipo', '#filtro-tema', '#filtro-fuente', '#filtro-horizonte', '#filtro-edicion', '#filtro-texto'];

  function renderTabla() {
    var fT = $('#filtro-tendencia').value, fTipo = $('#filtro-tipo').value, ft = $('#filtro-tema').value, ff = $('#filtro-fuente').value,
      fh = $('#filtro-horizonte').value, fe = $('#filtro-edicion').value;
    var q = normalizar($('#filtro-texto').value.trim());
    var res = estado.todas.filter(function (n) {
      var ts = estado.pertenencia[clave(n)] || [];
      if (fT === '__ninguna' && ts.length) return false;
      if (fT && fT !== '__ninguna' && ts.indexOf(fT) < 0) return false;
      if (fTipo === 'noticia' && esRef(n)) return false;
      if (fTipo === 'referencia' && !esRef(n)) return false;
      if (ft && n.tema !== ft) return false;
      if (ff && n.fuente !== ff) return false;
      if (fh && n.horizonte !== fh) return false;
      if (fe && n._edicion !== fe) return false;
      if (q) {
        var hay = normalizar([n.titulo, n.fuente, n.resumen_propio, n.lectura_negocio, n.dato_clave, temaInfo(n.tema).nombre].concat(tendenciasDe(n).map(function (t) { return t.nombre; })).join(' '));
        if (q.split(/\s+/).some(function (p) { return hay.indexOf(p) < 0; })) return false;
      }
      return true;
    });
    var nN = estado.todas.filter(function (n) { return !esRef(n); }).length;
    $('#conteo-hemeroteca').textContent = 'Mostrando ' + res.length + ' de ' + estado.todas.length + ' ítems de evidencia (' +
      plural(nN, 'noticia', 'noticias') + ' y ' + plural(estado.todas.length - nN, 'referencia', 'referencias') + ').';
    var tbody = $('#tabla-hemeroteca tbody');
    if (!res.length) { tbody.innerHTML = '<tr><td colspan="8" class="vacio">Ningún ítem coincide con los filtros.</td></tr>'; return; }
    tbody.innerHTML = res.map(function (n) {
      var u = urlSegura(n.url);
      var ts = tendenciasDe(n);
      var marca = esRef(n) ? ' ' + insigniaRef(n) + (n.estado === 'no_accesible' ? ' <span class="insignia insignia--no">No accesible</span>' : '') :
        (n.verificada === true ? '' : ' <span class="insignia insignia--no">⚠ Sin verificar</span>');
      return '<tr tabindex="0" data-abrir="' + esc(clave(n)) + '" aria-label="Abrir detalle: ' + esc(n.titulo) + '">' +
        '<td class="tabla__fecha" data-rotulo="Fecha">' + esc(fecha(n.fecha_publicacion, true)) + '</td>' +
        '<td class="tabla__titulo">' + texto(n.titulo) + marca + '</td>' +
        '<td data-rotulo="Tendencia">' + (ts.length ? ts.map(function (t) { return '<span class="chip-tend">' + esc(t.nombre) + '</span>'; }).join(' ') : sd()) + '</td>' +
        '<td data-rotulo="Tema">' + (vacio(n.tema) ? sd() : chipTema(n.tema)) + '</td>' +
        '<td data-rotulo="Fuente">' + texto(n.fuente) + '</td>' +
        '<td data-rotulo="Horizonte">' + (vacio(n.horizonte) ? sd() : esc(horizonteInfo(n.horizonte).nombre)) + '</td>' +
        '<td data-rotulo="Importancia">' + puntos(n.importancia, 5, 'Importancia') + '</td>' +
        '<td class="tabla__enlace">' + (u ? '<a class="enlace-fuente" href="' + esc(u) + '" target="_blank" rel="noopener noreferrer" data-no-abrir>Original' + ICONO_EXTERNO + '</a>' : '<span class="sin-dato">sin enlace</span>') + '</td></tr>';
    }).join('');
  }

  function irAEvidencia(filtros) {
    FILTROS.forEach(function (s) { $(s).value = ''; });
    if (filtros.tema) $('#filtro-tema').value = filtros.tema;
    if (filtros.tendencia) $('#filtro-tendencia').value = filtros.tendencia;
    if (filtros.edicion) $('#filtro-edicion').value = filtros.edicion;
    else if (filtros.tema && estado.actual) $('#filtro-edicion').value = estado.actual._fecha;
    renderTabla();
    $('#evidencia').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------- H. Metodología / fuentes ----------
  function renderDefiniciones() {
    $('#definiciones-perfiles').innerHTML = ORDEN_PERFILES.map(function (p) { return '<dt>' + esc(PERFILES[p].nombre) + '</dt><dd>' + esc(PERFILES[p].desc) + '</dd>'; }).join('');
    $('#definiciones-urgencia').innerHTML = Object.keys(URGENCIAS).map(function (u) { return '<dt>' + chipUrgencia(u) + '</dt><dd>' + esc(URGENCIAS[u].desc) + '</dd>'; }).join('');
    $('#definiciones-posicion').innerHTML = Object.keys(POSICIONES).map(function (p) { return '<dt>' + chipPosicion(p, true) + '</dt><dd>' + esc(POSICIONES[p].desc) + '</dd>'; }).join('');
  }

  function renderMetodologia(d) {
    var fuentes = lista(d.fuentes_consultadas);
    $('#fuentes-edicion').textContent = 'Edición del ' + fecha(d._fecha, true);
    var cuenta = {};
    fuentes.forEach(function (f) { cuenta[f.estado] = (cuenta[f.estado] || 0) + 1; });
    $('#resumen-estados').innerHTML = Object.keys(ESTADOS).filter(function (k) { return cuenta[k]; }).map(function (k) {
      return '<span class="estado estado--' + k + '">' + ESTADOS[k].icono + ' ' + ESTADOS[k].nombre + ': ' + cuenta[k] + '</span>';
    }).join('') || '<span class="vacio">La edición no registra fuentes consultadas.</span>';
    var orden = { bloqueada: 0, requiere_js: 1, manual: 2, sin_novedades: 3, ok: 4 };
    var filas = fuentes.slice().sort(function (a, b) { return (orden[a.estado] != null ? orden[a.estado] : 5) - (orden[b.estado] != null ? orden[b.estado] : 5); });
    var tabla = $('#tabla-fuentes');
    tabla.parentNode.id = 'fuentes-tabla';
    tabla.classList.add('tabla--tarjetas');
    tabla.querySelector('tbody').innerHTML = filas.length ? filas.map(function (f) {
      var e = ESTADOS[f.estado] || { nombre: f.estado || SIN_DATO, icono: '?' };
      var u = urlSegura(f.url);
      return '<tr><td>' + (u ? enlaceFuente(f.nombre || f.id, u) : texto(f.nombre || f.id) + ' <span class="sin-dato">(sin URL)</span>') + '</td>' +
        '<td data-rotulo="Estado"><span class="estado estado--' + esc(f.estado) + '">' + e.icono + ' ' + esc(e.nombre) + '</span></td>' +
        '<td data-rotulo="Nota">' + texto(f.nota) + '</td></tr>';
    }).join('') : '<tr><td colspan="3" class="vacio">Sin registro de fuentes.</td></tr>';
    var lim = lista(d.limitaciones);
    $('#limitaciones').innerHTML = lim.length ? lim.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') : '<li class="vacio">La edición no registra limitaciones.</li>';
  }

  function renderReferenciasEstado() {
    var refs = estado.referencias;
    $('#referencias-actualizado').textContent = estado.refsMeta && estado.refsMeta.actualizado ? 'Actualizada el ' + fecha(estado.refsMeta.actualizado, true) : 'Sin biblioteca';
    var ok = refs.filter(function (r) { return r.estado === 'ok'; }).length;
    $('#resumen-referencias').innerHTML = !estado.refsMeta ? '<span class="vacio">No se encontró data/referencias.json' + (estado.refsError ? ' (' + esc(estado.refsError) + ')' : '') + '.</span>' :
      '<span class="estado estado--ok">✓ Accesibles: ' + ok + '</span>' + (refs.length - ok ? '<span class="estado estado--bloqueada">✕ No accesibles: ' + (refs.length - ok) + '</span>' : '');
    $('#tabla-referencias tbody').innerHTML = refs.length ? refs.map(function (r) {
      var u = urlSegura(r.url);
      return '<tr><td>' + (u ? enlaceFuente(r.titulo || r.id, u) : texto(r.titulo || r.id)) + ' <small class="sin-dato">' + esc(TIPOS_DOC[r.tipo_documento] || r.tipo_documento || '') + (r.fecha_publicacion ? ' · ' + esc(fecha(r.fecha_publicacion, true)) : ' · sin fecha') + '</small></td>' +
        '<td data-rotulo="Estado">' + (r.estado === 'ok' ? '<span class="estado estado--ok">✓ Accesible</span>' : '<span class="estado estado--bloqueada">✕ No accesible</span>') + '</td>' +
        '<td data-rotulo="Nota de calidad">' + texto(r.nota_calidad) + '</td></tr>';
    }).join('') : '<tr><td colspan="3" class="vacio">La biblioteca está vacía.</td></tr>';
  }

  // ---------- Cajón: detalle de tendencia ----------
  function bloque(titulo, cuerpo, clase) { return '<div class="bloque' + (clase ? ' ' + clase : '') + '"><h4>' + titulo + '</h4>' + cuerpo + '</div>'; }

  function abrirTendencia(id, sinHash) {
    var t = tendencia(id);
    if (!t) return;
    estado.volverA = null;
    var p = estado.perfil;
    var ev = evidenciaDe(t);
    var prov = lista(t.proveedores).filter(Boolean);
    var kpis = lista(t.kpis).filter(function (k) { return !vacio(k); });
    var otros = ORDEN_PERFILES.filter(function (x) { return x !== p; });
    $('#cajon-etiqueta').textContent = 'Detalle de la tendencia';

    var html = '<div class="cajon__meta">' + chipTema(t.tema) + chipUrgencia(t.urgencia) + insigniaCerteza(t) +
      '<span>' + esc(horizonteInfo(t.horizonte).nombre) + (HORIZONTES[t.horizonte] && t.horizonte !== 'promedio_actual' ? ' (' + esc(HORIZONTES[t.horizonte].plazo) + ')' : '') + '</span></div>' +
      '<h2 class="cajon__titulo" id="cajon-titulo">' + texto(t.nombre) + '</h2>' +
      '<p class="cajon__desc">' + texto(t.descripcion) + '</p>' +

      bloque('Decisión sugerida <span class="editorial">Valoración editorial</span>', '<p class="decision__accion">' + texto(t.decision_sugerida) + '</p>', 'bloque--decision bloque--' + esc(t.urgencia || 'sin')) +

      '<div class="dos-columnas">' +
        bloque('Hoy: promedio de la industria', '<p>' + texto(t.promedio_actual) + '</p>') +
        bloque('Hacia dónde va', '<p>' + texto(t.hacia_donde_va) + '</p>', 'bloque--futuro') +
      '</div>' +

      bloque('Para <span data-perfil-nombre>' + esc(PERFILES[p].nombre) + '</span>', '<p>' + implicanciaHTML(t, p) + '</p>', 'bloque--perfil') +
      '<details class="otros-perfiles"><summary>Implicancias para los otros perfiles</summary><dl>' + otros.map(function (x) {
        return '<dt>' + esc(PERFILES[x].nombre) + '</dt><dd>' + texto(implicancia(t, x)) + '</dd>';
      }).join('') + '</dl></details>' +

      bloque('Posición de la industria', '<p>' + chipPosicion(t.posicion_industria) + '</p><p>' + texto(t.argumento_posicion) + '</p>') +

      bloque('Proveedores que nombran las fuentes', prov.length ? '<ul class="proveedores">' + prov.map(function (x) {
        return '<li><strong>' + texto(x.nombre) + '</strong>: ' + texto(x.rol) + (vacio(x.fuente_id) ? '' : ' <small class="sin-dato-suave">(fuente: ' + esc(x.fuente_id) + ')</small>') + '</li>';
      }).join('') + '</ul>' : '<p>' + sd() + ': ninguna fuente de la evidencia nombra proveedores para esta tendencia.</p>') +

      '<div class="dos-columnas">' +
        bloque('Inversión requerida <span class="editorial">Valoración editorial</span>', '<p class="inversion inversion--' + esc(t.inversion_requerida || 'sin_dato') + '">' +
          (INVERSIONES[t.inversion_requerida] && t.inversion_requerida !== 'sin_dato' ? esc(INVERSIONES[t.inversion_requerida]) : sd()) + '</p><p class="tarjeta__ayuda">' + texto(t.justificacion_inversion) + '</p>') +
        bloque('KPIs para medir el impacto <span class="editorial">Valoración editorial</span>', (kpis.length ? '<ul class="kpis">' + kpis.map(function (k) { return '<li>' + esc(k) + '</li>'; }).join('') + '</ul>' : '<p>' + sd() + '</p>') +
          (vacio(t.justificacion_kpis) ? '' : '<p class="tarjeta__ayuda">' + esc(t.justificacion_kpis) + '</p>')) +
      '</div>' +

      '<div class="bloque valoraciones"><h4>Brechas y valoraciones <span class="editorial">Valoración editorial</span></h4><dl>' +
        '<dt>Brecha global</dt><dd>' + medidor(t.brecha_global, 5, 'var(--serie-global)') + '</dd>' +
        '<dt>Brecha Latam</dt><dd>' + medidor(t.brecha_latam, 5, 'var(--serie-latam)') + '</dd>' +
        '<dt>Adopción</dt><dd>' + medidor(t.adopcion, 10) + '</dd>' +
        '<dt>Impacto</dt><dd>' + medidor(t.impacto, 10) + '</dd>' +
        '<dt>Fase</dt><dd>' + (vacio(t.fase_curva) ? sd() : esc(FASES[t.fase_curva] || t.fase_curva)) + '</dd>' +
        '<dt>Clasificación</dt><dd>' + (vacio(t.cuadrante) ? sd() : esc(CUADRANTES[t.cuadrante] || t.cuadrante)) + '</dd>' +
      '</dl><p class="tarjeta__ayuda">' + texto(t.justificacion_brecha) + '</p></div>' +

      bloque('Evidencia (' + ev.length + ')' + (ev.length < 2 ? ' <span class="insignia insignia--no">Evidencia débil: un solo ítem</span>' : ''),
        '<ul class="evidencia-lista">' + ev.map(function (x) {
          var n = x.item, e = x.e;
          if (!n) return '<li><span class="sin-dato">' + esc(e.tipo || 'ítem') + ' ' + esc(e.id) + ' no encontrado' + (e.edicion ? ' en la edición ' + esc(e.edicion) : '') + '</span></li>';
          var u = urlSegura(n.url);
          return '<li><span class="evidencia-lista__meta">' + (esRef(n) ? insigniaRef(n) : '<span class="insignia insignia--noticia">Noticia · ' + esc(fecha(n.fecha_publicacion, true)) + '</span>') +
            insigniaEvidencia(n) + '<span>' + texto(n.fuente) + '</span></span>' +
            '<button type="button" class="enlace-boton" data-abrir="' + esc(clave(n)) + '" data-desde-tendencia="' + esc(t.id) + '">' + texto(n.titulo) + '</button>' +
            (u ? ' ' + enlaceFuente(n.fuente, u, 'Original') : '') + '</li>';
        }).join('') + '</ul>' +
        '<button type="button" class="boton-texto" data-filtrar-tendencia="' + esc(t.id) + '">Ver esta evidencia en la tabla</button>') +

      '<p class="tarjeta__ayuda">Capa de tendencias' + (estado.tendMeta && estado.tendMeta.actualizado ? ', actualizada el ' + esc(fecha(estado.tendMeta.actualizado)) : '') +
        ' · última actualización de esta tendencia: ' + esc(fecha(t.ultima_actualizacion)) + ' · id ' + esc(t.id) + '</p>';
    mostrarCajon(html, sinHash ? null : '#tendencia=' + encodeURIComponent(t.id));
  }

  // ---------- Cajón: detalle de noticia o referencia ----------
  function buscarNoticia(k) {
    var p = String(k).split('/');
    if (p[0] === 'ref') {
      var id = p.slice(1).join('/');
      return estado.referencias.find(function (r) { return r.id === id; }) || null;
    }
    var d = estado.ediciones[p[0]];
    if (!d) return null;
    return noticiasDe(d).find(function (n) { return n.id === p.slice(1).join('/'); }) || null;
  }

  function abrirDetalle(k, sinHash, desdeTendencia) {
    var n = buscarNoticia(k);
    if (!n) return;
    estado.volverA = desdeTendencia || null;
    var u = urlSegura(n.url);
    var h = horizonteInfo(n.horizonte);
    var verif = n.verificada === true;
    var ref = esRef(n);
    var ts = tendenciasDe(n);
    $('#cajon-etiqueta').textContent = ref ? 'Detalle de la referencia' : 'Detalle de la noticia';
    var html = (desdeTendencia && tendencia(desdeTendencia) ? '<button type="button" class="boton-texto boton-volver" data-tendencia="' + esc(desdeTendencia) + '">← Volver a “' + esc(tendencia(desdeTendencia).nombre) + '”</button>' : '') +
      '<div class="cajon__meta">' + chipTema(n.tema) + (ref ? insigniaRef(n) : '') + insigniaVerificada(n) +
      (ref ? (vacio(n.tipo_documento) ? '' : '<span>' + esc(TIPOS_DOC[n.tipo_documento] || n.tipo_documento) + '</span>') + '<span>Geografía: ' + esc(geoNombre(n.geografia)) + '</span>'
        : (vacio(n.tipo) ? '' : '<span>' + esc(TIPOS[n.tipo] || n.tipo) + '</span>')) + '</div>' +
      '<h2 class="cajon__titulo" id="cajon-titulo">' + texto(n.titulo) + '</h2>' +
      '<p class="cajon__fuente"><strong>' + texto(n.fuente) + '</strong> · ' + (vacio(n.fecha_publicacion) ? 'Fecha de publicación: ' + sd() : 'Publicada el ' + esc(fecha(n.fecha_publicacion))) + '</p>' +
      (ts.length ? '<p class="cajon__tend">Evidencia de: ' + ts.map(function (t) { return botonTendencia(t.id); }).join(' ') + '</p>' : '<p class="cajon__tend sin-dato">No respalda ninguna tendencia.</p>') +
      (ref ? '<p class="nota">Referencia de la biblioteca: está fuera de la ventana semanal y no forma parte de las noticias de ninguna edición.</p>' : '') +
      (ref && !vacio(n.nota_calidad) ? '<div class="bloque bloque--calidad"><h4>Nota de calidad</h4><p>' + esc(n.nota_calidad) + '</p></div>' : '') +
      (u ? '<a class="boton-original" href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">Leer la nota original' + ICONO_EXTERNO + '</a><p class="cajon__url">' + esc(u) + '</p>'
         : '<p class="nota">No tiene enlace a la nota original.</p>') +
      (verif ? '' : '<p class="nota">No se pudo abrir la fuente original: no hay resumen con cifras y conviene contrastarlo.</p>') +
      '<div class="bloque"><h4>Resumen</h4><p>' + texto(n.resumen_propio) + '</p></div>' +
      '<div class="bloque"><h4>Lectura de negocio</h4><p>' + texto(n.lectura_negocio) + '</p></div>' +
      '<div class="bloque bloque--dato"><h4>Dato clave (de la fuente)</h4><p>' + texto(n.dato_clave) + '</p></div>' +
      '<div class="bloque valoraciones"><h4>Valoraciones <span class="editorial">Valoración editorial</span></h4><dl>' +
        '<dt>Importancia</dt><dd>' + medidor(n.importancia, 5) + '</dd>' +
        '<dt>Horizonte</dt><dd>' + esc(h.nombre) + (h.plazo && n.horizonte !== 'promedio_actual' ? ' (' + esc(h.plazo) + ')' : '') + '</dd>' +
        '<dt>Fase</dt><dd>' + (vacio(n.fase_curva) ? sd() : esc(FASES[n.fase_curva] || n.fase_curva)) + '</dd>' +
        '<dt>Adopción global</dt><dd>' + medidor(n.adopcion, 10) + '</dd>' +
        '<dt>Adopción Latam</dt><dd>' + medidor(n.adopcion_latam, 10, 'var(--serie-latam)') + '</dd>' +
        '<dt>Impacto</dt><dd>' + medidor(n.impacto, 10) + '</dd>' +
        '<dt>Clasificación</dt><dd>' + (vacio(n.cuadrante) ? sd() : esc(CUADRANTES[n.cuadrante] || n.cuadrante)) + '</dd>' +
        '<dt>Brecha global</dt><dd>' + medidor(n.brecha_global, 5, 'var(--serie-global)') + '</dd>' +
        '<dt>Brecha Latam</dt><dd>' + medidor(n.brecha_latam, 5, 'var(--serie-latam)') + '</dd>' +
        '<dt>Evidencia</dt><dd>' + (EVIDENCIAS[n.tipo_evidencia] ? esc(EVIDENCIAS[n.tipo_evidencia].nombre) : sd()) + '</dd>' +
        '<dt>Certeza</dt><dd>' + (CERTEZAS[n.certeza] ? insigniaCerteza(n) : sd()) + '</dd>' +
      '</dl></div>' +
      '<div class="bloque"><h4>Por qué esa brecha</h4><p>' + texto(n.justificacion_brecha) + '</p></div>' +
      '<p class="tarjeta__ayuda">' + (ref ? 'Biblioteca de referencias' + (estado.refsMeta && estado.refsMeta.actualizado ? ', actualizada el ' + esc(fecha(estado.refsMeta.actualizado)) : '') : 'Edición del ' + esc(fecha(n._edicion))) + ' · id ' + esc(n.id) + '</p>';
    mostrarCajon(html, sinHash ? null : '#noticia=' + encodeURIComponent(k));
  }

  function mostrarCajon(html, hash) {
    $('#cajon-cuerpo').innerHTML = html;
    $('#cajon-cuerpo').scrollTop = 0;
    var cajon = $('#cajon'), fondo = $('#cajon-fondo');
    if (!cajon.classList.contains('abierto')) estado.ultimoFoco = document.activeElement;
    fondo.hidden = false;
    requestAnimationFrame(function () { fondo.classList.add('abierto'); cajon.classList.add('abierto'); });
    cajon.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { $('#cajon-cerrar').focus(); }, 60);
    if (hash) history.replaceState(null, '', location.pathname + location.search + hash);
  }

  function cerrarDetalle() {
    var cajon = $('#cajon'), fondo = $('#cajon-fondo');
    if (!cajon.classList.contains('abierto')) return;
    cajon.classList.remove('abierto'); fondo.classList.remove('abierto');
    cajon.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    setTimeout(function () { fondo.hidden = true; }, 260);
    if (/^#(noticia|tendencia)=/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
    if (estado.ultimoFoco && estado.ultimoFoco.focus) estado.ultimoFoco.focus();
  }

  function abrirDesdeHash() {
    var m = location.hash.match(/^#noticia=(.+)$/);
    if (m) { abrirDetalle(decodeURIComponent(m[1]), true); return; }
    m = location.hash.match(/^#tendencia=(.+)$/);
    if (m) abrirTendencia(decodeURIComponent(m[1]), true);
  }

  function configurarCajon() {
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-no-abrir]')) return;
      var t = e.target.closest('[data-tendencia]');
      if (t) { e.preventDefault(); abrirTendencia(t.getAttribute('data-tendencia')); return; }
      var a = e.target.closest('[data-abrir]');
      if (a) { e.preventDefault(); abrirDetalle(a.getAttribute('data-abrir'), false, a.getAttribute('data-desde-tendencia')); return; }
      var ft = e.target.closest('[data-filtrar-tendencia]');
      if (ft) { e.preventDefault(); cerrarDetalle(); irAEvidencia({ tendencia: ft.getAttribute('data-filtrar-tendencia') }); return; }
      var f = e.target.closest('[data-filtrar-edicion]');
      if (f) { e.preventDefault(); irAEvidencia({ edicion: f.getAttribute('data-filtrar-edicion') }); }
    });
    $('#cajon-cerrar').addEventListener('click', cerrarDetalle);
    $('#cajon-fondo').addEventListener('click', cerrarDetalle);
    document.addEventListener('keydown', function (e) {
      var cajon = $('#cajon');
      if (!cajon.classList.contains('abierto')) return;
      if (e.key === 'Escape') { cerrarDetalle(); return; }
      if (e.key === 'Tab') {
        var foc = Array.prototype.filter.call(cajon.querySelectorAll('a[href], button, summary, [tabindex="0"]'), function (el) { return el.offsetParent !== null; });
        if (!foc.length) return;
        var primero = foc[0], ultimo = foc[foc.length - 1];
        if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
        else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
      }
    });
    window.addEventListener('hashchange', abrirDesdeHash);
  }

  // ---------- Modo claro / oscuro ----------
  function modoEfectivo() {
    var t = document.documentElement.getAttribute('data-theme');
    if (t === 'dark' || t === 'light') return t;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function aplicarIconoTema() {
    var oscuro = modoEfectivo() === 'dark';
    document.documentElement.setAttribute('data-modo', oscuro ? 'oscuro' : 'claro');
    $('#boton-tema').setAttribute('aria-label', oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
  }
  function repintarGraficos() { if (estado.actual) renderGraficoTemas(estado.actual); }
  function configurarTema() {
    aplicarIconoTema();
    $('#boton-tema').addEventListener('click', function () {
      var nuevo = modoEfectivo() === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', nuevo);
      try { localStorage.setItem('rg-tema', nuevo); } catch (e) {}
      aplicarIconoTema();
      repintarGraficos();
    });
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var cambio = function () { aplicarIconoTema(); repintarGraficos(); };
    if (mq.addEventListener) mq.addEventListener('change', cambio); else if (mq.addListener) mq.addListener(cambio);
  }

  // ---------- Navegación y animaciones ----------
  // Resalta en el menú la sección cuyo inicio ya pasó el 40% superior de la pantalla.
  function configurarNavegacion() {
    var enlaces = Array.prototype.slice.call(document.querySelectorAll('.navegacion a'));
    var secciones = enlaces.map(function (a) { return document.querySelector(a.getAttribute('href')); });
    var pendiente = false;
    function marcar() {
      pendiente = false;
      var linea = window.innerHeight * 0.4, activa = 0;
      secciones.forEach(function (s, i) { if (s && s.getBoundingClientRect().top <= linea) activa = i; });
      enlaces.forEach(function (a, i) { a.classList.toggle('activo', i === activa); });
    }
    window.addEventListener('scroll', function () { if (!pendiente) { pendiente = true; requestAnimationFrame(marcar); } }, { passive: true });
    window.addEventListener('resize', marcar);
    marcar();
  }
  function configurarRevelado() {
    var secciones = document.querySelectorAll('.revelar');
    if (!('IntersectionObserver' in window)) { secciones.forEach(function (s) { s.classList.add('visible'); }); return; }
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('visible'); obs.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    secciones.forEach(function (s) { obs.observe(s); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
