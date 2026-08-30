"use client";

import { useState, type ReactNode } from "react";
import { Box, Tab, Tabs } from "@mui/material";

export type RoundTab = {
  value: string;
  label: string;
  content: ReactNode;
};

/**
 * The race weekend, in the order an organizer works through it: what runs when,
 * who is entered, who is working, and then what happened.
 *
 * Server-rendered content is handed in as `content`, so each panel stays a
 * Server Component and only the tab selection is client state. Every panel is
 * mounted and hidden rather than unmounted, so switching back does not refetch
 * or lose a half-filled form.
 */
export default function RoundTabs({
  tabs,
  initial,
}: {
  tabs: RoundTab[];
  initial?: string;
}) {
  const [tab, setTab] = useState(initial ?? tabs[0]?.value ?? "");

  return (
    <Box>
      <Tabs
        value={tab}
        onChange={(_, next: string) => setTab(next)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}
      >
        {tabs.map((entry) => (
          <Tab
            key={entry.value}
            value={entry.value}
            label={entry.label}
            id={`round-tab-${entry.value}`}
            aria-controls={`round-panel-${entry.value}`}
            sx={{ minHeight: 48 }}
          />
        ))}
      </Tabs>

      {tabs.map((entry) => (
        <Box
          key={entry.value}
          role="tabpanel"
          id={`round-panel-${entry.value}`}
          aria-labelledby={`round-tab-${entry.value}`}
          hidden={entry.value !== tab}
        >
          {entry.content}
        </Box>
      ))}
    </Box>
  );
}
