import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: string) => {
              if (key === 'NODE_ENV') return 'test';
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return healthy status with uptime', () => {
    const health = controller.getHealth();
    expect(health.status).toBe('healthy');
    expect(health.environment).toBe('test');
    expect(health.services.database.status).toBe('up');
    expect(health.services.redis.status).toBe('up');
    expect(health.services.kafka.status).toBe('up');
  });

  it('should return ok for liveness probe', () => {
    const liveness = controller.getLiveness();
    expect(liveness.status).toBe('ok');
    expect(liveness.timestamp).toBeDefined();
  });

  it('should return ready for readiness probe', () => {
    const readiness = controller.getReadiness();
    expect(readiness.status).toBe('ready');
    expect(readiness.timestamp).toBeDefined();
  });
});
