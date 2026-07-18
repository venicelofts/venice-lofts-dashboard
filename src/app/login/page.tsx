import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4 text-sm text-[var(--text-muted)]">
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
