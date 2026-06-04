import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PortalPublicController, PortalAdminController } from './portal.controller';
import { PortalService } from './portal.service';
import { PortalRepository } from './portal.repository';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule, ConfigModule],
  controllers: [PortalPublicController, PortalAdminController],
  providers: [PortalService, PortalRepository],
})
export class PortalModule {}
