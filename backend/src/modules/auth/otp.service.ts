import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import type { OtpPurpose } from '@prisma/client';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { IdFactory } from '@/common/id/id.factory';
import { HashService } from '@/common/security/hash.service';
import { RateLimiterService } from '@/common/security/rate-limiter.service';
import { AppConfigService } from '@/config/app-config.service';
import { generateOtpCode } from '@/common/security/otp-code.util';
import { normalizePhone } from '@/common/security/phone.util';
import { DomainError } from '@/common/errors/domain-error';
import { OTP_SMS_QUEUE, type OtpSmsJobData } from '@/infra/sms/otp-sms.processor';
import { shouldExposeDevOtp } from './dev-otp.util';
import {
  OTP_EXPIRY_SECONDS,
  OTP_IP_HOURLY_LIMIT,
  OTP_IP_HOURLY_WINDOW_SECONDS,
  OTP_MAX_ATTEMPTS,
  OTP_PHONE_DAILY_LIMIT,
  OTP_PHONE_DAILY_WINDOW_SECONDS,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_SMS_TEMPLATE,
} from './constants/otp.constants';

/**
 * OTP so'rash/tasdiqlash — telefon egaligini isbotlashning yuragi.
 * Bosqich 21 — oddiy LOGIN endi parol bilan (`AuthService.login`), bu servis
 * UMUMAN ishtirok etmaydi. OTP FAQAT ikki maqsadda: REGISTER (yangi hisob)
 * va PASSWORD_RESET (parolni tiklash).
 *
 * `requestOtp` ATAYLAB `User` jadvaliga UMUMAN tegmaydi — shu bilan
 * enumeration-safe: ro'yxatdan o'tgan yoki o'tmagan telefon uchun bir xil
 * javob (controller ham bir xil generic xabar qaytaradi). Foydalanuvchini
 * yaratish/topish qarori bu servisdan TASHQARIDA, `AuthService`da (bu servis
 * faqat OTP haqiqiyligini biladi, User haqida qaror qabul qilmaydi — bitta
 * mas'uliyat). PASSWORD_RESET uchun "SMS haqiqatan yuborilsinmi" qarori
 * ham `AuthService` tomonidan `skipDelivery` orqali beriladi (bo'lim
 * 16 — noma'lum telefon uchun SMS xarajatini tejash, lekin rate-limit
 * baribir TO'LIQ ishlaydi — pastga qarang).
 *
 * `purpose` (REGISTER | PASSWORD_RESET) HAR bir challenge'ga bog'lanadi:
 * REGISTER uchun so'ralgan kod PASSWORD_RESET'ni tasdiqlay olmaydi va
 * aksincha (`verifyOtp`ning `WHERE`i `purpose`ni ham talab qiladi — boshqa
 * maqsad uchun yaratilgan qator UMUMAN topilmaydi, xuddi mavjud bo'lmagandek).
 */
@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ids: IdFactory,
    private readonly hash: HashService,
    private readonly limiter: RateLimiterService,
    private readonly config: AppConfigService,
    @InjectQueue(OTP_SMS_QUEUE) private readonly smsQueue: Queue<OtpSmsJobData>,
  ) {}

  /**
   * `skipDelivery` — `true` bo'lsa, RATE LIMIT BARIBIR TO'LIQ qo'llanadi
   * (aks holda noma'lum telefon uchun cheklov UMUMAN ishlamay qolib,
   * "cheklovga tegmayapti" degan o'zi bir enumeration signali bo'lardi),
   * lekin OTP qatori yaratilmaydi va SMS navbatga qo'yilmaydi — chaqiruvchi
   * (`AuthService`, PASSWORD_RESET uchun telefon mavjud emasligini
   * bilganda) shu bilan haqiqiy SMS xarajatidan qochadi.
   *
   * Auth hardening bosqichi 2 — bu yerdagi eski izoh "reasonable (mukammal
   * emas) timing-himoya" derdi, lekin HAQIQIY o'lchov (real Postgres/Redis,
   * N=40/tomon) buni noto'g'ri isbotladi: ro'yxatdan o'tgan va o'tmagan
   * telefon o'rtasida ~52ms farq bor edi, ikkala taqsimot BUTUNLAY
   * kesishmasdi (registered'ning ENG TEZ 10%i ham unknown'ning ENG SEKIN
   * 90%idan sekinroq) — ya'ni HAR BIR o'lchovda ishonchli farqlanadi, "kam
   * ehtimolli" emas. Sabab DB yozuvi EMAS (ikkalasi ham allaqachon bir xil
   * Redis/DB o'qishlarini bajaradi) — `hash.hash(code)` (argon2id, sinov
   * mashinasida ~45ms) FAQAT haqiqiy yo'lda chaqiriladi. Tuzatish — skip
   * yo'lida ham HAQIQIY, HAR SAFAR YANGI argon2 operatsiyasi bajariladi
   * (natija tashlanadi — pastga, `hash.hash()` chaqiruviga qarang; kesh
   * ISHLATILMAYDI, aks holda faqat BIRINCHI so'rov xarajat to'lardi).
   * OTP qatori YOKI SMS esa hamon yaratilmaydi/yuborilmaydi — xavfsizlik/
   * xarajat xususiyati o'zgarmaydi, faqat VAQT profili mos keladi.
   */
  async requestOtp(
    rawPhone: string,
    purpose: OtpPurpose,
    opts: { ip?: string; skipDelivery?: boolean } = {},
  ): Promise<{ devOtp?: string }> {
    const phone = normalizePhone(rawPhone);
    const { ip, skipDelivery = false } = opts;

    // Cooldown MAQSAD bo'yicha ajratilgan — masalan parolni tiklashdan
    // keyin darhol ro'yxatdan o'tishga urinish 60s kutmasdan ishlashi
    // kerak. Kunlik/IP chegara esa ATAYLAB umumiy (pastga qarang) — aks
    // holda bitta telefon REGISTER+PASSWORD_RESET orasida almashtirib
    // jami SMS hajmini ikki baravar oshirardi.
    const cooldownOk = await this.limiter.cooldown(
      `otp:cooldown:${phone}:${purpose}`,
      OTP_RESEND_COOLDOWN_SECONDS,
    );
    if (!cooldownOk) {
      throw new DomainError('RATE_LIMITED', "Qayta so'rashdan oldin biroz kuting");
    }

    const perPhoneDay = await this.limiter.hit(`otp:day:${phone}`, OTP_PHONE_DAILY_WINDOW_SECONDS);
    if (perPhoneDay.count > OTP_PHONE_DAILY_LIMIT) {
      throw new DomainError('RATE_LIMITED', "Bugungi so'rovlar chegarasiga yetdingiz");
    }

    if (ip) {
      const perIpHour = await this.limiter.hit(`otp:ip:${ip}`, OTP_IP_HOURLY_WINDOW_SECONDS);
      if (perIpHour.count > OTP_IP_HOURLY_LIMIT) {
        throw new DomainError('RATE_LIMITED', "So'rovlar chegarasiga yetdingiz");
      }
    }

    if (skipDelivery) {
      // Har safar YANGI hisoblanadi — keshlanmaydi. Sabab: pastdagi haqiqiy
      // yo'l HAM `hash.hash(code)`ni har so'rovda YANGIDAN chaqiradi;
      // dastlab sinalgan keshlangan variant (`AuthService.getDummyHash()`
      // uslubida) FAQAT birinchi so'rovda argon2 xarajatini to'lardi,
      // keyingilari allaqachon yechilgan Promise'ni qaytarardi — o'lchov
      // buni ANIQ ko'rsatdi (tuzatishdan keyin ham ~49ms farq qolgan edi).
      // `AuthService.getDummyHash()`da kesh ishlaydi, chunki u FAQAT
      // `hash.verify()`ning kirishini (solishtiriladigan hash) tayyorlaydi
      // — qimmat qism (`verify()`ning o'zi) baribir har chaqiriqda YANGI
      // ishlaydi. Bu yerda esa qimmat qismning O'ZI (`hash()`) keshlangan
      // edi — xato shu yerda edi.
      await this.hash.hash(generateOtpCode());
      return {};
    }

    // Auth hardening bosqichi 2 — resend invalidatsiyasi. ILGARI eski
    // (hali muddati o'tmagan, hali iste'mol qilinmagan) OTP qatori yangi
    // so'ralgan kod bilan BIRGA "tirik" qolardi: `verifyOtp`ning
    // `findFirst(... orderBy createdAt desc)` faqat ENG YANGI qatorni
    // ko'rar edi, shuning uchun ESKI kod ODATDA "noto'g'ri kod" bo'lib
    // ko'rinardi — LEKIN agar YANGI kod avval iste'mol qilinsa (foydalanuvchi
    // muvaffaqiyatli tasdiqlasa), ESKI kod QAYTA "eng yangi iste'molsiz
    // qator" bo'lib qolar va hali ham TO'LIQ ishlab, o'ZINING alohida
    // grant'ini (`registrationToken`/`resetToken`) berardi — real e2e
    // reproduksiya bilan tasdiqlangan. PASSWORD_RESET uchun bu jiddiy:
    // eski kodni ushlagan tajovuzkor (masalan SMS orqaga tashlanishi/
    // ijtimoiy muhandislik bilan) qurbon O'ZINING resetini muvaffaqiyatli
    // tugatgandan KEYIN ham parolni almashtirish uchun yaroqli token olishi
    // mumkin edi.
    //
    // Tuzatish — DB darajasida, ilova xotirasida EMAS: yangi kod
    // yaratishdan OLDIN shu telefon+maqsad uchun BARCHA hali iste'mol
    // qilinmagan eski qatorlar atomik `updateMany` bilan "iste'mol
    // qilingan" deb belgilanadi. Bir vaqtli (parallel) ikkita resend
    // so'rovi bo'lsa ham xavfsiz: har biri O'ZINING navbatida oldingi
    // hali-iste'mol-qilinmagan qatorlarni (shu jumladan, agar ulgurgan
    // bo'lsa, bir-birining yangi qatorini ham) yopadi — natijada FAQAT
    // ENG OXIRGI so'ralgan kod tirik qoladi, aynan talab qilingan
    // "faqat eng so'nggi OTP haqiqiy" invarianti.
    await this.prisma.otpCode.updateMany({
      where: { phone, purpose, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    const code = generateOtpCode();
    await this.prisma.otpCode.create({
      data: {
        id: this.ids.next(),
        phone,
        purpose,
        codeHash: await this.hash.hash(code),
        ip,
        expiresAt: new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000),
      },
    });

    // BullMQ orqali — OutboxEvent EMAS (`otp-sms.processor.ts` izohiga qarang:
    // OTP xom holda Postgres'ga yozilmasin). `purpose` — Bosqich 23,
    // provider REGISTER/PASSWORD_RESET matnini farqlashi uchun.
    await this.smsQueue.add('send', { phone, code, template: OTP_SMS_TEMPLATE, purpose });

    // Bosqich 22 — FAQAT lokal dev qulayligi (`dev-otp.util.ts`). Kodning
    // o'zi HECH QACHON qayta o'qilmaydi (`codeHash` bir tomonlama) — shuning
    // uchun bu yerda, hali xotirada turgan `code`dan qaror qilinishi shart.
    const devOtp = shouldExposeDevOtp({
      isProduction: this.config.isProduction,
      smsProvider: this.config.sms.provider,
      devExposeOtp: this.config.sms.devExposeOtp,
    })
      ? code
      : undefined;
    return devOtp ? { devOtp } : {};
  }

  /**
   * Muvaffaqiyatli bo'lsa normallashtirilgan telefonni qaytaradi.
   *
   * Bosqich 22 — xato taksonomiyasi ATAYLAB uch holatga ajratilgan (ilgari
   * hammasi bitta `INVALID_CODE`ga tushardi, UI "noto'g'ri format" bilan
   * "noto'g'ri kod"ni farqlay olmasdi):
   *   • `INVALID_CODE` — bunday challenge UMUMAN topilmadi (hech qachon
   *     so'ralmagan / boshqa `purpose` / allaqachon iste'mol qilingan) YOKI
   *     kod noto'g'ri kiritildi. Ataylab BIR XIL kod — enumeration-safe
   *     (topilmadi va noto'g'ri farqlansa, "bu telefon uchun challenge bor/
   *     yo'q" signali chiqib qolardi).
   *   • `OTP_EXPIRED` — qator topildi, lekin muddati o'tgan.
   *   • `OTP_ATTEMPTS_EXCEEDED` — urinishlar soni tugagan (yangi kod olish
   *     kerakligini aniq aytadi — "yana urinib ko'ring" chalg'ituvchi bo'lardi).
   */
  async verifyOtp(rawPhone: string, code: string, purpose: OtpPurpose): Promise<{ phone: string }> {
    const phone = normalizePhone(rawPhone);

    const otp = await this.prisma.otpCode.findFirst({
      where: { phone, purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) {
      throw new DomainError('INVALID_CODE', "Kod noto'g'ri");
    }
    if (otp.expiresAt <= new Date()) {
      throw new DomainError('OTP_EXPIRED', 'Kodning amal qilish muddati tugagan');
    }
    // Himoya qatlami: odatda oxirgi noto'g'ri urinishning o'zi (pastda)
    // darhol `consumedAt`ni belgilaydi va `findFirst`ning `consumedAt: null`
    // filtri uni keyingi o'qishda umuman topmaydi — shuning uchun bu shart
    // amalda deyarli hech qachon ishga tushmaydi. Eski (kuydirilgan
    // bo'lishi mumkin bo'lgan, atomik tuzatishdan OLDINGI) qatorlar uchun
    // qo'shimcha himoya sifatida qolgan.
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      throw new DomainError('OTP_ATTEMPTS_EXCEEDED', "Urinishlar soni oshib ketdi. Yangi kod oling.");
    }

    const valid = await this.hash.verify(otp.codeHash, code);
    if (!valid) {
      // OTP verify security hardening — bu ILGARI "o'qi, JS'da +1 hisobla,
      // yoz" (uchta alohida qadam, tranzaksiyasiz) edi: parallel noto'g'ri
      // so'rovlar BIR XIL eski `attempts`ni o'qib, BIR XIL qiymatni
      // yozardi — "lost update". 20 ta chinakam parallel noto'g'ri urinish
      // bilan reproduksiya qilindi: DB'da `attempts` faqat 1ga ko'tarilgan,
      // kod HECH QACHON kuymagan (dastlab bitta bir martalik scratch test
      // bilan tasdiqlangan, keyin doimiy regressiya sifatida
      // `backend/test/auth.e2e-spec.ts`dagi "RACE:" testlariga ko'chirilgan).
      //
      // Endi BITTA atomik UPDATE: `WHERE "attempts" < MAX AND "consumedAt"
      // IS NULL` — Postgres BIR XIL qatorga parallel UPDATE'larni tabiiy
      // qator-qulfi bilan serializatsiya qiladi (har biri navbat bilan
      // qulflanadi, WHERE keyingi UPDATE uchun QAYTA baholanadi), shuning
      // uchun N ta chinakam parallel noto'g'ri so'rov bo'lsa ham, ROVNO
      // "joy qolgan" miqdorda (MAX - joriy attempts) g'olib chiqadi —
      // ortig'i WHERE'dan o'tolmay 0 qator qaytaradi. Limitni to'ldirgan
      // AYNAN shu so'rov `consumedAt`ni ham SHU BIR UPDATE ichida
      // (CASE...THEN now()) o'rnatadi — ikkinchi, alohida "keyin kuydir"
      // qadami YO'Q, demak bu ikkinchi bosqich ham poyga oynasi qoldirmaydi.
      const rows = await this.prisma.$queryRaw<Array<{ attempts: number; burned: boolean }>>`
        UPDATE "otp_codes"
        SET "attempts" = "attempts" + 1,
            "consumedAt" = CASE WHEN "attempts" + 1 >= ${OTP_MAX_ATTEMPTS} THEN now() ELSE "consumedAt" END
        WHERE "id" = ${otp.id}::uuid AND "consumedAt" IS NULL AND "attempts" < ${OTP_MAX_ATTEMPTS}
        RETURNING "attempts", ("consumedAt" IS NOT NULL) AS "burned"
      `;
      const result = rows[0];
      // `result` yo'q — bu so'rov WHERE'dan o'tolmadi: parallel boshqa
      // so'rov ALLAQACHON kuydirgan/iste'mol qilgan (yoki juda kam
      // ehtimol — attempts allaqachon MAX'da). `result.burned` — bu
      // so'rovning O'ZI limitni to'ldirdi. Ikkalasida ham foydalanuvchi
      // uchun natija bir xil: yangi kod kerak.
      if (!result || result.burned) {
        throw new DomainError('OTP_ATTEMPTS_EXCEEDED', "Urinishlar soni oshib ketdi. Yangi kod oling.");
      }
      throw new DomainError('INVALID_CODE', "Kod noto'g'ri");
    }

    // CAS — parallel `verify` so'rovlari bo'lsa, kod FAQAT BIR marta iste'mol qilinsin.
    const consumed = await this.prisma.otpCode.updateMany({
      where: { id: otp.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (consumed.count === 0) {
      throw new DomainError('INVALID_CODE', 'Kod allaqachon ishlatilgan');
    }

    return { phone };
  }
}
