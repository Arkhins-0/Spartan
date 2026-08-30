"use client";

import { useTransition, useState } from "react";
import { Alert, Button, Card, CardActions, CardContent, CardHeader, Stack, Typography } from "@mui/material";
import { respondToVenueRelationship } from "@/lib/actions/venue-relationships";

interface VenueRelationshipInvitationProps {
  relationshipId: string;
  venueName: string;
  relationshipType: string;
}

export function VenueRelationshipInvitation({ relationshipId, venueName, relationshipType }: VenueRelationshipInvitationProps) {
  const [message, setMessage] = useState<{ severity: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const respond = (response: "ACCEPT" | "REJECT") => {
    startTransition(async () => {
      const result = await respondToVenueRelationship({ relationshipId, response });
      if (result.success) {
        setMessage({
          severity: "success",
          text: response === "ACCEPT" ? "Venue relationship accepted." : "Venue relationship rejected.",
        });
        return;
      }

      setMessage({ severity: "error", text: result.error });
    });
  };

  const settled = isPending || message?.severity === "success";

  return (
    <Card>
      <CardHeader title="Invitation" subheader={venueName} />
      <CardContent>
        <Stack spacing={2}>
          <Typography>{venueName} invited you to become a {relationshipType} circuit.</Typography>
          {message ? <Alert severity={message.severity}>{message.text}</Alert> : null}
        </Stack>
      </CardContent>
      <CardActions sx={{ justifyContent: "flex-end" }}>
        <Button variant="outlined" color="error" disabled={settled} onClick={() => respond("REJECT")}>
          Reject
        </Button>
        <Button variant="contained" disabled={settled} onClick={() => respond("ACCEPT")}>
          Accept
        </Button>
      </CardActions>
    </Card>
  );
}
