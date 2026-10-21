import Image from "next/image";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden bg-indigo-950 lg:block">
        <Image
          src="/login-art.svg"
          alt=""
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 p-12 text-white">
          <p className="text-3xl font-semibold">Orders Console</p>
          <p className="mt-2 text-indigo-200">Find any order in seconds.</p>
        </div>
      </aside>
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="mt-1 mb-8 text-sm text-slate-500">
            Use your Orders Console account.
          </p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
