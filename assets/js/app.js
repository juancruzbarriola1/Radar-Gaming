/* Radar Gaming: lógica del tablero.
   Todo el contenido sale de data/indice.json y data/ediciones/*.json.
   Ningún texto de noticias está escrito acá: solo rótulos de la interfaz. */
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
  var SIN_DATO = 'sin dato';
  var ICONO_EXTERNO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>';

  // ---------- Estado ----------
  var estado = {
    indice: [],          // entradas del índice, ordenadas de más nueva a más vieja
    ediciones: {},       // fecha -> edición cargada (o null si falló)
    actual: null,        // edición seleccionada
    todas: [],           // noticias de todas las ediciones (hemeroteca)
    referencias: [],     // biblioteca de referencias (data/referencias.json), fuera de la ventana semanal
    refsMeta: null,      // { actualizado } o null si el archivo no existe
    refsError: null,
    graficos: {},
    ultimoFoco: null
  };

  // ---------- Utilidades ----------
  var $ = function (sel) { return document.querySelector(sel); };
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function vacio(v) { return v === null || v === undefined || (typeof v === 'string' && v.trim() === ''); }
  function texto(v) { return vacio(v) ? '<span class="sin-dato">' + SIN_DATO + '</span>' : esc(v); }
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

  function chipTema(t) {
    var info = temaInfo(t);
    var color = TEMAS[t] ? 'var(--t-' + t + ')' : 'var(--tinta-suave)';
    return '<span class="tema" style="--c:' + color + '"><span class="tema__icono"><svg viewBox="0 0 24 24" aria-hidden="true">' +
      info.icono + '</svg></span><span class="tema__texto">' + esc(info.nombre) + '</span></span>';
  }
  function enlaceFuente(nombre, url, rotulo) {
    var u = urlSegura(url);
    if (!u) return texto(nombre) + ' <span class="sin-dato">(sin enlace)</span>';
    return '<a class="enlace-fuente" href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + esc(rotulo || nombre || 'Fuente') + ICONO_EXTERNO + '</a>';
  }
  function puntos(valor, max, etiqueta) {
    var v = num(valor);
    if (v == null) return '<span class="sin-dato">' + SIN_DATO + '</span>';
    var s = '<span class="puntos" role="img" aria-label="' + esc(etiqueta || '') + ' ' + v + ' de ' + max + '" title="' + esc(etiqueta || '') + ' ' + v + ' de ' + max + '">';
    for (var i = 1; i <= max; i++) s += '<i class="' + (i <= v ? 'lleno' : '') + '"></i>';
    return s + '</span>';
  }
  function medidor(valor, max, color) {
    var v = num(valor);
    if (v == null) return '<span class="sin-dato">' + SIN_DATO + '</span>';
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
    if (!CERTEZAS[n.certeza]) return '';
    return '<span class="insignia insignia--certeza insignia--certeza-' + esc(n.certeza) + '">Certeza ' + esc(CERTEZAS[n.certeza].toLowerCase()) + '</span>';
  }
  function geoNombre(g) { return vacio(g) ? SIN_DATO : (GEOGRAFIAS[g] || String(g)); }

  // ---------- Carga de datos ----------
  function cargarJSON(ruta) {
    return fetch(ruta, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' en ' + ruta);
      return r.json();
    });
  }

  function aviso(html, tipo) {
    var el = $('#aviso');
    el.insertAdjacentHTML('beforeend', '<div class="aviso-caja' + (tipo === 'error' ? ' aviso-caja--error' : '') + '">' + html + '</div>');
  }

  function iniciar() {
    configurarTema();
    configurarCajon();
    configurarNavegacion();
    configurarRevelado();

    cargarJSON('data/indice.json').then(function (idx) {
      estado.indice = lista(idx && idx.ediciones).filter(function (e) { return e && e.archivo; })
        .sort(function (a, b) { return String(b.fecha || '').localeCompare(String(a.fecha || '')); });
      if (!estado.indice.length) {
        $('#ventana').textContent = 'Todavía no hay ediciones publicadas.';
        return;
      }
      poblarSelector();
      return Promise.all(estado.indice.map(function (e) {
        return cargarJSON(e.archivo).then(function (d) { estado.ediciones[e.fecha] = d; })
          .catch(function (err) {
            estado.ediciones[e.fecha] = null;
            aviso('No se pudo cargar la edición del ' + esc(fecha(e.fecha)) + ' (' + esc(e.archivo) + '): ' + esc(err.message));
          });
      })).then(function () {
        Array.prototype.forEach.call($('#selector-edicion').options, function (o) {
          if (!estado.ediciones[o.value]) { o.disabled = true; o.textContent += ' (no disponible)'; }
        });
        armarHemeroteca();
        return cargarReferencias();
      }).then(function () {
        if (!estado.indice.some(function (e) { return estado.ediciones[e.fecha]; })) { $('#ventana').textContent = 'No se pudo cargar ninguna edición.'; return; }
        var pedida = new URLSearchParams(location.search).get('edicion');
        var inicial = estado.indice.find(function (e) { return e.fecha === pedida && estado.ediciones[e.fecha]; }) ||
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

  // La biblioteca es opcional: si falta o falla, el tablero sigue funcionando sin ella.
  function cargarReferencias() {
    return cargarJSON('data/referencias.json').then(function (d) {
      estado.refsMeta = { actualizado: d && d.actualizado };
      estado.referencias = lista(d && d.referencias).filter(function (r) { return r && typeof r === 'object' && !vacio(r.id); });
      estado.referencias.forEach(function (r) { Object.defineProperty(r, '_ref', { value: true, enumerable: false }); });
    }).catch(function (err) {
      estado.referencias = [];
      estado.refsMeta = null;
      estado.refsError = err.message;
    });
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
    estado.actual._fecha = f;
    $('#selector-edicion').value = f;
    if (actualizarUrl) {
      var u = new URL(location.href); u.searchParams.set('edicion', f); u.hash = '';
      history.replaceState(null, '', u);
    }
    renderPortada(d);
    renderPanelPortada(d);
    renderIndicadores(d);
    renderGraficoTemas(d);
    renderDatoSemana(d);
    renderListaActual(d);
    renderFrente(d);
    renderLineaTiempo(d);
    renderAlertas(d);
    renderBrechas(d);
    renderLatam(d);
    renderRegulacion();
    renderMetodologia(d);
    renderReferenciasEstado();
  }

  function noticiasDe(d) {
    var f = d._fecha;
    return lista(d.noticias).filter(function (n) { return n && typeof n === 'object'; }).map(function (n) {
      if (!n._edicion) Object.defineProperty(n, '_edicion', { value: f, enumerable: false });
      if (n.id == null) Object.defineProperty(n, 'id', { value: 'sin-id-' + Math.random().toString(36).slice(2, 7), enumerable: false });
      return n;
    });
  }

  // ---------- Portada ----------
  function renderPortada(d) {
    var ed = d.edicion || {};
    var desde = parseFecha(ed.desde), hasta = parseFecha(ed.hasta);
    var ventana = (desde && hasta) ? 'Semana del ' + fmtLarga.format(desde) + ' al ' + fmtLarga.format(hasta) : 'Ventana analizada: ' + SIN_DATO;
    $('#ventana').textContent = (ed.numero != null ? 'Edición ' + ed.numero + ' · ' : '') + ventana;
    var tema = d.tema_de_la_semana || {};
    $('#tema-titulo').textContent = vacio(tema.titulo) ? 'Edición del ' + fecha(d._fecha) : tema.titulo;
    $('#tema-bajada').textContent = tema.bajada || '';
    var noticias = noticiasDe(d);
    var ids = lista(tema.noticia_ids);
    var chips = ids.map(function (id) {
      var n = noticias.find(function (x) { return x.id === id; });
      if (!n) return '';
      return '<button type="button" class="chip-id" data-abrir="' + esc(clave(n)) + '" title="' + esc(n.titulo) + '">' +
        esc(n.fuente || id) + ' · <span>' + esc(n.titulo || id) + '</span></button>';
    }).join('');
    $('#tema-noticias').innerHTML = chips ? '<span>Basado en:</span>' + chips : '';
  }

  // ---------- Indicadores ----------
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

    var bg = promedio(noticias.map(function (n) { return num(n.brecha_global); }));
    var bl = promedio(noticias.map(function (n) { return num(n.brecha_latam); }));
    var nl = noticias.filter(function (n) { return num(n.brecha_latam) != null; }).length;
    var verif = noticias.filter(function (n) { return n.verificada === true; }).length;

    var html = '';
    html += '<a class="indicador" href="#hemeroteca" data-filtrar-edicion="' + esc(d._fecha) + '">' +
      '<span class="indicador__rotulo">Noticias de la edición</span>' +
      '<span class="indicador__valor">' + noticias.length + '</span>' +
      '<span class="indicador__detalle">' + verif + ' verificadas en la fuente original</span></a>';
    html += '<a class="indicador" href="#fuentes-tabla">' +
      '<span class="indicador__rotulo">Fuentes que respondieron</span>' +
      '<span class="indicador__valor">' + (fuentes.length ? respondieron + '<span style="font-size:.55em;color:var(--tinta-suave)"> / ' + fuentes.length + '</span>' : '<span class="sin-dato">' + SIN_DATO + '</span>') + '</span>' +
      '<span class="indicador__detalle">' + (!fuentes.length ? 'La edición no registra fuentes' : fallaron ? fallaron + ' bloqueadas o ilegibles' : 'Ninguna bloqueada') + '</span></a>';
    html += '<div class="indicador">' +
      '<span class="indicador__rotulo">Tema más cubierto</span>' +
      '<span class="indicador__valor indicador__valor--texto">' + (top.length ? top.map(chipTema).join(' ') : '<span class="sin-dato">' + SIN_DATO + '</span>') + '</span>' +
      '<span class="indicador__detalle">' + (max ? max + ' de ' + noticias.length + ' noticias' : '') + '</span></div>';
    html += '<a class="indicador" href="#brechas">' +
      '<span class="indicador__rotulo">Brecha promedio <span class="editorial">Valoración editorial</span></span>' +
      '<span class="indicador__valor">' + (bg == null ? '<span class="sin-dato">' + SIN_DATO + '</span>' : fmtNum(bg, 1) + '<span style="font-size:.55em;color:var(--tinta-suave)"> / 5</span>') + '</span>' +
      '<span class="indicador__detalle">Global. Latinoamérica: ' + (bl == null ? '<span class="sin-dato">' + SIN_DATO + '</span>' : fmtNum(bl, 1) + ' (' + nl + ' ' + (nl === 1 ? 'noticia' : 'noticias') + ' con dato)') + '</span></a>';
    $('#indicadores').innerHTML = html;
  }

  // ---------- Gráficos (Chart.js) ----------
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
        onClick: function (e, el) { if (el.length) irAHemeroteca({ tema: temas[el[0].index] }); },
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
      plugins: [etiquetasValor('end')]
    });
  }

  // Etiqueta de valor al final de cada barra (y "sin dato" donde el valor es null).
  function etiquetasValor(modo) {
    return {
      id: 'etiquetasValor',
      afterDatasetsDraw: function (chart) {
        var c = chart.ctx;
        c.save();
        c.font = '600 12px ' + (css('--fuente') || 'sans-serif');
        chart.data.datasets.forEach(function (ds, di) {
          var meta = chart.getDatasetMeta(di);
          if (meta.hidden) return;
          meta.data.forEach(function (bar, i) {
            var v = ds.data[i];
            if (v == null) {
              if (!ds._sinDato) return;
              // Barra ausente: escribir "sin dato" en vertical sobre la línea base, para no pisar a la vecina.
              var base = chart.scales.y.getPixelForValue(0);
              var x = isFinite(bar.x) ? bar.x : null;
              if (x == null) return;
              c.save();
              c.fillStyle = css('--tinta-suave');
              c.font = 'italic 500 11px ' + (css('--fuente') || 'sans-serif');
              c.translate(x, base - 6);
              c.rotate(-Math.PI / 2);
              c.textAlign = 'left'; c.textBaseline = 'middle';
              c.fillText(SIN_DATO, 0, 0);
              c.restore();
              return;
            }
            c.fillStyle = css('--tinta-2');
            if (modo === 'end') {
              c.textAlign = 'left'; c.textBaseline = 'middle';
              c.fillText(fmtNum(v, v % 1 ? 1 : 0), bar.x + 6, bar.y);
            } else {
              c.textAlign = 'center'; c.textBaseline = 'bottom';
              c.fillText(fmtNum(v, v % 1 ? 1 : 0), bar.x, bar.y - 4);
              if (ds._n) {
                // Tamaño de muestra de cada barra, debajo del valor y en tinta suave.
                c.save();
                c.fillStyle = css('--tinta-suave');
                c.font = '500 10.5px ' + (css('--fuente') || 'sans-serif');
                c.fillText('n=' + ds._n[i], bar.x, bar.y - 19);
                c.restore();
              }
            }
          });
        });
        c.restore();
      }
    };
  }

  // ---------- Dato de la semana ----------
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

  // ---------- Lista de noticias (tarjetas) ----------
  function tarjetaNoticia(n) {
    return '<button type="button" class="noticia-boton" data-abrir="' + esc(clave(n)) + '">' +
      '<span class="noticia-boton__arriba">' + chipTema(n.tema) + '<span>' + esc(n.fuente || SIN_DATO) + ' · ' + esc(fecha(n.fecha_publicacion, true)) + '</span>' +
      '<span title="Importancia (valoración editorial)">' + puntos(n.importancia, 5, 'Importancia') + '</span></span>' +
      '<span class="noticia-boton__titulo">' + texto(n.titulo) + '</span>' +
      (vacio(n.lectura_negocio) ? '' : '<span class="noticia-boton__lectura">' + esc(n.lectura_negocio) + '</span>') +
      '</button>';
  }
  function porImportancia(a, b) { return (num(b.importancia) || 0) - (num(a.importancia) || 0); }

  function renderListaActual(d) {
    var ns = noticiasDe(d).filter(function (n) { return n.horizonte === 'promedio_actual'; }).sort(porImportancia);
    $('#lista-actual').innerHTML = ns.length ? ns.map(tarjetaNoticia).join('') : '<p class="vacio">Ninguna noticia de esta edición describe una práctica ya habitual.</p>';
  }

  // ---------- Frente a frente ----------
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

  // ---------- Línea de tiempo ----------
  // Corto y mediano: noticias de la edición + referencias. Largo: solo referencias (ver CLAUDE.md).
  function itemLinea(n) {
    return '<button type="button" class="lt__item' + (esRef(n) ? ' lt__item--ref' : '') + '" style="--c:' + (TEMAS[n.tema] ? 'var(--t-' + n.tema + ')' : 'var(--borde-fuerte)') + '" data-abrir="' + esc(clave(n)) + '">' +
      (esRef(n) ? '<span class="lt__item-ref">' + insigniaRef(n) + insigniaEvidencia(n) + '</span>' : (insigniaEvidencia(n) ? '<span class="lt__item-ref">' + insigniaEvidencia(n) + '</span>' : '')) +
      '<span class="lt__item-titulo">' + texto(n.titulo) + '</span>' +
      '<span class="lt__item-meta">' + chipTema(n.tema) + '<span>' + esc(n.fuente || SIN_DATO) + '</span>' +
      '<span title="Importancia (valoración editorial)">' + puntos(n.importancia, 5, 'Importancia') + '</span></span></button>';
  }
  function porImportanciaYTipo(a, b) { return (esRef(a) ? 1 : 0) - (esRef(b) ? 1 : 0) || porImportancia(a, b); }

  function renderLineaTiempo(d) {
    var ns = noticiasDe(d), refs = refsOk();
    var carriles = ['corto', 'mediano', 'largo'];
    var html = '<div class="lt__eje" aria-hidden="true">' + carriles.map(function (h) { return '<span>' + esc(HORIZONTES[h].plazo) + '</span>'; }).join('') + '</div>';
    html += '<div class="lt__carriles">' + carriles.map(function (h) {
      var info = HORIZONTES[h];
      var deNoticias = h === 'largo' ? [] : ns.filter(function (n) { return n.horizonte === h; });
      var deRefs = refs.filter(function (r) { return r.horizonte === h; });
      var items = deNoticias.concat(deRefs).sort(porImportanciaYTipo);
      var conteo = h === 'largo' ? deRefs.length + (deRefs.length === 1 ? ' referencia' : ' referencias')
        : deNoticias.length + (deNoticias.length === 1 ? ' noticia' : ' noticias') + ' · ' + deRefs.length + (deRefs.length === 1 ? ' referencia' : ' referencias');
      return '<div class="lt__carril"><div class="lt__carril-cabecera"><span class="lt__carril-titulo">' + esc(info.nombre) + '</span>' +
        '<span class="lt__carril-plazo">' + esc(info.plazo) + '</span></div>' +
        '<p class="lt__carril-desc">' + esc(info.desc) + ' · ' + conteo + '</p>' +
        (h === 'largo' ? '<p class="lt__carril-nota">Se alimenta solo de referencias: las noticias de una semana no alcanzan para sostener apuestas a más de tres años.</p>' : '') +
        '<div class="lt__items">' + (items.length ? items.map(itemLinea).join('') : carrilVacio(h, ns)) + '</div></div>';
    }).join('') + '</div>';
    $('#linea-tiempo').innerHTML = html;
  }

  // Un carril vacío explica por qué está vacío.
  function carrilVacio(h, ns) {
    var motivo;
    if (h === 'largo') {
      if (!estado.refsMeta) motivo = 'No se encontró la biblioteca de referencias (data/referencias.json), que es la única fuente de este carril.';
      else if (!refsOk().length) motivo = 'La biblioteca de referencias todavía no tiene referencias accesibles.';
      else motivo = 'Ninguna referencia accesible está clasificada con horizonte largo.';
      var pendientes = estado.referencias.filter(function (r) { return r.estado === 'no_accesible' && r.foco === 'largo_plazo'; });
      if (pendientes.length) motivo += ' Quedaron sin cargar por no ser accesibles: ' + pendientes.map(function (r) { return r.titulo || r.id; }).join('; ') + '.';
    } else {
      var otros = ns.filter(function (n) { return n.horizonte && n.horizonte !== h; }).length;
      motivo = 'Ninguna noticia de esta edición ni referencia de la biblioteca describe algo a ' + (h === 'corto' ? 'menos de un año' : 'uno a tres años') + '.' +
        (otros ? ' Las ' + otros + ' noticias de la edición se ubican en otros horizontes.' : '');
    }
    return '<p class="vacio vacio--explica">' + esc(motivo) + '</p>';
  }

  // ---------- Alertas ----------
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

  // ---------- Brechas ----------
  // Base: noticias de la edición + referencias accesibles. La certeza baja se excluye salvo que se marque la casilla.
  function baseBrechas(d) {
    var todos = noticiasDe(d).concat(refsOk()).filter(function (n) { return num(n.brecha_global) != null || num(n.brecha_latam) != null; });
    var incluir = $('#incluir-baja').checked;
    var bajas = todos.filter(function (n) { return n.certeza === 'baja'; });
    return { items: incluir ? todos : todos.filter(function (n) { return n.certeza !== 'baja'; }), bajas: bajas.length, incluir: incluir };
  }

  function renderBrechas(d) {
    var casilla = $('#incluir-baja');
    if (!casilla._listo) { casilla._listo = true; casilla.addEventListener('change', function () { if (estado.actual) renderBrechas(estado.actual); }); }
    var base = baseBrechas(d);
    var ns = base.items;
    var nNot = ns.filter(function (n) { return !esRef(n); }).length, nRef = ns.length - nNot;
    $('#conteo-baja').textContent = base.bajas ? '(' + base.bajas + (base.bajas === 1 ? ' excluida' : ' excluidas') + (base.incluir ? ', ahora incluidas' : '') + ')' : '(no hay)';
    $('#alcance-brechas').textContent = 'Se promedian ' + nNot + (nNot === 1 ? ' noticia' : ' noticias') + ' de la edición y ' + nRef + (nRef === 1 ? ' referencia' : ' referencias') + ' con brecha valorada.';

    var presentes = ORDEN_TEMAS.concat(ns.map(function (n) { return n.tema; }).filter(function (t, i, a) { return ORDEN_TEMAS.indexOf(t) < 0 && a.indexOf(t) === i; }))
      .filter(function (t) { return !vacio(t) && ns.some(function (n) { return n.tema === t; }); });
    var filas = presentes.map(function (t) {
      var del = ns.filter(function (n) { return n.tema === t; });
      var g = del.map(function (n) { return num(n.brecha_global); }).filter(function (x) { return x != null; });
      var l = del.map(function (n) { return num(n.brecha_latam); }).filter(function (x) { return x != null; });
      return { tema: t, total: del.length, global: promedio(g), latam: promedio(l), ng: g.length, nl: l.length };
    });
    var totalLatam = filas.reduce(function (a, f) { return a + f.nl; }, 0);
    var totalGlobal = filas.reduce(function (a, f) { return a + f.ng; }, 0);

    $('#leyenda-brechas').innerHTML =
      '<span><i style="background:var(--serie-global)"></i>Brecha global (n=' + totalGlobal + ')</span>' +
      '<span><i style="background:var(--serie-latam)"></i>Brecha Latinoamérica (n=' + totalLatam + ')</span>' +
      '<span class="sin-dato">Sin barra = sin dato · n = cantidad de valoraciones promediadas</span>';
    $('#muestra-latam').innerHTML = totalLatam
      ? '<strong>Muestra de Latinoamérica: ' + totalLatam + (totalLatam === 1 ? ' valoración' : ' valoraciones') + '</strong> frente a ' + totalGlobal + ' globales. ' +
        (totalLatam < 3 ? 'Con tan pocos datos, cada barra de Latinoamérica es una lectura puntual, no un promedio representativo.' : 'Los promedios con n bajo pesan poco: mirá el n de cada barra.')
      : '<strong>Muestra de Latinoamérica: 0.</strong> Ninguna noticia ni referencia de esta base da fundamento para valorar la brecha en la región.';

    destruir('brechas');
    if (typeof Chart !== 'undefined' && filas.length) {
      baseChart();
      var ctx = $('#grafico-brechas');
      var dsG = { label: 'Brecha global', data: filas.map(function (f) { return f.global; }), _n: filas.map(function (f) { return f.ng; }), backgroundColor: css('--serie-global'), borderRadius: 4, borderSkipped: 'start', maxBarThickness: 28, _sinDato: true };
      var dsL = { label: 'Brecha Latinoamérica', data: filas.map(function (f) { return f.latam; }), _n: filas.map(function (f) { return f.nl; }), backgroundColor: css('--serie-latam'), borderRadius: 4, borderSkipped: 'start', maxBarThickness: 28, _sinDato: true };
      ctx.setAttribute('aria-label', 'Brecha promedio por tema. ' + filas.map(function (f) {
        return temaInfo(f.tema).nombre + ': global ' + fmtNum(f.global, 1) + ' (n=' + f.ng + '), Latinoamérica ' + fmtNum(f.latam, 1) + ' (n=' + f.nl + ')';
      }).join('; '));
      estado.graficos.brechas = new Chart(ctx, {
        type: 'bar',
        data: { labels: filas.map(function (f) { return partirEtiqueta(temaInfo(f.tema).nombre); }), datasets: [dsG, dsL] },
        options: {
          responsive: true, maintainAspectRatio: false,
          layout: { padding: { top: 34 } },
          plugins: {
            legend: { display: false },
            tooltip: Object.assign(tooltipBase(), { callbacks: {
              title: function (items) { return temaInfo(filas[items[0].dataIndex].tema).nombre; },
              label: function (c) {
                var f = filas[c.dataIndex];
                var n = c.datasetIndex === 0 ? f.ng : f.nl;
                if (c.raw == null) return c.dataset.label + ': ' + SIN_DATO + ' (n=0)';
                return c.dataset.label + ': ' + fmtNum(c.raw, 1) + ' / 5 (n=' + n + ' de ' + f.total + ')';
              },
              footer: function () { return 'Valoración editorial'; }
            } })
          },
          scales: {
            y: { min: 0, max: 5, ticks: { stepSize: 1, color: css('--tinta-suave') }, grid: { color: css('--rejilla') }, border: { display: false },
              title: { display: true, text: 'Brecha (1 a 5)', color: css('--tinta-suave'), font: { size: 12 } } },
            x: { grid: { display: false }, ticks: { color: css('--tinta'), font: { size: 12, weight: '600' }, autoSkip: false, maxRotation: 0 }, border: { color: css('--borde-fuerte') } }
          }
        },
        plugins: [etiquetasValor('top')]
      });
    } else if (!filas.length) {
      destruir('brechas');
    }

    $('#tabla-brechas').innerHTML = filas.length ? '<table class="tabla"><thead><tr><th scope="col">Tema</th><th scope="col">Global</th><th scope="col">Latinoamérica</th></tr></thead><tbody>' +
      filas.map(function (f) {
        return '<tr><td>' + chipTema(f.tema) + '</td><td>' + (f.global == null ? '<span class="sin-dato">' + SIN_DATO + '</span>' : fmtNum(f.global, 1) + ' <small>(n=' + f.ng + ' de ' + f.total + ')</small>') +
          '</td><td>' + (f.latam == null ? '<span class="sin-dato">' + SIN_DATO + '</span> <small>(n=0)</small>' : fmtNum(f.latam, 1) + ' <small>(n=' + f.nl + ' de ' + f.total + ')</small>') + '</td></tr>';
      }).join('') + '</tbody></table><p class="tarjeta__ayuda" style="margin-top:8px">n: valoraciones promediadas sobre el total de noticias y referencias del tema.</p>' : '<p class="vacio">Sin datos.</p>';

    var rank = ns.slice().sort(function (a, b) {
        var ma = Math.max(num(a.brecha_global) || 0, num(a.brecha_latam) || 0), mb = Math.max(num(b.brecha_global) || 0, num(b.brecha_latam) || 0);
        return mb - ma || (num(b.brecha_global) || 0) - (num(a.brecha_global) || 0) || porImportancia(a, b);
      }).slice(0, 8);
    $('#ranking-brechas').innerHTML = rank.length ? rank.map(function (n) {
      return '<li><button type="button" data-abrir="' + esc(clave(n)) + '">' +
        '<span class="ranking__titulo">' + texto(n.titulo) + '</span>' +
        '<span class="ranking__insignias">' + (esRef(n) ? insigniaRef(n) : '') + insigniaEvidencia(n) + (n.certeza === 'baja' ? insigniaCerteza(n) : '') + '</span>' +
        '<span class="ranking__medidas"><span>' + chipTema(n.tema) + '</span>' +
        '<span>Global ' + medidor(n.brecha_global, 5, 'var(--serie-global)') + '</span>' +
        '<span>Latam ' + medidor(n.brecha_latam, 5, 'var(--serie-latam)') + '</span></span>' +
        '<span class="ranking__just">' + texto(n.justificacion_brecha) + '</span></button></li>';
    }).join('') : '<li class="vacio">Sin noticias ni referencias con brecha valorada' + (base.bajas && !base.incluir ? ' y certeza suficiente; marcá la casilla para ver las de baja certeza.' : '.') + '</li>';
  }
  function partirEtiqueta(s) {
    var p = s.split(' ');
    if (s.length < 14 || p.length < 2) return s;
    var mitad = Math.ceil(p.length / 2);
    return [p.slice(0, mitad).join(' '), p.slice(mitad).join(' ')];
  }

  // ---------- Hemeroteca ----------
  function armarHemeroteca() {
    estado.todas = [];
    estado.indice.forEach(function (e) {
      var d = estado.ediciones[e.fecha];
      if (!d) return;
      d._fecha = e.fecha;
      noticiasDe(d).forEach(function (n) { estado.todas.push(n); });
    });
    estado.todas.sort(function (a, b) {
      return String(b.fecha_publicacion || '').localeCompare(String(a.fecha_publicacion || '')) || porImportancia(a, b);
    });

    function opciones(sel, valores, todos, rot) {
      sel.innerHTML = '<option value="">' + todos + '</option>' + valores.map(function (v) {
        return '<option value="' + esc(v) + '">' + esc(rot ? rot(v) : v) + '</option>';
      }).join('');
    }
    var temas = ORDEN_TEMAS.filter(function (t) { return estado.todas.some(function (n) { return n.tema === t; }); })
      .concat(unicos('tema').filter(function (t) { return ORDEN_TEMAS.indexOf(t) < 0; }));
    opciones($('#filtro-tema'), temas, 'Todos los temas', function (t) { return temaInfo(t).nombre; });
    opciones($('#filtro-fuente'), unicos('fuente').sort(function (a, b) { return a.localeCompare(b, 'es'); }), 'Todas las fuentes');
    opciones($('#filtro-horizonte'), Object.keys(HORIZONTES).filter(function (h) { return estado.todas.some(function (n) { return n.horizonte === h; }); })
      .concat(unicos('horizonte').filter(function (h) { return !HORIZONTES[h]; })), 'Todos los horizontes', function (h) { return horizonteInfo(h).nombre; });
    opciones($('#filtro-edicion'), estado.indice.filter(function (e) { return estado.ediciones[e.fecha]; }).map(function (e) { return e.fecha; }),
      'Todas las ediciones', function (f) { var e = estado.indice.find(function (x) { return x.fecha === f; }); return (e && e.numero != null ? 'N.º ' + e.numero + ' · ' : '') + fecha(f, true); });

    ['#filtro-tema', '#filtro-fuente', '#filtro-horizonte', '#filtro-edicion'].forEach(function (s) { $(s).addEventListener('change', renderTabla); });
    var t;
    $('#filtro-texto').addEventListener('input', function () { clearTimeout(t); t = setTimeout(renderTabla, 120); });
    $('#filtro-limpiar').addEventListener('click', function () {
      ['#filtro-tema', '#filtro-fuente', '#filtro-horizonte', '#filtro-edicion', '#filtro-texto'].forEach(function (s) { $(s).value = ''; });
      renderTabla();
    });
    $('#tabla-hemeroteca').classList.add('tabla--tarjetas');
    $('#tabla-hemeroteca tbody').addEventListener('keydown', function (e) {
      var tr = e.target.closest('tr[data-abrir]');
      if (tr && (e.key === 'Enter' || e.key === ' ') && e.target === tr) { e.preventDefault(); abrirDetalle(tr.getAttribute('data-abrir')); }
    });
    renderTabla();
  }
  function unicos(campo) {
    return estado.todas.map(function (n) { return n[campo]; }).filter(function (v, i, a) { return !vacio(v) && a.indexOf(v) === i; });
  }
  function normalizar(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

  function renderTabla() {
    var ft = $('#filtro-tema').value, ff = $('#filtro-fuente').value, fh = $('#filtro-horizonte').value, fe = $('#filtro-edicion').value;
    var q = normalizar($('#filtro-texto').value.trim());
    var res = estado.todas.filter(function (n) {
      if (ft && n.tema !== ft) return false;
      if (ff && n.fuente !== ff) return false;
      if (fh && n.horizonte !== fh) return false;
      if (fe && n._edicion !== fe) return false;
      if (q) {
        var hay = normalizar([n.titulo, n.fuente, n.resumen_propio, n.lectura_negocio, n.dato_clave, temaInfo(n.tema).nombre].join(' '));
        if (q.split(/\s+/).some(function (p) { return hay.indexOf(p) < 0; })) return false;
      }
      return true;
    });
    $('#conteo-hemeroteca').textContent = 'Mostrando ' + res.length + ' de ' + estado.todas.length + (estado.todas.length === 1 ? ' noticia' : ' noticias') +
      ' de ' + Object.keys(estado.ediciones).filter(function (k) { return estado.ediciones[k]; }).length + ' edición(es).';
    var tbody = $('#tabla-hemeroteca tbody');
    if (!res.length) { tbody.innerHTML = '<tr><td colspan="7" class="vacio">Ninguna noticia coincide con los filtros.</td></tr>'; return; }
    tbody.innerHTML = res.map(function (n) {
      var u = urlSegura(n.url);
      return '<tr tabindex="0" data-abrir="' + esc(clave(n)) + '" aria-label="Abrir detalle: ' + esc(n.titulo) + '">' +
        '<td class="tabla__fecha" data-rotulo="Fecha">' + esc(fecha(n.fecha_publicacion, true)) + '</td>' +
        '<td class="tabla__titulo">' + texto(n.titulo) + (n.verificada === true ? '' : ' <span class="insignia insignia--no">⚠ Sin verificar</span>') + '</td>' +
        '<td data-rotulo="Tema">' + chipTema(n.tema) + '</td>' +
        '<td data-rotulo="Fuente">' + texto(n.fuente) + '</td>' +
        '<td data-rotulo="Horizonte">' + esc(horizonteInfo(n.horizonte).nombre) + '</td>' +
        '<td data-rotulo="Importancia">' + puntos(n.importancia, 5, 'Importancia') + '</td>' +
        '<td class="tabla__enlace">' + (u ? '<a class="enlace-fuente" href="' + esc(u) + '" target="_blank" rel="noopener noreferrer" data-no-abrir>Original' + ICONO_EXTERNO + '</a>' : '<span class="sin-dato">sin enlace</span>') + '</td></tr>';
    }).join('');
  }

  function irAHemeroteca(filtros) {
    ['#filtro-tema', '#filtro-fuente', '#filtro-horizonte', '#filtro-edicion', '#filtro-texto'].forEach(function (s) { $(s).value = ''; });
    if (filtros.tema) $('#filtro-tema').value = filtros.tema;
    if (filtros.edicion) $('#filtro-edicion').value = filtros.edicion;
    else if (estado.actual) $('#filtro-edicion').value = estado.actual._fecha;
    renderTabla();
    $('#hemeroteca').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------- Metodología / fuentes ----------
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

  // ---------- Panel de la portada ----------
  function renderPanelPortada(d) {
    var ns = noticiasDe(d);
    var fuentes = lista(d.fuentes_consultadas);
    var resp = fuentes.filter(function (f) { return f && (f.estado === 'ok' || f.estado === 'sin_novedades'); }).length;
    var ok = refsOk();
    var latam = latamItems(d);
    var reg = estado.referencias.filter(function (r) { return r.foco === 'regulacion_pi'; });
    var largo = ok.filter(function (r) { return r.horizonte === 'largo'; }).length;
    function fila(valor, rotulo, href) {
      return '<a class="panel__fila" href="' + href + '"><span class="panel__valor">' + valor + '</span><span class="panel__rotulo">' + rotulo + '</span></a>';
    }
    var html = '<h2 class="panel__titulo">Esta edición</h2>' +
      fila(ns.length, 'noticias de la semana' + (fuentes.length ? ', de ' + resp + ' fuentes que respondieron sobre ' + fuentes.length : ''), '#hoy') +
      '<h2 class="panel__titulo">Biblioteca de referencias</h2>';
    if (!estado.refsMeta) {
      html += '<p class="vacio vacio--explica">No se encontró data/referencias.json. El tablero funciona solo con las noticias de la edición.</p>';
    } else {
      html += fila(ok.length + '<small> / ' + estado.referencias.length + '</small>', 'referencias accesibles' + (estado.referencias.length - ok.length ? ' (' + (estado.referencias.length - ok.length) + ' no se pudieron abrir)' : ''), '#metodologia') +
        fila(largo, 'con horizonte largo (3+ años)', '#futuro') +
        fila(latam.length, 'datos con foco en Latinoamérica', '#latam') +
        fila(reg.filter(function (r) { return r.estado === 'ok'; }).length, 'sobre regulación y propiedad intelectual', '#regulacion') +
        (estado.refsMeta.actualizado ? '<p class="panel__pie">Actualizada el ' + esc(fecha(estado.refsMeta.actualizado)) + '. Las referencias no son noticias de la semana.</p>' : '');
    }
    $('#portada-panel').innerHTML = html;
  }

  // ---------- Tarjetas de referencias (Latam y Regulación) ----------
  function diferenciaBrecha(n) {
    var g = num(n.brecha_global), l = num(n.brecha_latam);
    if (g == null || l == null) return '';
    var dif = l - g;
    var txt = dif === 0 ? 'igual a la global' : (dif > 0 ? dif + (dif === 1 ? ' punto mayor' : ' puntos mayor') + ' que la global' : (-dif) + ((-dif) === 1 ? ' punto menor' : ' puntos menor') + ' que la global');
    return '<p class="ref-tarjeta__brecha">Brecha global ' + medidor(g, 5, 'var(--serie-global)') + ' · Latam ' + medidor(l, 5, 'var(--serie-latam)') +
      ' <strong>→ en Latinoamérica es ' + txt + '</strong>' + (n.certeza === 'baja' ? ' ' + insigniaCerteza(n) : '') + '</p>';
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
      diferenciaBrecha(n) +
      (esRef(n) && !vacio(n.nota_calidad) ? '<p class="ref-tarjeta__nota"><strong>Calidad:</strong> ' + esc(n.nota_calidad) + '</p>' : '') +
      '<div class="ref-tarjeta__pie"><span>Publica: <strong>' + texto(n.fuente) + '</strong></span>' + (u ? enlaceFuente(n.fuente, u, 'Fuente original') : '<span class="sin-dato">sin enlace</span>') + '</div></article>';
  }

  // Referencias con geografía latam + noticias de la edición con base para valorar la región.
  function latamItems(d) {
    var refs = refsOk().filter(function (r) { return r.geografia === 'latam'; });
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
    html += pendientes.map(tarjetaRef).join('');
    $('#latam-tarjetas').innerHTML = html;
  }
  function renderRegulacion() {
    var refs = estado.referencias.filter(function (r) { return r.foco === 'regulacion_pi'; })
      .sort(function (a, b) { return (a.estado === 'ok' ? 0 : 1) - (b.estado === 'ok' ? 0 : 1) || String(b.fecha_publicacion || '').localeCompare(String(a.fecha_publicacion || '')); });
    $('#regulacion-tarjetas').innerHTML = refs.length ? refs.map(tarjetaRef).join('') :
      '<p class="vacio vacio--explica">' + (!estado.refsMeta ? 'No se encontró la biblioteca de referencias (data/referencias.json), que alimenta este bloque.' : 'La biblioteca no tiene referencias con foco en regulación y propiedad intelectual.') + '</p>';
  }

  // ---------- Estado de la biblioteca (metodología) ----------
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

  // ---------- Cajón de detalle ----------
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

  function abrirDetalle(k, sinHash) {
    var n = buscarNoticia(k);
    if (!n) return;
    var u = urlSegura(n.url);
    var h = horizonteInfo(n.horizonte);
    var verif = n.verificada === true;
    var ref = esRef(n);
    $('#cajon-etiqueta').textContent = ref ? 'Detalle de la referencia' : 'Detalle de la noticia';
    var html = '<div class="cajon__meta">' + chipTema(n.tema) + (ref ? insigniaRef(n) : '') + insigniaVerificada(n) +
      (ref ? (vacio(n.tipo_documento) ? '' : '<span>' + esc(TIPOS_DOC[n.tipo_documento] || n.tipo_documento) + '</span>') + '<span>Geografía: ' + esc(geoNombre(n.geografia)) + '</span>'
        : (vacio(n.tipo) ? '' : '<span>' + esc(TIPOS[n.tipo] || n.tipo) + '</span>')) + '</div>' +
      '<h2 class="cajon__titulo" id="cajon-titulo">' + texto(n.titulo) + '</h2>' +
      '<p class="cajon__fuente"><strong>' + texto(n.fuente) + '</strong> · ' + (vacio(n.fecha_publicacion) ? 'Fecha de publicación: <span class="sin-dato">' + SIN_DATO + '</span>' : 'Publicada el ' + esc(fecha(n.fecha_publicacion))) + '</p>' +
      (ref ? '<p class="nota">Referencia de la biblioteca: está fuera de la ventana semanal y no forma parte de las noticias de ninguna edición.</p>' : '') +
      (ref && !vacio(n.nota_calidad) ? '<div class="bloque bloque--calidad"><h4>Nota de calidad</h4><p>' + esc(n.nota_calidad) + '</p></div>' : '') +
      (u ? '<a class="boton-original" href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">Leer la nota original' + ICONO_EXTERNO + '</a><p class="cajon__url">' + esc(u) + '</p>'
         : '<p class="nota">Esta noticia no tiene enlace a la nota original.</p>') +
      (verif ? '' : '<p class="nota">No se pudo abrir la nota original al elaborar la edición: el resumen no incluye cifras y conviene contrastarlo.</p>') +
      '<div class="bloque"><h4>Resumen</h4><p>' + texto(n.resumen_propio) + '</p></div>' +
      '<div class="bloque"><h4>Lectura de negocio</h4><p>' + texto(n.lectura_negocio) + '</p></div>' +
      '<div class="bloque bloque--dato"><h4>Dato clave (de la fuente)</h4><p>' + texto(n.dato_clave) + '</p></div>' +
      '<div class="bloque valoraciones"><h4>Valoraciones <span class="editorial">Valoración editorial</span></h4><dl>' +
        '<dt>Importancia</dt><dd>' + medidor(n.importancia, 5) + '</dd>' +
        '<dt>Horizonte</dt><dd>' + esc(h.nombre) + (h.plazo && n.horizonte !== 'promedio_actual' ? ' (' + esc(h.plazo) + ')' : '') + '</dd>' +
        '<dt>Fase</dt><dd>' + (vacio(n.fase_curva) ? '<span class="sin-dato">' + SIN_DATO + '</span>' : esc(FASES[n.fase_curva] || n.fase_curva)) + '</dd>' +
        '<dt>Adopción global</dt><dd>' + medidor(n.adopcion, 10) + '</dd>' +
        '<dt>Adopción Latam</dt><dd>' + medidor(n.adopcion_latam, 10, 'var(--serie-latam)') + '</dd>' +
        '<dt>Impacto</dt><dd>' + medidor(n.impacto, 10) + '</dd>' +
        '<dt>Clasificación</dt><dd>' + (vacio(n.cuadrante) ? '<span class="sin-dato">' + SIN_DATO + '</span>' : esc(CUADRANTES[n.cuadrante] || n.cuadrante)) + '</dd>' +
        '<dt>Brecha global</dt><dd>' + medidor(n.brecha_global, 5, 'var(--serie-global)') + '</dd>' +
        '<dt>Brecha Latam</dt><dd>' + medidor(n.brecha_latam, 5, 'var(--serie-latam)') + '</dd>' +
        '<dt>Evidencia</dt><dd>' + (EVIDENCIAS[n.tipo_evidencia] ? esc(EVIDENCIAS[n.tipo_evidencia].nombre) : '<span class="sin-dato">' + SIN_DATO + '</span>') + '</dd>' +
        '<dt>Certeza</dt><dd>' + (CERTEZAS[n.certeza] ? insigniaCerteza(n) : '<span class="sin-dato">' + SIN_DATO + '</span>') + '</dd>' +
      '</dl></div>' +
      '<div class="bloque"><h4>Por qué esa brecha</h4><p>' + texto(n.justificacion_brecha) + '</p></div>' +
      '<p class="tarjeta__ayuda">' + (ref ? 'Biblioteca de referencias' + (estado.refsMeta && estado.refsMeta.actualizado ? ', actualizada el ' + esc(fecha(estado.refsMeta.actualizado)) : '') : 'Edición del ' + esc(fecha(n._edicion))) + ' · id ' + esc(n.id) + '</p>';
    $('#cajon-cuerpo').innerHTML = html;
    $('#cajon-cuerpo').scrollTop = 0;

    var cajon = $('#cajon'), fondo = $('#cajon-fondo');
    if (!cajon.classList.contains('abierto')) estado.ultimoFoco = document.activeElement;
    fondo.hidden = false;
    requestAnimationFrame(function () { fondo.classList.add('abierto'); cajon.classList.add('abierto'); });
    cajon.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { $('#cajon-cerrar').focus(); }, 60);
    if (!sinHash) history.replaceState(null, '', '#noticia=' + encodeURIComponent(k));
  }

  function cerrarDetalle() {
    var cajon = $('#cajon'), fondo = $('#cajon-fondo');
    if (!cajon.classList.contains('abierto')) return;
    cajon.classList.remove('abierto'); fondo.classList.remove('abierto');
    cajon.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    setTimeout(function () { fondo.hidden = true; }, 260);
    if (location.hash.indexOf('#noticia=') === 0) history.replaceState(null, '', location.pathname + location.search);
    if (estado.ultimoFoco && estado.ultimoFoco.focus) estado.ultimoFoco.focus();
  }

  function abrirDesdeHash() {
    var m = location.hash.match(/^#noticia=(.+)$/);
    if (m) abrirDetalle(decodeURIComponent(m[1]), true);
  }

  function configurarCajon() {
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-no-abrir]')) return;
      var a = e.target.closest('[data-abrir]');
      if (a) { e.preventDefault(); abrirDetalle(a.getAttribute('data-abrir')); return; }
      var f = e.target.closest('[data-filtrar-edicion]');
      if (f) { e.preventDefault(); irAHemeroteca({ edicion: f.getAttribute('data-filtrar-edicion') }); }
    });
    $('#cajon-cerrar').addEventListener('click', cerrarDetalle);
    $('#cajon-fondo').addEventListener('click', cerrarDetalle);
    document.addEventListener('keydown', function (e) {
      var cajon = $('#cajon');
      if (!cajon.classList.contains('abierto')) return;
      if (e.key === 'Escape') { cerrarDetalle(); return; }
      if (e.key === 'Tab') {
        var foc = cajon.querySelectorAll('a[href], button, [tabindex="0"]');
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
  function repintarGraficos() {
    if (!estado.actual) return;
    renderGraficoTemas(estado.actual);
    renderBrechas(estado.actual);
  }
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
  function configurarNavegacion() {
    var enlaces = Array.prototype.slice.call(document.querySelectorAll('.navegacion a'));
    if (!('IntersectionObserver' in window)) return;
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (en.isIntersecting) {
          enlaces.forEach(function (a) { a.classList.toggle('activo', a.getAttribute('href') === '#' + en.target.id); });
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    enlaces.forEach(function (a) { var s = document.querySelector(a.getAttribute('href')); if (s) obs.observe(s); });
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
