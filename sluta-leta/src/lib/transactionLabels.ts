export const TRANSACTION_STATE_LABELS: Record<string, string> = {
  OFFER_ACCEPTED: "Godkänt",
  CONTACT_FEE_PENDING: "Väntar på betalning",
  PAYMENT_PROCESSING: "Behandlar betalning",
  PAYMENT_COMPLETED: "Betalning klar",
  CHAT_UNLOCKED: "Chatt upplåst",
  DEAL_IN_PROGRESS: "Affär pågår",
  WAITING_FOR_COMPLETION: "Väntar på bekräftelse",
  COMPLETED: "Genomförd",
  CANCELLED: "Avbruten",
  FAILED: "Misslyckades",
  REFUND_PENDING: "Återbetalning väntar",
  REFUNDED: "Återbetald",
  DISPUTED: "Tvist",
};

export const SEARCH_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Aktiv",
  PAUSED: "Pausad",
  FULFILLED: "Hittad",
  CANCELLED: "Avslutad",
};
