# Dependencias del Proyecto

## Backend — ya instalado (`npm install`)

```bash
npm install
```

Todas las dependencias del backend están declaradas en `package.json`. Las principales:

| Paquete | Uso |
|---|---|
| `@nestjs/common`, `core`, `platform-express` | Framework principal |
| `@nestjs/jwt`, `passport-jwt` | Autenticación JWT |
| `@nestjs/config` | Variables de entorno |
| `@nestjs/swagger` | Documentación API (`/api/v1/docs`) |
| `@nestjs/throttler` | Rate limiting |
| `pg` | PostgreSQL |
| `redis` | Sesiones / caché |
| `bcryptjs` | Hash de contraseñas |
| `nodemailer` | Envío de emails (activación de cuenta, reset password) |
| `otplib` + `qrcode` | Autenticación 2FA (TOTP) |
| `@aws-sdk/client-s3` | Almacenamiento de documentos (MinIO / S3) |
| `pdfkit` | Generación de PDFs |
| `class-validator` + `class-transformer` | Validación de DTOs |
| `helmet` | Seguridad HTTP headers |
| `nest-winston` + `winston` | Logging |
| `libphonenumber-js` | Validación de teléfonos |
| `uuid` | Generación de IDs |

---

## Frontend — ya instalado

```bash
npm install
```

| Paquete | Uso |
|---|---|
| `react` + `react-dom` | Framework UI |
| `react-router-dom` v7 | Routing |
| `@tanstack/react-query` v5 | Fetching / caché de datos del servidor |
| `axios` | Cliente HTTP |
| `lucide-react` | Íconos |
| `libphonenumber-js` | Validación de teléfonos (mismo que backend) |

---

## Frontend — librerías adicionales recomendadas

Según las funcionalidades del backend, estas librerías **no están instaladas** pero serán necesarias:

### Formularios y validación
```bash
npm install react-hook-form zod @hookform/resolvers
```
| Paquete | Por qué |
|---|---|
| `react-hook-form` | Manejo de formularios complejos (alta de alumnos, docentes, etc.) |
| `zod` | Validación de esquemas con tipado TypeScript |
| `@hookform/resolvers` | Integración entre react-hook-form y zod |

### Notificaciones
```bash
npm install sonner
```
| Paquete | Por qué |
|---|---|
| `sonner` | Toasts de éxito/error al guardar, eliminar, etc. |

### Fechas
```bash
npm install date-fns
```
| Paquete | Por qué |
|---|---|
| `date-fns` | Formateo de fechas (ciclo lectivo, fechas de baja, historial) |

### Subida de archivos
```bash
npm install react-dropzone
```
| Paquete | Por qué |
|---|---|
| `react-dropzone` | Upload de documentos a la Biblioteca (el backend genera presigned URLs de S3/MinIO) |

### Autenticación 2FA
```bash
npm install qrcode.react
```
| Paquete | Por qué |
|---|---|
| `qrcode.react` | Renderizar el QR code para configurar TOTP (el backend lo genera como string, el frontend lo muestra) |

### Gráficos / Dashboard
```bash
npm install recharts
```
| Paquete | Por qué |
|---|---|
| `recharts` | Gráficos de asistencia, calificaciones, alumnos en riesgo |

---

## Variables de entorno — Frontend

Crear `.env` en la raíz del frontend:

```env
VITE_API_URL=http://localhost:3000/api/v1
```

En producción reemplazar con la URL del servidor.

---

## Variables de entorno — Backend

Copiar `.env.example` a `.env` y completar los valores. Ver `README.md` para detalle de cada variable.

---

## Infraestructura local (Docker)

```bash
# Levantar base de datos, Redis y MinIO
docker compose up -d

# Correr migraciones
npm run db:migrate

# Correr seed inicial (crea institución + usuario admin)
npm run db:seed

# Iniciar backend en modo desarrollo
npm run dev
```

Acceso local:
- **API**: http://localhost:3000/api/v1
- **Swagger**: http://localhost:3000/api/v1/docs
- **MinIO Console**: http://localhost:9001 (usuario: `sge_admin` / `sge_password_dev`)
