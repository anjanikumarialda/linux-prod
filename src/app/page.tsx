import { Metadata } from "next";
import { LoginCard } from "@/components/auth/login-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { VersionFooter } from "@/components/ui/version-footer";

export const metadata: Metadata = {
  title: "Login - Teams to Interval",
  description: "Login to Teams to Interval synchronization app",
};

export default function LoginPage() {
  return (
    <>
      <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-[400px] mx-auto">
          <LoginCard />
        </div>
      </main>
      <VersionFooter />
    </>
  );
}
