# Revisión de Nébula y rediseño de los tres espacios

## Alcance y límites

Revisión estática de las fuentes de `frontend/src`, `backend/src`, las cinco migraciones de `database/migrations`, `apps-script/Code.gs`, configuración, dependencias y pruebas existentes del repositorio. Se revisaron autenticación, selección de rol, perfiles, vinculaciones, consentimiento, seguimiento y presentación. No se accedió a una base de datos ni a usuarios reales. No se ejecutaron migraciones ni se comprobó la configuración del proyecto Supabase de producción. Los hallazgos SQL indican lo que permiten los archivos, no acreditan el estado del servidor desplegado.

Las pruebas visuales utilizan respuestas API simuladas para los tres roles. No demuestran integración real con Supabase, entrega de correo, RLS efectiva ni ausencia de vulnerabilidades. Las preferencias sensoriales son individuales: este diseño requiere validación con personas autistas, sin asumir que una ilustración o una paleta generará la misma emoción en todas ellas.

## Cambios implementados

- El panel deja de utilizar la tarjeta de autenticación limitada a 26 rem. Tiene una estructura propia, navegación persistente, formularios de dos columnas en escritorio y una columna en móvil.
- Tres espacios con mensajes y funciones según el rol: bienestar personal, acompañamiento familiar y acompañamiento educativo. Resumen, perfil y red de apoyo se presentan por separado; los formularios conservan sus valores al cambiar de sección.
- El pulpo de la portada y del logotipo se reemplaza por un amanecer con camino y colinas estáticas; el símbolo de marca es un amanecer sencillo.
- Vista sencilla para ocultar ilustración y mensaje lateral. Se respeta la preferencia de movimiento reducido, se incluye enlace para saltar al contenido, navegación con botones nativos e indicación de sección actual.
- Estados vacíos explicativos, campos de correo y teléfono con tipos adecuados, límites de longitud alineados con los campos de texto del backend, estado de guardado y protección ante envíos repetidos de emociones y observaciones.
- Si falla la carga de perfil, no se permite guardar un formulario vacío que sobrescriba los datos existentes.
- Estados de aprobación docente basados en `institution_approved_at` y `platform_approved_at`, en lugar de propiedades inexistentes.
- Actualización del resumen después de aceptar/revocar vínculos o revocar consentimiento. Los consentimientos muestran su estado y se explica el alcance completo antes de aceptar una vinculación.

## Hallazgos pendientes, por prioridad

| Prioridad | Evidencia | Impacto y acción recomendada |
| --- | --- | --- |
| Alta | `database/migrations/002_schema_alignment.sql` y `005_sia_existing_schema_adapter.sql` dependen de tablas y funciones SIA ausentes del repositorio. `004_relationship_invites.sql` crea `subject_user_id/consumed_at`; `relationship.service.ts` usa `joven_id/used_at/used_by/revoked_at/created_by/relationship_type`. | La instalación documentada no reconstruye la aplicación y las invitaciones fallarán con el esquema generado por 004. Obtener el esquema autorizado del entorno real, preparar una migración de conciliación y probar desde una base vacía y una copia de desarrollo antes de aplicar cambios. |
| Alta | `dashboard.service.ts::permittedStudents`, rama docente, comprueba acceso aprobado e institución activa/verificada, pero no vuelve a comprobar `institution_memberships`. | Si se revoca la membresía y permanece el acceso aprobado, el backend puede seguir devolviendo datos. Revalidar membresía vigente en cada consulta y escritura; añadir pruebas de revocación y de acceso cruzado. La explotación depende de las reglas de mantenimiento de accesos del entorno real. |
| Alta | `setAccountType` actualiza primero `app_metadata`, después `profiles.role`. La migración 002 instala un trigger que restringe cambios de rol mediante `private.is_sia_owner()`. | Un fallo de sincronización deja el rol seleccionado en Auth y bloquea reintentos con `ACCOUNT_TYPE_ALREADY_SET`. Verificar el trigger real y añadir operación recuperable/idempotente con pruebas de fallo parcial. No cambiar el trigger sin conocer `is_sia_owner`. |
| Alta | `npm audit` sobre los lockfiles existentes: frontend tiene 4 entradas (1 alta, 3 moderadas); backend tiene 1 alta. | Vite/esbuild, React Router/DOM y Zod tienen avisos. El detalle se conserva en `docs/dependency-audit.txt`. Resolver mediante actualización planificada y pruebas de compatibilidad; no ejecutar `audit fix --force` indiscriminadamente. Las rutas de la app usan destinos fijos y no utilizan hidratación SSR; eso reduce algunos vectores de React Router sin eliminar la deuda. |
| Media | `frontend/src/App.tsx::handleLogout` solo elimina la sesión en memoria; existe `/auth/logout` sin invocación desde ese botón. No se usa `/auth/refresh` ni `expiresAt`. | El cierre de sesión no revoca el refresh token y una sesión larga deja de funcionar al expirar el token. Implementar cierre remoto y renovación coordinada con manejo de fallos y pruebas. La recarga pierde la sesión por diseño actual. |
| Media | `auth.service.ts::resetPassword` elimina sesiones mediante RPC; `requireAuth` valida usuario con `getUser` sin verificar explícitamente `session_id` en `auth.sessions`. | No prometer invalidación instantánea de todos los JWT ya emitidos: pueden seguir válidos hasta expirar. Para revocación estricta comprobar sesión activa en operaciones sensibles y probar con un token emitido antes del restablecimiento. Consultado: https://supabase.com/docs/guides/auth/sessions |
| Media | `auth.service.ts::forgotPassword`, `resendVerification` y `registerUser` omiten envío para algunas cuentas y propagan 429/502 cuando sí hay envío. | Diferencias de respuesta y tiempo pueden revelar existencia/estado de cuentas pese al texto genérico. Desacoplar envío con respuestas uniformes y métricas internas; preservar la información operativa sin exponer diferencias por cuenta. |
| Media | `relationship.service.ts` crea consentimiento y aprueba relación en peticiones separadas; canje también usa varias escrituras con compensación. | Fallos parciales y carreras pueden producir estados inconsistentes. Reemplazar por operaciones transaccionales y probar aceptar/revocar/canjear simultáneamente. No se observó una transacción común en el código. |
| Media | `app.ts` limita JSON a 8 kb; el perfil admite varios textos de 2000 caracteres. `error.middleware.ts` transforma errores del parser en 500. | Perfiles válidos pueden fallar al guardar y los errores de formato/tamaño se reportan como internos. Definir un límite acotado compatible con el máximo real del perfil y devolver 400/413 según corresponda; comprobar texto multibyte. |
| Media | `Home.tsx` y `dashboard.service.ts` usan extensivamente `any`; varias peticiones de permisos/vínculos ignoran errores y no ofrecen reintento específico. | Datos ausentes o respuestas inesperadas pueden parecer estados vacíos. Definir contratos discriminados por rol, validación de respuesta y estados de error independientes. |
| Media | Docentes pueden consultar solicitudes; existe POST `/access/teacher-access`, pero falta un flujo UI completo para solicitar y aprobar acceso institucional. | El perfil profesional por sí solo no habilita estudiantes. Diseñar el flujo institucional con sus verificaciones reales y pruebas de extremo a extremo. |
| Baja | `dashboard.service.ts` consulta estudiantes usando solo el alcance `observations`; los permisos de informes/planes/emociones se consultan aparte. | Un usuario con otro alcance puede ver datos sin que la persona aparezca en la lista de vinculados. Construir un resumen de personas por unión de alcances autorizados, manteniendo filtros por dato. |
| Baja | `rate-limit.middleware.ts` usa el almacén en memoria y logs/auditoría no tienen una estrategia operativa documentada. | En múltiples instancias los contadores no se comparten. Definir almacén compartido, retención de OTP/auditoría, supervisión y pruebas de restauración. |

## Controles favorables observados

El secreto administrativo de Supabase queda en backend. El rol público se limita a tres opciones y la autorización usa `app_metadata`/perfil, no `user_metadata`. Los OTP se generan con aleatoriedad criptográfica y se guardan con HMAC; la verificación SQL bloquea la fila, limita intentos y consume el código. Las funciones privilegiadas de OTP revocan ejecución a PUBLIC/anon/authenticated. Hay Helmet, lista de orígenes CORS, límites de peticiones, validación Zod estricta y consultas de seguimiento filtradas por permiso. Apps Script valida firma, fecha y nonce bajo bloqueo; su caché no equivale a un registro duradero de anti-replay.

## Verificación realizada

- Compilación TypeScript y build de producción frontend correctos.
- Compilación backend y 7 pruebas existentes correctas: salud, validación, rechazo de roles públicos privilegiados, refresh y endpoints sin bearer.
- Chromium con Playwright: inicio de sesión simulado de los tres roles, navegación entre secciones, guardado de perfil, vista sencilla y ausencia de desbordamiento horizontal en 320, 390, 768, 1024 y 1440 píxeles.
- Revisión visual de capturas de escritorio y móvil. No se añadieron dependencias de ejecución para la ilustración o el panel.
- Revisión de componentes según la guía de React: estructura de componentes, estado, etiquetas de campos, navegación nativa, comportamiento responsive y carga de recursos.

Estas verificaciones no sustituyen pruebas de permisos contra una base de desarrollo ni una evaluación de accesibilidad con usuarios y tecnologías de asistencia.
