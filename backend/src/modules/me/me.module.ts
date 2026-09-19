import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { GuardsModule } from '@/common/guards/guards.module';
import { MeController } from './me.controller';
import { MeService } from './me.service';

@Module({
  imports: [AuthModule, GuardsModule],
  controllers: [MeController],
  providers: [MeService],
})
export class MeModule {}
