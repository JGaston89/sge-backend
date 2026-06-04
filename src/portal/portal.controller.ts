import {
  Controller, Get, Post, Patch, Delete, Query,
  Body, Param, ParseUUIDPipe, HttpCode, HttpStatus,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { PortalService } from './portal.service';
import {
  CreateNoticiaDto, UpdateNoticiaDto, QueryNoticiasDto, UpdatePerfilInstitucionDto,
} from './dto/portal.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

// 50 MB — las imágenes se redimensionan en el servicio;
// los documentos tienen su propio límite de 10 MB aplicado allí.
const MULTER_LIMIT = 50 * 1024 * 1024;

// ── Rutas públicas (sin JWT) ──────────────────────────────────────────────────

@ApiTags('Portal — Público')
@Controller('portal')
export class PortalPublicController {
  constructor(private readonly service: PortalService) {}

  @Get(':institucionId/info')
  @Public()
  @ApiOperation({ summary: 'Información pública de la institución' })
  @ApiParam({ name: 'institucionId', type: 'string' })
  getInfo(@Param('institucionId', ParseUUIDPipe) institucionId: string) {
    return this.service.getPerfilPublico(institucionId);
  }

  @Get(':institucionId/noticias')
  @Public()
  @ApiOperation({ summary: 'Listar noticias publicadas' })
  @ApiParam({ name: 'institucionId', type: 'string' })
  @ApiQuery({ name: 'categoria', required: false })
  @ApiQuery({ name: 'destacada', required: false, type: Boolean })
  @ApiQuery({ name: 'q', required: false })
  findNoticias(
    @Param('institucionId', ParseUUIDPipe) institucionId: string,
    @Query() query: QueryNoticiasDto,
  ) {
    return this.service.findNoticias(institucionId, query);
  }

  @Get(':institucionId/noticias/:slug')
  @Public()
  @ApiOperation({ summary: 'Detalle de noticia por slug' })
  @ApiParam({ name: 'institucionId', type: 'string' })
  @ApiParam({ name: 'slug', type: 'string' })
  findNoticia(
    @Param('institucionId', ParseUUIDPipe) institucionId: string,
    @Param('slug') slug: string,
  ) {
    return this.service.findNoticiaBySlug(institucionId, slug);
  }
}

// ── Rutas admin (requieren JWT + rol directivo/admin) ─────────────────────────

@ApiTags('Portal — Administración')
@ApiBearerAuth()
@Controller('portal/admin')
export class PortalAdminController {
  constructor(private readonly service: PortalService) {}

  @Post('upload')
  @Roles('admin', 'directivo', 'administrativo')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: MULTER_LIMIT },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir imagen o archivo para noticias (imágenes se redimensionan a máx. 1920×1080)' })
  uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo.');
    return this.service.uploadFile(file, user.inst);
  }

  @Get('info')
  @Roles('admin', 'directivo')
  @ApiOperation({ summary: 'Obtener perfil institucional para edición' })
  getInfoAdmin(@CurrentUser() user: JwtPayload) {
    return this.service.getPerfilPublico(user.inst);
  }

  @Patch('info')
  @Roles('admin', 'directivo')
  @ApiOperation({ summary: 'Actualizar info pública de la institución' })
  updateInfo(@Body() dto: UpdatePerfilInstitucionDto, @CurrentUser() user: JwtPayload) {
    return this.service.updatePerfil(dto, user);
  }

  @Get('noticias')
  @Roles('admin', 'directivo', 'administrativo')
  @ApiOperation({ summary: 'Listar todas las noticias (incluye borradores)' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.service.findNoticiasAdmin(user);
  }

  @Get('noticias/:id')
  @Roles('admin', 'directivo', 'administrativo')
  @ApiOperation({ summary: 'Detalle de noticia para edición' })
  @ApiParam({ name: 'id' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findNoticiaById(id, user);
  }

  @Post('noticias')
  @Roles('admin', 'directivo', 'administrativo')
  @ApiOperation({ summary: 'Crear noticia (borrador o publicada)' })
  create(@Body() dto: CreateNoticiaDto, @CurrentUser() user: JwtPayload) {
    return this.service.createNoticia(dto, user);
  }

  @Patch('noticias/:id')
  @Roles('admin', 'directivo', 'administrativo')
  @ApiOperation({ summary: 'Editar noticia' })
  @ApiParam({ name: 'id' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNoticiaDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateNoticia(id, dto, user);
  }

  @Delete('noticias/:id')
  @Roles('admin', 'directivo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar noticia' })
  @ApiParam({ name: 'id' })
  delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.deleteNoticia(id, user);
  }
}
