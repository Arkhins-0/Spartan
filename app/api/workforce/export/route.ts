import { prisma } from "@/lib/db/prisma";
import { getCurrentUserId } from "@/lib/auth/session";
import { Capability, hasCapability } from "@/lib/auth/capabilities";
import { toCsvContent } from "@/lib/utils/csv";

/**
 * The volunteer roster for an association, or for one race weekend, as CSV.
 *
 * A GET route rather than a Server Action: this is a file download, the
 * documented exception to the Server-Actions-first rule.
 *
 * Unlike the entry list, this one is organizer-only. It carries names, contact
 * addresses, and credential references — everything a coordinator needs to run
 * the day and nothing any other volunteer has a reason to read.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get("leagueId");
    const roundId = searchParams.get("roundId");
    if (!leagueId) {
      return new Response("Bad Request", { status: 400 });
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Association-wide authority: a team- or round-scoped coordinator can staff
    // their own shifts on the board, but a whole-association roster export is a
    // wider read than their grant covers.
    const canExport = await hasCapability({
      userId,
      leagueId,
      capability: Capability.MANAGE_VOLUNTEERS,
      ...(roundId ? { roundId } : {}),
    });
    if (!canExport) {
      return new Response("Forbidden", { status: 403 });
    }

    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { name: true },
    });
    if (!league) {
      return new Response("Not Found", { status: 404 });
    }

    const assignments = await prisma.volunteerAssignment.findMany({
      where: {
        need: { leagueId, ...(roundId ? { roundId } : {}) },
        status: { in: ["INVITED", "ACCEPTED", "WAITLISTED", "COMPLETED", "MISSED"] },
      },
      select: {
        status: true,
        checkedInAt: true,
        credentialWaivedAt: true,
        invitedEmail: true,
        user: { select: { name: true, email: true } },
        need: {
          select: {
            roleLabel: true,
            postLabel: true,
            startAt: true,
            endAt: true,
            timezone: true,
            round: { select: { roundNumber: true, name: true } },
            session: { select: { name: true } },
          },
        },
      },
      orderBy: [{ need: { startAt: "asc" } }, { createdAt: "asc" }],
    });

    function localTime(value: Date, timezone: string): string {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        dateStyle: "short",
        timeStyle: "short",
      }).format(value);
    }

    const csvContent = toCsvContent(
      [
        "Post",
        "Role",
        "Round",
        "Session",
        "Starts (venue local)",
        "Ends (venue local)",
        "Timezone",
        "Name",
        "Email",
        "Status",
        "Signed on",
        "Credential waived",
      ],
      assignments.map((assignment) => [
        assignment.need.postLabel,
        assignment.need.roleLabel,
        assignment.need.round
          ? `Round ${assignment.need.round.roundNumber} — ${assignment.need.round.name}`
          : null,
        assignment.need.session?.name ?? null,
        localTime(assignment.need.startAt, assignment.need.timezone),
        localTime(assignment.need.endAt, assignment.need.timezone),
        assignment.need.timezone,
        assignment.user?.name ?? "",
        assignment.user?.email ?? assignment.invitedEmail ?? "",
        assignment.status,
        assignment.checkedInAt
          ? localTime(assignment.checkedInAt, assignment.need.timezone)
          : "",
        assignment.credentialWaivedAt ? "yes" : "",
      ]),
    );

    const slug = league.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const date = new Date().toISOString().slice(0, 10);
    const filename = `volunteers-${slug}-${date}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error exporting volunteer roster:", error);
    return new Response("Failed to export the volunteer roster", { status: 500 });
  }
}
