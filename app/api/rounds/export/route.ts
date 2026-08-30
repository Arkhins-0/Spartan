import { prisma } from "@/lib/db/prisma";
import { getCurrentUserId } from "@/lib/auth/session";
import { toCsvContent } from "@/lib/utils/csv";

/**
 * The entry list for one round, as CSV.
 *
 * A GET route rather than a Server Action: this is a file download, which is
 * the documented exception to the Server-Actions-first rule (the roster export
 * is the same shape).
 *
 * Association membership is enough to read it. The entry list is already
 * visible to every member on the round page, and this exposes nothing more —
 * driver names and car numbers, never contact details or roster-private data.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roundId = searchParams.get("roundId");
    if (!roundId) {
      return new Response("Bad Request", { status: 400 });
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const round = await prisma.raceRound.findUnique({
      where: { id: roundId },
      select: { id: true, name: true, roundNumber: true, leagueId: true },
    });
    if (!round) {
      return new Response("Not Found", { status: 404 });
    }

    const membership = await prisma.leagueUser.count({
      where: { userId, leagueId: round.leagueId },
    });
    if (membership === 0) {
      return new Response("Forbidden", { status: 403 });
    }

    const entries = await prisma.raceEntry.findMany({
      where: { roundId: round.id },
      select: {
        carNumber: true,
        className: true,
        status: true,
        team: { select: { name: true } },
        player: { select: { name: true } },
      },
      orderBy: [{ className: "asc" }, { carNumber: "asc" }, { id: "asc" }],
    });

    const csvContent = toCsvContent(
      ["Car number", "Driver", "Team", "Class", "Status"],
      entries.map((entry) => [
        entry.carNumber,
        entry.player?.name ?? "Team entry",
        entry.team.name,
        entry.className,
        entry.status,
      ]),
    );

    const slug = round.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const filename = `entries-round-${round.roundNumber}-${slug}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error exporting race entries:", error);
    return new Response("Failed to export the entry list", { status: 500 });
  }
}
