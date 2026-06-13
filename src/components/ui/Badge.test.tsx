import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Badge } from "@/components/ui/Badge";

describe("Badge", () => {
  it("renders children", () => {
    render(<Badge>Activo</Badge>);
    expect(screen.getByText("Activo")).toBeInTheDocument();
  });

  it("renders as inline element", () => {
    const { container } = render(<Badge>X</Badge>);
    expect(container.firstChild?.nodeName).toBe("SPAN");
  });

  it("renders all four variants without crashing", () => {
    const variants = ["success", "warning", "danger", "neutral"] as const;
    for (const variant of variants) {
      const { unmount } = render(<Badge variant={variant}>{variant}</Badge>);
      expect(screen.getByText(variant)).toBeInTheDocument();
      unmount();
    }
  });
});
