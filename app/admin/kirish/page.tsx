import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export default function AdminLoginPage() {
  return (
    <AdminLoginForm
      role="admin"
      homeHref="/admin/kirish"
      title="Admin markaziga kirish"
      description="Faqat operatsion administratorlar uchun yopiq hudud."
    />
  );
}
