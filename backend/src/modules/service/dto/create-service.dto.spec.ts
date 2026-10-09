import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateServiceDto } from './create-service.dto';
import { UpdateServiceDto } from './update-service.dto';

describe('CreateServiceDto / UpdateServiceDto validation', () => {
  const validPayload = {
    categoryId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    title: 'Professional veb-dizayn xizmati',
    description: 'Biznesingiz uchun zamonaviy va chiroyli veb-sayt dizayni tayyorlab beramiz.',
    price: 500_000,
    deliveryDays: 7,
  };

  it('to‘g‘ri ma’lumotlar bilan validatsiyadan o‘tadi', async () => {
    const dto = plainToInstance(CreateServiceDto, validPayload);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('deliveryDays > 365 (masalan 660000) bo‘lganda rad etiladi', async () => {
    const dto = plainToInstance(CreateServiceDto, {
      ...validPayload,
      deliveryDays: 660_000,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.property).toBe('deliveryDays');
    expect(errors[0]!.constraints?.max).toBe('Muddat ko‘pi bilan 365 kun bo‘lishi mumkin');
  });

  it('deliveryDays < 1 bo‘lganda rad etiladi', async () => {
    const dto = plainToInstance(CreateServiceDto, {
      ...validPayload,
      deliveryDays: 0,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.property).toBe('deliveryDays');
    expect(errors[0]!.constraints?.min).toBe('Muddat kamida 1 kun bo‘lishi kerak');
  });

  it('deliveryDays kasr son bo‘lganda rad etiladi', async () => {
    const dto = plainToInstance(CreateServiceDto, {
      ...validPayload,
      deliveryDays: 2.5,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.property).toBe('deliveryDays');
    expect(errors[0]!.constraints?.isInt).toBe('Muddat butun kunlarda bo‘lishi kerak');
  });

  it('deliveryDays 1 va 365 chegaralari qabul qilinadi', async () => {
    const minDto = plainToInstance(CreateServiceDto, { ...validPayload, deliveryDays: 1 });
    expect(await validate(minDto)).toHaveLength(0);

    const maxDto = plainToInstance(CreateServiceDto, { ...validPayload, deliveryDays: 365 });
    expect(await validate(maxDto)).toHaveLength(0);
  });

  it('narx 10 mlrd so‘mdan oshganda rad etiladi', async () => {
    const dto = plainToInstance(CreateServiceDto, {
      ...validPayload,
      price: 10_000_000_001,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.property).toBe('price');
    expect(errors[0]!.constraints?.max).toBe('Narx 10 mlrd so‘mdan oshmasligi kerak');
  });

  it('UpdateServiceDto ham 365 kundan ortiq muddatni rad etadi', async () => {
    const dto = plainToInstance(UpdateServiceDto, { deliveryDays: 500 });
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.property).toBe('deliveryDays');
    expect(errors[0]!.constraints?.max).toBe('Muddat ko‘pi bilan 365 kun bo‘lishi mumkin');
  });
});
