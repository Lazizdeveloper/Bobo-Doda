import { MetricsController } from './metrics.controller';
import { VersionController } from './version.controller';

describe('Observability Controllers (MetricsController & VersionController)', () => {
  it('MetricsController.getMetrics returns prometheus formatted string', async () => {
    const controller = new MetricsController();
    const metrics = await controller.getMetrics();
    expect(typeof metrics).toBe('string');
    expect(metrics).toContain('process_cpu_user_seconds_total');
  });

  it('VersionController.getVersion returns app name and uptime', () => {
    const controller = new VersionController();
    const version = controller.getVersion();
    expect(version.name).toBe('bobololadono-backend');
    expect(version.version).toBe('0.1.0');
    expect(typeof version.uptimeSeconds).toBe('number');
  });
});
