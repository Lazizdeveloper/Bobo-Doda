"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonCard } from "@/components/ui/Skeleton";
import {
  ContractStatusBadge,
  OfferStatusBadge,
} from "@/components/shared/StatusBadge";
import {
  getAllMessages,
  getContracts,
  getIncomingOffers,
  getMessages,
  getSession,
  SELLER_ID,
} from "@/lib/api";
import type { Message } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { useT } from "@/lib/i18n";

/* Suhbat shartnoma yoki kelgan taklif (Offer) chatidan bo'lishi mumkin */
interface Thread {
  id: string;
  href: string;
  name: string;
  title: string;
  last: Message;
  badge: ReactNode;
}

export default function XabarlarPage() {
  const { t, lang } = useT();
  const [threads, setThreads] = useState<Thread[] | null>(null);

  const myId = getSession()?.userId ?? SELLER_ID;

  useEffect(() => {
    Promise.all([getAllMessages(), getContracts(), getIncomingOffers()]).then(
      async ([messages, contracts, offers]) => {
        const list: Thread[] = [];

        /* Shartnoma suhbatlari */
        const byContract = new Map<string, Message>();
        for (const msg of messages) {
          const current = byContract.get(msg.contractId);
          if (!current || msg.createdAt > current.createdAt) {
            byContract.set(msg.contractId, msg);
          }
        }
        byContract.forEach((last, contractId) => {
          const contract = contracts.find((c) => c.id === contractId);
          if (contract) {
            list.push({
              id: contract.id,
              href: `/mutaxassis/shartnomalar/${contract.id}`,
              name: contract.buyerName,
              title: contract.title,
              last,
              badge: <ContractStatusBadge status={contract.status} />,
            });
          }
        });

        /* Kelgan taklif suhbatlari (qabul qilinganlari shartnomaga ko'chgan) */
        const openOffers = offers.filter((o) => o.status !== "qabul_qilindi");
        const offerThreads = await Promise.all(
          openOffers.map((o) => getMessages(o.id))
        );
        openOffers.forEach((offer, i) => {
          const msgs = offerThreads[i];
          if (msgs.length === 0) return;
          list.push({
            id: offer.id,
            href: `/mutaxassis/takliflarim/kelgan/${offer.id}`,
            name: offer.buyerName,
            title: offer.title,
            last: msgs[msgs.length - 1],
            badge: <OfferStatusBadge status={offer.status} />,
          });
        });

        list.sort((a, b) => b.last.createdAt.localeCompare(a.last.createdAt));
        setThreads(list);
      }
    );
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-extrabold text-ink">
        {t("messages.title")}
      </h1>

      {!threads ? (
        <SkeletonCard />
      ) : threads.length === 0 ? (
        <EmptyState title={t("messages.empty")} />
      ) : (
        <Card padding="none">
          {threads.map((thread, i) => {
            const mine = thread.last.senderId === myId;
            return (
              <Link
                key={thread.id}
                href={thread.href}
                className={`flex items-center gap-3 p-4 transition-colors duration-150 hover:bg-card-hover ${
                  i > 0 ? "border-t border-line" : ""
                }`}
              >
                <Avatar name={thread.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium text-ink">
                      {thread.name}
                      <span className="ml-2 hidden text-2xs font-normal text-faint sm:inline">
                        {thread.title}
                      </span>
                    </p>
                    <span className="shrink-0 text-2xs text-faint">
                      {formatDate(thread.last.createdAt, lang)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {mine && <span className="text-faint">{t("chat.you")}: </span>}
                    {thread.last.text}
                  </p>
                </div>
                {thread.badge}
              </Link>
            );
          })}
        </Card>
      )}
    </div>
  );
}
