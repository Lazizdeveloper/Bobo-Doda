import { Module } from '@nestjs/common';
import { StaffAuthModule } from '@/modules/staff-auth/staff-auth.module';
import { StaffUserController } from './staff-user.controller';
import { StaffUserService } from './staff-user.service';

@Module({
  imports: [StaffAuthModule],
  controllers: [StaffUserController],
  providers: [StaffUserService],
})
export class StaffUserModule {}
