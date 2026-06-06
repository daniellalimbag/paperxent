export type ServiceStatus = 'ok' | 'degraded' | 'down';

export interface HealthResponse {
  status: ServiceStatus;
  service: string;
  timestamp: string;
}
