---
description: Agrupa noticias y referencias en tendencias con implicancias de negocio (actualiza data/tendencias.json y valida)
---
Construí o actualizá data/tendencias.json. Seguí CLAUDE.md al pie de la letra (usuario objetivo, reglas 1-14 y el esquema de tendencias). No abras artículos nuevos: trabajá solo con lo ya resumido en las ediciones y en la biblioteca de referencias.

1. Leé CLAUDE.md, todas las ediciones de data/ediciones/ (en el orden de data/indice.json), data/referencias.json si existe y data/tendencias.json si existe. Si falta referencias.json, seguí solo con las noticias y decilo en el reporte.
2. Agrupá: una tendencia junta noticias y referencias que hablan de la misma tecnología o cambio de mercado.
   - Las tendencias existentes se actualizan (sumá evidencia nueva, revisá textos y valoraciones) y nunca se borran ni cambian de id. Si una ya no tiene evidencia nueva, se deja como está.
   - Creá una tendencia nueva solo si hay evidencia que no encaja en ninguna existente; numerala a continuación (t12, t13…).
   - Una noticia puede quedar sin tendencia (tendencia_id null) si no encaja. Puede aparecer como evidencia secundaria de otra tendencia, pero su tendencia_id es una sola: la principal.
   - Las referencias no_accesible nunca son evidencia.
3. Para cada tendencia nueva o actualizada, completá todos los campos del esquema:
   - promedio_actual vs. hacia_donde_va: cada cifra con su firma ("según Newzoo, vía GamesBeat") y el id de la evidencia cuando ayude a rastrearla. No mezcles cifras de firmas distintas (reglas 10 y 11).
   - Recalculá adopcion, impacto, cuadrante, fase_curva y brechas con toda la evidencia acumulada, no solo con la de esta semana. justificacion_brecha dice en qué ítems se apoya; brecha_latam null si no hay base; con certeza baja, la justificación lo dice.
   - posicion_industria con argumento_posicion; proveedores solo si una fuente de la evidencia los nombra (fuente_id = id de ese ítem), si no lista vacía; inversion_requerida y kpis con su justificación (valoración editorial).
   - implicancias para los 4 perfiles fijos (indie, publisher_aaa, plataforma_distribuidor, latam): 1-2 frases, pueden decir "sin impacto relevante".
   - decision_sugerida concreta y urgencia (ahora | preparar | vigilar). certeza según regla 13 y nunca mayor que la de su mejor evidencia; con un solo ítem, no puede ser alta.
   - ultima_actualizacion = hoy, solo en las tendencias que cambiaron.
4. Revisá que cada noticia de cada edición tenga tendencia_id coherente (la tendencia la lista en su evidencia) y que los tendencia_id del resumen_ejecutivo existan. Si corregís una edición, no toques nada más que esos campos.
5. Guardá data/tendencias.json con "actualizado" = hoy. Corré `python scripts/validar.py data/tendencias.json` y después `python scripts/validar.py` (todo). Corregí y repetí hasta que pase.
6. Cerrá con un reporte breve:
   - Tendencias nuevas (id y nombre) y actualizadas (id y qué cambió: evidencia sumada, valoración, urgencia).
   - Tendencias con evidencia débil: un solo ítem o certeza baja, con el motivo.
   - Qué quedó sin dato: tendencias sin proveedores, sin brecha Latam o con inversion_requerida sin_dato.
   - Noticias sin tendencia.
   No resumas el contenido de las tendencias.
