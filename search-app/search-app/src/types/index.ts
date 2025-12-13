export interface SubscriberStats {
  timestamp: string;
  subscriber: string;
  second_party: string;
  bytes: number;
  last_seen: string;
}

export interface GlobalStats {
  timestamp: string;
  second_party: string;
  packets: number;
  bytes: number;
  last_seen: string;
}

export interface TrafficAnomaly {
  timestamp: string;
  detection_time: string;
  subscriber: string;
  second_party: string;
  anomaly_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  anomaly_score: number;
  current_value: number;
  baseline_value: number;
  description: string;
}

export interface SubscriberSummary {
  subscriber: string;
  total_bytes: number;
  unique_connections: number;
}

export interface TopDestination {
  second_party: string;
  total_bytes: number;
  unique_subscribers: number;
  last_seen: string;
}

export interface AnomalySummary {
  severity: string;
  anomaly_type: string;
  count: number;
}

export interface SearchParams {
  subscriber?: string;
  severity?: string;
  hours?: number;
  limit?: number;
}

export interface DashboardData {
  subscribers: SubscriberSummary[];
  topDestinations: TopDestination[];
  anomalies: AnomalySummary[];
}
