import { redirect } from "next/navigation";

/** Not in the panel yet: what does not exist is not shown, so the address leads to Inicio. */
export default function NotYetPage() {
  redirect("/dashboard");
}
