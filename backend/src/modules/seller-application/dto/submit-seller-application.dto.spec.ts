import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { SubmitSellerApplicationDto } from './submit-seller-application.dto';
import { toSellerApplicationResponseDto } from './seller-application-response.dto';
import type { SellerApplication } from '@prisma/client';

describe('SubmitSellerApplicationDto & Response KYC mapping', () => {
  it('validates correct KYC fields', async () => {
    const dto = plainToInstance(SubmitSellerApplicationDto, {
      legalName: 'Ali Valiyev',
      displayName: 'Ali Dev',
      description: 'Tajribali dasturchi',
      passportNumber: 'AA1234567',
      inn: '123456789',
      companyDetails: 'MChJ Texno Solutions',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects too short legalName', async () => {
    const dto = plainToInstance(SubmitSellerApplicationDto, {
      legalName: 'A',
      displayName: 'Ali Dev',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'legalName')).toBe(true);
  });

  it('toSellerApplicationResponseDto parses KYC metadata into response fields', () => {
    const app: SellerApplication = {
      id: '01925b6a-8888-7000-8000-000000000001',
      userId: '01925b6a-8888-7000-8000-000000000002',
      legalName: 'Ali Valiyev',
      displayName: 'Ali Dev',
      description: 'Tajribali dasturchi\n[KYC/AML: Pasport/ID: AA1234567 | STIR/INN: 123456789 | Yuridik: MChJ Texno Solutions]',
      status: 'PENDING',
      submittedAt: new Date(),
      reviewedAt: null,
      reviewedByStaffId: null,
      rejectionReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 0,
    };

    const res = toSellerApplicationResponseDto(app);
    expect(res.passportNumber).toBe('AA1234567');
    expect(res.inn).toBe('123456789');
    expect(res.companyDetails).toBe('MChJ Texno Solutions');
  });
});
