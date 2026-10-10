/**
 * ============================================================================
 * 빌라 수도 및 공용전기 요금 정산 시스템 - Google Apps Script 백엔드 (Code.gs)
 * ============================================================================
 * 
 * [시스템 개요]
 * - 세대별 10개 호수 (101호~105호, 201호~205호) 및 관리자(admin)
 * - 매월 5일 계량기 수치 측정 및 저장
 * - 수도요금 청구 주기: 지지난달 5일 수치 ~ 지난달 5일 수치 (예: 6월 고지서 = 4월~5월 사용량)
 * - 수도 정액료 총액: 2,190원 (세대당 219원 균등 분할)
 * - 1톤당 단가 = (고지서 전체 수도요금 - 2,190원) / 고지서 전체 사용량(톤)
 * - 세대별 수도요금 = 사용량(톤) × 1톤당 단가
 * - 세대별 공용전기료 = 고지서 전체 공용전기료 / 10
 * - 세대별 최종 납부금액 = 세대별 수도요금 + 정액료(219원) + 세대별 공용전기료
 * - 총무 관리: 고지서 입력 시 총무 이름 및 입금 계좌정보 관리
 * 
 * [시트 구성]
 * - Users: [ID, Password, Role]
 * - MeterData: [YearMonth, Unit, Value, UpdatedAt]
 * - BillingHistory: [YearMonth, TotalBill, TotalUsage, CommonElectric, ManagerName, AccountInfo]
 */

// 고정 상수
const FIXED_WATER_FEE_TOTAL = 2190;
const TOTAL_UNITS = 10;
const FIXED_WATER_FEE_PER_UNIT = 219; // 2190 / 10

// 기본 호수 목록
const DEFAULT_UNITS = [
  '101호', '102호', '103호', '104호', '105호',
  '201호', '202호', '203호', '204호', '205호'
];

/**
 * 1. 초기 시트 및 기본 데이터 세팅
 * Apps Script 편집기에서 실행 버튼을 눌러 1회 실행합니다.
 */
function setupInitialSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1) Users 시트
  let userSheet = ss.getSheetByName('Users');
  if (!userSheet) {
    userSheet = ss.insertSheet('Users');
  }
  userSheet.clear();
  userSheet.appendRow(['ID', 'Password', 'Role']);
  
  // 관리자 계정 추가
  userSheet.appendRow(['admin', 'admin1234', 'admin']);
  
  // 10개 세대 초기 계정 추가 (초기 ID: 호수, 초기 PW: 호수)
  DEFAULT_UNITS.forEach(function(unit) {
    userSheet.appendRow([unit, unit, 'resident']);
  });

  // 2) MeterData 시트
  let meterSheet = ss.getSheetByName('MeterData');
  if (!meterSheet) {
    meterSheet = ss.insertSheet('MeterData');
  }
  if (meterSheet.getLastRow() === 0) {
    meterSheet.appendRow(['YearMonth', 'Unit', 'Value', 'UpdatedAt']);
  }

  // 3) BillingHistory 시트
  let billingSheet = ss.getSheetByName('BillingHistory');
  if (!billingSheet) {
    billingSheet = ss.insertSheet('BillingHistory');
  }
  if (billingSheet.getLastRow() === 0) {
    billingSheet.appendRow(['YearMonth', 'TotalBill', 'TotalUsage', 'CommonElectric', 'ManagerName', 'AccountInfo']);
  }

  // 기본 시트(Sheet1 등)가 남아있다면 정리 (선택사항)
  const defaultSheet = ss.getSheetByName('시트1') || ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 3) {
    try { ss.deleteSheet(defaultSheet); } catch(e) {}
  }

  Logger.log('초기 시트 설정이 완료되었습니다!');
  return { success: true, message: '초기 시트 및 기본 사용자 계정이 성공적으로 생성되었습니다.' };
}

/**
 * 웹앱 GET 요청 처리 (조회 및 테스트용)
 */
function doGet(e) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    const action = params.action || 'ping';

    let result;
    switch (action) {
      case 'ping':
        result = { success: true, message: 'Google Apps Script API 서버가 정상 작동 중입니다.', timestamp: new Date().toISOString() };
        break;
      case 'login':
        result = login(params.id, params.password);
        break;
      case 'getSettlementData':
        result = getSettlementData(params.yearMonth, params.unit);
        break;
      case 'getUnits':
        result = { success: true, units: DEFAULT_UNITS };
        break;
      case 'getBillingHistory':
        result = getBillingHistory(params.yearMonth);
        break;
      case 'getMeterHistory':
        result = getMeterHistory(params.unit, params.yearMonth);
        break;
      default:
        result = { success: false, error: '알 수 없는 요청 action 입니다: ' + action };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 웹앱 POST 요청 처리 (데이터 저장, 변경 등)
 */
function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    const action = payload.action;
    let result;

    switch (action) {
      case 'login':
        result = login(payload.id, payload.password);
        break;
      case 'changePassword':
        result = changePassword(payload.id, payload.oldPassword, payload.newPassword);
        break;
      case 'resetUserPassword':
        result = resetUserPassword(payload.adminId, payload.adminPassword, payload.targetUnit);
        break;
      case 'saveMeterValue':
        result = saveMeterValue(payload.unit, payload.yearMonth, payload.value);
        break;
      case 'saveBatchMeterValues':
        result = saveBatchMeterValues(payload.yearMonth, payload.items);
        break;
      case 'saveBillingInfo':
        result = saveBillingInfo(
          payload.yearMonth,
          payload.totalBill,
          payload.totalUsage,
          payload.commonElectric,
          payload.managerName,
          payload.accountInfo
        );
        break;
      case 'getSettlementData':
        result = getSettlementData(payload.yearMonth, payload.unit);
        break;
      case 'setupInitialSheets':
        result = setupInitialSheets();
        break;
      default:
        result = { success: false, error: '유효하지 않은 action 요청입니다: ' + action };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 2. 로그인 처리
 */
function login(id, password) {
  if (!id || !password) {
    return { success: false, message: '아이디와 비밀번호를 모두 입력해주세요.' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Users');
  if (!sheet) {
    return { success: false, message: 'Users 시트가 존재하지 않습니다. setupInitialSheets를 먼저 실행해주세요.' };
  }

  const data = sheet.getDataRange().getValues();
  // 1행은 헤더 (ID, Password, Role)
  for (let i = 1; i < data.length; i++) {
    const rowId = String(data[i][0]).trim();
    const rowPw = String(data[i][1]).trim();
    const rowRole = String(data[i][2]).trim();

    if (rowId === String(id).trim()) {
      if (rowPw === String(password).trim()) {
        return {
          success: true,
          user: {
            id: rowId,
            role: rowRole,
            unit: rowRole === 'admin' ? null : rowId
          }
        };
      } else {
        return { success: false, message: '비밀번호가 일치하지 않습니다.' };
      }
    }
  }

  return { success: false, message: '등록되지 않은 아이디(호수)입니다.' };
}

/**
 * 3. 비밀번호 변경 (본인)
 */
function changePassword(id, oldPassword, newPassword) {
  if (!id || !oldPassword || !newPassword) {
    return { success: false, message: '모든 필수 항목을 입력해주세요.' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Users');
  if (!sheet) return { success: false, message: 'Users 시트가 없습니다.' };

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const rowId = String(data[i][0]).trim();
    const rowPw = String(data[i][1]).trim();

    if (rowId === String(id).trim()) {
      if (rowPw !== String(oldPassword).trim()) {
        return { success: false, message: '기존 비밀번호가 일치하지 않습니다.' };
      }
      sheet.getRange(i + 1, 2).setValue(String(newPassword).trim());
      return { success: true, message: '비밀번호가 성공적으로 변경되었습니다.' };
    }
  }

  return { success: false, message: '해당 사용자를 찾을 수 없습니다.' };
}

/**
 * 4. 세대별 비밀번호 초기화 (관리자 권한: 해당 호수 이름으로 리셋)
 */
function resetUserPassword(adminId, adminPassword, targetUnit) {
  // 관리자 인증
  const auth = login(adminId, adminPassword);
  if (!auth.success || auth.user.role !== 'admin') {
    return { success: false, message: '관리자 권한이 없거나 관리자 비밀번호가 일치하지 않습니다.' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Users');
  if (!sheet) return { success: false, message: 'Users 시트가 없습니다.' };

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const rowId = String(data[i][0]).trim();
    if (rowId === String(targetUnit).trim()) {
      // 초기 비밀번호는 해당 호수명으로 리셋
      sheet.getRange(i + 1, 2).setValue(targetUnit);
      return { success: true, message: targetUnit + '의 비밀번호가 "' + targetUnit + '"(호수명)으로 초기화되었습니다.' };
    }
  }

  return { success: false, message: targetUnit + ' 사용자를 찾을 수 없습니다.' };
}

/**
 * 5. 계량기 수치 저장 (당월 5일 측정값)
 * [YearMonth, Unit, Value, UpdatedAt]
 */
function saveMeterValue(unit, yearMonth, value) {
  if (!unit || !yearMonth || value === undefined || value === null || value === '') {
    return { success: false, message: '호수, 연월, 계량기 수치를 모두 입력해주세요.' };
  }

  const numValue = Number(value);
  if (isNaN(numValue) || numValue < 0) {
    return { success: false, message: '올바른 숫자 형태의 계량기 수치를 입력해주세요.' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('MeterData');
  if (!sheet) {
    sheet = ss.insertSheet('MeterData');
    sheet.appendRow(['YearMonth', 'Unit', 'Value', 'UpdatedAt']);
  }

  const data = sheet.getDataRange().getValues();
  const formattedYM = String(yearMonth).trim(); // YYYY-MM
  const formattedUnit = String(unit).trim();
  const now = new Date();
  const updatedAt = Utilities.formatDate(now, 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');

  // 기존 해당 월/호수 데이터가 있으면 업데이트, 없으면 신규 추가
  let foundRow = -1;
  for (let i = 1; i < data.length; i++) {
    const rowYM = String(data[i][0]).trim();
    const rowUnit = String(data[i][1]).trim();
    if (rowYM === formattedYM && rowUnit === formattedUnit) {
      foundRow = i + 1;
      break;
    }
  }

  if (foundRow > 0) {
    sheet.getRange(foundRow, 3).setValue(numValue);
    sheet.getRange(foundRow, 4).setValue(updatedAt);
  } else {
    sheet.appendRow([formattedYM, formattedUnit, numValue, updatedAt]);
  }

  return {
    success: true,
    message: formattedUnit + '의 ' + formattedYM + '월 계량기 수치(' + numValue + ')가 저장되었습니다.',
    unit: formattedUnit,
    yearMonth: formattedYM,
    value: numValue,
    updatedAt: updatedAt
  };
}

/**
 * 5-1. 10세대 계량기 수치 일괄 저장 (총무 전용 한꺼번에 입력 기능)
 * items: [{ unit: '101호', value: 334.8 }, ...]
 */
function saveBatchMeterValues(yearMonth, items) {
  if (!yearMonth || !items || !items.length) {
    return { success: false, message: '연월과 저장할 세대 수치 목록이 필요합니다.' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('MeterData');
  if (!sheet) {
    sheet = ss.insertSheet('MeterData');
    sheet.appendRow(['YearMonth', 'Unit', 'Value', 'UpdatedAt']);
  }

  const data = sheet.getDataRange().getValues();
  const formattedYM = String(yearMonth).trim();
  const now = new Date();
  const updatedAt = Utilities.formatDate(now, 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');

  // 빠른 수정을 위한 맵 (unit => row index)
  const existingRows = {};
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === formattedYM) {
      existingRows[String(data[i][1]).trim()] = i + 1;
    }
  }

  let updatedCount = 0;
  items.forEach(function(item) {
    if (!item.unit || item.value === undefined || item.value === null || item.value === '') return;
    const numVal = Number(item.value);
    if (isNaN(numVal) || numVal < 0) return;

    const u = String(item.unit).trim();
    if (existingRows[u]) {
      sheet.getRange(existingRows[u], 3).setValue(numVal);
      sheet.getRange(existingRows[u], 4).setValue(updatedAt);
    } else {
      sheet.appendRow([formattedYM, u, numVal, updatedAt]);
    }
    updatedCount++;
  });

  return {
    success: true,
    message: formattedYM + '월 ' + updatedCount + '개 세대 계량기 수치가 성공적으로 일괄 저장되었습니다.',
    count: updatedCount,
    updatedAt: updatedAt
  };
}

/**
 * 6. 고지서 정보 저장 (관리자)
 * [YearMonth, TotalBill, TotalUsage, CommonElectric, ManagerName, AccountInfo]
 */
function saveBillingInfo(yearMonth, totalBill, totalUsage, commonElectric, managerName, accountInfo) {
  if (!yearMonth) {
    return { success: false, message: '청구 연월을 지정해주세요.' };
  }

  const numTotalBill = Number(totalBill) || 0;
  const numTotalUsage = Number(totalUsage) || 0;
  const numCommonElectric = Number(commonElectric) || 0;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('BillingHistory');
  if (!sheet) {
    sheet = ss.insertSheet('BillingHistory');
    sheet.appendRow(['YearMonth', 'TotalBill', 'TotalUsage', 'CommonElectric', 'ManagerName', 'AccountInfo']);
  }

  const data = sheet.getDataRange().getValues();
  const formattedYM = String(yearMonth).trim();

  let foundRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === formattedYM) {
      foundRow = i + 1;
      break;
    }
  }

  const rowValues = [
    formattedYM,
    numTotalBill,
    numTotalUsage,
    numCommonElectric,
    String(managerName || '').trim(),
    String(accountInfo || '').trim()
  ];

  if (foundRow > 0) {
    sheet.getRange(foundRow, 1, 1, 6).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }

  return {
    success: true,
    message: formattedYM + '월 고지서 및 총무 정보가 저장되었습니다.',
    billing: {
      yearMonth: formattedYM,
      totalBill: numTotalBill,
      totalUsage: numTotalUsage,
      commonElectric: numCommonElectric,
      managerName: managerName,
      accountInfo: accountInfo
    }
  };
}

/**
 * 7. 정산 데이터 계산 및 조회
 * 
 * [청구 주기 원칙]
 * 청구월이 yearMonth (예: 2026-06)일 때:
 * - 지난달(M-1) 측정값 (예: 2026-05)
 * - 지지난달(M-2) 측정값 (예: 2026-04)
 * - 사용량 = 지난달 - 지지난달
 * - 단가 = (전체 수도요금 - 2190) / 전체 사용량
 * - 세대별 수도요금 = 사용량 × 단가
 * - 세대별 공용전기 = 전체 공용전기 / 10
 * - 세대별 최종납부액 = 세대별 수도요금 + 219 + 세대별 공용전기
 */
function getSettlementData(yearMonth, targetUnit) {
  if (!yearMonth) {
    return { success: false, message: '조회할 청구 연월이 필요합니다.' };
  }

  const ym = String(yearMonth).trim();
  const prevYM = getPreviousYearMonth(ym, 1);     // 지난달 (예: 2026-05)
  const prev2YM = getPreviousYearMonth(ym, 2);    // 지지난달 (예: 2026-04)

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1) 고지서 정보 조회
  const billingSheet = ss.getSheetByName('BillingHistory');
  let billing = {
    yearMonth: ym,
    totalBill: 0,
    totalUsage: 0,
    commonElectric: 0,
    managerName: '',
    accountInfo: ''
  };

  if (billingSheet) {
    const bData = billingSheet.getDataRange().getValues();
    for (let i = 1; i < bData.length; i++) {
      if (String(bData[i][0]).trim() === ym) {
        billing = {
          yearMonth: ym,
          totalBill: Number(bData[i][1]) || 0,
          totalUsage: Number(bData[i][2]) || 0,
          commonElectric: Number(bData[i][3]) || 0,
          managerName: String(bData[i][4] || ''),
          accountInfo: String(bData[i][5] || '')
        };
        break;
      }
    }
  }

  // 단가 계산: (고지서 전체 수도요금 - 2,190원) / 고지서 전체 사용량(톤)
  let unitPrice = 0;
  if (billing.totalUsage > 0 && billing.totalBill > FIXED_WATER_FEE_TOTAL) {
    unitPrice = (billing.totalBill - FIXED_WATER_FEE_TOTAL) / billing.totalUsage;
  }

  // 세대별 공용전기료 = 고지서 전체 공용전기료 / 10
  const commonElectricPerUnit = Math.round(billing.commonElectric / TOTAL_UNITS);

  // 2) 계량기 데이터 조회
  const meterSheet = ss.getSheetByName('MeterData');
  const meterMap = {}; // key: "unit_YYYY-MM" => value

  if (meterSheet) {
    const mData = meterSheet.getDataRange().getValues();
    for (let i = 1; i < mData.length; i++) {
      const rowYM = String(mData[i][0]).trim();
      const rowUnit = String(mData[i][1]).trim();
      const rowVal = Number(mData[i][2]);
      meterMap[rowUnit + '_' + rowYM] = rowVal;
    }
  }

  // 세대별 정산 계산
  const settlements = [];
  let sumCalculatedUsage = 0;
  let sumWaterFee = 0;
  let sumFinalTotal = 0;

  DEFAULT_UNITS.forEach(function(unit) {
    const prev2Val = meterMap[unit + '_' + prev2YM]; // 지지난달 수치
    const prevVal = meterMap[unit + '_' + prevYM];   // 지난달 수치
    const currentVal = meterMap[unit + '_' + ym];    // 이번달 수치(참고용)

    const hasPrev2 = prev2Val !== undefined && prev2Val !== null;
    const hasPrev = prevVal !== undefined && prevVal !== null;

    let usage = 0;
    let isComplete = false;

    if (hasPrev && hasPrev2) {
      usage = Math.max(0, Math.round((prevVal - prev2Val) * 100) / 100);
      isComplete = true;
    }

    const waterFee = Math.round(usage * unitPrice);
    const finalAmount = isComplete ? (waterFee + FIXED_WATER_FEE_PER_UNIT + commonElectricPerUnit) : 0;

    sumCalculatedUsage += usage;
    sumWaterFee += waterFee;
    sumFinalTotal += finalAmount;

    settlements.push({
      unit: unit,
      prev2Month: prev2YM,
      prev2Value: hasPrev2 ? prev2Val : null,
      prevMonth: prevYM,
      prevValue: hasPrev ? prevVal : null,
      currentMonth: ym,
      currentValue: (currentVal !== undefined && currentVal !== null) ? currentVal : null,
      usage: usage,
      unitPrice: Math.round(unitPrice * 100) / 100,
      waterFee: waterFee,
      fixedFee: FIXED_WATER_FEE_PER_UNIT,
      commonElectricFee: commonElectricPerUnit,
      finalAmount: finalAmount,
      isComplete: isComplete
    });
  });

  // 단일 세대 조회인 경우 필터링
  let singleResult = null;
  if (targetUnit) {
    singleResult = settlements.find(function(s) {
      return s.unit === String(targetUnit).trim();
    }) || null;
  }

  return {
    success: true,
    yearMonth: ym,
    period: {
      billingMonth: ym,
      fromMonth: prev2YM,
      toMonth: prevYM,
      description: prev2YM + '월 5일 ~ ' + prevYM + '월 5일 사용분'
    },
    billing: billing,
    unitPrice: Math.round(unitPrice * 100) / 100,
    fixedFeeTotal: FIXED_WATER_FEE_TOTAL,
    fixedFeePerUnit: FIXED_WATER_FEE_PER_UNIT,
    commonElectricPerUnit: commonElectricPerUnit,
    settlements: settlements,
    singleResult: singleResult,
    summary: {
      totalUnits: TOTAL_UNITS,
      completedUnits: settlements.filter(function(s) { return s.isComplete; }).length,
      sumUsage: Math.round(sumCalculatedUsage * 100) / 100,
      sumWaterFee: sumWaterFee,
      sumFinalTotal: sumFinalTotal
    }
  };
}

/**
 * 날짜 유틸리티: N개월 전 YYYY-MM 계산
 */
function getPreviousYearMonth(yearMonthStr, monthsAgo) {
  const parts = yearMonthStr.split('-');
  let year = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10);

  month -= monthsAgo;
  while (month <= 0) {
    month += 12;
    year -= 1;
  }

  const mm = (month < 10 ? '0' : '') + month;
  return year + '-' + mm;
}

/**
 * 고지서 이력 단건 조회 헬퍼
 */
function getBillingHistory(yearMonth) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('BillingHistory');
  if (!sheet) return { success: false, data: null };

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(yearMonth).trim()) {
      return {
        success: true,
        data: {
          yearMonth: data[i][0],
          totalBill: data[i][1],
          totalUsage: data[i][2],
          commonElectric: data[i][3],
          managerName: data[i][4],
          accountInfo: data[i][5]
        }
      };
    }
  }
  return { success: true, data: null };
}

/**
 * 특정 세대의 검침 이력 조회 헬퍼
 */
function getMeterHistory(unit, limit) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('MeterData');
  if (!sheet) return { success: true, history: [] };

  const data = sheet.getDataRange().getValues();
  const history = [];

  for (let i = 1; i < data.length; i++) {
    if (!unit || String(data[i][1]).trim() === String(unit).trim()) {
      history.push({
        yearMonth: String(data[i][0]),
        unit: String(data[i][1]),
        value: Number(data[i][2]),
        updatedAt: String(data[i][3])
      });
    }
  }

  // 최신 연월순 정렬
  history.sort(function(a, b) {
    return b.yearMonth.localeCompare(a.yearMonth);
  });

  return { success: true, history: history.slice(0, Number(limit) || 24) };
}
