import { Global, Module } from '@nestjs/common';
import { IdFactory } from './id.factory';

/**
 * `IdFactory` ni butun ilovaga beradi (A1). Domen modullari uni inject qiladi
 * — hech qayerda `uuid`/`randomUUID`/`crypto` bilan ID yasalmaydi.
 */
@Global()
@Module({
  providers: [IdFactory],
  exports: [IdFactory],
})
export class IdModule {}
