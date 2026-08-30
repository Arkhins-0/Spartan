import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PublicGearWishlist } from "@/components/features/gear/PublicGearWishlist";

describe("PublicGearWishlist", () => {
  it("renders only curated public item snapshots", () => {
    render(
      <PublicGearWishlist
        data={{
          associationName: "North Stars",
          title: "Gear wish list",
          description: "Help our skaters.",
          items: [{
            id: "item-1",
            name: "Youth helmet",
            category: "Protection",
            size: "Medium",
            description: "CSA approved",
            targetQty: 10,
            pledgedQty: 4,
            receivedQty: 2,
          }],
        }}
      />,
    );

    // The association name is the header subtitle ("North Stars · 1 item").
    expect(screen.getByText(/North Stars/)).toBeInTheDocument();
    expect(screen.getByText("Youth helmet")).toBeInTheDocument();
    // Quantities are table columns now: target / promised / received.
    const row = screen.getByRole("row", { name: /Youth helmet/ });
    expect(row).toHaveTextContent(/Youth helmet.*Protection - Medium.*CSA approved.*10.*4.*2/);
    expect(screen.getByRole("columnheader", { name: "Target" })).toBeInTheDocument();
    expect(screen.queryByText(/team/i)).not.toBeInTheDocument();
  });
});
