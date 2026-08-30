"use client";

import { useState } from "react";
import { Button, Card, CardContent, CardHeader, Collapse } from "@mui/material";
import { Add as AddIcon, ExpandLess as CollapseIcon } from "@mui/icons-material";
import CreateTeamForm from "@/components/features/team/CreateTeamForm";

type CreateTeamDisclosureProps = {
  label: string;
};

/**
 * Collapses CreateTeamForm behind a toggle in a card header so the
 * dashboard doesn't render a permanently expanded form.
 */
export default function CreateTeamDisclosure({ label }: CreateTeamDisclosureProps) {
  const [open, setOpen] = useState(false);

  return (
    <Card component="section">
      <CardHeader
        title={label}
        subheader="Set up a standalone team you administer."
        action={
          <Button
            variant={open ? "outlined" : "contained"}
            size="small"
            startIcon={open ? <CollapseIcon /> : <AddIcon />}
            onClick={() => setOpen((prev) => !prev)}
            aria-expanded={open}
            aria-controls="create-team-disclosure"
          >
            {open ? "Close" : label}
          </Button>
        }
      />
      <Collapse in={open} id="create-team-disclosure">
        <CardContent>
          <CreateTeamForm title={null} />
        </CardContent>
      </Collapse>
    </Card>
  );
}
