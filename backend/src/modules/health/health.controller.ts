import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { RedisService } from '@/infra/redis/redis.service';
import { ApiErrorDto } from '@/common/errors/api-error.dto';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { LivenessDto, ReadinessDto } from './health.dto';

/**
 * `/health/live`  — liveness: process ko'tarilganmi (bog'liqliklar tekshirilmaydi).
 * `/health/ready` — readiness: DB + Redis javob beradimi. Tayyor bo'lmasa 503.
 *
 * Bu marshrutlar global `api/v1` prefiksidan TASHQARIDA (main.ts `exclude`)
 * VA global `JwtAuthGuard`dan ham TASHQARIDA (`@Public()`) — load balancer/
 * orchestrator token'siz so'raydi.
 */
@Public()
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get('live')
  @ApiOkResponse({ type: LivenessDto })
  live(): LivenessDto {
    return {
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      commit: process.env.GIT_COMMIT_SHA,
    };
  }

  @Get('ready')
  @ApiOkResponse({ type: ReadinessDto })
  @ApiServiceUnavailableResponse({ type: ApiErrorDto })
  async ready(): Promise<ReadinessDto> {
    const [dbResult, redisResult] = await Promise.allSettled([
      this.prisma.ping(),
      this.redis.ping(),
    ]);

    const db = dbResult.status === 'fulfilled' && dbResult.value === true;
    const redis = redisResult.status === 'fulfilled' && redisResult.value === true;

    if (!db || !redis) {
      throw new ServiceUnavailableException({
        code: 'NOT_READY',
        message: 'Bog’liqliklar tayyor emas',
        fieldErrors: undefined,
        details: { db, redis },
      });
    }

    return { status: 'ok', db, redis };
  }
}
