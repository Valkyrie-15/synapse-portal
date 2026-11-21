// Helpers for the live portal figures. They are filled in by the scheduled scraper
// (scripts/scrapers/run.ts) and read by the dashboard; nothing here starts a scrape.

/** Key of the one stored record for an insurer + TPA combination at a hospital. */
export function comboKey(t: { hospitalId: string; insurerId: string; channelId: string }) {
  return { hospitalId_insurerId_tpaId: { hospitalId: t.hospitalId, insurerId: t.insurerId, tpaId: t.channelId } };
}

type StatsRow = {
  scope: string;
  pending: number | null; approved: number | null; queries: number | null; rejected: number | null;
  dischargePending: number | null; enhancementPending: number | null;
  status: string; message: string | null; scrapedAt: Date | null; checkedAt: Date;
};

/** The fields of a stats row that are safe to send to the browser. */
export function toPublicStats(row: StatsRow | null) {
  return (
    row && {
      scope: row.scope,
      pending: row.pending,
      approved: row.approved,
      queries: row.queries,
      rejected: row.rejected,
      dischargePending: row.dischargePending,
      enhancementPending: row.enhancementPending,
      status: row.status,
      message: row.message,
      scrapedAt: row.scrapedAt,
      checkedAt: row.checkedAt,
    }
  );
}
