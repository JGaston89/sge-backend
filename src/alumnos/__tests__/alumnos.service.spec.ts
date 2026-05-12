import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AlumnosService } from '../alumnos.service';
import { AlumnosRepository, Alumno } from '../alumnos.repository';
import { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { CreateAlumnoDto } from '../dto/create-alumno.dto';
import { BajaAlumnoDto } from '../dto/baja-alumno.dto';
import { UpdateAlumnoDto } from '../dto/update-alumno.dto';

// ─── Fixtures ────────────────────────────────────────────────

const mockUser: JwtPayload = {
  sub:   'user-uuid-001',
  inst:  'inst-uuid-001',
  email: 'admin@escuela.edu.ar',
  roles: ['admin'],
  iat:   0,
  exp:   9999999999,
};

const mockAlumno: Alumno = {
  id:               'alumno-uuid-001',
  institucion_id:   'inst-uuid-001',
  numero_legajo:    '2025-00001',
  dni:              '38123456',
  nombre:           'Juan',
  apellido:         'Pérez',
  fecha_nacimiento: null,
  genero:           null,
  nacionalidad:     null,
  email:            null,
  telefono:         null,
  domicilio:        null,
  contactos:        [],
  estado:           'activo',
  fecha_baja:       null,
  motivo_baja:      null,
  created_at:       new Date('2025-01-01'),
  updated_at:       new Date('2025-01-01'),
};

// ─── Suite ───────────────────────────────────────────────────

describe('AlumnosService', () => {
  let service: AlumnosService;
  let repo: jest.Mocked<AlumnosRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlumnosService,
        {
          provide: AlumnosRepository,
          useValue: {
            findByDni:            jest.fn(),
            generarNumeroLegajo:  jest.fn(),
            create:               jest.fn(),
            findById:             jest.fn(),
            findAll:              jest.fn(),
            update:               jest.fn(),
            darDeBaja:            jest.fn(),
            getHistorial:         jest.fn(),
            auditLog:             jest.fn(),
          } satisfies Partial<Record<keyof AlumnosRepository, jest.Mock>>,
        },
      ],
    }).compile();

    service = module.get(AlumnosService);
    repo    = module.get(AlumnosRepository);
  });

  // ─── create ─────────────────────────────────────────────

  describe('create', () => {
    const dto: CreateAlumnoDto = {
      dni:      '38123456',
      nombre:   'Juan',
      apellido: 'Pérez',
    };

    it('lanza ConflictException si el DNI ya existe en la institución', async () => {
      repo.findByDni.mockResolvedValue(mockAlumno);
      await expect(service.create(dto, mockUser)).rejects.toThrow(ConflictException);
      expect(repo.generarNumeroLegajo).not.toHaveBeenCalled();
    });

    it('genera legajo y crea el alumno correctamente', async () => {
      repo.findByDni.mockResolvedValue(null);
      repo.generarNumeroLegajo.mockResolvedValue('ALU-2025-00001');
      repo.create.mockResolvedValue(mockAlumno);
      repo.auditLog.mockResolvedValue(undefined);

      const result = await service.create(dto, mockUser);

      expect(result.numero_legajo).toBe('ALU-2025-00001');
      expect(repo.auditLog).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'ALUMNO_CREADO', registro_id: mockAlumno.id }),
      );
    });
  });

  // ─── findOne ────────────────────────────────────────────

  describe('findOne', () => {
    it('lanza NotFoundException si el alumno no existe', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.findOne('bad-id', mockUser)).rejects.toThrow(NotFoundException);
    });

    it('devuelve el alumno cuando existe', async () => {
      repo.findById.mockResolvedValue(mockAlumno);
      const result = await service.findOne(mockAlumno.id, mockUser);
      expect(result.id).toBe(mockAlumno.id);
    });
  });

  // ─── update ─────────────────────────────────────────────

  describe('update', () => {
    const dto: UpdateAlumnoDto = { nombre: 'Juan Pablo' };

    it('lanza NotFoundException si el alumno no existe', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.update('bad-id', dto, mockUser)).rejects.toThrow(NotFoundException);
    });

    it('lanza ConflictException si el alumno está dado de baja', async () => {
      repo.findById.mockResolvedValue({ ...mockAlumno, estado: 'baja' });
      await expect(service.update(mockAlumno.id, dto, mockUser)).rejects.toThrow(ConflictException);
    });

    it('actualiza y audita correctamente', async () => {
      const actualizado = { ...mockAlumno, nombre: 'Juan Pablo' };
      repo.findById.mockResolvedValue(mockAlumno);
      repo.update.mockResolvedValue(actualizado);
      repo.auditLog.mockResolvedValue(undefined);

      const result = await service.update(mockAlumno.id, dto, mockUser);

      expect(result.nombre).toBe('Juan Pablo');
      expect(repo.auditLog).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'ALUMNO_MODIFICADO' }),
      );
    });
  });

  // ─── darDeBaja ──────────────────────────────────────────

  describe('darDeBaja', () => {
    const dto: BajaAlumnoDto = { motivo: 'Traslado a otra institución' };

    it('lanza NotFoundException si el alumno no existe', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.darDeBaja('bad-id', dto, mockUser)).rejects.toThrow(NotFoundException);
    });

    it('lanza ConflictException si el alumno ya está dado de baja', async () => {
      repo.findById.mockResolvedValue({ ...mockAlumno, estado: 'baja' });
      await expect(service.darDeBaja(mockAlumno.id, dto, mockUser)).rejects.toThrow(ConflictException);
    });

    it('da de baja y audita correctamente', async () => {
      const resultado = { ...mockAlumno, estado: 'baja' as const, motivo_baja: dto.motivo };
      repo.findById.mockResolvedValue(mockAlumno);
      repo.darDeBaja.mockResolvedValue(resultado);
      repo.auditLog.mockResolvedValue(undefined);

      const result = await service.darDeBaja(mockAlumno.id, dto, mockUser);

      expect(result.estado).toBe('baja');
      expect(repo.auditLog).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'ALUMNO_BAJA' }),
      );
    });
  });

  // ─── getHistorial ───────────────────────────────────────

  describe('getHistorial', () => {
    it('lanza NotFoundException si el alumno no existe', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.getHistorial('bad-id', mockUser)).rejects.toThrow(NotFoundException);
    });

    it('devuelve el historial del alumno', async () => {
      repo.findById.mockResolvedValue(mockAlumno);
      repo.getHistorial.mockResolvedValue([]);
      const result = await service.getHistorial(mockAlumno.id, mockUser);
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
