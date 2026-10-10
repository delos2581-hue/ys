import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  FileCode,
  Github,
  Globe,
  Database,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  ArrowRight,
  BookOpen
} from 'lucide-react';

interface GasGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GasGuideModal: React.FC<GasGuideModalProps> = ({ isOpen, onClose }) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(1);

  if (!isOpen) return null;

  // Code.gs 소스코드 문자열
  const gasCodeString = `/**
 * 빌라 수도 및 공용전기 요금 정산 시스템 - Google Apps Script 백엔드 (Code.gs)
 * 구글 시트 [확장 프로그램] > [Apps Script]에 붙여넣으세요.
 */

const FIXED_WATER_FEE_TOTAL = 2190;
const TOTAL_UNITS = 10;
const FIXED_WATER_FEE_PER_UNIT = 219;
const DEFAULT_UNITS = [
  '101호', '102호', '103호', '104호', '105호',
  '201호', '202호', '203호', '204호', '205호'
];

function setupInitialSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let userSheet = ss.getSheetByName('Users') || ss.insertSheet('Users');
  if (userSheet.getLastRow() === 0) {
    userSheet.appendRow(['ID', 'Password', 'Role']);
    userSheet.appendRow(['admin', 'admin1234', 'admin']);
    DEFAULT_UNITS.forEach(function(unit) { userSheet.appendRow([unit, unit, 'resident']); });
  }

  let meterSheet = ss.getSheetByName('MeterData') || ss.insertSheet('MeterData');
  if (meterSheet.getLastRow() === 0) meterSheet.appendRow(['YearMonth', 'Unit', 'Value', 'UpdatedAt']);

  let billingSheet = ss.getSheetByName('BillingHistory') || ss.insertSheet('BillingHistory');
  if (billingSheet.getLastRow() === 0) billingSheet.appendRow(['YearMonth', 'TotalBill', 'TotalUsage', 'CommonElectric', 'ManagerName', 'AccountInfo']);
  Logger.log('초기 설정 완료!');
  return { success: true, message: '초기 시트가 생성되었습니다.' };
}

// 2026년 6월 둔지빌 실제 청구분 데이터 세팅 함수 (고지서 353,730원/279톤/권경희 총무 및 10세대 수치)
function setupJune2026Data() {
  setupInitialSheets();
  saveBillingInfo('2026-06', 353730, 279, 3590, '권경희', '부산은행 320 12 004078 6');
  const april = [{unit:'101호',value:3273},{unit:'102호',value:2606},{unit:'103호',value:1389},{unit:'104호',value:2708},{unit:'105호',value:456},{unit:'201호',value:2185},{unit:'202호',value:271},{unit:'203호',value:2348},{unit:'204호',value:2414},{unit:'205호',value:1071}];
  const may = [{unit:'101호',value:3301},{unit:'102호',value:2628},{unit:'103호',value:1399},{unit:'104호',value:2728},{unit:'105호',value:490},{unit:'201호',value:2207},{unit:'202호',value:295},{unit:'203호',value:2371},{unit:'204호',value:2428},{unit:'205호',value:1089}];
  const june = [{unit:'101호',value:3329},{unit:'102호',value:2653},{unit:'103호',value:1411},{unit:'104호',value:2748},{unit:'105호',value:534},{unit:'201호',value:2232},{unit:'202호',value:322},{unit:'203호',value:2395},{unit:'204호',value:2440},{unit:'205호',value:1102}];
  saveBatchMeterValues('2026-04', april);
  saveBatchMeterValues('2026-05', may);
  saveBatchMeterValues('2026-06', june);
  return { success: true, message: '2026년 6월 둔지빌 실데이터가 성공적으로 세팅되었습니다.' };
}

function doGet(e) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    const action = params.action || 'ping';
    let result;
    if (action === 'ping') result = { success: true, message: 'Apps Script API 정상 작동 중' };
    else if (action === 'getSettlementData') result = getSettlementData(params.yearMonth, params.unit);
    else if (action === 'setupJune2026Data') result = setupJune2026Data();
    else result = { success: false, error: 'Unknown action' };
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      try { payload = JSON.parse(e.postData.contents); } catch(err) { payload = e.parameter || {}; }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }
    const action = payload.action;
    let result;
    if (action === 'login') result = login(payload.id, payload.password);
    else if (action === 'changePassword') result = changePassword(payload.id, payload.oldPassword, payload.newPassword);
    else if (action === 'resetUserPassword') result = resetUserPassword(payload.adminId, payload.adminPassword, payload.targetUnit);
    else if (action === 'saveMeterValue') result = saveMeterValue(payload.unit, payload.yearMonth, payload.value);
    else if (action === 'saveBatchMeterValues') result = saveBatchMeterValues(payload.yearMonth, payload.items);
    else if (action === 'saveBillingInfo') result = saveBillingInfo(payload.yearMonth, payload.totalBill, payload.totalUsage, payload.commonElectric, payload.managerName, payload.accountInfo);
    else if (action === 'getSettlementData') result = getSettlementData(payload.yearMonth, payload.unit);
    else if (action === 'setupInitialSheets') result = setupInitialSheets();
    else if (action === 'setupJune2026Data') result = setupJune2026Data();
    else result = { success: false, error: 'Unknown POST action: ' + action };

    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function login(id, password) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Users');
  if (!sheet) return { success: false, message: 'Users 시트가 없습니다.' };
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(id).trim()) {
      if (String(data[i][1]).trim() === String(password).trim()) {
        return { success: true, user: { id: data[i][0], role: data[i][2], unit: data[i][2] === 'admin' ? null : data[i][0] } };
      }
      return { success: false, message: '비밀번호가 일치하지 않습니다.' };
    }
  }
  return { success: false, message: '등록되지 않은 호수입니다.' };
}

function changePassword(id, oldPassword, newPassword) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Users');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(id).trim()) {
      if (String(data[i][1]).trim() !== String(oldPassword).trim()) return { success: false, message: '기존 비밀번호가 틀립니다.' };
      sheet.getRange(i + 1, 2).setValue(String(newPassword).trim());
      return { success: true, message: '비밀번호가 변경되었습니다.' };
    }
  }
  return { success: false, message: '사용자를 찾을 수 없습니다.' };
}

function resetUserPassword(adminId, adminPassword, targetUnit) {
  const auth = login(adminId, adminPassword);
  if (!auth.success || auth.user.role !== 'admin') return { success: false, message: '관리자 인증 실패' };
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Users');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(targetUnit).trim()) {
      sheet.getRange(i + 1, 2).setValue(targetUnit);
      return { success: true, message: targetUnit + ' 비밀번호가 리셋되었습니다.' };
    }
  }
  return { success: false, message: targetUnit + ' 미존재' };
}

function saveMeterValue(unit, yearMonth, value) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('MeterData') || ss.insertSheet('MeterData');
  const data = sheet.getDataRange().getValues();
  const ym = String(yearMonth).trim();
  const u = String(unit).trim();
  const now = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
  let found = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === ym && String(data[i][1]).trim() === u) { found = i + 1; break; }
  }
  if (found > 0) {
    sheet.getRange(found, 3).setValue(Number(value));
    sheet.getRange(found, 4).setValue(now);
  } else {
    sheet.appendRow([ym, u, Number(value), now]);
  }
  return { success: true, message: u + ' 수치 저장 완료' };
}

function saveBatchMeterValues(yearMonth, items) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('MeterData') || ss.insertSheet('MeterData');
  const data = sheet.getDataRange().getValues();
  const ym = String(yearMonth).trim();
  const now = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
  const existingRows = {};
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === ym) existingRows[String(data[i][1]).trim()] = i + 1;
  }
  let count = 0;
  items.forEach(function(item) {
    if (!item.unit || item.value === undefined || item.value === '' || isNaN(Number(item.value))) return;
    const u = String(item.unit).trim();
    const val = Number(item.value);
    if (existingRows[u]) {
      sheet.getRange(existingRows[u], 3).setValue(val);
      sheet.getRange(existingRows[u], 4).setValue(now);
    } else {
      sheet.appendRow([ym, u, val, now]);
    }
    count++;
  });
  return { success: true, count: count, message: ym + '월 ' + count + '개 세대 수치 일괄 저장 완료' };
}

function saveBillingInfo(yearMonth, totalBill, totalUsage, commonElectric, managerName, accountInfo) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('BillingHistory') || ss.insertSheet('BillingHistory');
  const data = sheet.getDataRange().getValues();
  const ym = String(yearMonth).trim();
  let found = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === ym) { found = i + 1; break; }
  }
  const rowVals = [ym, Number(totalBill)||0, Number(totalUsage)||0, Number(commonElectric)||0, String(managerName||''), String(accountInfo||'')];
  if (found > 0) sheet.getRange(found, 1, 1, 6).setValues([rowVals]);
  else sheet.appendRow(rowVals);
  return { success: true, message: ym + '월 고지서 정보 저장 완료' };
}

function getSettlementData(yearMonth, targetUnit) {
  const ym = String(yearMonth).trim();
  const prevYM = getPreviousYearMonth(ym, 1);
  const prev2YM = getPreviousYearMonth(ym, 2);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const billingSheet = ss.getSheetByName('BillingHistory');
  let billing = { yearMonth: ym, totalBill: 0, totalUsage: 0, commonElectric: 0, managerName: '', accountInfo: '' };
  if (billingSheet) {
    const bData = billingSheet.getDataRange().getValues();
    for (let i = 1; i < bData.length; i++) {
      if (String(bData[i][0]).trim() === ym) {
        billing = { yearMonth: ym, totalBill: Number(bData[i][1])||0, totalUsage: Number(bData[i][2])||0, commonElectric: Number(bData[i][3])||0, managerName: String(bData[i][4]||''), accountInfo: String(bData[i][5]||'') };
        break;
      }
    }
  }
  let unitPrice = 0;
  if (billing.totalUsage > 0 && billing.totalBill > FIXED_WATER_FEE_TOTAL) {
    unitPrice = (billing.totalBill - FIXED_WATER_FEE_TOTAL) / billing.totalUsage;
  }
  const commonElecPerUnit = Math.round(billing.commonElectric / TOTAL_UNITS);
  const meterSheet = ss.getSheetByName('MeterData');
  const meterMap = {};
  if (meterSheet) {
    const mData = meterSheet.getDataRange().getValues();
    for (let i = 1; i < mData.length; i++) {
      meterMap[String(mData[i][1]).trim() + '_' + String(mData[i][0]).trim()] = Number(mData[i][2]);
    }
  }
  const settlements = [];
  let sumUsage = 0, sumWater = 0, sumTotal = 0;
  DEFAULT_UNITS.forEach(function(unit) {
    const prev2Val = meterMap[unit + '_' + prev2YM];
    const prevVal = meterMap[unit + '_' + prevYM];
    const currentVal = meterMap[unit + '_' + ym];
    const hasPrev2 = prev2Val !== undefined;
    const hasPrev = prevVal !== undefined;
    const usage = (hasPrev && hasPrev2) ? Math.max(0, Math.round((prevVal - prev2Val)*100)/100) : 0;
    const waterFee = Math.round(usage * unitPrice);
    const finalAmount = (hasPrev && hasPrev2) ? (waterFee + FIXED_WATER_FEE_PER_UNIT + commonElecPerUnit) : 0;
    sumUsage += usage; sumWater += waterFee; sumTotal += finalAmount;
    settlements.push({
      unit: unit, prev2Month: prev2YM, prev2Value: hasPrev2 ? prev2Val : null,
      prevMonth: prevYM, prevValue: hasPrev ? prevVal : null,
      currentMonth: ym, currentValue: currentVal !== undefined ? currentVal : null,
      usage: usage, unitPrice: Math.round(unitPrice*100)/100, waterFee: waterFee,
      fixedFee: FIXED_WATER_FEE_PER_UNIT, commonElectricFee: commonElecPerUnit,
      finalAmount: finalAmount, isComplete: (hasPrev && hasPrev2)
    });
  });
  return {
    success: true, yearMonth: ym,
    period: { billingMonth: ym, fromMonth: prev2YM, toMonth: prevYM, description: prev2YM + '월 5일 ~ ' + prevYM + '월 5일 사용분' },
    billing: billing, unitPrice: Math.round(unitPrice*100)/100,
    fixedFeeTotal: FIXED_WATER_FEE_TOTAL, fixedFeePerUnit: FIXED_WATER_FEE_PER_UNIT,
    commonElectricPerUnit: commonElecPerUnit, settlements: settlements,
    singleResult: targetUnit ? settlements.find(function(s){ return s.unit === targetUnit; }) : null,
    summary: { totalUnits: TOTAL_UNITS, completedUnits: settlements.filter(function(s){ return s.isComplete; }).length, sumUsage: Math.round(sumUsage*100)/100, sumWaterFee: sumWater, sumFinalTotal: sumTotal }
  };
}

function getPreviousYearMonth(yearMonthStr, monthsAgo) {
  const parts = yearMonthStr.split('-');
  let y = parseInt(parts[0], 10), m = parseInt(parts[1], 10) - monthsAgo;
  while (m <= 0) { m += 12; y -= 1; }
  return y + '-' + (m < 10 ? '0' : '') + m;
}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(gasCodeString);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* 모달 헤더 */}
        <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-400/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">GitHub + Vercel 배포 & 구글 시트 연동 가이드</h3>
              <p className="text-xs text-slate-400">
                Apps Script 웹앱 대신 버셀(Vercel)로 초고속 호스팅하고 시트를 DB로 연결하는 5단계 순서
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 gap-2 text-xs font-semibold">
          {[
            { id: 1, label: '1. 아키텍처 이해' },
            { id: 2, label: '2. Google 시트 & Code.gs 세팅' },
            { id: 3, label: '3. GitHub 푸시' },
            { id: 4, label: '4. Vercel 배포' },
            { id: 5, label: '5. URL 연동 및 완료' },
          ].map((step) => (
            <button
              key={step.id}
              onClick={() => setActiveStep(step.id)}
              className={`py-3 px-2 border-b-2 transition-all cursor-pointer ${
                activeStep === step.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {step.label}
            </button>
          ))}
        </div>

        {/* 모달 본문 */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700 leading-relaxed">
          {/* STEP 1 */}
          {activeStep === 1 && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                <h4 className="font-bold text-sm text-blue-900 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-blue-600" />
                  <span>왜 Apps Script 웹앱 대신 'Vercel + Google Sheet API' 구조인가요?</span>
                </h4>
                <p className="text-blue-800">
                  Google Apps Script HTML 서비스는 매번 로딩이 느리고 모바일 화면 최적화 및 커스텀 도메인 적용에 한계가 있습니다.
                  반면 <strong>프론트엔드를 Vercel(초고속 CDN)</strong>에 올리고 <strong>백엔드 저장소로 Google 스프레드시트(Apps Script API)</strong>를 활용하면:
                </p>
                <ul className="list-disc list-inside space-y-1 text-blue-900 pl-1">
                  <li>0.5초 만에 열리는 초고속 모바일 친화 웹앱 구축</li>
                  <li>모든 데이터는 내 구글 스프레드시트에 영구 보존 & 관리자가 엑셀로 직접 확인 가능</li>
                  <li>GitHub 커밋만 하면 Vercel에서 무료로 자동 빌드 및 실시간 배포</li>
                </ul>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 space-y-2 bg-slate-50">
                <span className="font-bold text-slate-900 block">전체 시스템 연동 구조도:</span>
                <div className="p-3 bg-white rounded-lg border border-slate-200 font-mono text-[11px] text-slate-700 space-y-1">
                  <div>[입주민 / 총무 스마트폰 브라우저]</div>
                  <div className="text-blue-600 font-bold">  ⬇ 접속 (Vercel 배포 URL, https://your-villa.vercel.app)</div>
                  <div>[React + Tailwind 프론트엔드 UI]</div>
                  <div className="text-emerald-600 font-bold">  ⬇ 실시간 API 요청 (Fetch POST/GET)</div>
                  <div>[Google Apps Script 웹 앱 (Code.gs)]</div>
                  <div className="text-indigo-600 font-bold">  ⬇ 데이터 입출력</div>
                  <div>[Google 스프레드시트: Users, MeterData, BillingHistory]</div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {activeStep === 2 && (
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-600" />
                <span>2단계: 구글 스프레드시트 생성 및 Code.gs 복사 & 배포</span>
              </h4>

              <ol className="list-decimal list-inside space-y-2.5">
                <li>
                  <a
                    href="https://sheets.new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 font-semibold underline inline-flex items-center gap-1"
                  >
                    Google 스프레드시트 새로 만들기 <ExternalLink className="w-3 h-3" />
                  </a>
                  에 접속하여 새 시트를 생성합니다 (제목 예: '빌라 수도 정산 데이터베이스').
                </li>
                <li>
                  상단 메뉴에서 <strong>[확장 프로그램] &gt; [Apps Script]</strong>를 클릭합니다.
                </li>
                <li>
                  기존 `Code.gs` 내용을 모두 지우고, 아래의 <strong>Code.gs 코드를 복사</strong>하여 붙여넣은 뒤 저장(Ctrl+S)합니다.
                </li>
                <li>
                  상단 함수 선택창에서 <strong>setupInitialSheets</strong>를 선택하고 <strong>[실행]</strong> 버튼을 누릅니다. (초기 101~205호 및 admin 계정, 시트 탭이 자동 생성됩니다)
                </li>
                <li>
                  우측 상단 파란색 <strong>[배포] &gt; [새 배포]</strong> 클릭:
                  <div className="ml-4 mt-1.5 p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1 text-amber-900 font-medium">
                    <div>• 유형 선택: <strong>웹 앱</strong> (톱니바퀴 아이콘)</div>
                    <div>• 설명: <strong>빌라 요금정산 API</strong></div>
                    <div>• 다음 사용자 권한으로 실행: <strong>나(내 구글 계정)</strong></div>
                    <div>• 액세스 권한이 있는 사용자: <strong className="text-rose-600 underline">모든 사용자 (Anyone)</strong> ★필수!</div>
                  </div>
                </li>
                <li>
                  배포 완료 후 화면에 나오는 <strong>웹 앱 URL (https://script.google.com/macros/s/.../exec)</strong>을 복사해 둡니다!
                </li>
              </ol>

              {/* Code.gs 복사 박스 */}
              <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden bg-slate-900 text-slate-200">
                <div className="p-3 bg-slate-800 flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-300 flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-blue-400" />
                    Code.gs 소스코드
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>복사 완료!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>코드 전체 복사</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 text-[11px] font-mono overflow-x-auto max-h-48 text-slate-300">
                  {gasCodeString}
                </pre>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {activeStep === 3 && (
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Github className="w-4 h-4 text-slate-900" />
                <span>3단계: GitHub 레포지토리에 프로젝트 업로드</span>
              </h4>

              <p>현재 애플리케이션 코드를 본인의 GitHub 저장소에 올립니다:</p>

              <ol className="list-decimal list-inside space-y-2">
                <li>
                  <a
                    href="https://github.com/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 font-semibold underline inline-flex items-center gap-1"
                  >
                    GitHub New Repository <ExternalLink className="w-3 h-3" />
                  </a>
                  에서 새 저장소(예: <code>villa-water-billing</code>)를 생성합니다.
                </li>
                <li>터미널에서 아래 명령어로 프로젝트를 푸시합니다:</li>
              </ol>

              <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-[11px] space-y-1 overflow-x-auto">
                <div className="text-slate-400"># 1. git 초기화 및 커밋</div>
                <div>git init</div>
                <div>git add .</div>
                <div>git commit -m "feat: villa water billing app with GAS integration"</div>
                <div className="text-slate-400 pt-2"># 2. 내 깃허브 원격 저장소 연결 및 푸시</div>
                <div>git branch -M main</div>
                <div>git remote add origin https://github.com/YOUR_GITHUB_ID/villa-water-billing.git</div>
                <div>git push -u origin main</div>
              </div>
            </div>
          )}

          {/* STEP 4 */}
          {activeStep === 4 && (
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-indigo-600" />
                <span>4단계: Vercel에서 1분 만에 무료 배포</span>
              </h4>

              <ol className="list-decimal list-inside space-y-2.5">
                <li>
                  <a
                    href="https://vercel.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 font-semibold underline inline-flex items-center gap-1"
                  >
                    Vercel.com <ExternalLink className="w-3 h-3" />
                  </a>
                  에 접속하여 로그인합니다 (GitHub 계정으로 원클릭 로그인 추천).
                </li>
                <li>
                  대시보드 우측 상단 <strong>[Add New...] &gt; [Project]</strong> 버튼을 클릭합니다.
                </li>
                <li>
                  방금 깃허브에 푸시한 <strong>villa-water-billing</strong> 저장소 옆의 <strong>[Import]</strong> 버튼을 누릅니다.
                </li>
                <li>
                  별도 설정 수정 없이 <strong>[Deploy]</strong> 버튼을 클릭합니다. (Vite 환경과 vercel.json이 이미 프로젝트에 설정되어 있어 30초 내에 빌드 완료됩니다!)
                </li>
                <li>
                  축하합니다! 이제 <code>https://villa-water-billing.vercel.app</code> 형태의 전 세계 접속 가능한 웹 링크가 생성되었습니다.
                </li>
              </ol>
            </div>
          )}

          {/* STEP 5 */}
          {activeStep === 5 && (
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>5단계: 배포된 사이트에서 구글 시트 연동 완료하기</span>
              </h4>

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-emerald-900">
                <p className="font-semibold">
                  이제 배포된 Vercel 웹 사이트로 접속하여 마지막 한 가지만 설정하면 끝납니다!
                </p>
                <ol className="list-decimal list-inside space-y-1.5 pl-1">
                  <li>배포된 Vercel 사이트 우측 상단의 <strong>[연동 설정] (톱니바퀴 아이콘)</strong> 클릭</li>
                  <li>2단계에서 복사해둔 <strong>Google Apps Script 웹 앱 URL</strong>을 입력창에 붙여넣기</li>
                  <li><strong>[연결 테스트 (Ping)]</strong> 버튼을 눌러 "정상 연결" 초록색 메시지 확인 후 저장</li>
                </ol>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-slate-600">
                <span className="font-bold text-slate-800">✅ 이제 모든 준비가 끝났습니다!</span>
                <p>
                  • 입주민들에게 Vercel 주소를 카카오톡 등으로 공유하면 끝납니다.
                  • 매월 5일 세대원들이 스마트폰으로 접속해 수치를 입력하면 구글 스프레드시트에 즉시 기록됩니다.
                  • 관리자는 고지서 금액만 넣으면 1초 만에 10개 세대 정산표와 카톡 공지문이 완성됩니다.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 모달 푸터 */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex gap-2">
            {activeStep > 1 && (
              <button
                onClick={() => setActiveStep((prev) => prev - 1)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                이전 단계
              </button>
            )}
            {activeStep < 5 && (
              <button
                onClick={() => setActiveStep((prev) => prev + 1)}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer flex items-center gap-1"
              >
                <span>다음 단계</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
