import {
  Injectable, NotFoundException, BadRequestException, OnModuleInit,
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
import { BibliotecaRepository } from './biblioteca.repository';
import { CreateMaterialEstudioDto, UpdateMaterialEstudioDto } from './dto/biblioteca.dto';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

const ALLOWED_MIME = ['application/pdf'];
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB por archivo
const URL_TTL_SECONDS = 900; // 15 min

@Injectable()
export class BibliotecaService implements OnModuleInit {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly endpointInternal: string;
  private readonly endpointPublic: string;

  constructor(
    private readonly config: ConfigService,
    private readonly repo: BibliotecaRepository,
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

  async onModuleInit() {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
      } catch (e) {
        console.warn('[BibliotecaService] No se pudo crear bucket S3:', (e as Error).message);
      }
    }
  }

  private async buildPresignedUrl(s3Key: string): Promise<string> {
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: s3Key });
    const internalUrl = await getSignedUrl(this.s3, cmd, { expiresIn: URL_TTL_SECONDS });
    return internalUrl.replace(this.endpointInternal, this.endpointPublic);
  }

  private async attachUrls(material: any): Promise<any> {
    const archivos = await Promise.all(
      (material.archivos ?? []).map(async (a: any) => ({
        ...a,
        url: await this.buildPresignedUrl(a.s3_key),
      })),
    );
    return { ...material, archivos };
  }

  async getMateriales(opts: {
    search?: string;
    docente_id?: string;
    curso_id?: string;
    materia_id?: string;
    page: number;
  }) {
    const limit = 10;
    const { items, total } = await this.repo.findMateriales({ ...opts, limit });
    const itemsWithUrls = await Promise.all(items.map((m) => this.attachUrls(m)));
    return {
      items: itemsWithUrls,
      total,
      page: opts.page,
      pages: Math.ceil(total / limit),
    };
  }

  async getMaterialById(id: string) {
    const material = await this.repo.findById(id);
    if (!material) throw new NotFoundException('Material no encontrado');
    return this.attachUrls(material);
  }

  async createMaterial(dto: CreateMaterialEstudioDto, user: JwtPayload) {
    return this.repo.createMaterial(dto, user.sub);
  }

  async updateMaterial(id: string, dto: UpdateMaterialEstudioDto) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Material no encontrado');
    return this.repo.updateMaterial(id, dto);
  }

  async deleteMaterial(id: string) {
    const material = await this.repo.findById(id);
    if (!material) throw new NotFoundException('Material no encontrado');

    for (const archivo of material.archivos) {
      try {
        await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: archivo.s3_key }));
      } catch (e) {
        console.warn('[BibliotecaService] No se pudo eliminar archivo S3:', archivo.s3_key);
      }
    }
    await this.repo.deleteMaterial(id);
  }

  async uploadArchivo(
    materialId: string,
    file: Express.Multer.File,
    tituloArchivo: string | undefined,
    user: JwtPayload,
  ) {
    const material = await this.repo.findById(materialId);
    if (!material) throw new NotFoundException('Material no encontrado');

    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException('Solo se permiten archivos PDF');
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException('El archivo supera el límite de 20 MB');
    }

    const ext = file.originalname.split('.').pop() ?? 'pdf';
    const s3Key = `biblioteca/${materialId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    await this.s3.send(new PutObjectCommand({
      Bucket:      this.bucket,
      Key:         s3Key,
      Body:        file.buffer,
      ContentType: file.mimetype,
    }));

    const archivo = await this.repo.createArchivo({
      material_id:     materialId,
      nombre_original: file.originalname,
      titulo_archivo:  tituloArchivo,
      s3_key:          s3Key,
      s3_bucket:       this.bucket,
      mime_type:       file.mimetype,
      tamano_bytes:    file.size,
      userId:          user.sub,
    });

    return { ...archivo, url: await this.buildPresignedUrl(s3Key) };
  }

  async deleteArchivo(archivoId: string) {
    const archivo = await this.repo.findArchivo(archivoId);
    if (!archivo) throw new NotFoundException('Archivo no encontrado');

    try {
      await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: archivo.s3_key }));
    } catch (e) {
      console.warn('[BibliotecaService] No se pudo eliminar archivo S3:', archivo.s3_key);
    }
    await this.repo.deleteArchivo(archivoId);
  }

  async getArchivoUrl(archivoId: string) {
    const archivo = await this.repo.findArchivo(archivoId);
    if (!archivo) throw new NotFoundException('Archivo no encontrado');
    return { url: await this.buildPresignedUrl(archivo.s3_key) };
  }
}
