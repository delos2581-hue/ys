import {
  BillingRecord,
  MeterRecord,
  SettlementData,
  SettlementItem,
  User
} from '../types';
import {
  DEFAULT_UNITS,
  INITIAL_BILLING_DATA,
  INITIAL_METER_DATA,
  INITIAL_USERS
} from './defaultData';

const STORAGE_KEYS = {
  USERS: 'villa_users_v1',
  METER: 'villa_meter_v1',
  BILLING: 'villa_billing_v1',
  CONFIG: 'villa_config_v1',
  CURRENT_USER: 'villa_current_user_v1'
};

const FIXED_WATER_FEE_TOTAL = 2190;
const TOTAL_UNITS = 10;
const FIXED_WATER_FEE_PER_UNIT = 219;

// 사용자 제공 Google Apps Script 웹 앱 배포 기본 주소
export const DEFAULT_GAS_URL =
  'https://script.google.com/macros/s/AKfycbzGa_QJIlIl7-Cc-nI8Zk4Xh0sf3MXgwn2870CX4Rtqbe0urH4vO3fM2wuNr4Hp3AyJHw/exec';

// LocalStorage 초기화 및 헬퍼
function getLocalUsers() {
  const raw = localStorage.getItem(STORAGE_KEYS.USERS);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    return { ...INITIAL_USERS };
  }
  try {
    return JSON.parse(raw);
  } catch {
    return { ...INITIAL_USERS };
  }
}

function setLocalUsers(users: typeof INITIAL_USERS) {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

function getLocalMeterData(): MeterRecord[] {
  const raw = localStorage.getItem(STORAGE_KEYS.METER);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.METER, JSON.stringify(INITIAL_METER_DATA));
    return [...INITIAL_METER_DATA];
  }
  try {
    return JSON.parse(raw);
  } catch {
    return [...INITIAL_METER_DATA];
  }
}

function setLocalMeterData(data: MeterRecord[]) {
  localStorage.setItem(STORAGE_KEYS.METER, JSON.stringify(data));
}

function getLocalBillingData(): BillingRecord[] {
  const raw = localStorage.getItem(STORAGE_KEYS.BILLING);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.BILLING, JSON.stringify(INITIAL_BILLING_DATA));
    return [...INITIAL_BILLING_DATA];
  }
  try {
    return JSON.parse(raw);
  } catch {
    return [...INITIAL_BILLING_DATA];
  }
}

function setLocalBillingData(data: BillingRecord[]) {
  localStorage.setItem(STORAGE_KEYS.BILLING, JSON.stringify(data));
}

export function getGasUrl(): string {
  const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
  if (!raw) return DEFAULT_GAS_URL;
  try {
    const parsed = JSON.parse(raw);
    return parsed.gasWebAppUrl || DEFAULT_GAS_URL;
  } catch {
    return DEFAULT_GAS_URL;
  }
}

export function setGasUrl(url: string) {
  const existing = localStorage.getItem(STORAGE_KEYS.CONFIG);
  let config = { gasWebAppUrl: '', autoSync: true };
  if (existing) {
    try {
      config = JSON.parse(existing);
    } catch {
      // ignore
    }
  }
  config.gasWebAppUrl = url.trim();
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
}

// 가장 최근에 입력된 총무 정보 조회 (새 연월 작성 시 자동 계승용)
export function getLatestManagerInfo(): { managerName: string; accountInfo: string } {
  const billingList = getLocalBillingData();
  const sorted = [...billingList].sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));
  for (const b of sorted) {
    if (b.managerName && b.managerName.trim()) {
      return {
        managerName: b.managerName.trim(),
        accountInfo: (b.accountInfo || '').trim()
      };
    }
  }
  return {
    managerName: '203호 김총무',
    accountInfo: '카카오뱅크 3333-12-8976543 (예금주: 김민수)'
  };
}

// N개월 전 연월 계산
export function getPreviousYearMonth(yearMonthStr: string, monthsAgo: number): string {
  const parts = yearMonthStr.split('-');
  let year = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10);

  month -= monthsAgo;
  while (month <= 0) {
    month += 12;
    year -= 1;
  }

  const mm = (month < 10 ? '0' : '') + month;
  return `${year}-${mm}`;
}

// 로컬 정산 데이터 계산 엔진 (GAS 백엔드와 100% 동일한 비즈니스 로직)
export function computeLocalSettlement(yearMonth: string, targetUnit?: string | null): SettlementData {
  const billingList = getLocalBillingData();
  const meterList = getLocalMeterData();

  const prevYM = getPreviousYearMonth(yearMonth, 1);   // 지난달 (예: 2026-05)
  const prev2YM = getPreviousYearMonth(yearMonth, 2);  // 지지난달 (예: 2026-04)

  const latestManager = getLatestManagerInfo();
  const rawBilling = billingList.find((b) => b.yearMonth === yearMonth);
  const billing: BillingRecord = rawBilling
    ? {
        ...rawBilling,
        managerName: rawBilling.managerName || latestManager.managerName,
        accountInfo: rawBilling.accountInfo || latestManager.accountInfo
      }
    : {
        yearMonth,
        totalBill: 0,
        totalUsage: 0,
        commonElectric: 0,
        managerName: latestManager.managerName,
        accountInfo: latestManager.accountInfo
      };

  // 1톤당 단가 = (고지서 전체 수도요금 - 2,190원) / 고지서 전체 사용량(톤)
  let unitPrice = 0;
  if (billing.totalUsage > 0 && billing.totalBill > FIXED_WATER_FEE_TOTAL) {
    unitPrice = (billing.totalBill - FIXED_WATER_FEE_TOTAL) / billing.totalUsage;
  }

  // 세대별 공용전기료 = 고지서 전체 공용전기료 / 10
  const commonElectricPerUnit = Math.round(billing.commonElectric / TOTAL_UNITS);

  // 계량기 맵 생성
  const meterMap: Record<string, number> = {};
  meterList.forEach((m) => {
    meterMap[`${m.unit}_${m.yearMonth}`] = m.value;
  });

  // 전체 세대 실사용량 합계 먼저 계산
  let sumUsage = 0;
  DEFAULT_UNITS.forEach((unit) => {
    const prev2Val = meterMap[`${unit}_${prev2YM}`];
    const prevVal = meterMap[`${unit}_${prevYM}`];
    if (prevVal !== undefined && prev2Val !== undefined) {
      sumUsage += Math.max(0, Math.round((prevVal - prev2Val) * 100) / 100);
    }
  });

  // 오차 톤수 및 오차금액 총액 (고지서 사용량 279톤 - 세대합계 215톤 = 64톤)
  let errorDiffUsage = 0;
  let errorDiffFeeTotal = 0;
  if (billing.totalUsage > sumUsage && sumUsage > 0) {
    errorDiffUsage = Math.round((billing.totalUsage - sumUsage) * 100) / 100;
    errorDiffFeeTotal = Math.round(errorDiffUsage * unitPrice);
  }

  const settlements: SettlementItem[] = [];
  let sumWaterFee = 0;
  let sumErrorDiffFee = 0;
  let sumFinalTotal = 0;

  DEFAULT_UNITS.forEach((unit) => {
    const prev2Val = meterMap[`${unit}_${prev2YM}`];
    const prevVal = meterMap[`${unit}_${prevYM}`];
    const currentVal = meterMap[`${unit}_${yearMonth}`];

    const hasPrev2 = prev2Val !== undefined && prev2Val !== null;
    const hasPrev = prevVal !== undefined && prevVal !== null;

    let usage = 0;
    let isComplete = false;

    if (hasPrev && hasPrev2) {
      usage = Math.max(0, Math.round((prevVal - prev2Val) * 100) / 100);
      isComplete = true;
    }

    // 기본 수도요금 = 사용량 × 단가 (예: 28톤 × 1,260원 = 35,280원)
    const waterFee = Math.round(usage * unitPrice);

    // 오차 납부금 = 64톤 × 단가 × (세대사용량 / 세대합계 215톤) (예: 10,502원)
    let errorDiffFee = 0;
    if (errorDiffFeeTotal > 0 && sumUsage > 0 && isComplete) {
      errorDiffFee = Math.round(errorDiffFeeTotal * (usage / sumUsage));
    }

    const finalAmount = isComplete
      ? (waterFee + FIXED_WATER_FEE_PER_UNIT + commonElectricPerUnit + errorDiffFee)
      : 0;

    sumWaterFee += waterFee;
    sumErrorDiffFee += errorDiffFee;
    sumFinalTotal += finalAmount;

    settlements.push({
      unit,
      prev2Month: prev2YM,
      prev2Value: hasPrev2 ? prev2Val : null,
      prevMonth: prevYM,
      prevValue: hasPrev ? prevVal : null,
      currentMonth: yearMonth,
      currentValue: currentVal !== undefined ? currentVal : null,
      usage,
      unitPrice: Math.round(unitPrice * 100) / 100,
      waterFee,
      fixedFee: FIXED_WATER_FEE_PER_UNIT,
      commonElectricFee: commonElectricPerUnit,
      errorDiffFee,
      finalAmount,
      isComplete
    });
  });

  const singleResult = targetUnit
    ? settlements.find((s) => s.unit === targetUnit) || null
    : null;

  return {
    success: true,
    yearMonth,
    period: {
      billingMonth: yearMonth,
      fromMonth: prev2YM,
      toMonth: prevYM,
      description: `${prev2YM}월 5일 ~ ${prevYM}월 5일 사용분`
    },
    billing,
    unitPrice: Math.round(unitPrice * 100) / 100,
    fixedFeeTotal: FIXED_WATER_FEE_TOTAL,
    fixedFeePerUnit: FIXED_WATER_FEE_PER_UNIT,
    commonElectricPerUnit,
    errorDiffUsage,
    errorDiffFeeTotal,
    settlements,
    singleResult,
    summary: {
      totalUnits: TOTAL_UNITS,
      completedUnits: settlements.filter((s) => s.isComplete).length,
      sumUsage: Math.round(sumUsage * 100) / 100,
      sumWaterFee,
      sumErrorDiffFee,
      sumFinalTotal
    }
  };
}

// GAS 통신 래퍼 (POST 시 CORS preflight 회피를 위해 text/plain 또는 URL 인코딩 전송)
async function callGas(action: string, data: Record<string, unknown> = {}) {
  const url = getGasUrl();
  if (!url) return null;

  try {
    const payload = { action, ...data };
    // GAS doPost receives text/plain seamlessly without preflight rejection
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`GAS 서버 응답 오류: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (err) {
    console.warn('[GAS 연동 경고]: 원격 호출 실패, 로컬 DB로 처리합니다.', err);
    return null;
  }
}

// -------------------------------------------------------------
// 통합 API 메서드 (GAS 연동 시 실시간 동기화 + 실패 시 로컬 즉시 반영)
// -------------------------------------------------------------

export const Api = {
  // 1. Google Apps Script Ping 테스트
  async pingGas(customUrl?: string): Promise<{ success: boolean; message: string }> {
    const targetUrl = customUrl || getGasUrl();
    if (!targetUrl) {
      return { success: false, message: 'Apps Script 웹앱 URL이 설정되지 않았습니다.' };
    }

    try {
      const fullUrl = targetUrl.includes('?')
        ? `${targetUrl}&action=ping`
        : `${targetUrl}?action=ping`;

      const response = await fetch(fullUrl, { method: 'GET', redirect: 'follow' });
      if (!response.ok) {
        return { success: false, message: `서버 응답 오류 (상태코드: ${response.status})` };
      }
      const data = await response.json();
      if (data && data.success) {
        return { success: true, message: data.message || 'Google Apps Script와 정상 연결되었습니다.' };
      }
      return { success: false, message: data.error || '연결 실패' };
    } catch (err) {
      return {
        success: false,
        message: 'Google Apps Script 연결에 실패했습니다. 배포 시 "액세스 권한: 모든 사용자"로 설정되었는지 확인해주세요.'
      };
    }
  },

  // 2. 로그인
  async login(id: string, password: string): Promise<{ success: boolean; user?: User; message?: string }> {
    const gasRes = await callGas('login', { id, password });
    if (gasRes) {
      if (gasRes.success) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(gasRes.user));
        return { success: true, user: gasRes.user };
      }
      return { success: false, message: gasRes.message };
    }

    // 로컬 폴백
    const users = getLocalUsers();
    const userAccount = users[id];
    if (!userAccount) {
      return { success: false, message: '등록되지 않은 아이디(호수)입니다.' };
    }
    if (userAccount.password !== password) {
      return { success: false, message: '비밀번호가 일치하지 않습니다.' };
    }

    const user: User = {
      id,
      role: userAccount.role,
      unit: userAccount.unit
    };
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    return { success: true, user };
  },

  // 3. 비밀번호 변경 (본인)
  async changePassword(id: string, oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const gasRes = await callGas('changePassword', { id, oldPassword, newPassword });
    if (gasRes) {
      // 로컬에도 동기화
      const users = getLocalUsers();
      if (users[id]) {
        users[id].password = newPassword;
        setLocalUsers(users);
      }
      return gasRes;
    }

    // 로컬 폴백
    const users = getLocalUsers();
    if (!users[id]) {
      return { success: false, message: '사용자를 찾을 수 없습니다.' };
    }
    if (users[id].password !== oldPassword) {
      return { success: false, message: '기존 비밀번호가 일치하지 않습니다.' };
    }
    users[id].password = newPassword;
    setLocalUsers(users);
    return { success: true, message: '비밀번호가 안전하게 변경되었습니다.' };
  },

  // 4. 세대별 비밀번호 초기화 (관리자 전용: 해당 호수명으로 리셋)
  async resetUserPassword(adminId: string, adminPassword: string, targetUnit: string): Promise<{ success: boolean; message: string }> {
    const gasRes = await callGas('resetUserPassword', { adminId, adminPassword, targetUnit });
    if (gasRes) {
      const users = getLocalUsers();
      if (users[targetUnit]) {
        users[targetUnit].password = targetUnit;
        setLocalUsers(users);
      }
      return gasRes;
    }

    // 로컬 폴백
    const users = getLocalUsers();
    if (!users[adminId] || users[adminId].role !== 'admin' || users[adminId].password !== adminPassword) {
      return { success: false, message: '관리자 인증에 실패했습니다.' };
    }
    if (!users[targetUnit]) {
      return { success: false, message: `${targetUnit} 사용자를 찾을 수 없습니다.` };
    }
    users[targetUnit].password = targetUnit;
    setLocalUsers(users);
    return {
      success: true,
      message: `${targetUnit}의 비밀번호가 초기값("${targetUnit}")으로 성공적으로 리셋되었습니다.`
    };
  },

  // 5. 계량기 수치 저장 (당월 5일 측정값)
  async saveMeterValue(unit: string, yearMonth: string, value: number): Promise<{ success: boolean; message: string }> {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const updatedAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    // 로컬에 먼저 반영
    const meterList = getLocalMeterData();
    const existingIndex = meterList.findIndex((m) => m.unit === unit && m.yearMonth === yearMonth);

    if (existingIndex >= 0) {
      meterList[existingIndex] = { unit, yearMonth, value, updatedAt };
    } else {
      meterList.push({ unit, yearMonth, value, updatedAt });
    }
    setLocalMeterData(meterList);

    // GAS 호출
    const gasRes = await callGas('saveMeterValue', { unit, yearMonth, value });
    if (gasRes && gasRes.success) {
      return { success: true, message: `${unit}의 ${yearMonth}월 검침 수치(${value})가 구글 시트에 실시간 저장되었습니다.` };
    }

    return {
      success: true,
      message: `${unit}의 ${yearMonth}월 검침 수치(${value})가 저장되었습니다.`
    };
  },

  // 5-1. 10개 세대 계량기 수치 한꺼번에 일괄 저장 (총무 전용)
  async saveBatchMeterValues(
    yearMonth: string,
    items: { unit: string; value: number }[]
  ): Promise<{ success: boolean; message: string; count: number }> {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const updatedAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    // 1) 로컬 스토리지 일괄 반영
    const meterList = getLocalMeterData();
    let updatedCount = 0;

    items.forEach((item) => {
      if (item.value === undefined || item.value === null || isNaN(item.value)) return;
      const existingIndex = meterList.findIndex((m) => m.unit === item.unit && m.yearMonth === yearMonth);
      if (existingIndex >= 0) {
        meterList[existingIndex] = { unit: item.unit, yearMonth, value: item.value, updatedAt };
      } else {
        meterList.push({ unit: item.unit, yearMonth, value: item.value, updatedAt });
      }
      updatedCount++;
    });
    setLocalMeterData(meterList);

    // 2) Google Apps Script 웹앱 일괄 저장 호출
    const gasRes = await callGas('saveBatchMeterValues', { yearMonth, items });
    if (gasRes && gasRes.success) {
      return {
        success: true,
        count: updatedCount,
        message: `${yearMonth}월 10개 세대 계량기 수치(${updatedCount}건)가 구글 시트에 일괄 저장되었습니다.`
      };
    }

    return {
      success: true,
      count: updatedCount,
      message: `${yearMonth}월 10개 세대 계량기 수치(${updatedCount}건)가 일괄 저장되었습니다.`
    };
  },

  // 6. 고지서 정보 저장 (관리자)
  async saveBillingInfo(billing: BillingRecord): Promise<{ success: boolean; message: string }> {
    // 로컬에 먼저 반영
    const billingList = getLocalBillingData();
    const existingIndex = billingList.findIndex((b) => b.yearMonth === billing.yearMonth);

    if (existingIndex >= 0) {
      billingList[existingIndex] = billing;
    } else {
      billingList.push(billing);
    }
    setLocalBillingData(billingList);

    // GAS 호출
    const gasRes = await callGas('saveBillingInfo', {
      yearMonth: billing.yearMonth,
      totalBill: billing.totalBill,
      totalUsage: billing.totalUsage,
      commonElectric: billing.commonElectric,
      managerName: billing.managerName,
      accountInfo: billing.accountInfo
    });

    if (gasRes && gasRes.success) {
      return { success: true, message: `${billing.yearMonth}월 고지서 정보가 구글 시트에 저장되었습니다.` };
    }

    return { success: true, message: `${billing.yearMonth}월 고지서 정보가 저장되었습니다.` };
  },

  // 7. 정산 데이터 조회
  async getSettlementData(yearMonth: string, unit?: string | null): Promise<SettlementData> {
    const gasRes = await callGas('getSettlementData', { yearMonth, unit });
    if (gasRes && gasRes.success && gasRes.settlements) {
      return gasRes as SettlementData;
    }

    // 로컬 계산 엔진
    return computeLocalSettlement(yearMonth, unit);
  },

  // 8. 검침 기록 조회 (세대원 또는 관리자)
  getMeterRecords(unit?: string): MeterRecord[] {
    const list = getLocalMeterData();
    if (unit) {
      return list.filter((m) => m.unit === unit).sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));
    }
    return list.sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));
  },

  // 9. 로컬 데이터 초기화 (필요시 샘플 데이터 복원)
  resetToSampleData() {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(STORAGE_KEYS.METER, JSON.stringify(INITIAL_METER_DATA));
    localStorage.setItem(STORAGE_KEYS.BILLING, JSON.stringify(INITIAL_BILLING_DATA));
  },

  // 10. 2026년 6월 둔지빌 실제 청구분 데이터 세팅 (고지서 353,730원/279톤/권경희 총무 및 10세대 수치)
  async setupJune2026Data(): Promise<{ success: boolean; message: string }> {
    localStorage.setItem(STORAGE_KEYS.BILLING, JSON.stringify(INITIAL_BILLING_DATA));
    localStorage.setItem(STORAGE_KEYS.METER, JSON.stringify(INITIAL_METER_DATA));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));

    const gasRes = await callGas('setupJune2026Data', {});
    if (gasRes && gasRes.success) {
      return gasRes;
    }

    return {
      success: true,
      message: '2026년 6월 둔지빌 실제 데이터(수도 353,730원, 279톤, 총무 권경희, 10세대 수치)가 성공적으로 세팅되었습니다.'
    };
  }
};
