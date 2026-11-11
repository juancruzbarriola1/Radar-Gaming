#!/usr/bin/env python3
"""Valida ediciones y la biblioteca de referencias del Radar Gaming contra el
esquema definido en CLAUDE.md.

Uso:
    python scripts/validar.py data/ediciones/AAAA-MM-DD.json
    python scripts/validar.py data/referencias.json
    python scripts/validar.py            (valida todas las ediciones y las referencias)

Imprime cada error (con el id de la noticia cuando corresponde) y sale con
código 1 si hay errores, 2 si el archivo no se puede leer, 0 si todo está bien.
Solo usa la biblioteca estándar de Python.
"""

import glob
import json
import os
import re
import sys
from datetime import date

TEMAS = {"cloud_gaming", "digitalizacion", "ia_clonacion_pirateria",
         "ia_desarrollo", "regulacion_pi", "mercado"}
HORIZONTES = {"promedio_actual", "corto", "mediano", "largo"}
FASES_CURVA = {"disparador", "pico", "abismo", "pendiente", "meseta"}
CUADRANTES = {"estrella", "interrogante", "vaca_lechera", "perro"}
TIPOS_ALERTA = {"oportunidad", "riesgo"}
ESTADOS_FUENTE = {"ok", "bloqueada", "sin_novedades", "requiere_js", "manual"}
TIPOS_NOTICIA = {"noticia", "analisis", "reporte", "encuesta", "opinion"}
CERTEZAS = {"alta", "media", "baja"}
TIPOS_EVIDENCIA = {"dato_medido", "pronostico", "opinion", "especulacion"}
TIPOS_DOCUMENTO = {"prensa_datos", "reporte", "paper", "analisis", "opinion_experta",
                   "analisis_legal", "posicionamiento_industria", "secundaria"}
FOCOS = TEMAS | {"latam", "largo_plazo"}
ESTADOS_REFERENCIA = {"ok", "no_accesible"}
# Palabras que la justificación debe contener cuando una brecha tiene certeza baja.
MARCAS_CERTEZA_BAJA = ("certeza baja", "especulativ", "no ocurri")

UMBRAL_ADOPCION = 5
UMBRAL_IMPACTO = 6
MAX_PALABRAS_RESUMEN = 90  # máximo de palabras permitido en resumen_propio (inclusive)

CAMPOS_EDICION = ["edicion", "tema_de_la_semana", "dato_de_la_semana",
                  "fuentes_consultadas", "noticias", "frente_a_frente",
                  "alertas", "limitaciones"]
CAMPOS_META = ["numero", "fecha", "desde", "hasta"]
CAMPOS_TEMA_SEMANA = ["titulo", "bajada", "noticia_ids"]
CAMPOS_DATO_SEMANA = ["cifra", "texto", "fuente", "url"]
CAMPOS_FUENTE = ["id", "nombre", "url", "estado", "nota"]
CAMPOS_NOTICIA = ["id", "fuente", "url", "fecha_publicacion", "titulo", "tipo",
                  "tema", "resumen_propio", "dato_clave", "lectura_negocio",
                  "importancia", "horizonte", "fase_curva", "adopcion",
                  "adopcion_latam", "impacto", "cuadrante", "brecha_global",
                  "brecha_latam", "justificacion_brecha", "tipo_evidencia", "certeza",
                  "verificada"]
CAMPOS_REFERENCIA = CAMPOS_NOTICIA + ["tipo_documento", "foco", "geografia",
                                      "estado", "nota_calidad"]
# En una referencia no accesible estos campos van en null (no hay base para valorarlos).
VALORACIONES = ["importancia", "horizonte", "fase_curva", "adopcion", "adopcion_latam",
                "impacto", "cuadrante", "brecha_global", "brecha_latam",
                "tipo_evidencia", "certeza"]
CAMPOS_FRENTE_ITEM = ["titulo", "texto", "fuentes"]
CAMPOS_ALERTA = ["tipo", "fuente", "url", "fecha", "titulo", "resumen",
                 "por_que_importa"]


class Validador:
    def __init__(self):
        self.errores = []

    def error(self, donde, mensaje):
        self.errores.append(f"[{donde}] {mensaje}")

    # --- utilidades -------------------------------------------------------

    def requeridos(self, obj, campos, donde):
        """Verifica que obj sea un dict con todos los campos. Devuelve True si es dict."""
        if not isinstance(obj, dict):
            self.error(donde, "debe ser un objeto JSON")
            return False
        for campo in campos:
            if campo not in obj:
                self.error(donde, f"falta el campo obligatorio '{campo}'")
        return True

    def fecha(self, valor, donde, campo):
        if not isinstance(valor, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", valor):
            self.error(donde, f"'{campo}' debe ser una fecha AAAA-MM-DD (recibido: {valor!r})")
            return None
        try:
            return date.fromisoformat(valor)
        except ValueError:
            self.error(donde, f"'{campo}' no es una fecha válida (recibido: {valor!r})")
            return None

    def enum(self, obj, campo, valores, donde):
        if campo in obj and obj[campo] not in valores:
            self.error(donde, f"'{campo}' inválido: {obj[campo]!r}. "
                              f"Valores permitidos: {', '.join(sorted(valores))}")

    def entero_rango(self, obj, campo, minimo, maximo, donde, nullable=False):
        if campo not in obj:
            return
        v = obj[campo]
        if v is None and nullable:
            return
        if isinstance(v, bool) or not isinstance(v, int) or not (minimo <= v <= maximo):
            extra = " o null" if nullable else ""
            self.error(donde, f"'{campo}' debe ser entero entre {minimo} y {maximo}{extra} (recibido: {v!r})")

    def numero_rango(self, obj, campo, minimo, maximo, donde, nullable=False):
        if campo not in obj:
            return None
        v = obj[campo]
        if v is None and nullable:
            return None
        if isinstance(v, bool) or not isinstance(v, (int, float)) or not (minimo <= v <= maximo):
            extra = " o null" if nullable else ""
            self.error(donde, f"'{campo}' debe ser un número entre {minimo} y {maximo}{extra} (recibido: {v!r})")
            return None
        return v

    def url(self, valor, donde, campo="url"):
        if not isinstance(valor, str) or not valor.startswith("http"):
            self.error(donde, f"'{campo}' debe empezar con http (recibido: {valor!r})")

    # --- secciones --------------------------------------------------------

    def validar(self, data):
        if not self.requeridos(data, CAMPOS_EDICION, "edicion"):
            return

        desde, hasta = self.validar_meta(data.get("edicion"))
        ids = self.validar_noticias(data.get("noticias"), desde, hasta)
        self.validar_tema_semana(data.get("tema_de_la_semana"), ids)
        self.validar_dato_semana(data.get("dato_de_la_semana"))
        self.validar_fuentes(data.get("fuentes_consultadas"))
        self.validar_frente(data.get("frente_a_frente"))
        self.validar_alertas(data.get("alertas"))
        if "limitaciones" in data and not isinstance(data["limitaciones"], list):
            self.error("limitaciones", "debe ser una lista de textos")

    def validar_meta(self, meta):
        donde = "edicion"
        if not self.requeridos(meta, CAMPOS_META, donde):
            return None, None
        n = meta.get("numero")
        if "numero" in meta and (isinstance(n, bool) or not isinstance(n, int) or n < 1):
            self.error(donde, f"'numero' debe ser un entero >= 1 (recibido: {n!r})")
        if "fecha" in meta:
            self.fecha(meta["fecha"], donde, "fecha")
        desde = self.fecha(meta["desde"], donde, "desde") if "desde" in meta else None
        hasta = self.fecha(meta["hasta"], donde, "hasta") if "hasta" in meta else None
        if desde and hasta and desde > hasta:
            self.error(donde, f"'desde' ({desde}) es posterior a 'hasta' ({hasta})")
            return None, None
        return desde, hasta

    def validar_noticias(self, noticias, desde, hasta):
        ids = set()
        if not isinstance(noticias, list):
            self.error("noticias", "debe ser una lista")
            return ids
        for i, n in enumerate(noticias):
            nid = n.get("id") if isinstance(n, dict) else None
            donde = f"noticia {nid}" if nid else f"noticia #{i + 1} (sin id)"
            if not self.requeridos(n, CAMPOS_NOTICIA, donde):
                continue

            # ids únicos
            if nid:
                if nid in ids:
                    self.error(donde, f"id duplicado: {nid!r}")
                ids.add(nid)

            # url y fecha dentro de la ventana
            if "url" in n:
                self.url(n["url"], donde)
            if "fecha_publicacion" in n:
                f = self.fecha(n["fecha_publicacion"], donde, "fecha_publicacion")
                if f and desde and hasta and not (desde <= f <= hasta):
                    self.error(donde, f"fecha_publicacion {f} fuera de la ventana de la edición ({desde} a {hasta})")
            self.validar_item(n, donde)
        return ids

    def validar_item(self, n, donde, valoraciones_nulas=False):
        """Controles comunes a noticias y referencias (enums, rangos, cuadrante, resumen, certeza)."""
        if valoraciones_nulas:
            for campo in VALORACIONES + ["dato_clave", "resumen_propio"]:
                if n.get(campo) is not None:
                    self.error(donde, f"referencia no accesible: '{campo}' debe ser null (recibido: {n[campo]!r})")
            if n.get("verificada") is not False:
                self.error(donde, "referencia no accesible: 'verificada' debe ser false")
            return

        # enums
        self.enum(n, "tema", TEMAS, donde)
        self.enum(n, "horizonte", HORIZONTES, donde)
        self.enum(n, "fase_curva", FASES_CURVA, donde)
        self.enum(n, "cuadrante", CUADRANTES, donde)
        self.enum(n, "tipo", TIPOS_NOTICIA, donde)
        self.enum(n, "tipo_evidencia", TIPOS_EVIDENCIA, donde)
        self.enum(n, "certeza", CERTEZAS, donde)

        # certeza coherente con el tipo de evidencia
        if n.get("tipo_evidencia") == "especulacion" and n.get("certeza") in CERTEZAS and n["certeza"] != "baja":
            self.error(donde, f"tipo_evidencia 'especulacion' exige certeza 'baja' (recibido: {n['certeza']!r})")
        if n.get("certeza") == "baja" and (n.get("brecha_global") is not None or n.get("brecha_latam") is not None):
            just = str(n.get("justificacion_brecha") or "").lower()
            if not any(m in just for m in MARCAS_CERTEZA_BAJA):
                self.error(donde, "brecha con certeza baja: 'justificacion_brecha' debe decir que es especulativa "
                                  "(por ejemplo, 'Certeza baja: ...')")

        # rangos
        self.entero_rango(n, "importancia", 1, 5, donde)
        self.entero_rango(n, "brecha_global", 1, 5, donde, nullable=True)
        self.entero_rango(n, "brecha_latam", 1, 5, donde, nullable=True)
        adopcion = self.numero_rango(n, "adopcion", 0, 10, donde)
        impacto = self.numero_rango(n, "impacto", 0, 10, donde)
        self.numero_rango(n, "adopcion_latam", 0, 10, donde, nullable=True)

        # cuadrante coherente con los umbrales
        if adopcion is not None and impacto is not None and n.get("cuadrante") in CUADRANTES:
            esperado = cuadrante_esperado(adopcion, impacto)
            if n["cuadrante"] != esperado:
                self.error(donde, f"cuadrante {n['cuadrante']!r} incoherente con adopcion={adopcion} "
                                  f"e impacto={impacto}: debería ser {esperado!r}")

        # resumen propio
        resumen = n.get("resumen_propio")
        if "resumen_propio" in n:
            if not isinstance(resumen, str) or not resumen.strip():
                self.error(donde, "'resumen_propio' debe ser un texto no vacío")
            else:
                palabras = len(resumen.split())
                if palabras > MAX_PALABRAS_RESUMEN:
                    self.error(donde, f"'resumen_propio' tiene {palabras} palabras "
                                      f"(máximo {MAX_PALABRAS_RESUMEN})")

        # verificada
        verificada = n.get("verificada")
        if "verificada" in n and not isinstance(verificada, bool):
            self.error(donde, f"'verificada' debe ser true o false (recibido: {verificada!r})")
        if verificada is False:
            dato = n.get("dato_clave")
            if isinstance(dato, str) and re.search(r"\d", dato):
                self.error(donde, f"noticia no verificada con cifras en 'dato_clave': {dato!r}")

    def validar_tema_semana(self, tema, ids):
        donde = "tema_de_la_semana"
        if not self.requeridos(tema, CAMPOS_TEMA_SEMANA, donde):
            return
        refs = tema.get("noticia_ids")
        if "noticia_ids" in tema and not isinstance(refs, list):
            self.error(donde, "'noticia_ids' debe ser una lista")
        elif isinstance(refs, list):
            for ref in refs:
                if ref not in ids:
                    self.error(donde, f"'noticia_ids' referencia una noticia inexistente: {ref!r}")

    def validar_dato_semana(self, dato):
        donde = "dato_de_la_semana"
        if not self.requeridos(dato, CAMPOS_DATO_SEMANA, donde):
            return
        if dato.get("url"):
            self.url(dato["url"], donde)

    def validar_fuentes(self, fuentes):
        if not isinstance(fuentes, list):
            self.error("fuentes_consultadas", "debe ser una lista")
            return
        for i, f in enumerate(fuentes):
            fid = f.get("id") if isinstance(f, dict) else None
            donde = f"fuente {fid}" if fid else f"fuente #{i + 1} (sin id)"
            if self.requeridos(f, CAMPOS_FUENTE, donde):
                self.enum(f, "estado", ESTADOS_FUENTE, donde)

    def validar_frente(self, frente):
        donde = "frente_a_frente"
        if not self.requeridos(frente, ["coincidencias", "diferencias"], donde):
            return
        for clave in ("coincidencias", "diferencias"):
            items = frente.get(clave)
            if clave in frente and not isinstance(items, list):
                self.error(donde, f"'{clave}' debe ser una lista")
                continue
            for i, item in enumerate(items or []):
                self.requeridos(item, CAMPOS_FRENTE_ITEM, f"{donde}.{clave} #{i + 1}")

    def validar_alertas(self, alertas):
        if not isinstance(alertas, list):
            self.error("alertas", "debe ser una lista")
            return
        for i, a in enumerate(alertas):
            donde = f"alerta #{i + 1}"
            if not self.requeridos(a, CAMPOS_ALERTA, donde):
                continue
            self.enum(a, "tipo", TIPOS_ALERTA, donde)
            if "url" in a:
                self.url(a["url"], donde)
            if a.get("fecha"):
                self.fecha(a["fecha"], donde, "fecha")


    # --- biblioteca de referencias ---------------------------------------

    def validar_referencias(self, data):
        if not self.requeridos(data, ["actualizado", "referencias"], "referencias.json"):
            return
        actualizado = self.fecha(data.get("actualizado"), "referencias.json", "actualizado") if "actualizado" in data else None
        refs = data.get("referencias")
        if not isinstance(refs, list):
            self.error("referencias.json", "'referencias' debe ser una lista")
            return
        ids = set()
        for i, r in enumerate(refs):
            rid = r.get("id") if isinstance(r, dict) else None
            donde = f"referencia {rid}" if rid else f"referencia #{i + 1} (sin id)"
            if not self.requeridos(r, CAMPOS_REFERENCIA, donde):
                continue
            if rid:
                if rid in ids:
                    self.error(donde, f"id duplicado: {rid!r}")
                ids.add(rid)
            self.url(r.get("url"), donde)
            for campo in ("fuente", "titulo"):
                if not isinstance(r.get(campo), str) or not r[campo].strip():
                    self.error(donde, f"'{campo}' debe ser un texto no vacío")
            if r.get("fecha_publicacion") is not None:
                f = self.fecha(r["fecha_publicacion"], donde, "fecha_publicacion")
                if f and actualizado and f > actualizado:
                    self.error(donde, f"fecha_publicacion {f} posterior a 'actualizado' ({actualizado})")
            self.enum(r, "estado", ESTADOS_REFERENCIA, donde)
            self.enum(r, "tipo_documento", TIPOS_DOCUMENTO, donde)
            self.enum(r, "foco", FOCOS, donde)
            self.enum(r, "tema", TEMAS, donde)
            geo = r.get("geografia")
            if not isinstance(geo, str) or not geo.strip():
                self.error(donde, "'geografia' debe ser 'global', 'latam' u otra región nombrada")
            nota = r.get("nota_calidad")
            if nota is not None and (not isinstance(nota, str) or not nota.strip()):
                self.error(donde, "'nota_calidad' debe ser un texto o null")
            if r.get("estado") == "no_accesible":
                if not nota:
                    self.error(donde, "referencia no accesible: 'nota_calidad' debe explicar el motivo")
                self.validar_item(r, donde, valoraciones_nulas=True)
            elif r.get("estado") == "ok":
                self.validar_item(r, donde)


def cuadrante_esperado(adopcion, impacto):
    if adopcion >= UMBRAL_ADOPCION:
        return "estrella" if impacto >= UMBRAL_IMPACTO else "vaca_lechera"
    return "interrogante" if impacto >= UMBRAL_IMPACTO else "perro"


def validar_archivo(ruta):
    """Valida un archivo; devuelve 0 si está bien, 1 si hay errores, 2 si no se puede leer."""
    try:
        with open(ruta, encoding="utf-8") as fh:
            data = json.load(fh)
    except (OSError, json.JSONDecodeError) as exc:
        print(f"ERROR: no se pudo leer {ruta}: {exc}", file=sys.stderr)
        return 2

    v = Validador()
    es_referencias = isinstance(data, dict) and "referencias" in data and "noticias" not in data
    if es_referencias:
        v.validar_referencias(data)
    else:
        v.validar(data)
    if v.errores:
        for e in v.errores:
            print(f"ERROR {e}")
        print(f"\n{len(v.errores)} error(es) en {ruta}")
        return 1
    if es_referencias:
        refs = data["referencias"]
        ok = sum(1 for r in refs if r.get("estado") == "ok")
        print(f"OK: {ruta} cumple el esquema ({len(refs)} referencias, {ok} accesibles, {len(refs) - ok} no accesibles)")
    else:
        print(f"OK: {ruta} cumple el esquema ({len(data['noticias'])} noticias)")
    return 0


def main(argv):
    if len(argv) > 2:
        print("Uso: python scripts/validar.py [ruta/a/archivo.json]", file=sys.stderr)
        return 2
    if len(argv) == 2:
        return validar_archivo(argv[1])
    # Sin argumentos: todas las ediciones y, si existe, la biblioteca de referencias.
    raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    rutas = sorted(glob.glob(os.path.join(raiz, "data", "ediciones", "*.json")))
    refs = os.path.join(raiz, "data", "referencias.json")
    if os.path.exists(refs):
        rutas.append(refs)
    if not rutas:
        print("No hay archivos para validar.", file=sys.stderr)
        return 2
    return max(validar_archivo(r) for r in rutas)


if __name__ == "__main__":
    sys.exit(main(sys.argv))
