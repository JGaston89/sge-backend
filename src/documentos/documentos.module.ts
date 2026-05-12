import { Module } from '@nestjs/common';
import { DocumentosService } from './documentos.service';
import { DocumentosRepository } from './documentos.repository';

@Module({
  providers: [DocumentosService, DocumentosRepository],
  exports:   [DocumentosService],
})
export class DocumentosModule {}
