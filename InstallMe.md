# SGE Backend — Guía de instalación

Sistema de Gestión Educativa — API REST construida con NestJS, PostgreSQL, Redis y MinIO (S3).

---

## Requisitos previos

| Herramienta | Versión mínima | Verificar |
|---|---|---|
| Node.js | 20.x LTS | `node --version` |
| npm | 10.x | `npm --version` |
| Docker | 24.x | `docker --version` |
| Docker Compose | 2.x (plugin) | `docker compose version` |
| Git | cualquier reciente | `git --version` |

---

## 1. Clonar el repositorio

```bash
git clone https://github.com/JGaston89/sge-backend.git
cd sge-backend
```

---

## 2. Configurar variables de entorno

Copiar el archivo de ejemplo y completar los valores:

```bash
cp .env.example .env
```

Editar `.env` con los valores del entorno. Los mínimos requeridos son:

```env
# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sge_db
DB_USER=sge_user
DB_PASSWORD=sge_local_pass

# JWT (generar claves seguras)
JWT_ACCESS_SECRET=<64 bytes hex aleatorio>
JWT_REFRESH_SECRET=<64 bytes hex aleatorio>

# MinIO (S3 local)
S3_ENDPOINT_INTERNAL=http://localhost:9000
S3_ENDPOINT_PUBLIC=http://localhost:9000
S3_BUCKET=sge-documentos
S3_REGION=us-east-1
S3_ACCESS_KEY=sge_admin
S3_SECRET_KEY=sge_password_dev
```

Generar claves JWT seguras:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 3. Levantar servicios con Docker

El proyecto incluye un `docker-compose.yml` con PostgreSQL, Redis y MinIO preconfigurados.

```bash
docker compose up -d
```

Esto levanta:

| Servicio | Puerto | Descripción |
|---|---|---|
| PostgreSQL | 5432 | Base de datos principal |
| Redis | 6379 | Caché y sesiones |
| MinIO | 9000 / 9001 | Almacenamiento S3 local |
| API NestJS | 3000 | La aplicación (watch mode) |

> El contenedor `api` monta `./src` como volumen — los cambios en código se recompilan automáticamente.

---

## 4. Ejecutar migraciones (solo primera vez)

Las migraciones SQL están en `src/database/migrations/` y se ejecutan automáticamente al iniciar postgres por primera vez (via `docker-entrypoint-initdb.d`).

Si necesitás ejecutarlas manualmente contra una BD ya existente:

```bash
# Ejecutar todas las migraciones en orden
for f in src/database/migrations/*.sql; do
  docker exec -i sge_postgres psql -U sge_user -d sge_db < "$f"
done
```

En Windows (PowerShell):

```powershell
Get-ChildItem "src\database\migrations\*.sql" | Sort-Object Name | ForEach-Object {
  Get-Content $_.FullName | docker exec -i sge_postgres psql -U sge_user -d sge_db
}
```

---

## 5. Instalación local (sin Docker)

Si preferís correr la API directo en el host:

```bash
# Instalar dependencias
npm install

# Modo desarrollo con hot-reload
npm run dev

# Compilar y correr en producción
npm run build
npm run start:prod
```

> Asegurate de tener PostgreSQL, Redis y MinIO corriendo localmente y el `.env` apuntando a `localhost`.

---

## 6. Verificar que todo funciona

```bash
# Health check
curl http://localhost:3000/api/v1/health

# Documentación Swagger
# Abrir en el navegador:
http://localhost:3000/api/v1/docs
```

---

## 7. Crear usuario inicial (seed)

```bash
npm run db:seed
```

Esto crea una institución de prueba y un usuario administrador. Revisar `src/database/seeds/seed.ts` para ver las credenciales por defecto.

---

## 8. Consola MinIO

Para administrar los archivos S3 localmente, acceder a la consola web de MinIO:

```
http://localhost:9001
Usuario: sge_admin
Contraseña: sge_password_dev
```

---

## 9. Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Hot-reload en desarrollo |
| `npm run build` | Compilar TypeScript |
| `npm run start:prod` | Producción (requiere build previo) |
| `npm run lint` | Linter con auto-fix |
| `npm test` | Tests unitarios |
| `npm run test:cov` | Tests con cobertura |
| `npm run db:seed` | Poblar BD con datos iniciales |

---

## 10. Estructura del proyecto

```
src/
├── auth/           # Autenticación JWT + 2FA
├── alumnos/        # Gestión de alumnos
├── calificaciones/ # Calificaciones y libro de notas
├── inscripciones/  # Inscripciones a cursos
├── asistencias/    # Registro de asistencias
├── planificacion/  # Planificación curricular y diario de clases
├── docentes/       # Legajos y asignaciones de docentes
├── examenes/       # Mesas de examen e inscripciones
├── calendario/     # Ciclos lectivos y calendario
├── alertas/        # Alertas académicas de riesgo
├── alta-academica/ # Altas académicas
├── biblioteca/     # Materiales de estudio con PDFs (S3)
├── espacios/       # Reserva y mantenimiento de espacios
├── documentos/     # Documentos de alumnos (S3)
├── database/
│   ├── migrations/ # 18 migraciones SQL numeradas
│   └── seeds/      # Datos iniciales
└── common/         # Decoradores, filtros y guards compartidos
```

---

## Problemas frecuentes

**La API no conecta a la BD:**
- Verificar que `sge_postgres` esté corriendo: `docker ps`
- El contenedor `api` usa `DB_HOST=postgres` (nombre del servicio Docker), no `localhost`

**MinIO no crea el bucket automáticamente:**
- El servicio `BibliotecaService` y `DocumentosService` crean el bucket en `onModuleInit`
- Si falla, crear el bucket manualmente desde la consola: `http://localhost:9001`

**Puerto 3000 ocupado (Windows):**
```powershell
Get-NetTCPConnection -LocalPort 3000 | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }
```
