import { RequireAuth } from "@/lib/auth/guards";
import { UserNavbar } from "@/components/layout/user-navbar";

export default function AuthedLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <UserNavbar>{children}</UserNavbar>
    </RequireAuth>
  );
}
