import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const ready = vi.fn();
vi.mock("@/lib/features", () => ({ isFeatureReady: () => ready() }));

import { ComingSoonGate } from "./ComingSoon";

describe("ComingSoonGate", () => {
  it("shows the screen when its feature is ready", () => {
    ready.mockReturnValue(true);
    render(
      <ComingSoonGate feature="finance" title="Finanzas">
        <p>pantalla real</p>
      </ComingSoonGate>,
    );
    expect(screen.getByText("pantalla real")).toBeInTheDocument();
  });

  it("says it is coming, without mounting the screen, when it is not", () => {
    ready.mockReturnValue(false);
    render(
      <ComingSoonGate feature="finance" title="Finanzas">
        <p>pantalla real</p>
      </ComingSoonGate>,
    );
    expect(screen.getByText("Próximamente")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Finanzas" })).toBeInTheDocument();
    expect(screen.queryByText("pantalla real")).not.toBeInTheDocument();
  });
});
