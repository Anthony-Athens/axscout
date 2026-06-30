import { permanentRedirect } from "next/navigation";

export default function BettingRedirectPage() {
  permanentRedirect("/predictions");
}
