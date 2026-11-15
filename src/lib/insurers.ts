import { db } from "@/lib/db";

/** Keeps only ids of TPAs that belong to the given hospital, so mappings never cross hospitals. */
export async function sameHospitalTpaIds(hospitalId: string, ids: unknown): Promise<string[]> {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const tpas = await db.insurer.findMany({
    where: { id: { in: ids.filter((i): i is string => typeof i === "string") }, hospitalId, kind: "TPA" },
    select: { id: true },
  });
  return tpas.map((t) => t.id);
}
