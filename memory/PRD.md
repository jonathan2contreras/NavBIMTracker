# PRD — BIMTracker Web (versión web de la app de seguimiento de piezas sobre modelo 3D)

## Problema original
"construye la aplicacion web utilizando el archivo subido" — el archivo NavBIMTracker-main.zip contiene la app móvil Expo + backend FastAPI de BIMTracker (modelo NAB 3D.glb, 12.275 objetos, 533 paneles de fachada).

## Elecciones del usuario (junio 2026)
- Réplica completa: login por roles, visor 3D, lista de piezas, dashboard de avance y reportes PDF/Excel.
- Mismo acceso: Administrador con contraseña "admin2026" y Usuario solo lectura.
- Mismo estilo visual que la app móvil (con los 3 logos corporativos).

## Arquitectura
- **Backend (FastAPI + MongoDB)**: reutilizado tal cual del zip (`/app/backend/server.py`). Sirve el GLB (`/api/model`) y el visor three.js (`/api/viewer` → `static/viewer.html`); catálogo cacheado en `static/objects.json` (12.275), fachadas en `static/facades.json`, dimensiones en `static/dims.json`. Endpoints: GET /api/objects (search/status/facade/skip/limit), GET /api/object?name=, GET/PUT /api/tags (upsert con history + observations; borra si status null sin obs históricas), GET /api/stats (533 paneles, por_fachada), GET /api/report + /api/report/export (pdf/xlsx con membrete de logos), POST /api/admin/verify (bcrypt vs ADMIN_PASSWORD_HASH en .env, comillas simples), POST /api/facades, POST /api/dims. Colección Mongo `tags` (índice único object_name).
- **Frontend (React CRA + Tailwind, puerto 3000)**: reescrito desde Expo a React web.
  - `src/lib/api.js` (cliente fetch), `src/lib/theme.js` (STATUSES/colores/logos/helpers).
  - `src/context/RoleContext.jsx`: rol en localStorage `bim_role` ("admin"|"viewer").
  - `src/components/AppLayout.jsx`: navbar superior con tabs (Modelo 3D /, Objetos /objects, Progreso /progress) + guard de rutas; `/reports` y `/login` fuera del layout.
  - `src/pages/ViewerPage.jsx`: iframe de /api/viewer + canal postMessage (comandos {__viewerCmd:true,cmd,args}: applyTags, setTag, clearSelection, isolate, focusObject; mensajes entrantes: progress/loaded/error/select). Header glass con chips de aislamiento, banner "Pieza enfocada" (?focus=), hint, overlays de carga (con %) y error con retry.
  - `src/components/TagSheet.jsx`: panel derecho (drawer) con fachada + pieza + dimensiones, 5 pills de estado, input de notas (solo admin), timeline historial (obs anidadas bajo el estado activo), modo solo lectura para viewer.
  - `src/pages/ObjectsPage.jsx`: búsqueda con debounce 400ms, chips de estado y de fachada, lista paginada 50 con scroll infinito, botón 3D → /?focus=.
  - `src/pages/ProgressPage.jsx`: hero % avance sobre 533 paneles + 3 logos, avance por fachada N/S/E/O, grid de tarjetas por estado + Sin estado, botón Reportes, logout.
  - `src/pages/ReportsPage.jsx`: tipos semanal (instalado)/mensual/personalizado (chips estado + fachada + rango fechas), navegación de períodos con dayjs, resumen con conteos, export PDF/Excel vía anchor download.
- Colores de estado: Fabricado #007AFF, Enviado #FF9500, Instalado #34C759, Entregable #F3EAD0 (accent #8A7A50), Observaciones #FFD60A (accent #D19E00), Sin estado #B4BAC6.

## Implementado (12 junio 2026)
- [x] MVP web completo portado desde la app móvil — testeado iteration_1: backend 25/25 pytest, frontend 100%, sin issues críticos.
- [x] Login por roles con contraseña admin bcrypt (admin2026), guard de rutas, logout.
- [x] Visor 3D con etiquetado, aislamiento por estado, foco de pieza desde la lista.
- [x] Lista con filtros (estado + fachada) y búsqueda, dashboard de avance, reportes con export PDF/Excel.
- [x] Fotos de avance: adjuntar foto de obra a cada nota (TagSheet → botón "Adjuntar foto de obra", preview, miniatura en el historial). Backend: Emergent Object Storage (EMERGENT_LLM_KEY en .env), POST /api/upload (whitelist de imágenes, máx 10MB), GET /api/files/{path}, campo `photo` en observations. Registros en colección `files` (soft-delete is_deleted). Testeado iteration_2 (34/34 backend + frontend OK).
- [x] Resumen semanal en Progreso: tarjeta "INSTALACIONES SEMANALES" (esta semana vs anterior + delta), datos en `semana` de GET /api/stats (semana Lun-Dom, solo paneles de fachada).
- [x] Fix (13 jun 2026): "Instalaciones semanales" contaba eventos históricos de instalado aunque la pieza hubiera cambiado luego a otro estado (ej. fabricado). Ahora solo cuenta piezas cuyo estado ACTUAL es instalado (una vez cada una, por la fecha de su última instalación). Pendiente redeploy a producción.
- [x] Fix (13 jun 2026): "Error al calcular estadísticas" — un documento malformado en `tags` tumbaba /api/stats, /api/tags y /api/objects con 500; `fetch_tags_map` ahora salta docs inválidos con warning. Botón "Reintentar" añadido al error del dashboard (progress-retry-button). Testeado iteration_4 (51/51 backend + frontend 100%). Pendiente redeploy a producción.
- [x] Superficie en m² en el TagSheet debajo de las dimensiones (`formatArea`: max(sx,sz) × sy, conversión mm→m si >100).
- [x] Galería de fotos de obra: nueva pestaña "Fotos" (/photos) con grid de tarjetas, chips de fachada, filtro por rango de fechas y lightbox. Endpoint GET /api/photos?facade&from&to (recorre observations con photo, orden fecha desc). Testeado iteration_3 (40/40 backend + frontend OK).
- [x] Dedup de códigos de objeto en la UI: "C1 C1 [6420986]" se muestra como "C1 [6420986]" (helper `displayName` en frontend: ObjectsPage/TagSheet/ReportsPage/Viewer banner/PhotosPage; `display_name` en backend solo para exports PDF/Excel). La API mantiene los nombres originales (claves estables).
- [x] (1 sep 2026) Miniatura 3D del panel en el TagSheet (sustituye al icono cuadrado): canvas 80×80 con el panel girando (three.js 0.160, gris neutro con aristas). Al pulsarla → pantalla completa (`PanelFullscreen`, z-60) con OrbitControls (gira solo hasta interactuar; arrastrar/rueda/pinza), cabecera con Código del panel, Fachada, Ancho, Alto y Superficie m²; cierre con botón o Escape. Backend: `GET /api/object/mesh?name=` extrae la geometría del nodo del GLB (JSON chunk indexado al arranque + mmap del binario, transformación mundo por cadena de padres, centrado, cache 200 items). Componentes en `src/components/panel3d/`. Testeado iteration_5 (backend 51/51 + 6 nuevos, frontend OK).
- [x] (2 sep 2026) Pantalla completa del panel: etiqueta superior fijada en estilo **Minimalista** (opción E elegida por el usuario entre 6 variantes): código grande con punto de color del estado, y línea "Fachada X · ancho × alto m · m² · estado". Sin tarjeta. Eliminado el aviso inferior "Arrastra para rotar". Verificado con screenshot.
- [x] (4 sep 2026) Borrar fotos en la galería (solo admin): icono papelera al pasar sobre la tarjeta y botón "Eliminar foto" en el lightbox con confirmación inline. Backend `DELETE /api/photos?object_name=&photo=`: quita el campo `photo` de la observación (borra la observación si no tenía texto; borra el tag si queda sin estado ni observaciones), marca `files.is_deleted=true` (el archivo deja de servirse, 404). Verificado con curl + screenshot.

## Backlog priorizado
- P2: autorización real en endpoints de escritura (hoy la verificación admin es solo client-side).
- P2: migrar @app.on_event a lifespan handlers de FastAPI.
- P2: multiusuario / exportar CSV.

## Notas técnicas
- No modificar MONGO_URL/DB_NAME. GLB en `/app/backend/static/nab3d.glb`; si se reemplaza, borrar `objects.json` para regenerar catálogo.
- Logos en `/app/frontend/public/logo_*.png` y en `/app/backend/static/` (membrete PDF).
- El visor tarda 30-90s en cargar (GLB 57MB) con barra de progreso.
- Suite de tests backend: `/app/backend/tests/backend_test.py`.

## Actualización — Junio 2026 (iteración 6)
- **Brújula interactiva** en la barra de leyenda del visor 3D: orienta el modelo hacia cada fachada (N/S/E/O) vía comando `orientTo` (viewer.html). Testids: compass-button, compass-panel, compass-{norte,sur,este,oeste}.
- **Equipos de instalación**: nueva colección `teams` {nombre, integrantes[]}. Endpoints /api/teams (GET/POST), /api/teams/{id} (PUT/DELETE), /api/teams/stats.
  - Página /teams (solo Admin): crear/editar/borrar equipos + tabla de registro de instalaciones (equipo, código panel, fecha). Acceso desde Progreso → botón "Equipos" (teams-nav-button).
  - Al marcar un panel como **Instalado** en TagSheet, es **obligatorio** elegir equipo; se guarda team_id/team_name en el evento 'instalado' del history del tag.
- **Reporte por equipos en Progreso** (progress-team-report): por equipo muestra nº instalados, % sobre total de fachada (pct_total) y % sobre lo instalado (pct_instalados), más bucket "Sin equipo".
- Presentación de inicio (splash) eliminada. Logos de socios movidos a la pantalla de carga del modelo (tamaño uniforme). Logos actualizados con archivos nuevos del usuario.
- Estado: probado con testing_agent (iteration_6.json) — sin bugs.


## 2026-06 — Navegación
- Botón **Equipos** movido a la barra principal (derecha de Progreso, solo Admin). Ruta `/teams` ahora dentro de `AppLayout`. Eliminado el botón Equipos y el botón "volver" del header de Progreso/Equipos.
- Pendiente sugerido por usuario anteriormente: mover también **Reportes** a la barra principal (aún en header de Progreso).

## 2026-06 — Filtros por equipo y exportación
- Reportes: nuevo filtro por Equipo (Todos / cada equipo / Sin equipo) visible en semanal, mensual y filtros; `GET /api/report` y `/api/report/export` aceptan `team=all|none|<id>`; columna Equipo añadida en PDF/Excel.
- Equipos › Registro de instalaciones: chips de filtro por equipo + botones exportar PDF/Excel (`GET /api/teams/export?format=pdf|xlsx&team=...`).
- Componente compartido `components/TeamFilter.jsx`.

## 2026-06 — Pantalla de carga
- Logos anclados al 8% de la altura (`pt-[8vh]`), spinner y texto justo debajo (ViewerPage.jsx).

## 2026-06 — Hover en visor 3D
- viewer.html: pointermove (solo mouse) con raycast -> mensaje `hover` {name,x,y}; pieza bajo el cursor con brillo suave + contorno azul (`hoverEdgeMat`).
- ViewerPage.jsx: tooltip flotante junto al cursor con `displayName` (data-testid hover-tooltip). Sin hover en táctil.

## 2026-06 — Sincronización multiusuario (polling)
- Elección del usuario: sondeo cada 5s, aplicado en Visor 3D + Objetos + Progreso.
- ViewerPage.jsx: `loadTags` cachea el último mapa (lastMapRef, compara JSON) y solo hace `applyTags` si cambió; setInterval 5s reaplica estados al modelo cuando está cargado, sin error y con la pestaña visible.
- ObjectsPage.jsx: setInterval 5s hace `getTags` y fusiona status/observation en los objetos ya cargados (no resetea el scroll infinito ni los filtros).
- ProgressPage.jsx: `fetchStats(silent)` refresca stats+teamStats cada 5s sin spinner y sin pintar el error en fallos transitorios.
- Todos pausan cuando `document.visibilityState !== 'visible'`. Verificado con screenshot: fila Objetos pasó de Enviado→Instalado sola tras cambio remoto por API.

## 2026-06 — Aviso de cambios (SyncToast)
- `components/SyncToast.jsx`: pastilla flotante arriba-centro ("Actualizado por otro usuario", icono azul refresh), animación `syncIn` (index.css), auto-cierre ~3.2s. Helper `notifySync(msg)` dispara evento window `bim-sync`. Montado en `AppLayout`.
- Se dispara solo cuando el sondeo detecta un cambio REMOTO (no propio): ViewerPage compara mapa de tags y actualiza `lastMapRef` también en `handleSaved` para no avisar de cambios propios; ObjectsPage avisa si algún item difiere (handleSaved actualiza items en local → sin aviso propio); ProgressPage compara JSON de stats.
- testids: sync-toast. Aprobado por el usuario (OK).

## 2026-06 — Barra superior + Brújula real + Total de paneles configurable
- **Barra superior (AppLayout)**: fila gris (#F2F2F7) con el rol centrado (`top-bar-role`) y botón **Salir** a la derecha (`top-bar-logout`); debajo la barra de pestañas en una sola línea (overflow-x-auto). Se eliminó el botón Salir y el rol duplicados del header de Progreso.
- **Brújula que marca el norte**: `components/CompassRose.jsx` (SVG con aguja N roja / S gris, gira con `angle`). viewer.html calcula el rumbo (`sendHeading`: rot = -atan2(fx,-fz)°, North=-Z) y lo envía como `{type:'heading',angle}` en cada render/animación/carga. ViewerPage guarda `heading` y lo pasa a CompassRose (en el botón `compass-button` size 22, y en el panel con labels size 30). Sustituye al icono estático `Compass`. Verificado que renderiza (screenshot); rotación validada por lógica (coincide con orientTo N/S/E/O).
- **Total de paneles de fachada configurable**: colección `settings` (_id:"app", campo `total_facade_override`). Backend: `get_total_facade_effective()` (override si >0, si no `len(FACADE_NAMES)`=533); GET/PUT `/api/settings`; usado en `/api/stats` (total, sin_estado clamp ≥0) y `/api/teams/stats` (total_facade → pct_total). Frontend: tarjeta editable en ReportsPage (`total-facade-card`, input `total-facade-input`, `total-facade-save`, `total-facade-reset`), solo Admin edita; el viewer ve el valor. Verificado con curl (override 600 → stats.total 600; reset → 533; -5 → 422).

## 2026-09 — Reportes: filtro "Instalación día"
- Nuevo tipo de reporte `diario` (botón `report-type-diario`, "Instalación día") a la IZQUIERDA de "Instalación semanal" en ReportsPage.
- Despliega un calendario (shadcn `ui/calendar` = react-day-picker, locale es) en un Popover (`day-picker-trigger`/`day-picker-popover`); flechas día anterior/siguiente (`day-prev`/`day-next`), días futuros deshabilitados.
- `getRange` para diario: from=to=día seleccionado, status='instalado'. Reutiliza `GET /api/report` (filtra eventos del history por fecha exacta) y los export PDF/Excel. El resumen muestra "N instalaciones". Verificado: screenshot del calendario + curl (2026-09-07 → C7B-2 Equipo 1; cada día muestra sólo lo instalado ese día).

## 2026-09 — PDF de reportes rediseñado
- **Foto por panel**: `build_report` añade `photo` a cada item (foto de la observación del mismo día del evento, o la última con foto). `make_pdf` añade columna "Foto" y embebe la imagen (helper `_pdf_photo`: descarga de object storage con cache, conserva aspecto, máx 26×22 mm; "—" si no hay/error).
- **Logos centrados y proporcionados**: `_pdf_letterhead` ahora `hAlign="CENTER"` + ALIGN CENTER, altura 12 mm, anchos por ratio real (fiberkret 3.0, entrepisos/grcontreras ~2.48).
- **Título**: "REPORTE DE INSTALACION NAB UNIVERSIDAD LIMA" centrado (styles Title), reemplaza "Reporte BIMTracker — Fachada"; período centrado debajo. Metadata del PDF también actualizada.
- colWidths reajustados a 180 mm útiles (A4). Verificado renderizando el PDF a imagen (pymupdf): foto embebida JPEG/DCTDecode, logos centrados, título correcto.

## 2026-09 — Renombrado de etiqueta
- Etiqueta visible "Entregable" → **"Recepcionado"** en toda la app (menús, chips, tarjetas, leyenda del visor 3D, TagSheet, PDF/Excel). Cambiado solo el label en `frontend/src/lib/theme.js` (STATUSES) y `backend/server.py` STATUS_LABELS. La clave interna `entregable` se mantiene (compatibilidad de datos y color #F3EAD0). Verificado con screenshot.

## 2026-09 — Regla de progresión de etiquetado
- Secuencia obligatoria: **Fabricado → Enviado → Instalado → Recepcionado**. Observaciones queda libre (sin regla).
- Backend (`STAGE_ORDER` + validación en `upsert_tag`): al cambiar a un estado de la secuencia, exige que todos los anteriores estén en el `history`; si falta alguno devuelve 422 con detalle (ej. "No puedes marcar 'Instalado' sin antes marcar: Enviado."). Solo se valida en cambio de estado (re-guardar el mismo estado o añadir observación no dispara). Verificado con curl (enviado/instalado/entregable bloqueados sin prerequisitos; observaciones libre).
- Frontend: `api.js` ahora adjunta `detail` del error. TagSheet bloquea los pills no permitidos (opacity 45, cursor-not-allowed, tooltip "Primero marca: …") según `obj.history`, muestra hint "Orden obligatorio: …" y surface del mensaje 422. Verificado con screenshot (panel nuevo: solo Fabricado y Observaciones activos).

## 2026-09 — FIX: reportes por estado reflejan el estado ACTUAL (no eventos revertidos)
- Bug reportado: en reportes aparecían paneles "instalados" que en el modelo 3D ya no lo estaban (estado revertido/quitado). Causa: `build_report` iteraba el `history` e incluía cualquier evento con el estado filtrado.
- Fix en `build_report`: para `status != 'all'` hace snapshot por ESTADO ACTUAL (`t.status == status`), usando la fecha del ÚLTIMO evento del history con ese estado (una fila por panel). Para `status == 'all'` (Mensual) se mantiene el registro de movimientos por evento. Afecta a semanal/día/personalizado y a los export PDF/Excel (coherentes con el modelo 3D y con GET /api/tags).
- Verificado por testing_agent (iteration_7.json): 6/6 backend OK, sin issues; datos de prueba limpiados (tags=0). Test: `/app/backend/tests/test_report_current_state_iter7.py`.
