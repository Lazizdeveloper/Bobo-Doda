/**
 * Bosqich 23 (v4) — TextUp SMS API, Bobo&Doda'ning O'Z hisobi uchun
 * (boshqa loyihadagi ishlayotgan integratsiya FAQAT protokol/referens —
 * uning credential/token/userId/templateId/nicknameId qiymatlari
 * KO'CHIRILMAYDI, faqat so'rov/javob SHAKLI olindi). Ikkita ALOHIDA host:
 * auth (`api-auth.textup.uz`) va SMS (`sms-api.textup.uz`).
 */
export interface TextUpConfig {
  authUrl: string;
  smsUrl: string;
  email: string;
  password: string;
  /**
   * Ixtiyoriy hisob-xavfsizlik tekshiruvi (majburiy config EMAS). Berilsa,
   * runtime login javobidagi `user.id` bilan solishtiriladi — mos
   * kelmasa fail-closed (boshqa hisobdan jimgina yuborib yuborilmaydi).
   * Yuborishda ishlatiladigan haqiqiy `userId` — HAR DOIM runtime login
   * javobidan (`user.id`), bu maydondan EMAS.
   */
  expectedUserId?: string;
  /** Ixtiyoriy, tasdiqlangan alpha-nom (hozir "Tekshirilmoqda"). Berilmasa qisqa raqamdan yuboriladi. */
  nicknameId?: string;
  /** Ixtiyoriy, "BOBODODA Registration OTP" shabloni tasdiqlangach. */
  registrationTemplateId?: string;
  /** Ixtiyoriy, "BOBODODA Password Reset OTP" shabloni tasdiqlangach. */
  passwordResetTemplateId?: string;
}

/** `POST {authUrl}` muvaffaqiyatli javobi — `accessToken` va `user.id` ikkalasi ham SHART (runtime userId manbai). */
export interface TextUpLoginResponse {
  accessToken: string;
  refreshToken?: string;
  user: {
    id: string;
    status?: string;
  };
}

/** `POST {smsUrl}` so'rov tanasi. */
export interface TextUpSendRequest {
  message: string;
  userId: string;
  name: string;
  recipients: string[];
  templateId?: string;
  nicknameId?: string;
}

/** Muvaffaqiyatli javob. */
export interface TextUpSendResponse {
  smsId: string;
}
