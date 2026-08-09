import type {
  AppNotification,
  Contract,
  Job,
  Message,
  Milestone,
  Offer,
  Proposal,
  Review,
  SellerProfile,
  Service,
  User,
} from "@/lib/types";

export const BUYER_ID = "u-b2";
export const SELLER_ID = "u-1";
export const DEMO_PASSWORD = "demo123";

export const seedUsers: User[] = [];
export const seedProfiles: Record<string, SellerProfile> = {};
export const seedNotifications: AppNotification[] = [];
export const seedServices: Service[] = [];
export const seedJobs: Job[] = [];
export const seedProposals: Proposal[] = [];
export const seedContracts: Contract[] = [];
export const seedMilestones: Milestone[] = [];
export const seedMessages: Message[] = [];
export const seedOfferMessages: Message[] = [];
export const seedOffers: Offer[] = [];
export const seedReviews: Review[] = [];
