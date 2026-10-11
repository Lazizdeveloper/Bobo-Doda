import { Controller, Get, Header } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { register, collectDefaultMetrics } from 'prom-client';
import { Public } from '@/modules/auth/decorators/public.decorator';

try {
  collectDefaultMetrics({ register });
} catch {
  // Metric allaqachon ro'yxatga olingan bo'lsa (masalan test yoki hot-reload)
}

/**
 * Prometheus `/metrics` endpointi (observability / monitoring).
 * Global `api/v1` prefiksidan va JWT Guard'dan tashqarida.
 */
@Public()
@ApiExcludeController()
@Controller()
export class MetricsController {
  @Get(['metrics', 'api/v1/metrics'])
  @Header('Content-Type', register.contentType)
  async getMetrics(): Promise<string> {
    return register.metrics();
  }
}
