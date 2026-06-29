import PageHeader from "@/components/layout/PageHeader";
import SectionCard from "@/components/ui/SectionCard";
import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="max-w-2xl">
      <PageHeader
        label="Login"
        title="Welcome back"
        description="Log in to manage your teams and account."
      />

      <SectionCard>
        {params.message && (
          <p className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {params.message}
          </p>
        )}
        {params.error && (
          <p role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {params.error}
          </p>
        )}
        <LoginForm />
      </SectionCard>
    </div>
  );
}
