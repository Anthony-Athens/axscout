import PageHeader from "@/components/layout/PageHeader";
import SectionCard from "@/components/ui/SectionCard";
import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    confirmed?: string;
    error?: string;
    message?: string;
  }>;
}) {
  const params = await searchParams;
  const callbackFailed = params.error === "auth_callback_failed";
  const errorMessage = callbackFailed
    ? "We couldn\u2019t complete email confirmation. Please try logging in or request a new confirmation email."
    : params.error;

  return (
    <div className="max-w-2xl">
      <PageHeader
        label="Login"
        title="Welcome back"
        description="Log in to manage your teams and account."
      />

      <SectionCard>
        {params.confirmed === "true" && (
          <p
            role="status"
            className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          >
            Email confirmed. You can now log in.
          </p>
        )}
        {params.message && (
          <p
            role="status"
            className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          >
            {params.message}
          </p>
        )}
        {errorMessage && (
          <p role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        )}
        <LoginForm />
      </SectionCard>
    </div>
  );
}
