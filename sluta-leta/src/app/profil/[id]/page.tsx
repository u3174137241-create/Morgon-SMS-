"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";

type Profile = {
  id: string;
  name: string;
  avatarUrl: string | null;
  verified: boolean;
  ratingAvg: number | null;
  ratingCount: number;
  dealsCompleted: number;
  createdAt: string;
};

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  author: { name: string; avatarUrl: string | null };
};

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, refresh } = useCurrentUser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    fetch(`/api/users/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setProfile(d.profile);
        setReviews(d.reviews ?? []);
      });
  }, [id]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    await refresh();
    router.push("/");
  }

  if (!profile) return <p className="text-sm text-gray-400">Laddar…</p>;
  const isSelf = user?.id === profile.id;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div className="card flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-kungsbla-100 text-xl font-bold text-kungsbla-600">
          {profile.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2 text-lg font-bold text-kungsbla-700">
            {profile.name}
            {profile.verified && <span className="badge-guld">✓ Verifierad</span>}
          </div>
          <p className="text-sm text-gray-500">
            {profile.ratingCount > 0 ? `${profile.ratingAvg} ★ (${profile.ratingCount} recensioner)` : "Inga recensioner än"} ·{" "}
            {profile.dealsCompleted} genomförda affärer
          </p>
        </div>
      </div>

      {isSelf && (
        <div className="flex gap-3">
          <a href="/plus" className="btn-primary">
            Sluta Leta Plus
          </a>
          <button className="btn-secondary" onClick={logout}>
            Logga ut
          </button>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-lg font-bold text-kungsbla-700">Recensioner</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-gray-400">Inga recensioner än.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {reviews.map((r) => (
              <div key={r.id} className="card">
                <p className="text-sm font-semibold text-kungsbla-700">
                  {r.author.name} · {r.rating} ★
                </p>
                {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
