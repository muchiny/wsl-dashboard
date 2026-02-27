export interface MetricsPoint {
  time: string;
  cpu: number;
  memUsed: number;
  memTotal: number;
  memPercent: number;
  diskPercent: number;
  netRx: number;
  netTx: number;
}
