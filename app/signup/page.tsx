import PageHeader from "@/components/layout/PageHeader";
import SectionCard from "@/components/ui/SectionCard";
import SignupForm from "./SignupForm";

export default function SignupPage() {
  return (
    <div className="max-w-2xl">
      <PageHeader
        label="Sign Up"
        title="Create your AX Scout account"
        description="Save favorite teams and personalize your dashboard."
      />

      <SectionCard>
        <SignupForm />
      </SectionCard>
    </div>
  );
}
