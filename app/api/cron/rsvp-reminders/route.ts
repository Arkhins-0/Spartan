import { NextResponse } from "next/server";
import { sendRSVPReminders, sendSignupEventReminders } from "@/lib/email/templates";

/**
 * Constant-time string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * API route for sending RSVP reminders
 * Called hourly by the GitHub Actions scheduler (.github/workflows/cron-jobs.yml)
 * with `Authorization: Bearer $CRON_SECRET`. Any external scheduler that sends
 * the same header works; see DEPLOYMENT.md "Cron Jobs".
 */
export async function GET(request: Request) {
  try {
    // Require a configured cron secret AND a matching Bearer token. Fail CLOSED:
    // if CRON_SECRET is unset, refuse rather than sending mass reminder emails,
    // matching the notification-batches and event-waitlist crons. (Previously
    // this endpoint sent emails to anyone when CRON_SECRET happened to be unset.)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("CRON_SECRET not configured");
      return NextResponse.json(
        { error: "Cron secret not configured" },
        { status: 500 }
      );
    }

    const expectedAuth = `Bearer ${cronSecret}`;
    if (!authHeader || !timingSafeEqual(authHeader, expectedAuth)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Send RSVP reminders
    await sendRSVPReminders();

    // Send 48-hour signup-event reminders (same hourly cadence)
    await sendSignupEventReminders();

    return NextResponse.json({
      success: true,
      message: "RSVP reminders sent successfully",
    });
  } catch (error) {
    console.error("Error sending RSVP reminders:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to send RSVP reminders",
      },
      { status: 500 }
    );
  }
}
