#!/usr/bin/env python3
"""Valida una edición del Radar Gaming contra el esquema definido en CLAUDE.md.

Uso:
    python scripts/validar.py data/ediciones/AAAA-MM-DD.json

Imprime cada error (con el id de la noticia cuando corresponde) y sale con
código 1 si hay errores, 2 si el archivo no se puede leer, 0 si todo está bien.
Solo usa la biblioteca estándar de Python.
"""

import json
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

UMBRAL_ADOPCION = 5
UMBRAL_IMPACTO = 6
MAX_PALABRAS_RESUMEN = 90  # el resumen debe tener MENOS de este número de palabras

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
                  "brecha_latam", "justificacion_brecha", "verificada"]
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

            # enums
            self.enum(n, "tema", TEMAS, donde)
            self.enum(n, "horizonte", HORIZONTES, donde)
            self.enum(n, "fase_curva", FASES_CURVA, donde)
            self.enum(n, "cuadrante", CUADRANTES, donde)
            self.enum(n, "tipo", TIPOS_NOTICIA, donde)

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
                    if palabras >= MAX_PALABRAS_RESUMEN:
                        self.error(donde, f"'resumen_propio' tiene {palabras} palabras "
                                          f"(debe tener menos de {MAX_PALABRAS_RESUMEN})")

            # verificada
            verificada = n.get("verificada")
            if "verificada" in n and not isinstance(verificada, bool):
                self.error(donde, f"'verificada' debe ser true o false (recibido: {verificada!r})")
            if verificada is False:
                dato = n.get("dato_clave")
                if isinstance(dato, str) and re.search(r"\d", dato):
                    self.error(donde, f"noticia no verificada con cifras en 'dato_clave': {dato!r}")
        return ids

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


def cuadrante_esperado(adopcion, impacto):
    if adopcion >= UMBRAL_ADOPCION:
        return "estrella" if impacto >= UMBRAL_IMPACTO else "vaca_lechera"
    return "interrogante" if impacto >= UMBRAL_IMPACTO else "perro"


def main(argv):
    if len(argv) != 2:
        print("Uso: python scripts/validar.py <ruta/a/edicion.json>", file=sys.stderr)
        return 2
    ruta = argv[1]
    try:
        with open(ruta, encoding="utf-8") as fh:
            data = json.load(fh)
    except (OSError, json.JSONDecodeError) as exc:
        print(f"ERROR: no se pudo leer {ruta}: {exc}", file=sys.stderr)
        return 2

    v = Validador()
    v.validar(data)
    if v.errores:
        for e in v.errores:
            print(f"ERROR {e}")
        print(f"\n{len(v.errores)} error(es) en {ruta}")
        return 1
    print(f"OK: {ruta} cumple el esquema ({len(data['noticias'])} noticias)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
