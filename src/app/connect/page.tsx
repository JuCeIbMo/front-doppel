import type { Metadata } from "next";
import { AuthFlow } from "@/components/connect/AuthFlow";

export const metadata: Metadata = { title: "Contrata a tu empleado — Doppel" };

export default function ConnectPage() {
  return <AuthFlow />;
}
