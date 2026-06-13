import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Input } from "@/components/ui/Input";

describe("Input", () => {
  it("renders without label", () => {
    render(<Input placeholder="Buscar" />);
    expect(screen.getByPlaceholderText("Buscar")).toBeInTheDocument();
  });

  it("renders label and associates it with input", () => {
    render(<Input label="Nombre" />);
    const label = screen.getByText("Nombre");
    expect(label.tagName).toBe("LABEL");
    const input = screen.getByRole("textbox");
    expect(label).toHaveAttribute("for", input.id);
  });

  it("renders error message when provided", () => {
    render(<Input label="Email" error="Campo requerido" />);
    expect(screen.getByText("Campo requerido")).toBeInTheDocument();
  });

  it("passes through native input props", () => {
    render(<Input type="search" defaultValue="test" />);
    expect(screen.getByDisplayValue("test")).toBeInTheDocument();
  });
});
