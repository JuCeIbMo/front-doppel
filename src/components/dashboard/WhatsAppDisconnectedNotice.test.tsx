import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/components/connect/EmbeddedSignup", () => ({
  EmbeddedSignup: () => <button type="button">Conectar con Facebook</button>,
}));

import { WhatsAppDisconnectedNotice } from "./WhatsAppDisconnectedNotice";

describe("WhatsAppDisconnectedNotice", () => {
  it("signals that WhatsApp is not connected", () => {
    render(<WhatsAppDisconnectedNotice />);
    expect(screen.getByText("WhatsApp no conectado")).toBeInTheDocument();
    expect(
      screen.getByText(/el bot no puede responder/i),
    ).toBeInTheDocument();
  });

  it("offers inline reconnection via the Meta signup flow", () => {
    render(<WhatsAppDisconnectedNotice />);
    expect(
      screen.getByRole("button", { name: "Conectar con Facebook" }),
    ).toBeInTheDocument();
  });
});
