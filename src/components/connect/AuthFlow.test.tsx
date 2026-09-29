import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const router = { replace: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/supabase", () => ({
  getAccessToken: vi.fn(async () => "token"),
  getSupabase: vi.fn(),
}));
const isOnboarded = vi.fn();
const hasStarted = vi.fn();
vi.mock("@/lib/onboarding", () => ({
  isOnboarded: () => isOnboarded(),
  hasStarted: () => hasStarted(),
}));
const chooseKind = vi.fn();
vi.mock("@/lib/business", () => ({
  SWITCH_SAYS: { selling: "Vende", booking: "Agenda" },
  chooseKind: (kind: string) => chooseKind(kind),
}));
vi.mock("@/components/connect/EmbeddedSignup", () => ({
  EmbeddedSignup: () => <p>Conectar con Meta</p>,
}));

import { AuthFlow } from "./AuthFlow";

describe("AuthFlow", () => {
  beforeEach(() => {
    isOnboarded.mockReset().mockResolvedValue(false);
    hasStarted.mockReset().mockResolvedValue(false);
    chooseKind.mockReset().mockResolvedValue(undefined);
  });

  it("asks whether the Business sells or books before connecting WhatsApp", async () => {
    render(<AuthFlow />);

    fireEvent.click(await screen.findByRole("button", { name: /Que agende mis citas/ }));

    expect(await screen.findByText("Conectar con Meta")).toBeInTheDocument();
    expect(chooseKind).toHaveBeenCalledWith("booking");
  });

  it("stays on the question and says why when the choice was refused", async () => {
    chooseKind.mockRejectedValue(new Error("Tienes 1 cita por venir."));
    render(<AuthFlow />);

    fireEvent.click(await screen.findByRole("button", { name: /Que venda mis productos/ }));

    expect(await screen.findByText("Tienes 1 cita por venir.")).toBeInTheDocument();
    expect(screen.queryByText("Conectar con Meta")).not.toBeInTheDocument();
    expect(chooseKind).toHaveBeenCalledWith("selling");
  });

  it("does not ask again a Business that already started, and goes on to connecting", async () => {
    hasStarted.mockResolvedValue(true);
    render(<AuthFlow />);

    expect(await screen.findByText("Conectar con Meta")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Que agende mis citas/ })).not.toBeInTheDocument();
    expect(chooseKind).not.toHaveBeenCalled();
  });
});
