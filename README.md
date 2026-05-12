# SGE Backend — Sistema de Gestión Educativa

**Stack:** NestJS 10 · TypeScript · PostgreSQL 16 · Redis 7 · Passport JWT · Swagger

---

## Estado actual del proyecto

| Sprint | Descripción | Estado |
|--------|-------------|--------|
| Sprint 1–4 | Relevamiento, diseño, base | ✅ Completo |
| Sprint 5 | Auth: JWT, refresh tokens, 2FA TOTP, RBAC | ✅ Completo |
| Sprint 6 | CRUD alumnos, legajos, historial de cambios | ✅ Completo |
| Sprint 7 | Calificaciones | 🔜 Próximo |
| Sprint 8 | Asistencia | ⏳ Pendiente |

---

## Levantar el proyecto (arranque de sesión)

### 1. Infraestructura Docker

```bash
cd "d:\Proyectos en Claude\sge-backend"
docker compose up postgres redis -d
```

> Si los contenedores ya existen de una sesión anterior, `docker compose start postgres redis` es suficiente.

### 2. Backend (NestJS)

```bash
cd "d:\Proyectos en Claude\sge-backend"
npm run dev
```

API disponible en: `http://localhost:3000/api/v1`  
Swagger en: `http://localhost:3000/api/v1/docs`

### 3. Frontend (React + Vite)

```bash
cd "d:\Proyectos en Claude\sge-frontend"
npm run dev
```

Frontend disponible en: `http://localhost:5173`

---

## Credenciales de prueba (seed ya aplicado)

El seed está cargado en la base de datos. Institución y usuarios listos para usar.

**ID de institución:**
```
3120205f-a01c-48f4-9a18-f6f6f329f4fb
```

**Usuarios:**

| Email | Contraseña | Rol |
|-------|-----------|-----|
| `admin@escuela.com` | `Admin123!` | admin |
| `directivo@escuela.com` | `Admin123!` | directivo |
| `administrativo@escuela.com` | `Admin123!` | administrativo |
| `docente@escuela.com` | `Admin123!` | docente |

Para regenerar el seed (resetear datos): `npm run db:seed`

---

## Endpoints disponibles

### Auth — Sprint 5

```
POST   /api/v1/auth/login          Login (email + password + institucion_id)
POST   /api/v1/auth/refresh        Renovar access token
POST   /api/v1/auth/logout         Cerrar sesión actual
POST   /api/v1/auth/logout-all     Cerrar todas las sesiones
GET    /api/v1/auth/me             Perfil del usuario autenticado
POST   /api/v1/auth/2fa/setup      Generar QR para 2FA
POST   /api/v1/auth/2fa/verify     Activar 2FA con código TOTP
POST   /api/v1/auth/2fa/disable    Desactivar 2FA
```

### Alumnos — Sprint 6

```
POST   /api/v1/alumnos             Crear alumno (genera legajo AAAA-NNNNN)
GET    /api/v1/alumnos             Listar (paginación cursor, filtros, búsqueda FTS)
GET    /api/v1/alumnos/:id         Detalle de alumno
PATCH  /api/v1/alumnos/:id         Actualización parcial (DNI inmutable)
POST   /api/v1/alumnos/:id/baja    Dar de baja con motivo
GET    /api/v1/alumnos/:id/historial  Historial de cambios (audit log)
```

---

## Scripts útiles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor con hot reload |
| `npm run db:migrate` | Aplicar migraciones SQL |
| `npm run db:seed` | Cargar datos de prueba |
| `npm test` | Tests unitarios |
| `npm run test:cov` | Tests + cobertura |
| `npm run build` | Compilar para producción |

---

## Estructura del proyecto

```
src/
├── main.ts
├── app.module.ts
│
├── config/
│   ├── app.config.ts
│   ├── auth.config.ts
│   └── database.config.ts
│
├── database/
│   ├── database.module.ts       Pool PostgreSQL (global)
│   ├── redis.module.ts          Cliente Redis (global)
│   ├── migrate.ts               Script de migraciones
│   ├── migrations/
│   │   ├── 001_auth.sql         Tablas: instituciones, usuarios, roles, audit_log
│   │   └── 002_alumnos.sql      Tablas: alumnos, legajo_secuencias
│   └── seeds/
│       └── seed.ts              Datos de prueba (institución + 4 usuarios)
│
├── auth/                        Sprint 5 — completo
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.repository.ts
│   ├── dto/auth.dto.ts
│   ├── strategies/jwt.strategy.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   └── __tests__/auth.service.spec.ts
│
├── alumnos/                     Sprint 6 — completo
│   ├── alumnos.module.ts
│   ├── alumnos.controller.ts
│   ├── alumnos.service.ts
│   ├── alumnos.repository.ts
│   ├── dto/
│   │   ├── create-alumno.dto.ts
│   │   ├── update-alumno.dto.ts
│   │   ├── query-alumnos.dto.ts
│   │   └── baja-alumno.dto.ts
│   └── __tests__/alumnos.service.spec.ts
│
└── common/
    ├── decorators/
    │   ├── current-user.decorator.ts
    │   ├── roles.decorator.ts
    │   └── public.decorator.ts
    ├── filters/global-exception.filter.ts
    └── interceptors/response.interceptor.ts
```

---

## Patrones del proyecto

- **Módulo por dominio:** Module + Controller + Service + Repository + DTOs
- **Raw SQL** con `pg` (sin TypeORM ni Prisma)
- **DTOs** con `class-validator` + `class-transformer`
- **Respuestas** envueltas en `{ ok, data }` vía `ResponseInterceptor` global
- **Guards globales:** `JwtAuthGuard` + `RolesGuard`; endpoints públicos usan `@Public()`
- **Multi-tenancy:** todo scoped por `institucion_id`
- **Auditoría:** tabla `audit_log` con before/after en JSONB

---

## Cómo agregar el próximo módulo (Sprint 7 — Calificaciones)

```bash
# Crear la migración primero
# src/database/migrations/003_calificaciones.sql

# Luego el módulo:
npx nest g module calificaciones
npx nest g controller calificaciones
npx nest g service calificaciones

# Crear manualmente:
# src/calificaciones/calificaciones.repository.ts
# src/calificaciones/dto/
# src/calificaciones/__tests__/calificaciones.service.spec.ts
```

---

## Gotchas conocidos

### Imports de librerías CJS en TypeScript
`bcryptjs`, `qrcode` y similares no tienen default export. Usar siempre:
```ts
import * as bcrypt from 'bcryptjs';   // ✅
import bcrypt from 'bcryptjs';        // ❌ — resulta en undefined en runtime
```

### CORS
El `.env` tiene `CORS_ORIGIN=http://localhost:5173` (puerto del frontend Vite).  
Si se cambia el puerto del frontend, actualizar esta variable y **reiniciar el backend** (el watch no detecta cambios en `.env`).

### Migraciones ya aplicadas
Las migraciones SQL se ejecutan automáticamente cuando Docker inicia el contenedor de Postgres por primera vez (via `docker-entrypoint-initdb.d`). El script `npm run db:migrate` es para entornos donde Postgres ya existe y se necesita aplicar manualmente.

### Variables de entorno en `.env`
El archivo `.env` tiene las credenciales de desarrollo listas (no hace falta tocar nada):
- `DB_PASSWORD=sge_local_pass` — coincide con el `docker-compose.yml`
- `CORS_ORIGIN=http://localhost:5173` — apunta al frontend Vite
- JWT secrets ya generados

---

## Seguridad

| Mecanismo | Detalle |
|-----------|---------|
| JWT HS256 | Access token 15 min, firmado con secret de 64 bytes |
| Refresh tokens | Rotativos, hasheados SHA-256 en PostgreSQL + Redis |
| Rate limiting | 5 intentos por IP / 15 min → bloqueo |
| Bloqueo de cuenta | 5 intentos fallidos → bloqueado 15 min |
| 2FA TOTP | Google Authenticator / Authy compatible |
| Códigos de recuperación | 10 códigos de un solo uso, almacenados hasheados |
| Blacklist tokens | Redis invalida access tokens antes de expirar |
| Audit log | Registro inmutable en PostgreSQL de todos los accesos |
| RBAC | Guards globales + decoradores `@Roles()` y `@Public()` |









---------------------------------


## Plan de Reestructura: Módulo Alumnos


## Visión General

## El módulo actual se reemplaza por una página hub con 4 tarjetas de acción, cada una con su propio flujo de navegación. La página principal (/alumnos) es solo un punto de entrada; la lógica pesada vive en páginas dedicadas a las que se navega desde cada tarjeta.

Estructura de Archivos (Frontend)

src/modules/alumnos/
├── pages/
│   ├── AlumnosPage.tsx            ← Hub con las 4 tarjetas
│   ├── HistorialAcademicoPage.tsx ← Tabla de años/cursos
│   ├── SeguimientoPage.tsx        ← Dashboard por materia
│   └── BuscarCursoPage.tsx        ← Lista de alumnos del curso
│
├── components/
│   ├── cards/
│   │   ├── FichaCompletaCard.tsx
│   │   ├── HistorialAcademicoCard.tsx
│   │   ├── SeguimientoCard.tsx
│   │   └── BuscarCursoCard.tsx
│   │
│   ├── modals/
│   │   └── FichaCompletaModal.tsx  ← Modal paginado (ver secciones abajo)
│   │
│   ├── seguimiento/
│   │   ├── AlumnoInfoCard.tsx      ← Nombre, Apellido, DNI, Edad
│   │   └── MateriaChart.tsx        ← Tarjeta+gráfico por materia
│   │
│   └── curso/
│       ├── AlumnosCursoTable.tsx   ← Tabla con botón PDF por fila
│       └── DescargaCursoBtn.tsx    ← Botón "DESCARGAR CURSO COMPLETO"
│
├── hooks/
│   ├── useFichaCompleta.ts
│   ├── useHistorialAcademico.ts
│   ├── useSeguimiento.ts
│   └── useBuscarCurso.ts
│
└── types/
    └── alumnos.types.ts
Rutas (React Router)

/alumnos                          → AlumnosPage (hub 4 tarjetas)
/alumnos/:id/historial            → HistorialAcademicoPage
/alumnos/:id/seguimiento          → SeguimientoPage
/alumnos/curso                    → BuscarCursoPage
La navegación desde las tarjetas de Historial y Seguimiento pasa el alumno_id en la URL. BuscarCurso recibe curso y anio como query params (/alumnos/curso?curso=1A&anio=2024).

Detalle por Tarjeta
1. Ficha Completa
Flujo: búsqueda de alumno (autocomplete con debounce) → botón Buscar → abre FichaCompletaModal.

Modal paginado — secciones:

Página 1: Datos Personales (nombre, apellido, DNI, fecha nac., domicilio)
Página 2: Datos Familiares / Tutor (nombre tutor, parentesco, contacto de emergencia)
Página 3: Legajo y Documentación (links a archivos S3 adjuntos, estado de cada documento)
Página 4: Inscripciones activas
El paginador es interno al modal (flechas prev/next, indicador "1 / 4"). Así la info queda organizada sin scroll infinito.

Botón PDF: llama a GET /alumnos/:id/ficha/pdf → el backend genera el PDF en el servidor y responde con Content-Type: application/pdf; el frontend lo descarga con un <a download> generado dinámicamente.

Hook: useFichaCompleta(alumnoId) → expone { ficha, isLoading, error, paginaActual, setPagina, descargarPdf }.

2. Historial Académico
Flujo: búsqueda de alumno → botón Buscar → navigate('/alumnos/:id/historial').

Página:

Header con nombre del alumno + botón volver + botón "Exportar Excel"
Tabla con columnas: Año Lectivo | Curso | Sección | Condición (Promovido / Repitente / En curso)
Filas ordenadas cronológicamente
Hook: useHistorialAcademico(alumnoId) → GET /alumnos/:id/historial → array de { anio_lectivo, curso, seccion, condicion }.

Mejora sugerida: agregar columna "Promedio anual" si el backend lo tiene disponible. También resaltar con color la fila si el alumno repitió ese año (útil para orientación).

3. Seguimiento y Trayectoria
Flujo: búsqueda de alumno → botón Buscar → navigate('/alumnos/:id/seguimiento').

Página:

Arriba: AlumnoInfoCard con Nombre, Apellido, DNI, Edad, Fecha de ingreso
Abajo: grid de MateriaChart, una tarjeta por cada materia única que el alumno cursó en toda su historia
Lógica de agregación (backend):
El endpoint GET /alumnos/:id/seguimiento devuelve el trabajo ya procesado:


{
  "alumno": { "id", "nombre", "apellido", "dni", "edad" },
  "materias": [
    {
      "nombre": "Lengua",
      "anios": [
        { "anio_lectivo": 2018, "curso": "1° A", "calificacion": 8 },
        { "anio_lectivo": 2019, "curso": "2° A", "calificacion": 7 },
        { "anio_lectivo": 2020, "curso": "3° A", "calificacion": 9 }
      ],
      "promedio_global": 8.0
    },
    { "nombre": "Matemática", ... }
  ]
}
El backend agrupa por nombre_materia, suma todos los años en que la cursó, y calcula el promedio. El frontend solo renderiza.

MateriaChart: tarjeta con título de la materia, promedio global visible en grande, y un BarChart (Recharts) con X = año lectivo, Y = calificación. Si el promedio está por debajo de 6 → borde rojo en la tarjeta (alerta visual inmediata).

4. Buscar Curso
Flujo: seleccionar Curso (dropdown) + seleccionar Año lectivo (dropdown) → botón Buscar → navigate('/alumnos/curso?curso=1A&anio=2024').

Página:

Header: "Alumnos — 1° A · 2024" + botón volver + botón DESCARGAR CURSO COMPLETO
Tabla: columnas Apellido y Nombre | DNI | Condición | Descargar Ficha (botón por fila)
Descarga individual: GET /alumnos/:id/ficha-tecnica/pdf → PDF de un solo alumno.

Descarga masiva: GET /cursos/pdf-completo?curso=1A&anio=2024 → el backend concatena todas las fichas en un único PDF bien segmentado (una página de portada por alumno, datos, documentación). El frontend descarga el blob resultante.

Hook: useBuscarCurso(curso, anio) → GET /cursos/:curso/anio/:anio/alumnos.

Endpoints Backend Necesarios
Método	Ruta	Descripción
GET	/alumnos/buscar?q=	Autocomplete por nombre/DNI
GET	/alumnos/:id/ficha	Ficha completa (4 secciones)
GET	/alumnos/:id/ficha/pdf	PDF ficha completa
GET	/alumnos/:id/historial	Años y cursos cursados
GET	/alumnos/:id/seguimiento	Materias agregadas con calificaciones
GET	/cursos	Lista de cursos disponibles
GET	/anios-lectivos	Lista de años disponibles
GET	/cursos/:curso/anio/:anio/alumnos	Alumnos de un curso/año
GET	/alumnos/:id/ficha-tecnica/pdf	PDF ficha técnica individual
GET	/cursos/pdf-completo?curso=&anio=	PDF masivo del curso completo
Mejoras que agregué respecto a tu mockup
Autocomplete en los buscadores: los 3 campos "Buscar Alumno" usan debounce (300ms) y muestran sugerencias al escribir, evitando que el usuario tenga que saber el DNI exacto.

Estado de condición en Historial: la tabla muestra si el alumno promovió, repitió o está en curso ese año — dato muy útil para orientación educativa.

Alerta visual en Seguimiento: tarjetas de materia con borde rojo si el promedio global está por debajo de 6. Permite identificar de un vistazo las materias problemáticas del alumno.

Exportar Excel en Historial Académico: el sidebar original mencionaba "Exportación a PDF/Excel" — lo conecté específicamente al historial ya que es la vista tabular más natural para exportar a planilla.

PDF masivo segmentado: en lugar de un ZIP de PDFs individuales, el backend genera un único PDF con portada por alumno (más prolijo para imprimir o archivar).

Botón "Agregar Alumno" visible en la esquina superior derecha del hub — lo veo en tu mockup y lo mantendría ahí, abre un formulario separado o modal de alta.

Orden de implementación sugerido
Hub (AlumnosPage) con 4 tarjetas estáticas + rutas registradas
Ficha Completa (modal paginado + PDF) — el más autónomo
Historial Académico (tabla simple, fácil de construir)
Buscar Curso (descarga individual → luego masiva)
Seguimiento y Trayectoria (requiere el endpoint de agregación backend, el más complejo)
¿Arrancamos con el hub + Ficha Completa, o preferís un orden diferente?