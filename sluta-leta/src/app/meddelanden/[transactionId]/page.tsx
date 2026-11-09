"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { TRANSACTION_STATE_LABELS } from "@/lib/transactionLabels";

type Transaction = {
  id: string;
  state: string;
  amount: number;
  buyerId: string;
  sellerId: string;
  buyerConfirmedAt: string | null;
  sellerConfirmedAt: string | null;
  contactFee: { status: string; amount: number } | null;
  conversation: { id: string } | null;
  buyer: { id: string; name: string };
  seller: { id: string; name: string };
  offer: { message: string; price: number; search: { title: string } | null };
};

type Message = {
  id: string;
  senderId: string;
  type: string;
  content: string | null;
  mediaUrl: string | null;
  createdAt: string;
};

function TransactionThreadContent() {
  const { transactionId } = useParams<{ transactionId: string }>();
  const searchParams = useSearchParams();
  const paymentStatus = searchParams.get("betalning");
  const { user } = useCurrentUser();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [payingUp, setPayingUp] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSent, setReviewSent] = useState(false);

  const loadTransaction = useCallback(async () => {
    setLoadError(false);
    try {
      const res = await fetch(`/api/transactions/${transactionId}`);
      const data = await res.json();
      if (!res.ok) throw new Error();
      setTransaction(data.transaction);
    } catch {
      setLoadError(true);
    }
  }, [transactionId]);

  const loadMessages = useCallback(async () => {
    const res = await fetch(`/api/messages?transactionId=${transactionId}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages ?? []);
    }
  }, [transactionId]);

  useEffect(() => {
    loadTransaction();
  }, [loadTransaction]);

  useEffect(() => {
    if (!transaction?.conversation) return;
    loadMessages();
    const interval = setInterval(loadMessages, 4000);
    return () => clearInterval(interval);
  }, [transaction?.conversation, loadMessages]);

  async function payContactFee() {
    setPayingUp(true);
    setError(null);
    const res = await fetch("/api/payments/contact-fee/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionId }),
    });
    const data = await res.json();
    setPayingUp(false);
    if (!res.ok) return setError(data.error);
    window.location.href = data.checkoutUrl;
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionId, type: "TEXT", content: text }),
    });
    if (res.ok) {
      setText("");
      loadMessages();
    }
  }

  async function markComplete() {
    const res = await fetch(`/api/transactions/${transactionId}/complete`, { method: "POST" });
    if (res.ok) loadTransaction();
  }

  async function sendReview(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionId, rating: reviewRating, comment: reviewComment }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setReviewSent(true);
  }

  if (loadError) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-2 py-16 text-center">
        <p className="text-sm font-medium text-gray-500">Något gick fel.</p>
        <p className="text-xs text-gray-400">Vi kunde inte hämta den här konversationen just nu.</p>
        <button className="btn-secondary mt-2 !px-5 !py-2 text-xs" onClick={loadTransaction}>
          Försök igen
        </button>
      </div>
    );
  }
  if (!transaction || !user) return <p className="text-sm text-gray-400">Laddar…</p>;

  const isSeller = user.id === transaction.sellerId;
  const isBuyer = user.id === transaction.buyerId;
  const iConfirmed = isBuyer ? transaction.buyerConfirmedAt : transaction.sellerConfirmedAt;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <div className="card flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-kungsbla-700">
            {isBuyer ? transaction.seller.name : transaction.buyer.name}
          </p>
          <span className="text-xs font-medium text-kungsbla-500">
            {TRANSACTION_STATE_LABELS[transaction.state] ?? transaction.state}
          </span>
        </div>
        {transaction.offer.search && (
          <p className="line-clamp-1 text-xs text-gray-400">Gäller: {transaction.offer.search.title}</p>
        )}
        <p className="text-sm font-bold text-kungsbla-600">{transaction.amount} kr</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {paymentStatus === "klar" && (
        <p className="rounded-xl bg-kungsbla-50 p-3 text-sm text-kungsbla-600">
          Tack! Din betalning behandlas — chatten låses upp så snart den är bekräftad.
        </p>
      )}
      {paymentStatus === "avbruten" && (
        <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-500">Betalningen avbröts. Inget drogs från ditt kort.</p>
      )}

      {!transaction.conversation && ["CONTACT_FEE_PENDING", "PAYMENT_PROCESSING", "FAILED"].includes(transaction.state) && (
        <div className="card flex flex-col gap-3 border-guld-400/40 bg-guld-400/5">
          <p className="flex items-center gap-2 text-sm font-semibold text-kungsbla-700">
            <span aria-hidden>🔒</span> Chatten är låst
          </p>
          {isSeller && transaction.state === "CONTACT_FEE_PENDING" && transaction.contactFee && (
            <>
              <p className="text-sm text-gray-700">
                Ditt bud har godkänts! Lås upp chatten för {transaction.contactFee.amount} kr och fortsätt affären.
              </p>
              <button className="btn-primary w-fit" onClick={payContactFee} disabled={payingUp}>
                {payingUp ? "Skapar betalning…" : `Lås upp chatten — ${transaction.contactFee.amount} kr`}
              </button>
              <p className="text-xs text-gray-400">
                Dina gratis provchattar som ny användare är använda. Har du Sluta Leta Plus slipper du den här
                avgiften helt.{" "}
                <a href="/plus" className="font-medium text-kungsbla-600 underline">
                  Läs mer om Plus
                </a>
                .
              </p>
            </>
          )}
          {isBuyer && transaction.state === "CONTACT_FEE_PENDING" && (
            <p className="text-sm text-gray-500">Väntar på att säljaren låser upp chatten…</p>
          )}
          {transaction.state === "PAYMENT_PROCESSING" && <p className="text-sm text-gray-500">Behandlar betalning…</p>}
          {transaction.state === "FAILED" && isSeller && (
            <>
              <p className="text-sm text-red-600">Betalningen misslyckades eller avbröts. Försök igen för att låsa upp chatten.</p>
              <button className="btn-primary w-fit" onClick={payContactFee} disabled={payingUp}>
                {payingUp ? "Skapar betalning…" : "Försök igen"}
              </button>
            </>
          )}
          {transaction.state === "FAILED" && isBuyer && (
            <p className="text-sm text-gray-500">Säljarens betalning misslyckades. Väntar på ett nytt försök.</p>
          )}
        </div>
      )}

      {transaction.conversation && (
        <div className="card flex h-96 flex-col">
          <div className="flex-1 space-y-2 overflow-y-auto">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                  m.senderId === user.id ? "ml-auto bg-kungsbla-500 text-white" : "bg-gray-100 text-gray-800"
                }`}
              >
                {m.type === "TEXT" && m.content}
                {m.type === "IMAGE" && m.mediaUrl && <img src={m.mediaUrl} alt="" className="rounded-lg" />}
                {m.type === "VOICE" && m.mediaUrl && <audio controls src={m.mediaUrl} className="max-w-full" />}
              </div>
            ))}
            {messages.length === 0 && <p className="text-sm text-gray-400">Säg hej!</p>}
          </div>
          <form onSubmit={sendMessage} className="mt-2 flex gap-2">
            <input
              className="input"
              placeholder="Skriv ett meddelande…"
              aria-label="Skriv ett meddelande"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button className="btn-primary" type="submit">
              Skicka
            </button>
          </form>
        </div>
      )}

      {["CHAT_UNLOCKED", "DEAL_IN_PROGRESS", "WAITING_FOR_COMPLETION"].includes(transaction.state) && (
        <button className="btn-secondary w-fit" onClick={markComplete} disabled={Boolean(iConfirmed)}>
          {iConfirmed ? "Väntar på den andra parten…" : "Markera affären som klar"}
        </button>
      )}

      {transaction.state === "COMPLETED" && !reviewSent && (
        <form onSubmit={sendReview} className="card flex flex-col gap-2">
          <p className="text-sm font-semibold text-kungsbla-700">Betygsätt affären</p>
          <select
            className="input"
            aria-label="Betyg, 1 till 5 stjärnor"
            value={reviewRating}
            onChange={(e) => setReviewRating(Number(e.target.value))}
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} ★
              </option>
            ))}
          </select>
          <textarea
            className="input"
            placeholder="Kommentar (valfritt)"
            aria-label="Kommentar, valfritt"
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
          />
          <button className="btn-primary w-fit" type="submit">
            Skicka recension
          </button>
        </form>
      )}
      {reviewSent && <p className="text-sm text-kungsbla-600">Tack för din recension!</p>}
    </div>
  );
}

export default function TransactionThreadPage() {
  return (
    <Suspense fallback={<p className="text-sm text-gray-400">Laddar…</p>}>
      <TransactionThreadContent />
    </Suspense>
  );
}
