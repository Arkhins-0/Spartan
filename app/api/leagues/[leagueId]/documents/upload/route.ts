import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUserId } from "@/lib/auth/session";
import { handleUploadGrantRequest } from "@/lib/storage/upload-route";
import { DOCUMENT_CONTENT_TYPES, DOCUMENT_MAX_BYTES, documentPrefix } from "@/lib/storage/policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Upload grant for association paperwork. The browser sends bytes straight
 * to storage with a grant this route issues after authorizing the caller:
 * association admins, or a team admin filing for their own team. The
 * database row is written afterwards by `finalizeDocumentUpload`, which
 * re-validates everything server-side.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ leagueId: string }> }
): Promise<Response> {
  const { leagueId } = await params;

  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const league = await prisma.league.findFirst({
    where: { id: leagueId, isActive: true },
    select: { id: true },
  });
  if (!league) {
    return NextResponse.json({ error: "Association not found" }, { status: 404 });
  }

  // Association admins, or any team admin within the association.
  const [leagueAdmin, teamAdminCount] = await Promise.all([
    prisma.leagueUser.count({
      where: { userId, leagueId, role: "LEAGUE_ADMIN" },
    }),
    prisma.teamMember.count({
      where: { userId, role: "ADMIN", team: { leagueId } },
    }),
  ]);

  if (leagueAdmin === 0 && teamAdminCount === 0) {
    return NextResponse.json(
      { error: "Only association and team admins can file documents" },
      { status: 403 }
    );
  }

  return handleUploadGrantRequest(request, {
    prefix: documentPrefix(leagueId),
    allowedContentTypes: DOCUMENT_CONTENT_TYPES,
    maxBytesFor: () => DOCUMENT_MAX_BYTES,
  });
}
