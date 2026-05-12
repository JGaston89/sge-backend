import { Controller, Get, Param, Query, ParseUUIDPipe, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { AlertasService } from './alertas.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Alertas')
@ApiBearerAuth()
@Controller()
export class AlertasController {
  constructor(private readonly service: AlertasService) {}

  // GET /alertas?curso_id=&ciclo_lectivo=&periodo=
  @Get('alertas')
  @ApiOperation({ summary: 'Obtener alertas de riesgo académico por curso y ciclo lectivo' })
  @ApiQuery({ name: 'curso_id',      required: true })
  @ApiQuery({ name: 'ciclo_lectivo', required: true })
  @ApiQuery({ name: 'periodo',       required: false })
  getAlertasByCurso(
    @Query('curso_id') cursoId: string,
    @Query('ciclo_lectivo') cicloLectivo: string,
    @Query('periodo') periodo: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getAlertasByCurso(cursoId, Number(cicloLectivo), user, periodo);
  }

  // GET /alertas/export?curso_id=&ciclo_lectivo=&periodo=
  @Get('alertas/export')
  @ApiOperation({ summary: 'Exportar reporte de riesgo académico como PDF' })
  @ApiQuery({ name: 'curso_id',      required: true })
  @ApiQuery({ name: 'ciclo_lectivo', required: true })
  @ApiQuery({ name: 'periodo',       required: false })
  async exportPdf(
    @Query('curso_id') cursoId: string,
    @Query('ciclo_lectivo') cicloLectivo: string,
    @Query('periodo') periodo: string | undefined,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const buffer = await this.service.exportPdf(cursoId, Number(cicloLectivo), user, periodo);
    const filename = `alertas-${cursoId}-${cicloLectivo}${periodo ? '-' + periodo.replace(/\s+/g, '-') : ''}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.end(buffer);
  }

  // GET /alumnos/:id/alertas?ciclo_lectivo=
  @Get('alumnos/:id/alertas')
  @ApiOperation({ summary: 'Obtener alertas de riesgo académico de un alumno en un ciclo' })
  @ApiParam({ name: 'id', description: 'UUID del alumno' })
  @ApiQuery({ name: 'ciclo_lectivo', required: true })
  getAlertasByAlumno(
    @Param('id', ParseUUIDPipe) alumnoId: string,
    @Query('ciclo_lectivo') cicloLectivo: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getAlertasByAlumno(alumnoId, Number(cicloLectivo), user);
  }
}
