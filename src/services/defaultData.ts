import { BillingRecord, MeterRecord } from '../types';

export const DEFAULT_UNITS = [
  '101호', '102호', '103호', '104호', '105호',
  '201호', '202호', '203호', '204호', '205호'
];

export const INITIAL_USERS: Record<string, { role: 'admin' | 'resident'; password: string; unit: string | null }> = {
  admin: { role: 'admin', password: 'admin1234', unit: null },
  '101호': { role: 'resident', password: '101호', unit: '101호' },
  '102호': { role: 'resident', password: '102호', unit: '102호' },
  '103호': { role: 'resident', password: '103호', unit: '103호' },
  '104호': { role: 'resident', password: '104호', unit: '104호' },
  '105호': { role: 'resident', password: '105호', unit: '105호' },
  '201호': { role: 'resident', password: '201호', unit: '201호' },
  '202호': { role: 'resident', password: '202호', unit: '202호' },
  '203호': { role: 'resident', password: '203호', unit: '203호' },
  '204호': { role: 'resident', password: '204호', unit: '204호' },
  '205호': { role: 'resident', password: '205호', unit: '205호' },
};

// 기본 샘플 계량기 데이터 (2026-04, 2026-05, 2026-06)
export const INITIAL_METER_DATA: MeterRecord[] = [
  // 지지난달 (2026-04 측정값)
  { yearMonth: '2026-04', unit: '101호', value: 320.5, updatedAt: '2026-04-05 09:30:00' },
  { yearMonth: '2026-04', unit: '102호', value: 285.0, updatedAt: '2026-04-05 10:15:00' },
  { yearMonth: '2026-04', unit: '103호', value: 412.3, updatedAt: '2026-04-05 11:00:00' },
  { yearMonth: '2026-04', unit: '104호', value: 198.7, updatedAt: '2026-04-05 13:20:00' },
  { yearMonth: '2026-04', unit: '105호', value: 350.2, updatedAt: '2026-04-05 14:05:00' },
  { yearMonth: '2026-04', unit: '201호', value: 245.8, updatedAt: '2026-04-05 15:30:00' },
  { yearMonth: '2026-04', unit: '202호', value: 310.1, updatedAt: '2026-04-05 16:10:00' },
  { yearMonth: '2026-04', unit: '203호', value: 390.4, updatedAt: '2026-04-05 17:45:00' },
  { yearMonth: '2026-04', unit: '204호', value: 275.6, updatedAt: '2026-04-05 18:20:00' },
  { yearMonth: '2026-04', unit: '205호', value: 335.9, updatedAt: '2026-04-05 19:00:00' },

  // 지난달 (2026-05 측정값)
  { yearMonth: '2026-05', unit: '101호', value: 334.8, updatedAt: '2026-05-05 09:12:00' }, // 14.3톤
  { yearMonth: '2026-05', unit: '102호', value: 297.2, updatedAt: '2026-05-05 10:25:00' }, // 12.2톤
  { yearMonth: '2026-05', unit: '103호', value: 430.1, updatedAt: '2026-05-05 11:30:00' }, // 17.8톤
  { yearMonth: '2026-05', unit: '104호', value: 207.9, updatedAt: '2026-05-05 13:10:00' }, // 9.2톤
  { yearMonth: '2026-05', unit: '105호', value: 365.7, updatedAt: '2026-05-05 14:40:00' }, // 15.5톤
  { yearMonth: '2026-05', unit: '201호', value: 258.4, updatedAt: '2026-05-05 15:55:00' }, // 12.6톤
  { yearMonth: '2026-05', unit: '202호', value: 324.9, updatedAt: '2026-05-05 16:30:00' }, // 14.8톤
  { yearMonth: '2026-05', unit: '203호', value: 409.2, updatedAt: '2026-05-05 17:15:00' }, // 18.8톤
  { yearMonth: '2026-05', unit: '204호', value: 288.7, updatedAt: '2026-05-05 18:05:00' }, // 13.1톤
  { yearMonth: '2026-05', unit: '205호', value: 349.6, updatedAt: '2026-05-05 19:22:00' }, // 13.7톤

  // 이번달 (2026-06 일부 입력 예시)
  { yearMonth: '2026-06', unit: '101호', value: 349.5, updatedAt: '2026-06-05 10:00:00' },
  { yearMonth: '2026-06', unit: '102호', value: 310.8, updatedAt: '2026-06-05 11:00:00' }
];

// 기본 고지서 히스토리 (2026-06월 청구 고지서 = 4/5~5/5 사용량 기준)
export const INITIAL_BILLING_DATA: BillingRecord[] = [
  {
    yearMonth: '2026-06',
    totalBill: 248500,       // 전체 수도요금 고지서 금액
    totalUsage: 142,         // 고지서 전체 사용량 (톤)
    commonElectric: 85000,   // 공용전기료 총액 (세대당 8,500원)
    managerName: '203호 김총무',
    accountInfo: '카카오뱅크 3333-12-8976543 (예금주: 김민수)'
  },
  {
    yearMonth: '2026-05',
    totalBill: 236000,
    totalUsage: 135,
    commonElectric: 78000,
    managerName: '203호 김총무',
    accountInfo: '카카오뱅크 3333-12-8976543 (예금주: 김민수)'
  }
];
