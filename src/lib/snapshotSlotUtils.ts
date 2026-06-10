/**
 * Utility functions for converting between tag names and snapshot slot keys.
 * Snapshot tables use fixed columns like response_tag_1, stage_tag_2, etc.
 * But this project stores tags as JSON objects in response_tags and stage_tags columns.
 */

export interface SnapshotRow {
  date: string;
  total_leads: number;
  total_responses: number;
  response_tags: Record<string, number>;
  stage_tags: Record<string, number>;
  final_tag: string | null;
  final_tag_count: number;
  funnel_tag: string | null;
  funnel_tag_count: number;
  funnel_start_date: string | null;
  funnel_day: number | null;
  source: string;
  upline_leader_id: string | null;
}

/**
 * Parse raw snapshot row from Supabase into a typed SnapshotRow.
 * response_tags and stage_tags come as JSON objects from the DB.
 */
export function parseSnapshotRow(raw: any): SnapshotRow {
  return {
    date: raw.date,
    total_leads: raw.total_leads ?? 0,
    total_responses: raw.total_responses ?? 0,
    response_tags: typeof raw.response_tags === 'object' && raw.response_tags !== null
      ? raw.response_tags as Record<string, number>
      : {},
    stage_tags: typeof raw.stage_tags === 'object' && raw.stage_tags !== null
      ? raw.stage_tags as Record<string, number>
      : {},
    final_tag: raw.final_tag ?? null,
    final_tag_count: raw.final_tag_count ?? 0,
    funnel_tag: raw.funnel_tag ?? null,
    funnel_tag_count: raw.funnel_tag_count ?? 0,
    funnel_start_date: raw.funnel_start_date ?? null,
    funnel_day: raw.funnel_day ?? null,
    source: raw.source ?? 'MANUAL',
    upline_leader_id: raw.upline_leader_id ?? null,
  };
}

/**
 * Build the response_tags JSON object for saving to the edge function.
 * Maps tag names to their counts.
 */
export function buildResponseTagsPayload(
  tagNames: string[],
  values: Record<string, number>
): Record<string, number> {
  const payload: Record<string, number> = {};
  tagNames.forEach((name) => {
    if (values[name] !== undefined) {
      payload[name] = values[name];
    }
  });
  return payload;
}

/**
 * Build the stage_tags JSON object for saving.
 */
export function buildStageTagsPayload(
  tagNames: string[],
  values: Record<string, number>
): Record<string, number> {
  const payload: Record<string, number> = {};
  tagNames.forEach((name) => {
    if (values[name] !== undefined) {
      payload[name] = values[name];
    }
  });
  return payload;
}

/**
 * Get the value of a specific tag from a snapshot row's response_tags or stage_tags.
 */
export function getTagValue(
  tags: Record<string, number>,
  tagName: string
): number {
  return tags[tagName] ?? 0;
}

/**
 * Format a number for display: 0 becomes '--', others show as-is.
 */
export function formatTrackingValue(value: number): string {
  return value === 0 ? '--' : String(value);
}

/**
 * Convert human-readable tag names + values to position-based slot keys.
 * e.g. tagNames = ["Interested", "Follow Up"], values = { "Interested": 3, "Follow Up": 2 }
 * => { "response_tag_1": 3, "response_tag_2": 2 }
 */
export function tagNamesToSlotKeys(
  tagNames: string[],
  values: Record<string, number>,
  prefix: 'response_tag' | 'stage_tag'
): Record<string, number> {
  const result: Record<string, number> = {};
  tagNames.forEach((name, index) => {
    const slotKey = `${prefix}_${index + 1}`;
    if (values[name] !== undefined) {
      result[slotKey] = values[name];
    }
  });
  return result;
}

/**
 * Hybrid resolve: per position, prefer slot-key value; fall back to legacy
 * label-keyed value if slot value is missing. Never sums both.
 * e.g. tagNames=["A","B"], data={ response_tag_1: 3, "B": 2 } => { A:3, B:2 }
 */
export function slotKeysToTagNames(
  tagNames: string[],
  slotData: Record<string, number>,
  prefix: 'response_tag' | 'stage_tag'
): Record<string, number> {
  const result: Record<string, number> = {};
  tagNames.forEach((name, index) => {
    const slotKey = `${prefix}_${index + 1}`;
    const slotVal = slotData[slotKey];
    const labelVal = slotData[name];
    if (slotVal !== undefined) {
      result[name] = slotVal;
    } else if (labelVal !== undefined) {
      result[name] = labelVal;
    }
  });
  return result;
}

/**
 * Detect if tags object uses slot keys (e.g. response_tag_1) vs human-readable names.
 */
export function hasSlotKeys(tags: Record<string, number>, prefix: 'response_tag' | 'stage_tag'): boolean {
  const pattern = new RegExp(`^${prefix}_\\d+$`);
  return Object.keys(tags).some((key) => pattern.test(key));
}
