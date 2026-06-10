import type { AnalyticsRange } from '@paperxent/shared-types';

export interface ListAnalyticsParams {
  requesterUserId: string;
  pathUserId: string;
  range: AnalyticsRange;
}
