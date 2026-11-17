"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { TRANSACTION_STATE_LABELS } from "@/lib/transactionLabels";
import { SkeletonCard } from "@/app/components/Skeleton";

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
  offer: { message: string; price: number; search: { id: string; title: string } | null };
};

function formatMessageTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
}

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
  const [sendingImage, setSendingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function sendImage(file: File | undefined) {
    if (!file) return;
    setSendingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/uploads", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        setError(uploadData.error ?? "Kunde inte ladda upp bilden.");
        return;
      }
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId, type: "IMAGE", mediaUrl: uploadData.url }),
      });
      if (res.ok) loadMessages();
    } finally {
      setSendingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
  if (!transaction || !user) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4">
        <SkeletonCard />
        <div className="card h-96 animate-pulse bg-gray-50" />
      </div>
    );
  }

  const isSeller = user.id === transaction.sellerId;
  const isBuyer = user.id === transaction.buyerId;
  const iConfirmed = isBuyer ? transaction.buyerConfirmedAt : transaction.sellerConfirmedAt;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <div className="card flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-kungsbla-100 text-xs font-bold text-kungsbla-600">
              {(isBuyer ? transaction.seller.name : transaction.buyer.name).charAt(0).toUpperCase()}
            </span>
            <p className="text-sm font-semibold text-kungsbla-700">
              {isBuyer ? transaction.seller.name : transaction.buyer.name}
            </p>
          </div>
          <span className="text-xs font-medium text-kungsbla-500">
            {TRANSACTION_STATE_LABELS[transaction.state] ?? transaction.state}
          </span>
        </div>
        {transaction.offer.search && (
          <Link href={`/sok/${transaction.offer.search.id}`} className="line-clamp-1 text-xs text-gray-400 hover:underline">
            Gäller: {transaction.offer.search.title}
          </Link>
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
            {messages.map((m) => {
              const mine = m.senderId === user.id;
              return (
                <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                      mine ? "bg-kungsbla-500 text-white" : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {m.type === "TEXT" && m.content}
                    {m.type === "IMAGE" && m.mediaUrl && <img src={m.mediaUrl} alt="" className="max-h-56 rounded-lg" />}
                    {m.type === "VOICE" && m.mediaUrl && <audio controls src={m.mediaUrl} className="max-w-full" />}
                  </div>
                  <span className="mt-0.5 px-1 text-[10px] text-gray-400">{formatMessageTime(m.createdAt)}</span>
                </div>
              );
            })}
            {messages.length === 0 && <p className="text-sm text-gray-400">Säg hej!</p>}
          </div>
          <form onSubmit={sendMessage} className="mt-2 flex items-center gap-2">
            <label
              className={`flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:border-kungsbla-400 hover:text-kungsbla-600 ${
                sendingImage ? "opacity-50" : ""
              }`}
              aria-label="Skicka bild"
            >
              {sendingImage ? (
                "…"
              ) : (
                <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5">
                  <rect x="3" y="5" width="18" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="8.5" cy="10" r="1.5" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4 17 5-5 3 3 4-4 4 4" />
                </svg>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={sendingImage}
                onChange={(e) => sendImage(e.target.files?.[0])}
              />
            </label>
            <input
              className="input"
              placeholder="Skriv ett meddelande…"
              aria-label="Skriv ett meddelande"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button className="btn-primary !px-4" type="submit" aria-label="Skicka meddelande">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M3.4 20.6 21 12 3.4 3.4 3 10l12 2-12 2z" />
              </svg>
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
