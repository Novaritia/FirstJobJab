import { redirect } from "next/navigation";

// Security now lives in the ความปลอดภัย section of /settings
export default function SecurityRedirect() {
  redirect("/settings");
}
