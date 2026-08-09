import * as mock from "@/lib/mock-api";
import * as adminMock from "@/lib/admin-api";
import type {
  AuthService,
  CatalogService,
  ContractsService,
  DisputesService,
  JobsService,
  MessagesService,
  MilestonesService,
  NotificationsService,
  OffersService,
  PaymentsService,
  ProposalsService,
  ReviewsService,
  SavedService,
  ServicesService,
  SupportService,
  UsersService,
  VerificationService,
} from "./contracts";
import { withNormalizedErrors } from "./errors";

const call = <T>(operation: () => Promise<T>) => withNormalizedErrors(operation);

export const authService: AuthService = {
  getSession: mock.getSession,
  login: (input) => call(() => mock.login(input)),
  register: (input) => call(() => mock.register(input)),
  verifyTelegram: (code) => call(() => mock.verifyTelegram(code)),
  chooseRole: (role) => call(() => mock.chooseRole(role)),
  resetPassword: (input) => call(() => mock.resetPassword(input)),
  logout: mock.logout,
};

export const usersService: UsersService = {
  getCurrent: () => call(mock.getCurrentUser),
  getSellerProfile: () => call(mock.getSellerProfile),
  updateName: (name) => call(() => mock.updateUserName(name)),
  completeSellerProfile: (input) => call(() => mock.completeSellerProfile(input)),
  updateSellerProfile: (input) => call(() => mock.updateSellerProfile(input)),
  setAvailability: (available) => call(() => mock.setAvailability(available)),
  getPreferences: () => call(mock.getAccountPreferences),
  savePreferences: (preferences) => call(() => mock.saveAccountPreferences(preferences)),
  changePassword: (current, next) => call(() => mock.changePassword(current, next)),
  exportData: () => call(mock.exportCurrentUserData),
  deleteAccount: () => call(mock.deleteCurrentAccount),
  reportUser: (input) => call(() => mock.reportUser(input)),
};

export const catalogService: CatalogService = {
  listSpecialists: () => call(mock.getSpecialists),
  getSpecialist: (userId) => call(() => mock.getSpecialist(userId)),
  listSellerReviews: (sellerId) => call(() => mock.getReviewsForSeller(sellerId)),
};

export const savedService: SavedService = {
  listJobIds: () => call(mock.getSavedJobIds),
  toggleJob: (jobId) => call(() => mock.toggleSavedJob(jobId)),
  listMarketIds: () => call(mock.getSavedMarketIds),
  toggleMarketItem: (id) => call(() => mock.toggleSavedMarketItem(id)),
};

export const servicesService: ServicesService = {
  listMine: () => call(mock.getServices),
  listPublic: () => call(mock.getPublicServices),
  get: (id) => call(() => mock.getService(id)),
  create: (input) => call(() => mock.createService(input)),
  update: (id, input) => call(() => mock.updateService(id, input)),
  remove: (id) => call(() => mock.deleteService(id)),
};

export const jobsService: JobsService = {
  list: () => call(mock.getJobs),
  get: (id) => call(() => mock.getJob(id)),
  listMine: () => call(mock.getBuyerJobs),
  create: (input) => call(() => mock.createJob(input)),
  close: (id) => call(() => mock.closeJob(id)),
};

export const proposalsService: ProposalsService = {
  listMine: () => call(mock.getProposals),
  get: (id) => call(() => mock.getProposal(id)),
  listForJob: (id) => call(() => mock.getJobProposals(id)),
  create: (input) => call(() => mock.createProposal(input)),
  setStatus: (id, status) => call(() => mock.setProposalStatus(id, status)),
  hire: (proposalId, milestones) => call(() => mock.hireProposal(proposalId, milestones)),
  withdraw: (id) => call(() => mock.withdrawProposal(id)),
};

export const offersService: OffersService = {
  get: (id) => call(() => mock.getOffer(id)),
  create: (input) => call(() => mock.createOffer(input)),
  listSent: () => call(mock.getSentOffers),
  listIncoming: () => call(mock.getIncomingOffers),
  accept: (id) => call(() => mock.acceptOffer(id)),
  withdraw: (id) => call(() => mock.withdrawOffer(id)),
  decline: (id) => call(() => mock.declineOffer(id)),
};

export const contractsService: ContractsService = {
  list: () => call(mock.getContracts),
  get: (id) => call(() => mock.getContract(id)),
  cancel: (id) => call(() => mock.cancelContract(id)),
};

export const milestonesService: MilestonesService = {
  list: (id) => call(() => mock.getMilestones(id)),
  listMine: () => call(mock.getAllMilestones),
  submit: (id) => call(() => mock.submitMilestone(id)),
  accept: (id) => call(() => mock.acceptMilestone(id)),
  requestRevision: (id, comment) => call(() => mock.requestRevision(id, comment)),
};

export const paymentsService: PaymentsService = {
  fundContract: (id) => call(() => mock.fundContract(id)),
  getBalance: () => call(mock.getBalance),
  getCards: () => call(mock.getCards),
  addCard: (input) => call(() => mock.addCard(input)),
  removeCard: (id) => call(() => mock.removeCard(id)),
  withdrawEarnings: (cardId) => call(() => mock.withdrawFunds(cardId)),
  withdrawBalance: (cardId) => call(() => mock.withdrawBalance(cardId)),
  getWithdrawnTotal: () => call(mock.getWithdrawnTotal),
};

export const messagesService: MessagesService = {
  list: (id) => call(() => mock.getMessages(id)),
  listMine: () => call(mock.getAllMessages),
  send: (id, body) => call(() => mock.sendMessage(id, body)),
};

export const notificationsService: NotificationsService = {
  list: () => call(mock.getNotifications),
  markRead: (id) => call(() => mock.markNotificationRead(id)),
  markAllRead: () => call(mock.markAllNotificationsRead),
};

export const reviewsService: ReviewsService = {
  listMine: () => call(mock.getReviews),
  getForContract: (id) => call(() => mock.getReviewByContract(id)),
  create: (id, rating, comment) => call(() => mock.createReview(id, rating, comment)),
};

export const disputesService: DisputesService = {
  getForContract: (id) => call(() => mock.getDisputeByContract(id)),
  open: (contractId, input) => call(() => mock.openDispute(contractId, input)),
};

export const verificationService: VerificationService = {
  getMine: () => call(mock.getVerification),
  submit: (input) => call(() => mock.submitVerification(input)),
};

export const supportService: SupportService = {
  listMine: () => call(mock.getSupportTickets),
  create: (input) => call(() => mock.createSupportTicket(input)),
};

export const adminService = {
  getSession: adminMock.getAdminSession,
  getCurrent: adminMock.getCurrentAdmin,
  hasPermission: adminMock.hasPermission,
  getAuditEvents: adminMock.getAuditEvents,
};

/**
 * Ma'lumot o'zgargani haqidagi signal — ekranlar shu hodisada qayta o'qiydi.
 * Hozir mock adapter localStorage yozuvidan keyin chiqaradi; backend'da bu
 * websocket/SSE push yoki kesh invalidatsiyasi bilan almashtiriladi.
 */
export const DATA_CHANGED_EVENT = mock.DATA_CHANGED_EVENT;
