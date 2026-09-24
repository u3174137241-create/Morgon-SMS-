"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";

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
};

type Message = {
  id: string;
  senderId: string;
  type: string;
  content: string | null;
  mediaUrl: string | null;
  createdAt: string;
};

export default function TransactionThreadPage() {
  const { transactionId } = useParams<{ transactionId: string }>();
  const { user } = useCurrentUser();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [payingUp, setPayingUp] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSent, setReviewSent] = useState(false);

  const loadTransaction = useCallback(async () => {
    const res = await fetch(`/api/transactions/${transactionId}`);
    const data = await res.json();
    if (res.ok) setTransaction(data.transaction);
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

  if (!transaction || !user) return <p className="text-sm text-gray-400">Laddar…</p>;

  const isSeller = user.id === transaction.sellerId;
  const isBuyer = user.id === transaction.buyerId;
  const iConfirmed = isBuyer ? transaction.buyerConfirmedAt : transaction.sellerConfirmedAt;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <div className="card flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-kungsbla-700">
            {isBuyer ? transaction.seller.name : transaction.buyer.name}
          </p>
          <p className="text-xs text-gray-400">{transaction.amount} kr</p>
        </div>
        <span className="text-xs font-medium text-kungsbla-500">{transaction.state}</span>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {isSeller && transaction.state === "CONTACT_FEE_PENDING" && transaction.contactFee && (
        <div className="card flex flex-col gap-2 border-guld-400/40 bg-guld-400/5">
          <p className="text-sm text-gray-700">
            Köparen har godkänt ditt erbjudande! Betala kontaktavgiften ({transaction.contactFee.amount} kr) för
            att låsa upp chatten.
          </p>
          <button className="btn-primary w-fit" onClick={payContactFee} disabled={payingUp}>
            {payingUp ? "Skapar betalning…" : `Betala ${transaction.contactFee.amount} kr`}
          </button>
        </div>
      )}
      {isBuyer && transaction.state === "CONTACT_FEE_PENDING" && (
        <p className="text-sm text-gray-500">Väntar på att säljaren betalar kontaktavgiften…</p>
      )}
      {transaction.state === "PAYMENT_PROCESSING" && (
        <p className="text-sm text-gray-500">Behandlar betalning…</p>
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
            <input className="input" placeholder="Skriv ett meddelande…" value={text} onChange={(e) => setText(e.target.value)} />
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
          <select className="input" value={reviewRating} onChange={(e) => setReviewRating(Number(e.target.value))}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} ★
              </option>
            ))}
          </select>
          <textarea className="input" placeholder="Kommentar (valfritt)" value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} />
          <button className="btn-primary w-fit" type="submit">
            Skicka recension
          </button>
        </form>
      )}
      {reviewSent && <p className="text-sm text-kungsbla-600">Tack för din recension!</p>}
    </div>
  );
}
