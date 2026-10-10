export type UserRole = 'admin' | 'resident';

export interface User {
  id: string;
  role: UserRole;
  unit: string | null;
}

export interface MeterRecord {
  yearMonth: string; // YYYY-MM
  unit: string;      // e.g. '101호'
  value: number;
  updatedAt: string;
}

export interface BillingRecord {
  yearMonth: string;       // YYYY-MM
  totalBill: number;       // 고지서 전체 수도요금 (원)
  totalUsage: number;      // 고지서 전체 사용량 (톤)
  commonElectric: number;  // 고지서 전체 공용전기료 (원)
  managerName: string;     // 3개월 순환 총무 이름
  accountInfo: string;     // 입금 계좌정보 (예: 카카오뱅크 3333-xx-xxxx 홍길동)
}

export interface SettlementItem {
  unit: string;
  prev2Month: string;
  prev2Value: number | null;
  prevMonth: string;
  prevValue: number | null;
  currentMonth: string;
  currentValue: number | null;
  usage: number;              // (prevValue - prev2Value)
  unitPrice: number;          // 1톤당 단가 = (totalBill - 2190) / totalUsage
  waterFee: number;           // usage * unitPrice
  fixedFee: number;           // 219원 (2,190원 / 10)
  commonElectricFee: number;  // commonElectric / 10
  errorDiffFee?: number;      // 오차납부금 (고지서 톤수 오차분 안분 배분액)
  finalAmount: number;        // waterFee + fixedFee + commonElectricFee + errorDiffFee
  isComplete: boolean;
}

export interface SettlementSummary {
  totalUnits: number;
  completedUnits: number;
  sumUsage: number;
  sumWaterFee: number;
  sumErrorDiffFee?: number;
  sumFinalTotal: number;
}

export interface SettlementData {
  success: boolean;
  yearMonth: string;
  period: {
    billingMonth: string;
    fromMonth: string;
    toMonth: string;
    description: string;
  };
  billing: BillingRecord;
  unitPrice: number;
  fixedFeeTotal: number;
  fixedFeePerUnit: number;
  commonElectricPerUnit: number;
  errorDiffUsage?: number;
  errorDiffFeeTotal?: number;
  settlements: SettlementItem[];
  singleResult?: SettlementItem | null;
  summary: SettlementSummary;
  message?: string;
}

export interface AppConfig {
  gasWebAppUrl: string;
  autoSync: boolean;
}
