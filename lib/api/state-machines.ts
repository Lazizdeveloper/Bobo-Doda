import type {
  ContractStatus,
  Dispute,
  JobStatus,
  MilestoneStatus,
  OfferStatus,
  ProposalStatus,
} from "@/lib/types";

export type Actor = "buyer" | "seller" | "admin" | "system";

export interface TransitionRule<State extends string> {
  from: State;
  to: State;
  actors: readonly Actor[];
  preconditions?: readonly string[];
  postconditions?: readonly string[];
}

export interface StateMachine<State extends string> {
  initial: State;
  terminal: readonly State[];
  transitions: readonly TransitionRule<State>[];
}

export type PaymentStatus =
  | "created"
  | "pending"
  | "authorized"
  | "captured"
  | "failed"
  | "refunded"
  | "cancelled";

export type ReviewStatus = "eligible" | "submitted" | "published" | "hidden";
export type NotificationStatus = "unread" | "read" | "archived";
export type DisputeStatus = Dispute["status"];

export const jobMachine: StateMachine<JobStatus> = {
  initial: "ochiq",
  terminal: ["yopilgan"],
  transitions: [
    { from: "ochiq", to: "yopilgan", actors: ["buyer", "admin"] },
  ],
};

export const proposalMachine: StateMachine<ProposalStatus> = {
  initial: "yuborilgan",
  terminal: ["yollandi", "rad_etildi", "qaytarib_olingan"],
  transitions: [
    { from: "yuborilgan", to: "korib_chiqilmoqda", actors: ["buyer"] },
    { from: "yuborilgan", to: "suhbat", actors: ["buyer"] },
    { from: "korib_chiqilmoqda", to: "suhbat", actors: ["buyer"] },
    { from: "yuborilgan", to: "rad_etildi", actors: ["buyer", "admin"] },
    { from: "korib_chiqilmoqda", to: "rad_etildi", actors: ["buyer", "admin"] },
    { from: "suhbat", to: "rad_etildi", actors: ["buyer", "admin"] },
    {
      from: "yuborilgan",
      to: "qaytarib_olingan",
      actors: ["seller"],
      preconditions: ["job is open"],
    },
    {
      from: "korib_chiqilmoqda",
      to: "qaytarib_olingan",
      actors: ["seller"],
      preconditions: ["job is open"],
    },
    {
      from: "suhbat",
      to: "qaytarib_olingan",
      actors: ["seller"],
      preconditions: ["job is open"],
    },
    {
      from: "yuborilgan",
      to: "yollandi",
      actors: ["buyer"],
      preconditions: ["job is open", "no contract exists for proposal"],
    },
    {
      from: "korib_chiqilmoqda",
      to: "yollandi",
      actors: ["buyer"],
      preconditions: ["job is open", "no contract exists for proposal"],
    },
    {
      from: "suhbat",
      to: "yollandi",
      actors: ["buyer"],
      preconditions: ["job is open", "no contract exists for proposal"],
    },
  ],
};

export const offerMachine: StateMachine<OfferStatus> = {
  initial: "yuborilgan",
  terminal: ["qabul_qilindi", "rad_etildi", "bekor_qilingan"],
  transitions: [
    { from: "yuborilgan", to: "qabul_qilindi", actors: ["seller"] },
    { from: "yuborilgan", to: "rad_etildi", actors: ["seller"] },
    { from: "yuborilgan", to: "bekor_qilingan", actors: ["buyer"] },
  ],
};

export const contractMachine: StateMachine<ContractStatus> = {
  initial: "imzolangan",
  terminal: ["yakunlangan", "bekor_qilingan"],
  transitions: [
    {
      from: "imzolangan",
      to: "faol",
      actors: ["buyer", "system"],
      preconditions: ["payment captured", "at least one milestone funded"],
    },
    { from: "imzolangan", to: "bekor_qilingan", actors: ["buyer", "seller", "admin"] },
    { from: "faol", to: "yakunlangan", actors: ["system"], preconditions: ["all milestones accepted"] },
    { from: "faol", to: "bekor_qilingan", actors: ["buyer", "seller", "admin"] },
    { from: "faol", to: "nizo", actors: ["buyer", "seller", "admin"] },
    { from: "nizo", to: "faol", actors: ["admin"], postconditions: ["dispute resolved without termination"] },
    { from: "nizo", to: "yakunlangan", actors: ["admin"], postconditions: ["resolution applied"] },
    { from: "nizo", to: "bekor_qilingan", actors: ["admin"], postconditions: ["refund/release applied"] },
  ],
};

export const milestoneMachine: StateMachine<MilestoneStatus> = {
  initial: "kutilmoqda",
  terminal: ["qabul_qilindi"],
  transitions: [
    { from: "kutilmoqda", to: "mablaglangan", actors: ["buyer", "system"] },
    { from: "mablaglangan", to: "topshirildi", actors: ["seller"] },
    { from: "topshirildi", to: "qabul_qilindi", actors: ["buyer", "system"] },
    { from: "topshirildi", to: "ozgartirish_soraldi", actors: ["buyer"] },
    { from: "ozgartirish_soraldi", to: "topshirildi", actors: ["seller"] },
  ],
};

export const paymentMachine: StateMachine<PaymentStatus> = {
  initial: "created",
  terminal: ["captured", "failed", "refunded", "cancelled"],
  transitions: [
    { from: "created", to: "pending", actors: ["buyer", "system"] },
    { from: "pending", to: "authorized", actors: ["system"] },
    { from: "pending", to: "failed", actors: ["system"] },
    { from: "pending", to: "cancelled", actors: ["buyer", "system"] },
    { from: "authorized", to: "captured", actors: ["system"] },
    { from: "authorized", to: "failed", actors: ["system"] },
    { from: "captured", to: "refunded", actors: ["admin", "system"] },
  ],
};

export const reviewMachine: StateMachine<ReviewStatus> = {
  initial: "eligible",
  terminal: ["published", "hidden"],
  transitions: [
    { from: "eligible", to: "submitted", actors: ["buyer", "seller"] },
    { from: "submitted", to: "published", actors: ["system"] },
    { from: "published", to: "hidden", actors: ["admin"] },
    { from: "hidden", to: "published", actors: ["admin"] },
  ],
};

export const disputeMachine: StateMachine<DisputeStatus> = {
  initial: "ochiq",
  terminal: ["hal_qilindi"],
  transitions: [
    { from: "ochiq", to: "korib_chiqilmoqda", actors: ["admin"] },
    { from: "korib_chiqilmoqda", to: "hal_qilindi", actors: ["admin"] },
    // Admin can resolve directly without a separate "under review" step —
    // there is no UI action that sets korib_chiqilmoqda today, so requiring
    // it first would make every open dispute unresolvable.
    { from: "ochiq", to: "hal_qilindi", actors: ["admin"] },
  ],
};

export const notificationMachine: StateMachine<NotificationStatus> = {
  initial: "unread",
  terminal: ["archived"],
  transitions: [
    { from: "unread", to: "read", actors: ["buyer", "seller"] },
    { from: "unread", to: "archived", actors: ["buyer", "seller"] },
    { from: "read", to: "archived", actors: ["buyer", "seller"] },
  ],
};

export function canTransition<State extends string>(
  machine: StateMachine<State>,
  from: State,
  to: State,
  actor: Actor
): boolean {
  return machine.transitions.some(
    (rule) => rule.from === from && rule.to === to && rule.actors.includes(actor)
  );
}

export function assertTransition<State extends string>(
  machine: StateMachine<State>,
  from: State,
  to: State,
  actor: Actor
): void {
  if (!canTransition(machine, from, to, actor)) {
    throw new Error("BAD_STATE");
  }
}
