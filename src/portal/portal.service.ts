import {
  Injectable, NotFoundException, OnModuleInit, BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client, PutObjectCommand, DeleteObjectCommand,
  CreateBucketCommand, HeadBucketCommand, PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';
import * as sharp from 'sharp';
import { PortalRepository } from './portal.repository';
import type {
  CreateNoticiaDto, UpdateNoticiaDto, QueryNoticiasDto, UpdatePerfilInstitucionDto,
} from './dto/portal.dto';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

const IMAGE_MIME = new Set(['image/jpeg','image/png','image/gif','image/webp']);

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const MAX_IMAGE_BYTES = 50 * 1024 * 1024; // 50 MB — se redimensiona antes de guardar
const MAX_DOC_BYTES   = 10 * 1024 * 1024; // 10 MB para documentos

export interface ArchivoPortal {
  nombre: string;
  url: string;
  s3_key: string;
  mime_type: string;
  tamano_bytes: number;
}

@Injectable()
export class PortalService implements OnModuleInit {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly endpointInternal: string;
  private readonly endpointPublic: string;

  constructor(
    private readonly config: ConfigService,
    private readonly repo: PortalRepository,
  ) {
    this.endpointInternal = config.get<string>('S3_ENDPOINT_INTERNAL') ?? 'http://localhost:9000';
    this.endpointPublic   = config.get<string>('S3_ENDPOINT_PUBLIC')   ?? 'http://localhost:9000';
    this.bucket           = config.get<string>('S3_PORTAL_BUCKET')     ?? 'sge-portal';

    this.s3 = new S3Client({
      region:      config.get<string>('S3_REGION')     ?? 'us-east-1',
      endpoint:    this.endpointInternal,
      credentials: {
        accessKeyId:     config.get<string>('S3_ACCESS_KEY') ?? 'minioadmin',
        secretAccessKey: config.get<string>('S3_SECRET_KEY') ?? 'minioadmin',
      },
      forcePathStyle: true,
    });
  }

  async onModuleInit() {
    // Crear bucket si no existe
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
      } catch (e) {
        console.warn('[PortalService] No se pudo crear el bucket portal:', (e as Error).message);
        return;
      }
    }
    // Política de lectura pública para que imágenes sean accesibles en el portal
    try {
      const policy = JSON.stringify({
        Version: '2012-10-17',
        Statement: [{
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${this.bucket}/*`],
        }],
      });
      await this.s3.send(new PutBucketPolicyCommand({ Bucket: this.bucket, Policy: policy }));
    } catch (e) {
      console.warn('[PortalService] No se pudo aplicar política pública:', (e as Error).message);
    }
  }

  // ── Upload con resize automático para imágenes ───────────────────────────

  async uploadFile(file: Express.Multer.File, instId: string): Promise<ArchivoPortal> {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException(
        'Tipo de archivo no permitido. Se aceptan imágenes (JPG, PNG, GIF, WEBP) y documentos (PDF, Word, Excel).',
      );
    }

    let buffer = file.buffer;
    let finalMime = file.mimetype;
    let ext = file.originalname.split('.').pop()?.toLowerCase() ?? 'bin';

    if (IMAGE_MIME.has(file.mimetype)) {
      // Imágenes: aceptar hasta 50 MB, redimensionar a máx 1920×1080
      if (file.size > MAX_IMAGE_BYTES) {
        throw new BadRequestException('La imagen supera el tamaño máximo permitido de 50 MB.');
      }

      if (file.mimetype === 'image/gif') {
        // Los GIFs no se redimensionan para no perder la animación
        buffer = file.buffer;
      } else {
        // Redimensiona manteniendo proporción, nunca amplía
        buffer = await sharp(file.buffer)
          .resize({ width: 1920, height: 1080, fit: 'inside', withoutEnlargement: true })
          .toBuffer();
      }
    } else {
      // Documentos: límite estricto de 10 MB
      if (file.size > MAX_DOC_BYTES) {
        throw new BadRequestException(
          `El documento supera el tamaño máximo permitido de 10 MB. El archivo pesa ${(file.size / (1024 * 1024)).toFixed(1)} MB.`,
        );
      }
    }

    const s3Key  = `${instId}/noticias/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const pubUrl = `${this.endpointPublic}/${this.bucket}/${s3Key}`;

    await this.s3.send(new PutObjectCommand({
      Bucket:      this.bucket,
      Key:         s3Key,
      Body:        buffer,
      ContentType: finalMime,
    }));

    return {
      nombre:       file.originalname,
      url:          pubUrl,
      s3_key:       s3Key,
      mime_type:    finalMime,
      tamano_bytes: buffer.length,
    };
  }

  async deleteFile(s3Key: string) {
    try {
      await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: s3Key }));
    } catch (e) {
      console.warn('[PortalService] No se pudo eliminar archivo:', (e as Error).message);
    }
  }

  // ── Perfil público (sin auth) ─────────────────────────────────────

  async getPerfilPublico(institucionId: string) {
    const perfil = await this.repo.getPerfilPublico(institucionId);
    if (!perfil) throw new NotFoundException('Institución no encontrada');
    return perfil;
  }

  async updatePerfil(dto: UpdatePerfilInstitucionDto, user: JwtPayload) {
    return this.repo.updatePerfil(user.inst, dto);
  }

  // ── Noticias públicas (sin auth) ──────────────────────────────────

  findNoticias(institucionId: string, query: QueryNoticiasDto) {
    return this.repo.findNoticias(institucionId, query);
  }

  async findNoticiaBySlug(institucionId: string, slug: string) {
    const noticia = await this.repo.findNoticiaBySlug(institucionId, slug);
    if (!noticia) throw new NotFoundException('Noticia no encontrada');
    return noticia;
  }

  // ── Admin ─────────────────────────────────────────────────────────

  findNoticiasAdmin(user: JwtPayload) {
    return this.repo.findNoticiasAdmin(user.inst);
  }

  async findNoticiaById(id: string, user: JwtPayload) {
    const noticia = await this.repo.findNoticiaById(id, user.inst);
    if (!noticia) throw new NotFoundException('Noticia no encontrada');
    return noticia;
  }

  createNoticia(dto: CreateNoticiaDto, user: JwtPayload) {
    return this.repo.createNoticia(user.inst, user.sub, dto);
  }

  updateNoticia(id: string, dto: UpdateNoticiaDto, user: JwtPayload) {
    return this.repo.updateNoticia(id, user.inst, dto);
  }

  deleteNoticia(id: string, user: JwtPayload) {
    return this.repo.deleteNoticia(id, user.inst);
  }
}
