import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '@/modules/auth/decorators/public.decorator';

export interface VersionResponse {
  name: string;
  version: string;
  commit?: string;
  env: string;
  uptimeSeconds: number;
}

/**
 * Tizim versiyasi `/version` endpointi.
 * DevOps observability va deployment versiyasini tekshirish uchun.
 */
@Public()
@ApiExcludeController()
@Controller()
export class VersionController {
  @Get(['version', 'api/v1/version'])
  getVersion(): VersionResponse {
    return {
      name: 'bobololadono-backend',
      version: '0.1.0',
      commit: process.env.GIT_COMMIT_SHA,
      env: process.env.NODE_ENV ?? 'development',
      uptimeSeconds: Math.round(process.uptime()),
    };
  }
}
