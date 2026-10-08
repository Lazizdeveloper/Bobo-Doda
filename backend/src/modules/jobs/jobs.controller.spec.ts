import { JobsController } from './jobs.controller';
import type { JobsService } from './jobs.service';
import type { AccessTokenPayload } from '@/modules/auth/types/token-payload';
import { JobStatus } from '@prisma/client';

describe('JobsController', () => {
  let controller: JobsController;
  let service: Partial<JobsService>;

  const mockJob = {
    id: '01925b6a-9999-7000-8000-000000000001',
    buyerId: '01925b6a-8888-7000-8000-000000000002',
    categoryId: '01a092fb-037e-740b-9b72-83002432b73c',
    title: 'Veb-sayt yaratish kerak',
    description: 'Biznesimiz uchun zamonaviy landing page kerak',
    budgetMin: 100_000_000n,
    budgetMax: 200_000_000n,
    currency: 'UZS',
    skillsRequired: ['Next.js'],
    screeningQuestions: [],
    proposalsCount: 0,
    status: JobStatus.OPEN,
    deadline: null,
    attachedImages: [],
    createdAt: new Date('2026-10-08T12:00:00Z'),
    updatedAt: new Date('2026-10-08T12:00:00Z'),
    version: 0,
    buyer: { id: '01925b6a-8888-7000-8000-000000000002', fullName: 'Alisher V.' },
    category: { id: '01a092fb-037e-740b-9b72-83002432b73c', slug: 'dasturlash' },
  };

  const user: AccessTokenPayload = {
    sub: '01925b6a-8888-7000-8000-000000000002',
    activeRole: 'BUYER',
    familyId: 'fam_1',
  };

  beforeEach(() => {
    service = {
      listPublic: jest.fn().mockResolvedValue({
        items: [mockJob],
        page: 1,
        perPage: 20,
        total: 1,
        totalPages: 1,
      }),
      listMine: jest.fn().mockResolvedValue({
        items: [mockJob],
        page: 1,
        perPage: 50,
        total: 1,
        totalPages: 1,
      }),
      getByIdOrThrow: jest.fn().mockResolvedValue(mockJob),
      create: jest.fn().mockResolvedValue(mockJob),
      close: jest.fn().mockResolvedValue({ ...mockJob, status: JobStatus.CLOSED }),
    };

    controller = new JobsController(service as JobsService);
  });

  it('lists public jobs', async () => {
    const res = await controller.list({});
    expect(res.items).toHaveLength(1);
    expect(res.items[0]?.title).toBe('Veb-sayt yaratish kerak');
  });

  it('lists mine jobs', async () => {
    const res = await controller.listMine(user);
    expect(res.items).toHaveLength(1);
    expect(service.listMine).toHaveBeenCalledWith(user.sub, 1, 50);
  });

  it('gets a job by id', async () => {
    const res = await controller.get('01925b6a-9999-7000-8000-000000000001');
    expect(res.id).toBe('01925b6a-9999-7000-8000-000000000001');
  });

  it('creates a job', async () => {
    const res = await controller.create(user, {
      title: 'Veb-sayt yaratish kerak',
      description: 'Biznesimiz uchun zamonaviy landing page kerak',
      category: 'dasturlash',
      budgetMin: 1_000_000,
      budgetMax: 2_000_000,
    });
    expect(res.id).toBe('01925b6a-9999-7000-8000-000000000001');
  });

  it('closes a job', async () => {
    const res = await controller.close(user, '01925b6a-9999-7000-8000-000000000001');
    expect(res.status).toBe('yopilgan');
  });
});
