import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { MetricsController } from './metrics.controller';
import { VersionController } from './version.controller';

@Module({
  controllers: [HealthController, MetricsController, VersionController],
})
export class HealthModule {}
