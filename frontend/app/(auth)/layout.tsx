import Link from "next/link";
import Image from "next/image";
import { AuthFooter } from "@/lib/i18n";
import { LanguageToggle } from "@/components/layout/language-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="absolute right-4 top-4">
        <LanguageToggle />
      </div>
      <Link href="/login" aria-label="THUIE home" className="mb-8 inline-flex items-center rounded-lg bg-brand px-4 py-2.5">
        <Image src="/logo.png" alt="清华大学 工业工程系 · Department of Industrial Engineering, Tsinghua University" width={446} height={66} className="h-11 w-auto" priority />
      </Link>
      <div className="w-full max-w-md">{children}</div>
      <AuthFooter />
    </div>
  );
}
