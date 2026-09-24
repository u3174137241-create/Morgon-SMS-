import { getCurrentUser, publicProfile } from "@/lib/auth";
import { jsonOk } from "@/lib/http";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonOk({ user: null });
  return jsonOk({ user: { ...publicProfile(user), email: user.email, isAdmin: user.isAdmin } });
}
