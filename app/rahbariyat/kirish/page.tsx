import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export default function LeadershipLoginPage() {
  return (
    <AdminLoginForm
      role="super_admin"
      homeHref="/rahbariyat/kirish"
      title="Rahbariyat markaziga kirish"
      description="Faqat CEO Super Admin hisobi uchun yopiq boshqaruv hududi."
    />
  );
}
