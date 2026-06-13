import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Table } from "@/components/ui/Table";

describe("Table", () => {
  it("renders basic table structure", () => {
    render(
      <Table>
        <Table.Head>
          <tr><Table.Th>Nombre</Table.Th></tr>
        </Table.Head>
        <Table.Body>
          <Table.Row>
            <Table.Cell>Producto A</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>
    );
    expect(screen.getByText("Nombre")).toBeInTheDocument();
    expect(screen.getByText("Producto A")).toBeInTheDocument();
  });

  it("Table.Empty renders the message in a cell", () => {
    render(
      <Table>
        <Table.Empty>Sin datos</Table.Empty>
      </Table>
    );
    expect(screen.getByText("Sin datos")).toBeInTheDocument();
  });

  it("Table.Loading renders skeleton rows", () => {
    const { container } = render(
      <Table>
        <Table.Loading rows={3} cols={2} />
      </Table>
    );
    // 3 rows × 2 cols = 6 td elements with pulse divs
    const pulseEls = container.querySelectorAll(".animate-pulse");
    expect(pulseEls).toHaveLength(6);
  });
});
