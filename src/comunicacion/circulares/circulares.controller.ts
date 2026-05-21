import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { CircularesService } from './circulares.service';
import { CreateCircularDto, UpdateCircularDto } from './dto/circular.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';

@ApiTags('Comunicación — Circulares')
@ApiBearerAuth()
@Controller('comunicacion/circulares')
export class CircularesController {
  constructor(private readonly service: CircularesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar circulares visibles para el usuario autenticado' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.service.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de circular (se marca como leída automáticamente)' })
  @ApiParam({ name: 'id' })
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findById(id, user);
  }

  @Post()
  @Roles('admin', 'directivo', 'administrativo')
  @ApiOperation({ summary: 'Crear circular / aviso / comunicado' })
  create(@Body() dto: CreateCircularDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Roles('admin', 'directivo', 'administrativo')
  @ApiOperation({ summary: 'Editar circular' })
  @ApiParam({ name: 'id' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCircularDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Roles('admin', 'directivo', 'administrativo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar circular' })
  @ApiParam({ name: 'id' })
  delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.delete(id, user);
  }
}
