import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const useHasSessionMock = vi.fn();
vi.mock("@/hooks/useHasSession", () => ({
  useHasSession: () => useHasSessionMock(),
}));

import { Navbar } from "./Navbar";

describe("Navbar auth entry", () => {
  beforeEach(() => useHasSessionMock.mockReset());

  it("offers 'Iniciar sesión' when logged out", () => {
    useHasSessionMock.mockReturnValue(false);
    render(<Navbar />);

    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toHaveAttribute("href", "/connect");
    expect(screen.queryByRole("link", { name: /Ir a mi panel/ })).toBeNull();
  });

  it("offers 'Ir a mi panel' when a session exists", () => {
    useHasSessionMock.mockReturnValue(true);
    render(<Navbar />);

    expect(screen.getByRole("link", { name: /Ir a mi panel/ })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.queryByRole("link", { name: "Iniciar sesión" })).toBeNull();
  });

  it("defaults to the logged-out view while session state is unknown", () => {
    useHasSessionMock.mockReturnValue(null);
    render(<Navbar />);

    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Ir a mi panel/ })).toBeNull();
  });
});
