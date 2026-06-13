import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatCard } from "@/components/ui/StatCard";

describe("StatCard", () => {
  it("renders label and value", () => {
    render(<StatCard label="Ventas" value="$1.200" />);
    expect(screen.getByText("Ventas")).toBeInTheDocument();
    expect(screen.getByText("$1.200")).toBeInTheDocument();
  });

  it("renders delta when provided", () => {
    render(<StatCard label="Margen" value="$400" delta="+12%" deltaPositive />);
    expect(screen.getByText("+12%")).toBeInTheDocument();
  });

  it("does not render delta element when omitted", () => {
    const { queryByText } = render(<StatCard label="X" value="0" />);
    expect(queryByText("%")).not.toBeInTheDocument();
  });
});
