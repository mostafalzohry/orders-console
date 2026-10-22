"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { INPUT_CLASS, LABEL_CLASS } from "@/constants/styles";
import { loginErrorMessage } from "@/lib/auth/login-error-message";
import { loginSchema, type LoginValues } from "@/lib/auth/login-schema";
import { useLogin } from "@/lib/auth/use-login";

export function LoginForm() {
  const router = useRouter();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = (values: LoginValues) =>
    login.mutate(values, { onSuccess: () => router.replace(ROUTES.orders) });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <div>
        <label htmlFor="email" className={LABEL_CLASS}>
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          className={`${INPUT_CLASS} mt-1`}
          {...register("email")}
        />
        {errors.email && (
          <p role="alert" className="mt-1 text-sm text-red-600">
            {errors.email.message}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="password" className={LABEL_CLASS}>
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          className={`${INPUT_CLASS} mt-1`}
          {...register("password")}
        />
        {errors.password && (
          <p role="alert" className="mt-1 text-sm text-red-600">
            {errors.password.message}
          </p>
        )}
      </div>
      {login.isError && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {loginErrorMessage(login.error)}
        </p>
      )}
      <Button type="submit" disabled={login.isPending} className="w-full">
        {login.isPending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
