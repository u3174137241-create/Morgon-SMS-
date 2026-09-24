import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { sendMessageSchema } from "@/lib/validation";
import { rateLimit, clientKeyFromRequest } from "@/lib/rateLimit";

async function assertParticipant(userId: string, transactionId: string) {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { conversation: true },
  });
  if (!transaction) return { error: jsonError("Transaktionen hittades inte.", 404) };
  if (transaction.buyerId !== userId && transaction.sellerId !== userId) {
    return { error: jsonError("Du har inte åtkomst till den här konversationen.", 403) };
  }
  // Chatten är låst tills kontaktåtkomst är beviljad — oavsett vad frontend skickar.
  if (!transaction.conversation) {
    return { error: jsonError("Chatten är låst tills köparen godkänt och kontaktavgiften (om någon) är betald.", 403) };
  }
  return { transaction };
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Du måste vara inloggad.", 401);

  const url = new URL(req.url);
  const transactionId = url.searchParams.get("transactionId");
  if (!transactionId) return jsonError("transactionId krävs.", 400);

  const { error, transaction } = await assertParticipant(user.id, transactionId);
  if (error) return error;

  const messages = await prisma.message.findMany({
    where: { conversationId: transaction!.conversation!.id },
    orderBy: { createdAt: "asc" },
    take: 500,
  });

  return jsonOk({ messages });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Du måste vara inloggad.", 401);

  const { allowed } = rateLimit(clientKeyFromRequest(req, `send-message:${user.id}`), 60, 60 * 1000);
  if (!allowed) return jsonError("Skickar för snabbt, vänta lite.", 429);

  const body = await req.json().catch(() => null);
  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Ogiltig indata", 400);
  const { transactionId, type, content, mediaUrl } = parsed.data;

  if (type === "TEXT" && !content) return jsonError("Meddelandet saknar text.", 400);
  if ((type === "IMAGE" || type === "VOICE") && !mediaUrl) return jsonError("Media-URL saknas.", 400);

  const { error, transaction } = await assertParticipant(user.id, transactionId);
  if (error) return error;

  const message = await prisma.message.create({
    data: {
      conversationId: transaction!.conversation!.id,
      senderId: user.id,
      type,
      content,
      mediaUrl,
    },
  });

  return jsonOk({ message }, 201);
}
