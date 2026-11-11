---
description: Carga la biblioteca de referencias del Radar Gaming (abre cada fuente, resume, clasifica y valida)
---
Construí o actualizá data/referencias.json. Seguí CLAUDE.md al pie de la letra (en especial las reglas 1-6 y 9-13). Las referencias NO son noticias de la semana: no tocan ninguna edición.

1. Leé CLAUDE.md, la lista "referencias" de config/fuentes.json y data/referencias.json si existe (para conservar lo ya cargado y actualizar "actualizado" con la fecha de hoy).
2. Por cada entrada de "referencias", abrí su URL con WebFetch.
   - Si falla (403, bloqueo, paywall, JavaScript, contenido truncado, visor sin texto, PDF ilegible): guardala con "estado": "no_accesible", "verificada": false, el motivo concreto en "nota_calidad", y resumen_propio, dato_clave y todas las valoraciones en null. No uses otros caminos para saltear el bloqueo y no completes nada de memoria. Seguí con la siguiente.
   - Si el PDF llega como binario, podés extraer el texto del archivo que guardó la propia descarga (por ejemplo con pdftotext). Eso no es otro camino: es el mismo documento.
3. Si abre, armá la referencia con el esquema de CLAUDE.md:
   - id, url y foco: los de config/fuentes.json. tipo_documento: el "tipo" de config. tipo: el valor de noticia que mejor la describe (reporte, analisis, opinion, encuesta, noticia).
   - fuente: el medio o editor que publica la página. titulo: el título tal como figura, en su idioma.
   - fecha_publicacion: la que muestra la página. Si no figura, null. Nunca la fecha de la consulta ni una inferida.
   - resumen_propio: con tus palabras, máximo 90 palabras, sin copiar párrafos.
   - dato_clave: una cifra o hecho citable, con la firma que lo mide: "según <firma>" o, si llega de segunda mano, "según <firma>, vía <medio>". Si no hay cifra, el hecho principal; si no hay nada citable, null.
   - geografia: global, latam u otra región nombrada (por ejemplo "EE. UU.", "Colombia").
   - Clasificá con las rúbricas: tema, importancia, horizonte, fase_curva, adopcion, adopcion_latam, impacto, cuadrante, brecha_global, brecha_latam con justificacion_brecha, tipo_evidencia y certeza. adopcion_latam y brecha_latam van en null si la fuente no da base para Latinoamérica. Una brecha sobre algo especulativo lleva certeza baja y la justificación lo dice.
   - nota_calidad: comunicado patrocinado, cifras de segunda mano, preprint sin revisión por pares, fechas dudosas y, sobre todo, cifras que difieren entre firmas (anotá ambas con sus firmas, sin elegir).
   - estado "ok" y verificada true.
4. Leé también inbox/ (.md, .txt y PDF). Las primeras líneas del texto son URL, fuente y fecha. Si hay una línea "Vía: <medio>", toda cita de ese texto debe decir "según <firma>, vía <medio>". Si el texto de inbox corresponde a una referencia no accesible, usalo para completarla: estado "ok", y en nota_calidad aclará que se cargó desde inbox (texto aportado por el usuario). Si no corresponde a ninguna, agregala como referencia nueva con un id propio.
5. Piratería: solo el fenómeno según la prensa. Nunca nombres ni enlaces sitios de descarga, ni expliques cómo clonar o crackear.
6. Guardá data/referencias.json, corré `python scripts/validar.py data/referencias.json` y corregí hasta que pase. Después corré `python scripts/validar.py` (todo) para confirmar que las ediciones siguen pasando.
7. Cerrá con un reporte: cuántas referencias abrieron, cuáles no y por qué (una línea por cada una), qué campos quedaron en null por falta de base y qué conviene pegar en inbox/ para completar las no accesibles. No resumas el contenido de las referencias.
