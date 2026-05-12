import * as bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'sge_db',
  user:     process.env.DB_USER     || 'sge_user',
  password: process.env.DB_PASSWORD || '',
});

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── Institución ──────────────────────────────────────────
    const { rows: [inst] } = await client.query(`
      INSERT INTO instituciones (nombre, tipo, cuit, domicilio)
      VALUES ('Escuela Técnica N°1', 'escuela', '30-12345678-9', 'Av. Rivadavia 1234, CABA')
      ON CONFLICT (cuit) DO UPDATE SET nombre = EXCLUDED.nombre
      RETURNING id
    `);
    const institucionId: string = inst.id;
    console.log(`✓ Institución:  ${institucionId}`);

    // ── Roles ────────────────────────────────────────────────
    const roleNames = ['admin', 'directivo', 'administrativo', 'docente'];
    const roleIds: Record<string, string> = {};
    for (const nombre of roleNames) {
      const { rows: [rol] } = await client.query(`
        INSERT INTO roles (institucion_id, nombre, descripcion, permisos)
        VALUES ($1, $2, $3, '{}')
        ON CONFLICT (institucion_id, nombre) DO UPDATE SET nombre = EXCLUDED.nombre
        RETURNING id
      `, [institucionId, nombre, `Rol ${nombre}`]);
      roleIds[nombre] = rol.id;
    }
    console.log(`✓ Roles:        ${Object.keys(roleIds).join(', ')}`);

    // ── Usuarios ─────────────────────────────────────────────
    const passwordHash = await bcrypt.hash('Admin123!', 10);
    const users = [
      { email: 'admin@escuela.com',        nombre: 'Administrador', apellido: 'Sistema',    rol: 'admin'         },
      { email: 'directivo@escuela.com',    nombre: 'María',         apellido: 'González',  rol: 'directivo'     },
      { email: 'administrativo@escuela.com', nombre: 'Carlos',      apellido: 'Pérez',     rol: 'administrativo' },
      { email: 'docente@escuela.com',      nombre: 'Juan',          apellido: 'García',    rol: 'docente'       },
    ];

    for (const u of users) {
      const { rows: existing } = await client.query(
        'SELECT id FROM usuarios WHERE email = $1 AND institucion_id = $2',
        [u.email, institucionId],
      );

      let userId: string;
      if (existing.length > 0) {
        userId = existing[0].id;
        console.log(`  (ya existe)  ${u.email}`);
      } else {
        const { rows: [usr] } = await client.query(`
          INSERT INTO usuarios
            (institucion_id, email, password_hash, nombre, apellido,
             activo, email_verificado, primer_acceso)
          VALUES ($1, $2, $3, $4, $5, true, true, false)
          RETURNING id
        `, [institucionId, u.email, passwordHash, u.nombre, u.apellido]);
        userId = usr.id;
        console.log(`✓ Usuario:      ${u.email}`);
      }

      await client.query(`
        INSERT INTO usuario_roles (usuario_id, rol_id, fecha_desde)
        VALUES ($1, $2, CURRENT_DATE)
        ON CONFLICT (usuario_id, rol_id) DO NOTHING
      `, [userId, roleIds[u.rol]]);
    }

    // ── Materias ─────────────────────────────────────────────
    const materias = ['Matemática', 'Lengua y Literatura', 'Historia', 'Física', 'Química'];
    const materiaIds: Record<string, string> = {};
    for (const nombre of materias) {
      const { rows: [mat] } = await client.query(`
        INSERT INTO materias (institucion_id, nombre)
        VALUES ($1, $2)
        ON CONFLICT (institucion_id, nombre) DO UPDATE SET nombre = EXCLUDED.nombre
        RETURNING id
      `, [institucionId, nombre]);
      materiaIds[nombre] = mat.id;
    }
    console.log(`✓ Materias:     ${materias.join(', ')}`);

    // ── Cursos ───────────────────────────────────────────────
    const anio = new Date().getFullYear();
    const cursos = [
      { nombre: '1° Año A', nivel: 'secundaria', turno: 'manana' },
      { nombre: '2° Año B', nivel: 'secundaria', turno: 'tarde'  },
    ];
    const cursoIds: Record<string, string> = {};
    for (const c of cursos) {
      const { rows: [cur] } = await client.query(`
        INSERT INTO cursos (institucion_id, nombre, anio_academico, nivel, turno)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (institucion_id, nombre, anio_academico) DO UPDATE SET nombre = EXCLUDED.nombre
        RETURNING id
      `, [institucionId, c.nombre, anio, c.nivel, c.turno]);
      cursoIds[c.nombre] = cur.id;
    }
    console.log(`✓ Cursos:       ${cursos.map(c => c.nombre).join(', ')}`);

    // ── Alumnos de prueba ────────────────────────────────────
    const alumnosSeed = [
      { dni: '40000001', nombre: 'Lucas',    apellido: 'Fernández', curso: '1° Año A' },
      { dni: '40000002', nombre: 'Valentina', apellido: 'López',    curso: '1° Año A' },
      { dni: '40000003', nombre: 'Matías',   apellido: 'Torres',    curso: '2° Año B' },
    ];
    for (const al of alumnosSeed) {
      const { rows: existing } = await client.query(
        'SELECT id FROM alumnos WHERE dni = $1 AND institucion_id = $2',
        [al.dni, institucionId],
      );
      let alumnoId: string;
      if (existing.length > 0) {
        alumnoId = existing[0].id;
      } else {
        const legajoAnio = anio;
        const { rows: [seq] } = await client.query(`
          INSERT INTO legajo_secuencias (institucion_id, anio, ultimo_numero)
          VALUES ($1, $2, 1)
          ON CONFLICT (institucion_id, anio)
          DO UPDATE SET ultimo_numero = legajo_secuencias.ultimo_numero + 1
          RETURNING ultimo_numero
        `, [institucionId, legajoAnio]);
        const legajo = `${legajoAnio}-${seq.ultimo_numero.toString().padStart(5, '0')}`;
        const { rows: [newAl] } = await client.query(`
          INSERT INTO alumnos (institucion_id, numero_legajo, dni, nombre, apellido)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `, [institucionId, legajo, al.dni, al.nombre, al.apellido]);
        alumnoId = newAl.id;
        console.log(`✓ Alumno:       ${al.nombre} ${al.apellido} (legajo ${legajo})`);
      }

      await client.query(`
        INSERT INTO curso_alumnos (curso_id, alumno_id)
        VALUES ($1, $2)
        ON CONFLICT (curso_id, alumno_id) DO NOTHING
      `, [cursoIds[al.curso], alumnoId]);
    }

    await client.query('COMMIT');

    console.log('\n─────────────────────────────────────────────');
    console.log('  Seed completado. Credenciales de acceso:');
    console.log('─────────────────────────────────────────────');
    console.log(`  Email              Rol             Contraseña`);
    console.log(`  admin@escuela.com          admin           Admin123!`);
    console.log(`  directivo@escuela.com      directivo       Admin123!`);
    console.log(`  administrativo@escuela.com administrativo  Admin123!`);
    console.log(`  docente@escuela.com        docente         Admin123!`);
    console.log('─────────────────────────────────────────────');
    console.log(`  institucion_id: ${institucionId}`);
    console.log('─────────────────────────────────────────────');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error en seed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
