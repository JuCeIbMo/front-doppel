import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Card, CardHeader } from "@/components/ui/Card";

describe("Card", () => {
  it("renders children", () => {
    render(<Card>Hello</Card>);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("accepts additional className", () => {
    const { container } = render(<Card className="extra">x</Card>);
    expect(container.firstChild).toHaveClass("extra");
  });
});

describe("CardHeader", () => {
  it("renders title and action", () => {
    render(<CardHeader title="My Title" action={<button>Go</button>} />);
    expect(screen.getByText("My Title")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go" })).toBeInTheDocument();
  });

  it("renders without action", () => {
    render(<CardHeader title="No action" />);
    expect(screen.getByText("No action")).toBeInTheDocument();
  });
});
