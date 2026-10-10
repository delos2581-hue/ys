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

// 둔지빌 실제 계량기 수치 데이터 (2026년 4월, 5월, 6월 검침본)
export const INITIAL_METER_DATA: MeterRecord[] = [
  // 1) 4월 05일 측정값 (지지난달, 둔지빌 10세대 합계: 18,721)
  { yearMonth: '2026-04', unit: '101호', value: 3273, updatedAt: '2026-04-05 09:00:00' },
  { yearMonth: '2026-04', unit: '102호', value: 2606, updatedAt: '2026-04-05 09:00:00' },
  { yearMonth: '2026-04', unit: '103호', value: 1389, updatedAt: '2026-04-05 09:00:00' },
  { yearMonth: '2026-04', unit: '104호', value: 2708, updatedAt: '2026-04-05 09:00:00' },
  { yearMonth: '2026-04', unit: '105호', value: 456,  updatedAt: '2026-04-05 09:00:00' },
  { yearMonth: '2026-04', unit: '201호', value: 2185, updatedAt: '2026-04-05 09:00:00' },
  { yearMonth: '2026-04', unit: '202호', value: 271,  updatedAt: '2026-04-05 09:00:00' },
  { yearMonth: '2026-04', unit: '203호', value: 2348, updatedAt: '2026-04-05 09:00:00' },
  { yearMonth: '2026-04', unit: '204호', value: 2414, updatedAt: '2026-04-05 09:00:00' },
  { yearMonth: '2026-04', unit: '205호', value: 1071, updatedAt: '2026-04-05 09:00:00' },

  // 2) 5월 05일 측정값 (지난달, 둔지빌 10세대 합계: 18,936 / 사용량 합계: 215톤)
  { yearMonth: '2026-05', unit: '101호', value: 3301, updatedAt: '2026-05-05 09:00:00' }, // 28톤
  { yearMonth: '2026-05', unit: '102호', value: 2628, updatedAt: '2026-05-05 09:00:00' }, // 22톤
  { yearMonth: '2026-05', unit: '103호', value: 1399, updatedAt: '2026-05-05 09:00:00' }, // 10톤
  { yearMonth: '2026-05', unit: '104호', value: 2728, updatedAt: '2026-05-05 09:00:00' }, // 20톤
  { yearMonth: '2026-05', unit: '105호', value: 490,  updatedAt: '2026-05-05 09:00:00' }, // 34톤
  { yearMonth: '2026-05', unit: '201호', value: 2207, updatedAt: '2026-05-05 09:00:00' }, // 22톤
  { yearMonth: '2026-05', unit: '202호', value: 295,  updatedAt: '2026-05-05 09:00:00' }, // 24톤
  { yearMonth: '2026-05', unit: '203호', value: 2371, updatedAt: '2026-05-05 09:00:00' }, // 23톤
  { yearMonth: '2026-05', unit: '204호', value: 2428, updatedAt: '2026-05-05 09:00:00' }, // 14톤
  { yearMonth: '2026-05', unit: '205호', value: 1089, updatedAt: '2026-05-05 09:00:00' }, // 18톤

  // 3) 6월 05일 측정값 (익월사용량, 둔지빌 10세대 합계: 19,166)
  { yearMonth: '2026-06', unit: '101호', value: 3329, updatedAt: '2026-06-05 09:00:00' },
  { yearMonth: '2026-06', unit: '102호', value: 2653, updatedAt: '2026-06-05 09:00:00' },
  { yearMonth: '2026-06', unit: '103호', value: 1411, updatedAt: '2026-06-05 09:00:00' },
  { yearMonth: '2026-06', unit: '104호', value: 2748, updatedAt: '2026-06-05 09:00:00' },
  { yearMonth: '2026-06', unit: '105호', value: 534,  updatedAt: '2026-06-05 09:00:00' },
  { yearMonth: '2026-06', unit: '201호', value: 2232, updatedAt: '2026-06-05 09:00:00' },
  { yearMonth: '2026-06', unit: '202호', value: 322,  updatedAt: '2026-06-05 09:00:00' },
  { yearMonth: '2026-06', unit: '203호', value: 2395, updatedAt: '2026-06-05 09:00:00' },
  { yearMonth: '2026-06', unit: '204호', value: 2440, updatedAt: '2026-06-05 09:00:00' },
  { yearMonth: '2026-06', unit: '205호', value: 1102, updatedAt: '2026-06-05 09:00:00' }
];

// 2026년 6월 둔지빌 실제 고지서 정보
export const INITIAL_BILLING_DATA: BillingRecord[] = [
  {
    yearMonth: '2026-06',
    totalBill: 353730,       // 전체 수도요금 (상수도 152,850 + 하수도 200,880)
    totalUsage: 279,         // 고지서 총 사용량 (톤) -> 1톤 단가 1,260원
    commonElectric: 3590,    // 공용전기요금 총액 (세대당 359원)
    managerName: '권경희',
    accountInfo: '부산은행 320 12 004078 6'
  }
];
