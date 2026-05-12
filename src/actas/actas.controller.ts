import {
  Controller,
  Get,
  Param,
  Res,
  ParseUUIDPipe,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { CalificacionesService } from '../calificaciones/calificaciones.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Actas')
@Controller('actas')
export class ActasController {
  constructor(private readonly calificacionesService: CalificacionesService) {}

  // ─── Descargar PDF del acta ───────────────────────────────

  @Get(':id/pdf')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Genera y descarga el PDF del acta con firma digital' })
  @ApiParam({ name: 'id', description: 'UUID del acta' })
  @ApiResponse({ status: 200, description: 'PDF del acta' })
  @ApiResponse({ status: 404, description: 'Acta no encontrada' })
  async downloadActaPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const appUrl = `${(res.req as { protocol: string }).protocol}://${(res.req as { get: (h: string) => string }).get('host')}`;
    const { buffer, hash } = await this.calificacionesService.getActaPdf(id, user, appUrl);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="acta-${id}.pdf"`,
      'X-Document-Hash': hash,
    });
    res.end(buffer);
  }

  // ─── Verificación pública del acta ───────────────────────

  @Get(':id/verify')
  @Public()
  @ApiOperation({ summary: 'Verifica la autenticidad de un acta (público, accesible desde QR)' })
  @ApiParam({ name: 'id', description: 'UUID del acta' })
  @ApiResponse({ status: 200, description: 'Resultado de verificación' })
  @ApiResponse({ status: 404, description: 'Acta no encontrada' })
  async verifyActa(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.calificacionesService.verifyActa(id);
    if (!result) throw new NotFoundException('Acta no encontrada');
    return result;
  }
}
