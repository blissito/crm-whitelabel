// SQLite no soporta enums Prisma: se modelan como String + estas constantes.
// Un solo lugar que define los valores válidos y sus tipos derivados.

export const ConversationStatus = {
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  TIMEOUT: "TIMEOUT",
  DELETED: "DELETED",
} as const;
export type ConversationStatus =
  (typeof ConversationStatus)[keyof typeof ConversationStatus];

export const MessageRole = {
  USER: "USER",
  ASSISTANT: "ASSISTANT",
  SYSTEM: "SYSTEM",
} as const;
export type MessageRole = (typeof MessageRole)[keyof typeof MessageRole];

export const MessageOrigin = {
  OPERATOR_DASHBOARD: "operator_dashboard",
  OPERATOR_PHONE: "operator_phone",
  HISTORY: "history",
} as const;
export type MessageOrigin = (typeof MessageOrigin)[keyof typeof MessageOrigin];

export const LeadStatus = {
  NEW: "NEW",
  CONTACTED: "CONTACTED",
  SCHEDULED: "SCHEDULED",
  NEGOTIATING: "NEGOTIATING",
  CLOSED_WON: "CLOSED_WON",
  CLOSED_LOST: "CLOSED_LOST",
} as const;
export type LeadStatus = (typeof LeadStatus)[keyof typeof LeadStatus];

export const EscalationStatus = {
  PENDING: "PENDING",
  ASSIGNED: "ASSIGNED",
  RESOLVED: "RESOLVED",
} as const;
export type EscalationStatus =
  (typeof EscalationStatus)[keyof typeof EscalationStatus];

export const EscalationPriority = {
  LOW: "LOW",
  NORMAL: "NORMAL",
  HIGH: "HIGH",
  URGENT: "URGENT",
} as const;
export type EscalationPriority =
  (typeof EscalationPriority)[keyof typeof EscalationPriority];

export const OrdenStatus = {
  ABIERTA: "ABIERTA",
  CERRADA: "CERRADA",
} as const;
export type OrdenStatus = (typeof OrdenStatus)[keyof typeof OrdenStatus];

export const UserRole = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
