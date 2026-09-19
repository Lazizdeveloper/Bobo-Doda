import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { StaffAuthModule } from '@/modules/staff-auth/staff-auth.module';
import { GuardsModule } from '@/common/guards/guards.module';
import { SellerApplicationController } from './seller-application.controller';
import { StaffSellerApplicationController } from './staff-seller-application.controller';
import { StaffSellerController } from './staff-seller.controller';
import { SellerApplicationService } from './seller-application.service';

@Module({
  imports: [AuthModule, StaffAuthModule, GuardsModule],
  controllers: [SellerApplicationController, StaffSellerApplicationController, StaffSellerController],
  providers: [SellerApplicationService],
  exports: [SellerApplicationService],
})
export class SellerApplicationModule {}
