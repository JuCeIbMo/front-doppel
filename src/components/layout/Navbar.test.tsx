import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const useHasSessionMock = vi.fn();
vi.mock("@/hooks/useHasSession", () => ({
  useHasSession: () => useHasSessionMock(),
}));

import { Navbar } from "./Navbar";

describe("Navbar auth entry", () => {
  beforeEach(() => useHasSessionMock.mockReset());

  it("shows 'Iniciar sesión' and 'Conectar WhatsApp' when logged out", () => {
    useHasSessionMock.mockReturnValue(false);
    render(<Navbar />);

    const login = screen.getByRole("link", { name: "Iniciar sesión" });
    expect(login).toHaveAttribute("href", "/connect");
    expect(screen.getByRole("link", { name: "Conectar WhatsApp" })).toHaveAttribute(
      "href",
      "/connect",
    );
    expect(screen.queryByRole("link", { name: /Ir al dashboard/ })).toBeNull();
  });

  it("collapses to a single 'Ir al dashboard' when a session exists", () => {
    useHasSessionMock.mockReturnValue(true);
    render(<Navbar />);

    expect(screen.getByRole("link", { name: /Ir al dashboard/ })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.queryByRole("link", { name: "Iniciar sesión" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Conectar WhatsApp" })).toBeNull();
  });

  it("defaults to the logged-out view while session state is unknown", () => {
    useHasSessionMock.mockReturnValue(null);
    render(<Navbar />);

    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Conectar WhatsApp" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Ir al dashboard/ })).toBeNull();
  });
});
