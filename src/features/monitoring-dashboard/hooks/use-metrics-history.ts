export interface MetricsPoint {
  time: string;
  cpu: number;
  memUsed: number;
  memTotal: number;
  memPercent: number;
  diskPercent: number;
  netRx: number;
  netTx: number;
  perCore?: number[];
  swapPercent?: number;
  contextSwitches?: number;
  diskReadRate?: number;
  diskWriteRate?: number;
  tcpEstablished?: number;
  tcpTimeWait?: number;
  tcpListen?: number;
  gpuPercent?: number;
  gpuVramPercent?: number;
}
