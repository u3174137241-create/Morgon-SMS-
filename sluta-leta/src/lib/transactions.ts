import type { Prisma, TransactionState } from "@prisma/client";
import { prisma } from "@/lib/db";

// Tillåtna övergångar i transaktionens tillståndsmaskin. Backend är den enda
// auktoriteten här — frontend kan aldrig själv sätta ett nytt state.
const ALLOWED_TRANSITIONS: Record<TransactionState, TransactionState[]> = {
  OFFER_ACCEPTED: ["CONTACT_FEE_PENDING", "CHAT_UNLOCKED", "CANCELLED"],
  CONTACT_FEE_PENDING: ["PAYMENT_PROCESSING", "CANCELLED", "FAILED"],
  PAYMENT_PROCESSING: ["PAYMENT_COMPLETED", "FAILED", "CANCELLED"],
  PAYMENT_COMPLETED: ["CHAT_UNLOCKED"],
  CHAT_UNLOCKED: ["DEAL_IN_PROGRESS", "CANCELLED", "DISPUTED"],
  DEAL_IN_PROGRESS: ["WAITING_FOR_COMPLETION", "CANCELLED", "DISPUTED"],
  WAITING_FOR_COMPLETION: ["COMPLETED", "DISPUTED", "CANCELLED"],
  COMPLETED: ["DISPUTED"],
  CANCELLED: [],
  REFUND_PENDING: ["REFUNDED", "DISPUTED"],
  REFUNDED: [],
  DISPUTED: ["REFUND_PENDING", "COMPLETED", "CANCELLED"],
  FAILED: ["CONTACT_FEE_PENDING"],
};

export class InvalidTransitionError extends Error {
  constructor(from: TransactionState, to: TransactionState) {
    super(`Ogiltig övergång: ${from} -> ${to}`);
  }
}

export async function transitionTransaction(
  tx: Prisma.TransactionClient | typeof prisma,
  transactionId: string,
  toState: TransactionState,
  note?: string
) {
  const current = await tx.transaction.findUniqueOrThrow({ where: { id: transactionId } });
  if (current.state === toState) return current;

  const allowed = ALLOWED_TRANSITIONS[current.state] ?? [];
  if (!allowed.includes(toState)) {
    throw new InvalidTransitionError(current.state, toState);
  }

  const updated = await tx.transaction.update({
    where: { id: transactionId },
    data: { state: toState },
  });

  await tx.transactionEvent.create({
    data: {
      transactionId,
      fromState: current.state,
      toState,
      note,
    },
  });

  return updated;
}
