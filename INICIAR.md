# Cómo levantar el sistema SGE

> Usá la terminal integrada de VSCode (`Ctrl + \``) para ejecutar estos comandos.

---

## Requisitos previos

- **Docker Desktop** abierto y corriendo (ícono en la barra de tareas sin animación)
- **Node.js** instalado (verificá con `node -v`)

---

## Paso 1 — Levantar la infraestructura (Docker)

Abrí una terminal en la carpeta del **backend** y ejecutá:

```bash
cd "d:\Proyectos en Claude\sge-backend"
docker compose up -d postgres redis minio
```

Esto levanta PostgreSQL, Redis y MinIO en segundo plano.
Verificá que estén sanos:

```bash
docker compose ps
```

Todos deben mostrar `healthy` en la columna STATUS.

---

## Paso 2 — Levantar el Backend

En la **misma terminal** (o una nueva pestaña en VSCode):

```bash
cd "d:\Proyectos en Claude\sge-backend"
npm run dev
```

Esperá hasta ver este mensaje en la consola:

```
🚀 SGE Backend en puerto 3000 [development]
```

> Si es la primera vez, también podés correr las migraciones antes de `npm run dev`:
> ```bash
> npm run db:migrate
> ```

---

## Paso 3 — Levantar el Frontend

Abrí una **nueva pestaña de terminal** en VSCode (`Ctrl + Shift + \``) y ejecutá:

```bash
cd "d:\Proyectos en Claude\sge-frontend"
npm run dev
```

Esperá hasta ver:

```
VITE ready in XXXX ms
➜  Local:   http://localhost:5173/
```

---

## Acceder al sistema

| Servicio   | URL                          |
|------------|------------------------------|
| Frontend   | http://localhost:5173        |
| Backend    | http://localhost:3000/api/v1 |
| Swagger    | http://localhost:3000/api/v1/docs |

**Credenciales de prueba:**

| Email                       | Contraseña  | Rol            |
|-----------------------------|-------------|----------------|
| directivo@escuela.com       | Admin123!   | Directivo      |
| administrativo@escuela.com  | Admin123!   | Administrativo |
| docente@escuela.com         | Admin123!   | Docente        |

---

## Apagar todo

```bash
# Detener el frontend: Ctrl+C en su terminal

# Detener el backend: Ctrl+C en su terminal

# Detener los contenedores Docker:
cd "d:\Proyectos en Claude\sge-backend"
docker compose down
```

---

## Solución de problemas

**El backend no toma los cambios de código (errores de columna inexistente, rutas 404)**
→ `nest start --watch` a veces no detecta cambios de archivo desde Windows via Docker volume.
→ Solución: reiniciá el container `sge_api` desde Docker Desktop o con `docker restart sge_api`.

**El backend no arranca — "Redis: reconnect limit"**
→ Docker Desktop no está corriendo. Abrilo y repetí el Paso 1.

**El backend no arranca — error de compilación TypeScript**
→ Leé el mensaje de error en la consola. Generalmente es un import incorrecto.

**El frontend muestra error 401**
→ El token expiró. Cerrá sesión y volvé a iniciar.

**Puerto 3000 ya en uso**
→ Hay otro proceso usando ese puerto. Ejecutá en PowerShell:
```powershell
Get-NetTCPConnection -LocalPort 3000 | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }
```



Buscar logs de token para validar correo:

SOLUCIÓN SIMPLE

Probá este comando: (intentar siempre con este comando)

docker logs sge_api --tail 50

Usá:

docker logs sge_api --tail 100 | findstr "http://localhost"

👉 Eso buscará directamente la URL.

🟢 Si estás en PowerShell moderno

También podés usar:

docker logs sge_api 2>&1 | Select-String "http://localhost"


Nota para el futuro: cada vez que edites código del backend, si el container no lo detecta automáticamente, usá docker restart sge_api desde Docker Desktop para forzar la recompilación.