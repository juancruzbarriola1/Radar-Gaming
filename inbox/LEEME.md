# Inbox: fuentes manuales
Acá pegás textos de artículos o reportes que el agente no pudo abrir (bloqueo, paywall, JavaScript), como archivos `.md`, `.txt` o `.pdf`.
Formato obligatorio de las tres primeras líneas: línea 1 = URL original; línea 2 = nombre de la fuente; línea 3 = fecha de publicación (AAAA-MM-DD, o "sin fecha" si no figura).
Opcional, línea 4: `Vía: <medio>` cuando el texto es una nota que cita datos de otra firma. Las cifras se citarán como "según <firma>, vía <medio>".
Desde la línea siguiente va el texto del artículo o reporte, tal como lo copiaste. En un PDF, esas líneas son las primeras del documento o van en un `.txt` con el mismo nombre.
El agente los lee en cada `/actualizar-noticias` (noticias de la semana, estado "manual") y en cada `/cargar-referencias` (biblioteca de referencias), y les da prioridad sobre lo que no pudo abrir.
