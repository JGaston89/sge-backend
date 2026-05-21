import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  ParseUUIDPipe, HttpCode, HttpStatus, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiParam, ApiConsumes } from '@nestjs/swagger';
import { BibliotecaService } from './biblioteca.service';
import { CreateMaterialEstudioDto, UpdateMaterialEstudioDto } from './dto/biblioteca.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Biblioteca')
@ApiBearerAuth()
@Controller('biblioteca')
export class BibliotecaController {
  constructor(private readonly svc: BibliotecaService) {}

  @Get()
  @ApiOperation({ summary: 'Listar materiales de estudio (paginado, con búsqueda)' })
  @ApiQuery({ name: 'search',     required: false })
  @ApiQuery({ name: 'docente_id', required: false })
  @ApiQuery({ name: 'curso_id',   required: false })
  @ApiQuery({ name: 'materia_id', required: false })
  @ApiQuery({ name: 'page',       required: false, type: Number })
  getMateriales(
    @Query('search')     search?: string,
    @Query('docente_id') docente_id?: string,
    @Query('curso_id')   curso_id?: string,
    @Query('materia_id') materia_id?: string,
    @Query('page')       page?: string,
  ) {
    return this.svc.getMateriales({
      search,
      docente_id,
      curso_id,
      materia_id,
      page: Math.max(1, parseInt(page ?? '1', 10) || 1),
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un material' })
  @ApiParam({ name: 'id' })
  getMaterial(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.getMaterialById(id);
  }

  @Post()
  @Roles('admin', 'directivo', 'administrativo', 'docente')
  @ApiOperation({ summary: 'Crear material de estudio' })
  createMaterial(
    @Body() dto: CreateMaterialEstudioDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.createMaterial(dto, user);
  }

  @Patch(':id')
  @Roles('admin', 'directivo', 'administrativo', 'docente')
  @ApiOperation({ summary: 'Editar material de estudio' })
  @ApiParam({ name: 'id' })
  updateMaterial(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMaterialEstudioDto,
  ) {
    return this.svc.updateMaterial(id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'directivo', 'administrativo')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar material (borra todos sus archivos de S3)' })
  @ApiParam({ name: 'id' })
  deleteMaterial(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.deleteMaterial(id);
  }

  @Post(':id/archivos')
  @Roles('admin', 'directivo', 'administrativo', 'docente')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Subir PDF al material' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id' })
  uploadArchivo(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('titulo') titulo?: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.svc.uploadArchivo(id, file, titulo, user!);
  }

  @Get('archivos/:archivoId/url')
  @ApiOperation({ summary: 'Obtener URL pre-firmada de un archivo' })
  @ApiParam({ name: 'archivoId' })
  getArchivoUrl(@Param('archivoId', ParseUUIDPipe) archivoId: string) {
    return this.svc.getArchivoUrl(archivoId);
  }

  @Delete('archivos/:archivoId')
  @Roles('admin', 'directivo', 'administrativo', 'docente')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un archivo PDF' })
  @ApiParam({ name: 'archivoId' })
  deleteArchivo(@Param('archivoId', ParseUUIDPipe) archivoId: string) {
    return this.svc.deleteArchivo(archivoId);
  }
}
