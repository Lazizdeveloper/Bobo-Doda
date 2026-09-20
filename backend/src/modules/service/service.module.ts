import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { StaffAuthModule } from '@/modules/staff-auth/staff-auth.module';
import { GuardsModule } from '@/common/guards/guards.module';
import { ServiceController } from './service.controller';
import { SellerServiceController } from './seller-service.controller';
import { StaffServiceController } from './staff-service.controller';
import { ServiceService } from './service.service';

@Module({
  imports: [AuthModule, StaffAuthModule, GuardsModule],
  controllers: [ServiceController, SellerServiceController, StaffServiceController],
  providers: [ServiceService],
  exports: [ServiceService],
})
export class ServiceModule {}
