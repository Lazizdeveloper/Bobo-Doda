import {
  BadRequestException,
  ForbiddenException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  type ArgumentsHost,
} from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { DomainError, ValidationDomainError } from '../errors/domain-error';

beforeAll(() => Logger.overrideLogger(false));
afterAll(() => Logger.overrideLogger(new Logger()));

interface Captured {
  status: number;
  body: {
    code: string;
    message?: string;
    fieldErrors?: Record<string, string>;
    requestId?: string;
  };
}

function run(exception: unknown): Captured {
  const captured = {} as Captured;
  const res = {
    status(code: number) {
      captured.status = code;
      return this;
    },
    json(payload: Captured['body']) {
      captured.body = payload;
      return this;
    },
  };
  const req = { requestId: 'req-123', method: 'POST', originalUrl: '/api/v1/x' };
  const host = {
    switchToHttp: () => ({
      getResponse: () => res,
      getRequest: () => req,
    }),
  } as unknown as ArgumentsHost;

  new AllExceptionsFilter().catch(exception, host);
  return captured;
}

describe('AllExceptionsFilter', () => {
  it('DomainError → o’z kodi va statusi', () => {
    const { status, body } = run(new DomainError('PHONE_EXISTS', 'Raqam band'));
    expect(status).toBe(409);
    expect(body).toEqual({ code: 'PHONE_EXISTS', message: 'Raqam band', requestId: 'req-123' });
  });

  it('ValidationDomainError → 422 + fieldErrors', () => {
    const { status, body } = run(new ValidationDomainError({ phone: 'Majburiy' }));
    expect(status).toBe(422);
    expect(body.code).toBe('VALIDATION');
    expect(body.fieldErrors).toEqual({ phone: 'Majburiy' });
    expect(body.requestId).toBe('req-123');
  });

  it('Nest NotFoundException → 404 NOT_FOUND', () => {
    const { status, body } = run(new NotFoundException('yo’q'));
    expect(status).toBe(404);
    expect(body.code).toBe('NOT_FOUND');
  });

  it('Nest ForbiddenException → 403 FORBIDDEN', () => {
    const { status, body } = run(new ForbiddenException());
    expect(status).toBe(403);
    expect(body.code).toBe('FORBIDDEN');
  });

  it('Nest BadRequestException (validatsiya massivi) → 400 VALIDATION, message birlashtiriladi', () => {
    const { status, body } = run(
      new BadRequestException(['phone must be a string', 'name should not be empty']),
    );
    expect(status).toBe(400);
    expect(body.code).toBe('VALIDATION');
    expect(body.message).toContain('phone must be a string');
    expect(body.message).toContain('name should not be empty');
  });

  it('obyekt tanali HttpException dagi `code` saqlanadi (health NOT_READY)', () => {
    const { status, body } = run(
      new ServiceUnavailableException({ code: 'NOT_READY', message: 'tayyor emas' }),
    );
    expect(status).toBe(503);
    expect(body.code).toBe('NOT_READY');
    expect(body.message).toBe('tayyor emas');
  });

  it('noma’lum xato → 500 UNKNOWN, batafsili sizib chiqmaydi', () => {
    const { status, body } = run(new Error('internal db password leak: secret'));
    expect(status).toBe(500);
    expect(body.code).toBe('UNKNOWN');
    expect(body.message).toBe('Ichki server xatosi');
    expect(JSON.stringify(body)).not.toContain('secret');
  });

  it('string tashlansa ham yiqilmaydi → 500 UNKNOWN', () => {
    const { status, body } = run('boom');
    expect(status).toBe(500);
    expect(body.code).toBe('UNKNOWN');
  });

  it('har javobda requestId bor', () => {
    expect(run(new DomainError('NOT_FOUND')).body.requestId).toBe('req-123');
  });
});
