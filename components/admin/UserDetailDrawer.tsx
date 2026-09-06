"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { type User, type Contract, type Service, type Job, type VerificationRecord, type SellerProfile } from "@/lib/types";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { adminErrorText } from "@/lib/admin-error-text";
import { formatDate, formatMoney } from "@/lib/format";
import { InternalNotesWidget } from "@/components/admin/InternalNotesWidget";
import { DangerousActionModal } from "@/components/admin/DangerousActionModal";
import {
  suspendUser,
  unsuspendUser,
  blockUser,
  deactivateUser,
  adminModerateKYC,
} from "@/lib/api/admin";

interface UserDetailDrawerProps {
  user: User | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
  allContracts?: Contract[];
  allServices?: Service[];
  allJobs?: Job[];
  allVerifications?: VerificationRecord[];
  allProfiles?: Record<string, SellerProfile>;
  moderationInfo?: { status: string; reason?: string; suspendedUntil?: string };
}

export function UserDetailDrawer({
  user,
  open,
  onClose,
  onUpdated,
  allContracts = [],
  allServices = [],
  allJobs = [],
  allVerifications = [],
  allProfiles = {},
  moderationInfo,
}: UserDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "contracts" | "content" | "kyc" | "notes">("overview");

  // Action Modals
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [suspendDays] = useState<number>(7);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [kycRejectModalOpen, setKycRejectModalOpen] = useState(false);
  const [actionError, setActionError] = useState("");

  /* Modalsiz tugmalar uchun: amal ASYNC bo'lgani sababli xato endi
     `Promise` rejection bo'lib keladi. Uni yutib yuborish mumkin emas —
     aks holda tugma bosiladi, hech narsa o'zgarmaydi va operator sababini
     bilmaydi. */
  function runAction(action: () => Promise<unknown>) {
    setActionError("");
    action()
      .then(() => onUpdated())
      .catch((err) => setActionError(adminErrorText(err)));
  }

  const profile = user ? allProfiles[user.id] : null;
  const userContracts = useMemo(() => {
    if (!user) return [];
    return allContracts.filter((c) => c.buyerId === user.id || c.sellerId === user.id);
  }, [user, allContracts]);

  const userServices = useMemo(() => {
    if (!user) return [];
    return allServices.filter((s) => s.sellerId === user.id);
  }, [user, allServices]);

  const userJobs = useMemo(() => {
    if (!user) return [];
    return allJobs.filter((j) => j.buyerId === user.id);
  }, [user, allJobs]);

  const kycRecord = useMemo(() => {
    if (!user) return null;
    return allVerifications.find((v) => v.userId === user.id) || null;
  }, [user, allVerifications]);

  const totalVolume = useMemo(() => {
    return userContracts.reduce((sum, c) => sum + c.totalAmount, 0);
  }, [userContracts]);

  if (!user) return null;

  const isSuspended = moderationInfo?.status === "suspended";
  const isBlocked = moderationInfo?.status === "blocked";
  const isDeactivated = moderationInfo?.status === "deactivated";

  const statusBadge = (): { label: string; tone: BadgeTone } => {
    if (isBlocked) return { label: "Bloklangan", tone: "danger" };
    if (isSuspended) return { label: "Vaqtincha to'xtatilgan", tone: "warning" };
    if (isDeactivated) return { label: "Deaktivatsiya", tone: "neutral" };
    return { label: "Faol", tone: "success" };
  };

  const badgeInfo = statusBadge();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${user.fullName} (${user.role === "mutaxassis" ? "Mutaxassis" : "Xaridor"})`}
      size="xl"
      footer={
        <div className="flex w-full flex-col gap-2">
          {actionError && (
            <p role="alert" className="text-2xs font-medium text-danger-deep">
              {actionError}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 w-full">
          <div className="flex items-center gap-2">
            {isSuspended || isBlocked ? (
              <Button
                type="button"
                size="sm"
                tone="success"
                onClick={() => {
                  runAction(() => unsuspendUser(user.id));
                }}
              >
                Cheklovni yechish (Unsuspend)
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  tone="warning"
                  onClick={() => setSuspendModalOpen(true)}
                >
                  Vaqtincha to‘xtatish
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  tone="danger"
                  onClick={() => setBlockModalOpen(true)}
                >
                  Bloklash
                </Button>
              </>
            )}
            {!isDeactivated && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setDeactivateModalOpen(true)}
              >
                Deaktivatsiya
              </Button>
            )}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Yopish
          </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* User Hero Summary Banner */}
        <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-primary/20 bg-card">
              {user.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt={user.fullName}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-heading font-bold text-primary">
                  {user.fullName.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-base font-extrabold text-ink">{user.fullName}</h3>
                <Badge tone={badgeInfo.tone} size="sm">{badgeInfo.label}</Badge>
              </div>
              <p className="text-xs text-muted font-mono mt-0.5">{user.phone} · ID: {user.id}</p>
              <p className="text-2xs text-muted mt-0.5">Ro‘yxatdan o‘tgan: {formatDate(user.createdAt)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 border-t border-line pt-3 sm:border-t-0 sm:pt-0">
            <div className="rounded-xl border border-line bg-card px-3 py-1.5 text-center">
              <p className="text-3xs uppercase font-semibold text-muted">Jami Shartnomalar</p>
              <p className="font-heading text-sm font-extrabold text-ink">{userContracts.length} ta</p>
            </div>
            <div className="rounded-xl border border-line bg-card px-3 py-1.5 text-center">
              <p className="text-3xs uppercase font-semibold text-muted">Aylanma Hajmi</p>
              <p className="font-heading text-sm font-extrabold text-primary">{formatMoney(totalVolume)}</p>
            </div>
          </div>
        </div>

        {/* Status Warning if Suspended/Blocked */}
        {(isSuspended || isBlocked) && (
          <div className="rounded-xl border border-danger/30 bg-danger/5 p-3.5 text-xs text-ink">
            <p className="font-bold text-danger">
              ⛔ {isBlocked ? "Hisob butunlay bloklangan" : "Hisob vaqtincha to'xtatilgan"}
            </p>
            {moderationInfo?.reason && (
              <p className="mt-1 text-ink/80"><span className="font-semibold">Sabab:</span> {moderationInfo.reason}</p>
            )}
            {moderationInfo?.suspendedUntil && (
              <p className="mt-0.5 text-ink/80"><span className="font-semibold">Muddat:</span> {formatDate(moderationInfo.suspendedUntil)} gacha</p>
            )}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-line text-xs font-medium">
          {[
            { id: "overview", label: "Umumiy & Profil" },
            { id: "contracts", label: `Shartnomalar (${userContracts.length})` },
            { id: "content", label: user.role === "mutaxassis" ? `Xizmatlar (${userServices.length})` : `E'lonlar (${userJobs.length})` },
            { id: "kyc", label: `KYC & Hujjatlar (${kycRecord ? kycRecord.status : "Yo'q"})` },
            { id: "notes", label: "Ichki Eslatmalar" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as "overview" | "contracts" | "content" | "kyc" | "notes")}
              className={`border-b-2 px-3.5 py-2.5 transition ${
                activeTab === tab.id
                  ? "border-primary text-primary font-bold"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW & PROFILE */}
        {activeTab === "overview" && (
          <div className="space-y-4 text-xs">
            {profile ? (
              <Card className="space-y-3">
                <div>
                  <span className="text-3xs uppercase font-bold text-muted">Kasbiy Sarlavha:</span>
                  <p className="font-semibold text-ink text-sm mt-0.5">{profile.headline}</p>
                </div>
                <div>
                  <span className="text-3xs uppercase font-bold text-muted">Bio / Tavsif:</span>
                  <p className="text-ink mt-0.5 leading-relaxed">{profile.bio}</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-line">
                  <div>
                    <span className="text-3xs text-muted font-bold">Joylashuv:</span>
                    <p className="font-semibold text-ink">{profile.location || "Ko‘rsatilmagan"}</p>
                  </div>
                  <div>
                    <span className="text-3xs text-muted font-bold">Reyting:</span>
                    <p className="font-semibold text-warning-deep">⭐ {profile.rating} / 5.0</p>
                  </div>
                  <div>
                    <span className="text-3xs text-muted font-bold">Javob Vaqti:</span>
                    <p className="font-semibold text-ink">{profile.responseTimeHours} soat</p>
                  </div>
                  <div>
                    <span className="text-3xs text-muted font-bold">Ishonch Nishoni:</span>
                    <p className="font-semibold text-primary">{profile.badge}</p>
                  </div>
                </div>
                {profile.skills && profile.skills.length > 0 && (
                  <div className="pt-2">
                    <span className="text-3xs uppercase font-bold text-muted block mb-1.5">Ko&apos;nikmalar:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.skills.map((s, i) => (
                        <span key={i} className="rounded-md bg-surface px-2 py-0.5 text-2xs border border-line text-ink">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ) : (
              <Card className="py-6 text-center text-muted">
                Ushbu foydalanuvchi hali mutaxassis profilini to‘ldirmagan yoki bu xaridor hisobi.
              </Card>
            )}
          </div>
        )}

        {/* TAB 2: CONTRACTS & ESCROW */}
        {activeTab === "contracts" && (
          <div className="space-y-3">
            {userContracts.length === 0 ? (
              <Card className="py-8 text-center text-xs text-muted">
                Foydalanuvchida hali hech qanday shartnoma mavjud emas.
              </Card>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {userContracts.map((cnt) => (
                  <div
                    key={cnt.id}
                    className="flex items-center justify-between rounded-xl border border-line bg-card p-3 text-xs hover:border-primary/40 transition"
                  >
                    <div>
                      <p className="font-bold text-ink">{cnt.title}</p>
                      <p className="text-2xs text-muted mt-0.5">
                        #{cnt.id} · {cnt.buyerName} → {cnt.sellerName}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-primary">{formatMoney(cnt.totalAmount)}</p>
                      <Badge size="sm" tone={cnt.status === "faol" ? "success" : cnt.status === "nizo" ? "danger" : "neutral"}>
                        {cnt.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CONTENT (Services or Jobs) */}
        {activeTab === "content" && (
          <div className="space-y-3">
            {user.role === "mutaxassis" ? (
              userServices.length === 0 ? (
                <Card className="py-8 text-center text-xs text-muted">Xizmatlar yaratilmagan.</Card>
              ) : (
                <div className="space-y-2">
                  {userServices.map((svc) => (
                    <div key={svc.id} className="flex items-center justify-between rounded-xl border border-line p-3 text-xs">
                      <div>
                        <p className="font-bold text-ink">{svc.title}</p>
                        <p className="text-2xs text-muted">{svc.category} · {svc.deliveryDays} kun yetkazish</p>
                      </div>
                      <p className="font-bold text-primary">{formatMoney(svc.price)}</p>
                    </div>
                  ))}
                </div>
              )
            ) : (
              userJobs.length === 0 ? (
                <Card className="py-8 text-center text-xs text-muted">E’lonlar joylashtirilmagan.</Card>
              ) : (
                <div className="space-y-2">
                  {userJobs.map((j) => (
                    <div key={j.id} className="flex items-center justify-between rounded-xl border border-line p-3 text-xs">
                      <div>
                        <p className="font-bold text-ink">{j.title}</p>
                        <p className="text-2xs text-muted">{j.category} · {j.proposalsCount} ta taklif</p>
                      </div>
                      <p className="font-bold text-primary">{formatMoney(j.budgetMax)} gacha</p>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}

        {/* TAB 4: KYC & IDENTITY */}
        {activeTab === "kyc" && (
          <div className="space-y-3 text-xs">
            {kycRecord ? (
              <Card className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-ink">{kycRecord.legalName}</p>
                    <p className="text-2xs text-muted">Hujjat turi: {kycRecord.documentType.toUpperCase()} ({kycRecord.country})</p>
                    <p className="text-2xs text-muted">Tug‘ilgan sana: {kycRecord.birthDate}</p>
                  </div>
                  <Badge tone={kycRecord.status === "tasdiqlangan" ? "success" : kycRecord.status === "rad_etilgan" ? "danger" : "warning"}>
                    {kycRecord.status}
                  </Badge>
                </div>

                {/* Documents preview */}
                {kycRecord.documents && kycRecord.documents.length > 0 && (
                  <div>
                    <span className="text-3xs uppercase font-bold text-muted block mb-1">Hujjat skrinshoti:</span>
                    <div className="relative h-44 w-full max-w-sm rounded-xl overflow-hidden border border-line bg-surface">
                      <Image
                        src={kycRecord.documents[0]}
                        alt="KYC Document"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  </div>
                )}

                {kycRecord.status === "korib_chiqilmoqda" && (
                  <div className="flex items-center gap-2 pt-2 border-t border-line">
                    <Button
                      type="button"
                      size="sm"
                      tone="success"
                      onClick={() => {
                        runAction(() => adminModerateKYC(user.id, "approve"));
                      }}
                    >
                      Hujjatni tasdiqlash
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      tone="danger"
                      onClick={() => setKycRejectModalOpen(true)}
                    >
                      Rad etish
                    </Button>
                  </div>
                )}
              </Card>
            ) : (
              <Card className="py-8 text-center text-xs text-muted">
                Foydalanuvchi hali shaxsni tasdiqlash uchun hujjat topshirmagan.
              </Card>
            )}
          </div>
        )}

        {/* TAB 5: INTERNAL OPERATOR NOTES */}
        {activeTab === "notes" && (
          <InternalNotesWidget targetId={user.id} targetType="user" />
        )}
      </div>

      {/* MODAL: Suspend User */}
      <DangerousActionModal
        open={suspendModalOpen}
        onClose={() => setSuspendModalOpen(false)}
        title="Foydalanuvchini vaqtincha to‘xtatish"
        description={`${user.fullName} hisobini vaqtincha muzlatish. Bu vaqt ichida foydalanuvchi yangi shartnoma ocha olmaydi va tizimda taklif qoldira olmaydi.`}
        impactDetails={[
          "Mavjud ochiq takliflari vaqtincha to'xtatiladi",
          "Yangi buyurtma qabul qilish imkoniyati cheklanadi",
          "Foydalanuvchi tizimga kirganda ogohlantirish xabarini ko'radi",
        ]}
        confirmLabel="Vaqtincha to'xtatish"
        confirmTone="warning"
        onConfirm={async (reason) => {
          await suspendUser(user.id, reason, suspendDays);
          onUpdated();
        }}
      />

      {/* MODAL: Block User */}
      <DangerousActionModal
        open={blockModalOpen}
        onClose={() => setBlockModalOpen(false)}
        title="Foydalanuvchini butunlay bloklash"
        description={`${user.fullName} akkauntini platforma qoidalarini jiddiy buzganlik uchun bloklash.`}
        impactDetails={[
          "Foydalanuvchi tizimga butunlay kira olmaydi",
          "Barcha xizmatlari va e'lonlari ommadan yashiriladi",
          "Balansdagi mablag'larni yechish to'xtatiladi",
        ]}
        confirmLabel="Hisobni bloklash"
        confirmTone="danger"
        onConfirm={async (reason) => {
          await blockUser(user.id, reason);
          onUpdated();
        }}
      />

      {/* MODAL: Deactivate User */}
      <DangerousActionModal
        open={deactivateModalOpen}
        onClose={() => setDeactivateModalOpen(false)}
        title="Hisobni deaktivatsiya qilish"
        description="Foydalanuvchi hisobini nofaol holatga o'tkazish."
        impactDetails={["Foydalanuvchi tizimdan chiqaziladi va profili yashiriladi"]}
        confirmLabel="Deaktivatsiya qilish"
        confirmTone="danger"
        onConfirm={async () => {
          await deactivateUser(user.id);
          onUpdated();
        }}
      />

      {/* MODAL: Reject KYC */}
      <DangerousActionModal
        open={kycRejectModalOpen}
        onClose={() => setKycRejectModalOpen(false)}
        title="KYC Hujjatlarini rad etish"
        description="Foydalanuvchiga hujjat nima sababdan rad etilganligini tushuntiring."
        impactDetails={["Foydalanuvchiga rad sababi ko'rsatiladi va qayta topshirish so'raladi"]}
        confirmLabel="Rad etish"
        confirmTone="danger"
        onConfirm={async (reason) => {
          await adminModerateKYC(user.id, "reject", reason);
          onUpdated();
        }}
      />
    </Modal>
  );
}
