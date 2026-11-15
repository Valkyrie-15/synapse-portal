import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { getAuthContext, isSuperAdmin } from "@/lib/auth";

// Private documents live outside /public, under storage/documents/<HOSPITAL_CODE>/<INSURER_CODE>/,
// and are only served to signed-in users of that hospital (or a super admin)
const STORAGE_DIR = path.join(process.cwd(), "storage", "documents");

const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
};

export async function GET(_request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { path: segments } = await params;
  // No relative or embedded path parts, so a request can't climb into another hospital's folder
  if (segments.some((seg) => seg === "." || seg === ".." || /[\\/\0]/.test(seg))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Non-admins are confined to their own hospital's folder; other hospitals' files are "not found"
  let baseDir = STORAGE_DIR;
  if (!isSuperAdmin(ctx.role)) {
    const hospital = ctx.hospitalId
      ? await db.hospital.findUnique({ where: { id: ctx.hospitalId }, select: { code: true } })
      : null;
    if (!hospital || segments[0] !== hospital.code) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    baseDir = path.join(STORAGE_DIR, hospital.code);
  }

  const filePath = path.resolve(STORAGE_DIR, ...segments);
  if (!filePath.startsWith(baseDir + path.sep)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let data: Buffer;
  try {
    data = await readFile(filePath);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ext = path.extname(filePath).toLowerCase();
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${path.basename(filePath)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
