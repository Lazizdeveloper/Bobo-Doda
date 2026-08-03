import Link from "next/link";
import { Card } from "@/components/ui/Card";

export default function ForbiddenPage() {
  return (
    <div className="grid min-h-[65vh] place-items-center">
      <Card padding="lg" className="max-w-lg text-center">
        <p className="font-heading text-5xl font-extrabold text-danger">403</p>
        <h1 className="mt-4 font-heading text-xl font-bold text-ink">Ruxsat yetarli emas</h1>
        <p className="mt-2 text-sm text-muted">Hisobingizda ushbu bo‘limni ochish uchun yetarli vakolat mavjud emas.</p>
        <Link href="/admin" className="mt-6 inline-flex h-10 items-center rounded-btn bg-primary px-4 text-sm font-medium text-on-primary">Boshqaruvga qaytish</Link>
      </Card>
    </div>
  );
}
