---
description: Genera la edición semanal del Radar Gaming (recolecta, analiza, valida y guarda)
---
Ejecutá el proceso completo para producir una nueva edición. Seguí CLAUDE.md al pie de la letra.

1. Leé CLAUDE.md, config/fuentes.json (lista "fuentes"; la lista "referencias" la usa /cargar-referencias), data/indice.json y la última edición de data/ediciones/ (para numerar y no repetir noticias). La ventana son los últimos 7 días hasta hoy.
2. Por cada fuente de la lista "fuentes" de config/fuentes.json con "activa": true: probá primero su RSS (si lo tiene o lo encontrás en la página), después la página. Si falla, registrá el estado en fuentes_consultadas y seguí.
3. Completá con WebSearch usando búsquedas cortas por tema (cloud gaming, fin del juego físico / ventas digitales, IA clonando o portando juegos, IA en desarrollo de videojuegos, regulación de propiedad intelectual en juegos, y el ángulo Latinoamérica). Podés usar medios especializados reconocidos fuera de la lista; registrá el dominio en fuentes_consultadas. Ignorá foros, blogs anónimos y sitios que alojen contenido pirata.
4. Leé los archivos de inbox/ como fuentes manuales (estado "manual"). Esos textos tienen prioridad sobre lo que no pudiste abrir.
5. Elegí de 8 a 15 noticias, sin duplicados, priorizando cloud_gaming, digitalizacion e ia_clonacion_pirateria. Abrí cada artículo antes de resumirlo.
6. Clasificá con las rúbricas de CLAUDE.md. Armá tema_de_la_semana, dato_de_la_semana, frente_a_frente (solo si hay 2 o más fuentes sobre el mismo punto), alertas y limitaciones.
7. Guardá data/ediciones/AAAA-MM-DD.json y agregá la edición a data/indice.json.
8. Corré `python scripts/validar.py data/ediciones/AAAA-MM-DD.json`. Si hay errores, corregilos y repetí hasta que pase.
9. Cerrá con un reporte breve: fuentes que funcionaron y cuáles no, cantidad de noticias, noticias con verificada=false, y qué debería pegar el usuario en inbox/ para mejorar la próxima edición. No resumas el contenido de las noticias.
