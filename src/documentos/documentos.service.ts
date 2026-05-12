import {
  Injectable,
  OnModuleInit,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { DocumentosRepository } from './documentos.repository';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const URL_TTL_SECONDS = 900; // 15 min

@Injectable()
export class DocumentosService implements OnModuleInit {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly endpointInternal: string;
  private readonly endpointPublic: string;

  constructor(
    private readonly config: ConfigService,
    private readonly repo: DocumentosRepository,
  ) {
    this.endpointInternal = config.get<string>('S3_ENDPOINT_INTERNAL') ?? 'http://localhost:9000';
    this.endpointPublic   = config.get<string>('S3_ENDPOINT_PUBLIC')  ?? 'http://localhost:9000';
    this.bucket           = config.get<string>('S3_BUCKET')           ?? 'sge-documentos';

    this.s3 = new S3Client({
      region:      config.get<string>('S3_REGION') ?? 'us-east-1',
      endpoint:    this.endpointInternal,
      credentials: {
        accessKeyId:     config.get<string>('S3_ACCESS_KEY') ?? 'minioadmin',
        secretAccessKey: config.get<string>('S3_SECRET_KEY') ?? 'minioadmin',
      },
      forcePathStyle: true,
    });
  }

  // ── Crear bucket si no existe (útil para MinIO local) ────────

  async onModuleInit() {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
      } catch (e) {
        console.warn('[DocumentosService] No se pudo crear el bucket S3:', (e as Error).message);
      }
    }
  }

  // ── Subir documento ──────────────────────────────────────────

  async upload(
    alumnoId: string,
    file: Express.Multer.File,
    tipoDocumento: string,
    user: JwtPayload,
  ) {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException('Solo se permiten archivos PDF, JPG y PNG');
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException('El archivo supera el tamaño máximo de 10 MB');
    }

    const version = (await this.repo.getLastVersion(alumnoId, tipoDocumento)) + 1;
    const ext     = file.originalname.split('.').pop() ?? 'bin';
    const s3Key   = `${user.inst}/${alumnoId}/${tipoDocumento}/v${version}-${Date.now()}.${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket:      this.bucket,
        Key:         s3Key,
        Body:        file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          alumno_id:      alumnoId,
          tipo_documento: tipoDocumento,
          subido_por:     user.sub,
        },
      }),
    );

    const doc = await this.repo.create({
      institucion_id: user.inst,
      alumno_id:      alumnoId,
      tipo_documento: tipoDocumento,
      nombre_archivo: file.originalname,
      s3_key:         s3Key,
      s3_bucket:      this.bucket,
      mime_type:      file.mimetype,
      tamano_bytes:   file.size,
      version,
      subido_por:     user.sub,
    });

    return doc;
  }

  // ── Listar documentos con pre-signed URLs ────────────────────

  async findByAlumno(alumnoId: string, user: JwtPayload) {
    const docs = await this.repo.findByAlumno(alumnoId, user.inst);

    return Promise.all(
      docs.map(async (d) => {
        const cmd = new GetObjectCommand({ Bucket: d.s3_bucket, Key: d.s3_key });
        const signedUrl = await getSignedUrl(this.s3, cmd, { expiresIn: URL_TTL_SECONDS });
        const url = signedUrl.replace(this.endpointInternal, this.endpointPublic);
        return { ...d, url };
      }),
    );
  }

  // ── Eliminar (soft delete) ────────────────────────────────────

  async delete(alumnoId: string, docId: string, user: JwtPayload) {
    const doc = await this.repo.findById(docId, user.inst);
    if (!doc || doc.alumno_id !== alumnoId || !doc.activo) {
      throw new NotFoundException('Documento no encontrado');
    }

    await this.repo.softDelete(docId, user.sub);

    // Intentar borrar el objeto de S3 (no bloqueante si falla)
    this.s3
      .send(new DeleteObjectCommand({ Bucket: doc.s3_bucket, Key: doc.s3_key }))
      .catch((e) => console.warn('[DocumentosService] No se pudo eliminar de S3:', (e as Error).message));

    return { ok: true };
  }
}
