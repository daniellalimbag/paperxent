import type { PaperAlertType } from '@paperxent/shared-types';

export interface PaperAlertRow {
  id: string;
  ticker: string;
  type: PaperAlertType;
  targetPrice: string | null;
  percentThreshold: string | null;
  baselinePrice: string;
  isActive: boolean;
  triggeredAt: string | null;
  triggeredPrice: string | null;
  createdAt: string;
}

export interface PaperAlertsPayload {
  active: PaperAlertRow[];
  triggered: PaperAlertRow[];
}

export interface CreatePaperAlertInput {
  userId: string;
  ticker: string;
  type: PaperAlertType;
  targetPrice?: string;
  /** Whole-number percent from client, e.g. "5" for 5%. */
  percentThreshold?: string;
}
