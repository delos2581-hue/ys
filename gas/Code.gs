/**
 * ============================================================================
 * 빌라 수도 및 공용전기 요금 정산 시스템 - Google Apps Script 백엔드 (Code.gs)
 * ============================================================================
 * 
 * [시스템 개요]
 * - 세대별 10개 호수 (101호~105호, 201호~205호) 및 관리자(admin)
 * - 매월 5일 계량기 수치 측정 및 저장
 * - 수도요금 청구 주기: 지지난달 5일 수치 ~ 지난달 5일 수치 (예: 6월 고지서 = 4월 5일 ~ 5월 5일 사용량)
 * - 수도 정액료 총액: 2,190원 (세대당 219원 균등 분할)
 * - 1톤당 단가 = (고지서 전체 수도요금 - 2,190원) / 고지서 전체 사용량(톤)
 * - 세대별 기본 수도요금 = 사용량(톤) × 1톤당 단가
 * - 오차 납부금 = (고지서 총사용량 - 세대합계 사용량) × 단가 × (세대사용량 / 세대합계사용량)
 * - 세대별 공용전기료 = 고지서 전체 공용전기료 / 10 (1/N 균등 분할)
 * - 세대별 최종 납부금액 = 세대별 수도요금 + 수도정액료(219원) + 공용전기료 + 오차납부금
 * - 총무 관리: 고지서 입력 시 총무 이름과 입금 계좌정보 저장 및 관리
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

// 둔지빌 10개 호수 목록
const DEFAULT_UNITS = [
  '101호', '102호', '103호', '104호', '105호',
  '201호', '202호', '203호', '204호', '205호'
];

/**
 * ★ [핵심 추가] 2026년 6월 청구분(둔지빌 4월 사용 및 5월 공용전기) 실제 데이터 자동 세팅 함수
 * Apps Script 편집기 상단 함수 목록에서 'setupJune2026Data'를 선택하고 [실행]을 누르면 
 * 구글 시트에 고지서와 10개 세대의 실제 수치가 1초 만에 완벽하게 세팅됩니다!
 */
function setupJune2026Data() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1) 초기 시트(Users, MeterData, BillingHistory) 점검 및 생성
  setupInitialSheets();

  // 2) 2026-06 고지서 및 총무 정보 등록 (첨부 이미지 기준)
  // - 수도요금(정액+상수+하수): 353,730원 (상수도 152,850원 + 하수도 200,880원)
  // - 고지서 총 사용량: 279톤 (1톤당 단가 1,260원)
  // - 공용전기요금: 3,590원 (세대당 359원)
  // - 총무: 권경희
  // - 계좌정보: 부산은행 320 12 004078 6
  saveBillingInfo(
    '2026-06',
    353730,
    279,
    3590,
    '권경희',
    '부산은행 320 12 004078 6'
  );

  // 3) 4월 05일 측정값 (지지난달, 둔지빌 10세대 합계: 18,721)
  const aprilData = [
    { unit: '101호', value: 3273 },
    { unit: '102호', value: 2606 },
    { unit: '103호', value: 1389 },
    { unit: '104호', value: 2708 },
    { unit: '105호', value: 456 },
    { unit: '201호', value: 2185 },
    { unit: '202호', value: 271 },
    { unit: '203호', value: 2348 },
    { unit: '204호', value: 2414 },
    { unit: '205호', value: 1071 }
  ];

  // 4) 5월 05일 측정값 (지난달, 둔지빌 10세대 합계: 18,936 / 당월사용량 합계: 215톤)
  const mayData = [
    { unit: '101호', value: 3301 }, // 사용량: 28톤
    { unit: '102호', value: 2628 }, // 사용량: 22톤
    { unit: '103호', value: 1399 }, // 사용량: 10톤
    { unit: '104호', value: 2728 }, // 사용량: 20톤
    { unit: '105호', value: 490 },  // 사용량: 34톤
    { unit: '201호', value: 2207 }, // 사용량: 22톤
    { unit: '202호', value: 295 },  // 사용량: 24톤
    { unit: '203호', value: 2371 }, // 사용량: 23톤
    { unit: '204호', value: 2428 }, // 사용량: 14톤
    { unit: '205호', value: 1089 }  // 사용량: 18톤
  ];

  // 5) 6월 05일 측정값 (익월사용량, 둔지빌 10세대 합계: 19,166)
  const juneData = [
    { unit: '101호', value: 3329 },
    { unit: '102호', value: 2653 },
    { unit: '103호', value: 1411 },
    { unit: '104호', value: 2748 },
    { unit: '105호', value: 534 },
    { unit: '201호', value: 2232 },
    { unit: '202호', value: 322 },
    { unit: '203호', value: 2395 },
    { unit: '204호', value: 2440 },
    { unit: '205호', value: 1102 }
  ];

  saveBatchMeterValues('2026-04', aprilData);
  saveBatchMeterValues('2026-05', mayData);
  saveBatchMeterValues('2026-06', juneData);

  Logger.log('2026년 6월 둔지빌 청구분 실데이터 세팅 완료!');
  return {
    success: true,
    message: '2026년 6월 둔지빌 청구분 고지서(353,730원, 279톤, 단가 1,260원, 총무 권경희) 및 10개 세대 계량기 수치가 성공적으로 세팅되었습니다.'
  };
}

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
  if (userSheet.getLastRow() === 0) {
    userSheet.appendRow(['ID', 'Password', 'Role']);
    userSheet.appendRow(['admin', 'admin1234', 'admin']);
    DEFAULT_UNITS.forEach(function(unit) {
      userSheet.appendRow([unit, unit, 'resident']);
    });
  }

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

  // 기본 시트(Sheet1 등) 정리 (선택사항)
  const defaultSheet = ss.getSheetByName('시트1') || ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 3) {
    try { ss.deleteSheet(defaultSheet); } catch(e) {}
  }

  Logger.log('초기 시트 설정 완료!');
  return { success: true, message: '초기 시트 및 기본 사용자 계정이 준비되었습니다.' };
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
      case 'setupJune2026Data':
        result = setupJune2026Data();
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
      case 'setupJune2026Data':
        result = setupJune2026Data();
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
      sheet.getRange(i + 1, 2).setValue(targetUnit);
      return { success: true, message: targetUnit + '의 비밀번호가 "' + targetUnit + '"(호수명)으로 초기화되었습니다.' };
    }
  }

  return { success: false, message: targetUnit + ' 사용자를 찾을 수 없습니다.' };
}

/**
 * 5. 단일 계량기 수치 저장 (당월 5일 측정값)
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
  const formattedYM = String(yearMonth).trim();
  const formattedUnit = String(unit).trim();
  const now = new Date();
  const updatedAt = Utilities.formatDate(now, 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');

  let foundRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === formattedYM && String(data[i][1]).trim() === formattedUnit) {
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
 * items: [{ unit: '101호', value: 3301 }, ...]
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
 * [청구 주기 및 계산 원칙]
 * 청구월이 yearMonth (예: 2026-06)일 때:
 * - 지난달(M-1) 측정값 (2026-05) - 지지난달(M-2) 측정값 (2026-04) = 세대별 사용량
 * - 1톤당 단가 = (고지서 전체 수도요금 - 2,190원) / 고지서 전체 사용량(톤)
 * - 세대별 기본 수도요금 = 세대별 사용량 × 1톤당 단가
 * - 오차 납부금 = (고지서 총사용량 - 둔지빌 세대합계) × 단가 × (세대사용량 / 세대총사용량)
 * - 세대별 공용전기료 = 고지서 전체 공용전기료 / 10
 * - 세대별 최종 납부총액 = 세대별 수도요금 + 오차납부금 + 수도정액료(219원) + 공용전기료
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

  // 1톤당 단가: (고지서 전체 수도요금 - 2,190원) / 고지서 전체 사용량(톤)
  let unitPrice = 0;
  if (billing.totalUsage > 0 && billing.totalBill > FIXED_WATER_FEE_TOTAL) {
    unitPrice = (billing.totalBill - FIXED_WATER_FEE_TOTAL) / billing.totalUsage;
  }

  // 세대별 공용전기료: 전체 공용전기료 / 10
  const commonElectricPerUnit = Math.round(billing.commonElectric / TOTAL_UNITS);

  // 2) 계량기 데이터 조회
  const meterSheet = ss.getSheetByName('MeterData');
  const meterMap = {};

  if (meterSheet) {
    const mData = meterSheet.getDataRange().getValues();
    for (let i = 1; i < mData.length; i++) {
      const rowYM = String(mData[i][0]).trim();
      const rowUnit = String(mData[i][1]).trim();
      const rowVal = Number(mData[i][2]);
      meterMap[rowUnit + '_' + rowYM] = rowVal;
    }
  }

  // 세대별 실사용량 합계 계산
  let sumCalculatedUsage = 0;
  DEFAULT_UNITS.forEach(function(unit) {
    const prev2Val = meterMap[unit + '_' + prev2YM];
    const prevVal = meterMap[unit + '_' + prevYM];
    if (prevVal !== undefined && prev2Val !== undefined) {
      sumCalculatedUsage += Math.max(0, Math.round((prevVal - prev2Val) * 100) / 100);
    }
  });

  // 고지서 사용량과 세대실측 합계의 오차량(톤) 및 오차납부금 총액 계산
  let errorDiffUsage = 0;
  let errorDiffFeeTotal = 0;
  if (billing.totalUsage > sumCalculatedUsage && sumCalculatedUsage > 0) {
    errorDiffUsage = Math.round((billing.totalUsage - sumCalculatedUsage) * 100) / 100;
    errorDiffFeeTotal = Math.round(errorDiffUsage * unitPrice);
  }

  // 세대별 정산 계산
  const settlements = [];
  let sumWaterFee = 0;
  let sumErrorDiffFee = 0;
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

    // 기본 수도요금 = 사용량 × 단가 (예: 28톤 × 1,260원 = 35,280원)
    const waterFee = Math.round(usage * unitPrice);

    // 오차 납부금 (공용 오차 톤수 배분): 사용량 비율로 안분 (예: 10,502원)
    let errorDiffFee = 0;
    if (errorDiffFeeTotal > 0 && sumCalculatedUsage > 0 && isComplete) {
      errorDiffFee = Math.round(errorDiffFeeTotal * (usage / sumCalculatedUsage));
    }

    // 최종 청구 합계 = 기본수도요금 + 정액료(219원) + 공용전기료(359원) + 오차납부금
    const finalAmount = isComplete
      ? (waterFee + FIXED_WATER_FEE_PER_UNIT + commonElectricPerUnit + errorDiffFee)
      : 0;

    sumWaterFee += waterFee;
    sumErrorDiffFee += errorDiffFee;
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
      errorDiffFee: errorDiffFee,
      finalAmount: finalAmount,
      isComplete: isComplete
    });
  });

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
    errorDiffUsage: errorDiffUsage,
    errorDiffFeeTotal: errorDiffFeeTotal,
    settlements: settlements,
    singleResult: singleResult,
    summary: {
      totalUnits: TOTAL_UNITS,
      completedUnits: settlements.filter(function(s) { return s.isComplete; }).length,
      sumUsage: Math.round(sumCalculatedUsage * 100) / 100,
      sumWaterFee: sumWaterFee,
      sumErrorDiffFee: sumErrorDiffFee,
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

  history.sort(function(a, b) {
    return b.yearMonth.localeCompare(a.yearMonth);
  });

  return { success: true, history: history.slice(0, Number(limit) || 24) };
}
