import { ApiProperty } from '@nestjs/swagger';
import { StaffMemberResponseDto } from './staff-member-response.dto';

/** Bo'lim 3/4 — `tempPassword` FAQAT shu javobda, bir marta ko'rsatiladi. */
export class CreateStaffMemberResponseDto extends StaffMemberResponseDto {
  @ApiProperty() tempPassword!: string;
}

/** Bo'lim 6 — admin parol reset javobi (yagona joy — yangi doimiy parolni admin BILMAYDI). */
export class AdminPasswordResetResponseDto {
  @ApiProperty() tempPassword!: string;
}
