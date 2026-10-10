import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Calendar,
  CreditCard,
  Download,
  FileSpreadsheet,
  KeyRound,
  Printer,
  RefreshCw,
  Save,
  Shield,
  MessageSquare,
  Check,
  AlertTriangle,
  UserCheck,
  Edit3,
  Layers,
  ChevronDown,
  Gauge,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { Api, getPreviousYearMonth, getLatestManagerInfo } from '../services/api';
import { BillingRecord, SettlementData, SettlementItem, User } from '../types';
import { DEFAULT_UNITS } from '../services/defaultData';

interface AdminViewProps {
  user: User;
}

export const AdminView: React.FC<AdminViewProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'settlement' | 'batchMeter' | 'billing' | 'password' | 'preview'>('settlement');
  const [selectedYM, setSelectedYM] = useState('2026-06');
  const [settlementData, setSettlementData] = useState<SettlementData | null>(null);
  const [loading, setLoading] = useState(false);

  // 고지서 입력 폼 상태
  const [totalBill, setTotalBill] = useState(248500);
  const [totalUsage, setTotalUsage] = useState(142);
  const [commonElectric, setCommonElectric] = useState(85000);
  const [managerName, setManagerName] = useState('203호 김총무');
  const [accountInfo, setAccountInfo] = useState('카카오뱅크 3333-12-8976543 (예금주: 김민수)');
  const [billingSaveMsg, setBillingSaveMsg] = useState<string | null>(null);

  // 10세대 계량기 한꺼번에 입력 상태
  const [batchYM, setBatchYM] = useState(() => getPreviousYearMonth('2026-06', 1)); // 기본 2026-05 (6월 청구 기준월)
  const [batchValues, setBatchValues] = useState<Record<string, string>>({});
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchSaveMsg, setBatchSaveMsg] = useState<string | null>(null);

  // 대리 검침 입력 모달 상태
  const [editUnitModal, setEditUnitModal] = useState<string | null>(null);
  const [editUnitMonth, setEditUnitMonth] = useState('2026-05');
  const [editUnitValue, setEditUnitValue] = useState('');

  // 비밀번호 초기화 상태
  const [adminAuthPw, setAdminAuthPw] = useState('admin1234');
  const [pwResetMsg, setPwResetMsg] = useState<string | null>(null);
  const [pwResetLoading, setPwResetLoading] = useState(false);

  // 카카오톡 텍스트 복사 상태
  const [copiedKakao, setCopiedKakao] = useState(false);

  // 세대별 영수증 미리보기용 호수
  const [previewUnit, setPreviewUnit] = useState('101호');

  // 10세대 일괄 데이터 로드
  const loadBatchMeterData = (targetYM: string) => {
    const allRecords = Api.getMeterRecords();
    const map: Record<string, string> = {};
    DEFAULT_UNITS.forEach((unit) => {
      const rec = allRecords.find((r) => r.unit === unit && r.yearMonth === targetYM);
      map[unit] = rec ? String(rec.value) : '';
    });
    setBatchValues(map);
  };

  useEffect(() => {
    loadBatchMeterData(batchYM);
  }, [batchYM]);

  // 데이터 로드
  const loadSettlement = async (ym: string = selectedYM) => {
    setLoading(true);
    try {
      const data = await Api.getSettlementData(ym);
      setSettlementData(data);
      if (data.billing) {
        setTotalBill(data.billing.totalBill || 0);
        setTotalUsage(data.billing.totalUsage || 0);
        setCommonElectric(data.billing.commonElectric || 0);

        // 총무 정보: 해당 월에 이미 등록된 총무 정보가 있으면 그것을 유지/고정하고,
        // 아직 비어있는 경우 가장 최근에 입력했던 총무 정보를 자동으로 계승 채움
        const latest = getLatestManagerInfo();
        setManagerName(data.billing.managerName || latest.managerName);
        setAccountInfo(data.billing.accountInfo || latest.accountInfo);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettlement(selectedYM);
  }, [selectedYM]);

  // 고지서 정보 저장 (해당 청구월에 고정 저장됨)
  const handleSaveBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    setBillingSaveMsg(null);
    try {
      const record: BillingRecord = {
        yearMonth: selectedYM,
        totalBill: Number(totalBill) || 0,
        totalUsage: Number(totalUsage) || 0,
        commonElectric: Number(commonElectric) || 0,
        managerName: managerName.trim(),
        accountInfo: accountInfo.trim()
      };
      const res = await Api.saveBillingInfo(record);
      setBillingSaveMsg(`${selectedYM}월 고지서와 총무 정보가 저장되어 이 달에 고정되었습니다.`);
      await loadSettlement(selectedYM);
      setTimeout(() => setBillingSaveMsg(null), 3500);
    } catch {
      alert('고지서 정보 저장 중 오류가 발생했습니다.');
    }
  };

  // 10세대 계량기 수치 한꺼번에 일괄 저장 핸들러
  const handleSaveAllBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setBatchLoading(true);
    setBatchSaveMsg(null);
    try {
      const items = DEFAULT_UNITS.map((unit) => ({
        unit,
        value: batchValues[unit] !== undefined && batchValues[unit] !== '' ? parseFloat(batchValues[unit]) : NaN
      })).filter((item) => !isNaN(item.value));

      if (items.length === 0) {
        alert('저장할 계량기 수치를 하나 이상 입력해주세요.');
        setBatchLoading(false);
        return;
      }

      const res = await Api.saveBatchMeterValues(batchYM, items);
      setBatchSaveMsg(res.message);
      await loadSettlement(selectedYM);
      loadBatchMeterData(batchYM);
      setTimeout(() => setBatchSaveMsg(null), 4000);
    } catch {
      alert('일괄 저장 중 오류가 발생했습니다.');
    } finally {
      setBatchLoading(false);
    }
  };

  // 실시간 1톤당 단가 계산 프리뷰
  const previewUnitPrice =
    totalUsage > 0 && totalBill > 2190
      ? (totalBill - 2190) / totalUsage
      : 0;

  // 관리자 대리 계량기 수치 저장
  const handleSaveProxyMeter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUnitModal || !editUnitValue || isNaN(Number(editUnitValue))) {
      alert('올바른 계량기 수치를 입력해주세요.');
      return;
    }

    try {
      await Api.saveMeterValue(editUnitModal, editUnitMonth, parseFloat(editUnitValue));
      setEditUnitModal(null);
      await loadSettlement(selectedYM);
    } catch {
      alert('수치 저장 실패');
    }
  };

  // 세대 비밀번호 초기화 (호수명으로 리셋)
  const handleResetPassword = async (targetUnit: string) => {
    if (!window.confirm(`${targetUnit}의 비밀번호를 초기값("${targetUnit}")으로 리셋하시겠습니까?`)) {
      return;
    }

    setPwResetLoading(true);
    setPwResetMsg(null);
    try {
      const res = await Api.resetUserPassword('admin', adminAuthPw, targetUnit);
      setPwResetMsg(res.message);
      setTimeout(() => setPwResetMsg(null), 4000);
    } catch {
      setPwResetMsg('비밀번호 초기화 실패');
    } finally {
      setPwResetLoading(false);
    }
  };

  // 카카오톡 단톡방 공지 텍스트 생성 및 복사
  const handleCopyKakaoNotice = () => {
    if (!settlementData) return;

    const b = settlementData.billing;
    const periodDesc = settlementData.period.description;
    const lines = [
      `📢 [빌라 ${selectedYM}월 수도 및 공용전기 요금 정산 안내]`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📅 사용 기간: ${periodDesc}`,
      `💧 전체 수도요금: ${b.totalBill.toLocaleString()}원 (${b.totalUsage}톤)`,
      `⚡ 공용 전기요금: ${b.commonElectric.toLocaleString()}원 (세대당 ${(b.commonElectric / 10).toLocaleString()}원)`,
      `💧 1톤당 수도단가: ${settlementData.unitPrice.toLocaleString()}원`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `[세대별 최종 입금 금액]`,
    ];

    settlementData.settlements.forEach((s) => {
      const usageStr = s.isComplete ? `${s.usage}톤` : '검침확인중';
      lines.push(`• ${s.unit}: ${s.finalAmount.toLocaleString()}원 (${usageStr})`);
    });

    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`👤 이번 총무: ${b.managerName}`);
    lines.push(`🏦 입금 계좌: ${b.accountInfo}`);
    lines.push(`* 입금 시 입금자명은 [호수]로 부탁드립니다. 감사합니다! 🙏`);

    const fullText = lines.join('\n');
    navigator.clipboard.writeText(fullText);
    setCopiedKakao(true);
    setTimeout(() => setCopiedKakao(false), 2500);
  };

  // CSV 다운로드
  const handleDownloadCSV = () => {
    if (!settlementData) return;
    const headers = [
      '호수',
      '지지난달(M-2)수치',
      '지난달(M-1)수치',
      '사용량(톤)',
      '1톤단가(원)',
      '세대수도요금(원)',
      '정액료(원)',
      '공용전기료(원)',
      '최종청구액(원)'
    ];

    const rows = settlementData.settlements.map((s) => [
      s.unit,
      s.prev2Value ?? '',
      s.prevValue ?? '',
      s.usage,
      s.unitPrice,
      s.waterFee,
      s.fixedFee,
      s.commonElectricFee,
      s.finalAmount
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `빌라_요금정산표_${selectedYM}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const previewSingle = settlementData?.settlements.find((s) => s.unit === previewUnit);

  return (
    <div className="space-y-6">
      {/* 관리자 환영 & 상단 바 */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-400/30">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">빌라 관리자(총무) 정산 센터</h2>
              <span className="text-[11px] bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded font-mono">
                admin
              </span>
            </div>
            <p className="text-xs text-slate-400">
              고지서 금액 입력, 10개 세대 일괄 정산, 단톡방 공지문 복사 및 비밀번호 초기화 관리
            </p>
          </div>
        </div>

        {/* 청구월 선택 & 새로고침 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-300 font-medium">청구 연월:</span>
          <select
            value={selectedYM}
            onChange={(e) => setSelectedYM(e.target.value)}
            className="text-xs font-semibold bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="2026-06">2026년 06월</option>
            <option value="2026-05">2026년 05월</option>
            <option value="2026-07">2026년 07월</option>
            <option value="2026-08">2026년 08월</option>
          </select>
          <button
            onClick={() => loadSettlement(selectedYM)}
            disabled={loading}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors cursor-pointer"
            title="새로고침"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('settlement')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'settlement'
              ? 'bg-white text-blue-600 border-t border-x border-slate-200 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>전체 10세대 정산표</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('batchMeter');
            loadBatchMeterData(batchYM);
          }}
          className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'batchMeter'
              ? 'bg-white text-blue-600 border-t border-x border-slate-200 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Gauge className="w-4 h-4 text-blue-600" />
          <span className="font-bold">10세대 계량기 한꺼번에 입력</span>
          <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-bold">
            총무전용
          </span>
        </button>

        <button
          onClick={() => setActiveTab('billing')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'billing'
              ? 'bg-white text-blue-600 border-t border-x border-slate-200 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>고지서 및 총무정보 입력</span>
        </button>

        <button
          onClick={() => setActiveTab('preview')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'preview'
              ? 'bg-white text-blue-600 border-t border-x border-slate-200 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>세대별 개별 영수증 확인</span>
        </button>

        <button
          onClick={() => setActiveTab('password')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'password'
              ? 'bg-white text-blue-600 border-t border-x border-slate-200 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>세대 비밀번호 초기화</span>
        </button>
      </div>

      {/* 탭 1: 전체 10세대 요금 정산표 */}
      {activeTab === 'settlement' && (
        <div className="space-y-6">
          {/* 핵심 지표 KPI 카드 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block">
                전체 수도요금 고지서
              </span>
              <span className="text-lg sm:text-xl font-bold text-slate-900">
                {settlementData?.billing.totalBill.toLocaleString()} 원
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                전체 {settlementData?.billing.totalUsage} 톤
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block">
                1톤당 환산 단가
              </span>
              <span className="text-lg sm:text-xl font-bold text-blue-600">
                {settlementData?.unitPrice.toLocaleString()} 원
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                (수도요금-2,190) ÷ 톤
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block">
                공용 전기료 (1/10)
              </span>
              <span className="text-lg sm:text-xl font-bold text-amber-600">
                {settlementData?.commonElectricPerUnit.toLocaleString()} 원
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                총 {settlementData?.billing.commonElectric.toLocaleString()} 원
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block">
                정산 완료 세대수
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-lg sm:text-xl font-bold text-emerald-600">
                  {settlementData?.summary.completedUnits}
                </span>
                <span className="text-xs text-slate-400">/ 10 세대</span>
              </div>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                총 청구합계 {settlementData?.summary.sumFinalTotal.toLocaleString()}원
              </span>
            </div>
          </div>

          {/* 액션 버튼 바 (카카오톡 복사, 엑셀, 인쇄) */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">
                정산 기준 기간:
              </span>
              <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-100">
                {settlementData?.period.description}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* 카카오톡 공지문 복사 버튼 */}
              <button
                type="button"
                onClick={handleCopyKakaoNotice}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  copiedKakao
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#FEE500] hover:bg-[#FADA0A] text-slate-900 shadow-xs'
                }`}
              >
                {copiedKakao ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>복사 완료! 단톡방에 붙여넣으세요</span>
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-3.5 h-3.5 text-slate-900" />
                    <span>카톡 단톡방 공지문 복사</span>
                  </>
                )}
              </button>

              {/* CSV 다운로드 */}
              <button
                type="button"
                onClick={handleDownloadCSV}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>엑셀(CSV) 저장</span>
              </button>

              {/* 인쇄 */}
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>정산표 인쇄</span>
              </button>
            </div>
          </div>

          {/* 10개 세대 종합 정산표 테이블 */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-3 px-3 font-semibold">호수</th>
                    <th className="py-3 px-2 text-right font-semibold">
                      지지난달 수치 ({settlementData?.period.fromMonth})
                    </th>
                    <th className="py-3 px-2 text-right font-semibold">
                      지난달 수치 ({settlementData?.period.toMonth})
                    </th>
                    <th className="py-3 px-2 text-right font-semibold text-blue-700">
                      사용량(톤)
                    </th>
                    <th className="py-3 px-2 text-right font-semibold">
                      수도요금
                    </th>
                    <th className="py-3 px-2 text-right font-semibold">
                      정액료(219원)
                    </th>
                    <th className="py-3 px-2 text-right font-semibold">
                      공용전기(1/10)
                    </th>
                    <th className="py-3 px-3 text-right font-bold text-slate-900">
                      최종납부액
                    </th>
                    <th className="py-3 px-3 text-center font-semibold">상태 및 수정</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {settlementData?.settlements.map((item) => (
                    <tr key={item.unit} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        {item.unit}
                      </td>
                      <td className="py-3 px-2 text-right text-slate-600">
                        {item.prev2Value !== null ? `${item.prev2Value} 톤` : '-'}
                      </td>
                      <td className="py-3 px-2 text-right text-slate-600">
                        {item.prevValue !== null ? `${item.prevValue} 톤` : '-'}
                      </td>
                      <td className="py-3 px-2 text-right font-semibold text-blue-700">
                        {item.usage.toFixed(2)} 톤
                      </td>
                      <td className="py-3 px-2 text-right text-slate-700">
                        {item.waterFee.toLocaleString()} 원
                      </td>
                      <td className="py-3 px-2 text-right text-slate-500">
                        {item.fixedFee.toLocaleString()} 원
                      </td>
                      <td className="py-3 px-2 text-right text-slate-500">
                        {item.commonElectricFee.toLocaleString()} 원
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-sm text-blue-600">
                        {item.finalAmount.toLocaleString()} 원
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {item.isComplete ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
                              <Check className="w-3 h-3" /> 완료
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-50 text-amber-700 px-2 py-0.5 rounded">
                              <AlertTriangle className="w-3 h-3" /> 미입력
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setEditUnitModal(item.unit);
                              setEditUnitMonth(settlementData.period.toMonth);
                              setEditUnitValue(item.prevValue !== null ? String(item.prevValue) : '');
                            }}
                            className="p-1 hover:bg-slate-200 text-slate-500 rounded cursor-pointer"
                            title="관리자 대리 검침값 수정"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* 합계 행 */}
                <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300">
                  <tr>
                    <td className="py-3 px-3 text-slate-900">전체 10세대 합계</td>
                    <td className="py-3 px-2 text-right text-slate-500">-</td>
                    <td className="py-3 px-2 text-right text-slate-500">-</td>
                    <td className="py-3 px-2 text-right text-blue-800 font-black">
                      {settlementData?.summary.sumUsage.toFixed(2)} 톤
                    </td>
                    <td className="py-3 px-2 text-right text-slate-800">
                      {settlementData?.summary.sumWaterFee.toLocaleString()} 원
                    </td>
                    <td className="py-3 px-2 text-right text-slate-800">
                      {(settlementData?.fixedFeeTotal || 2190).toLocaleString()} 원
                    </td>
                    <td className="py-3 px-2 text-right text-slate-800">
                      {settlementData?.billing.commonElectric.toLocaleString()} 원
                    </td>
                    <td className="py-3 px-3 text-right text-sm text-blue-700 font-black">
                      {settlementData?.summary.sumFinalTotal.toLocaleString()} 원
                    </td>
                    <td className="py-3 px-3 text-center text-slate-500">합계 검증</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 탭 2: 10세대 계량기 수치 한꺼번에 일괄 입력 (총무 전용) */}
      {activeTab === 'batchMeter' && (
        <div className="space-y-6">
          {/* 상단 안내 & 연월 선택 바 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Gauge className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>10세대 계량기 수치 한꺼번에 입력</span>
                  <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                    구글 시트 실시간 일괄 저장
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  매월 5일 세대별 계량기를 순회 검침한 후, 10개 호수의 수치를 한 화면에서 순차 입력하고 [한 번에 일괄 저장]합니다.
                </p>
              </div>
            </div>

            {/* 검침 연월 선택기 */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-700">검침 연월:</span>
              <input
                type="month"
                value={batchYM}
                onChange={(e) => setBatchYM(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                type="button"
                onClick={() => setBatchYM(getPreviousYearMonth(selectedYM, 1))}
                className="px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                title="선택된 고지서의 청구 기준 측정월로 설정"
              >
                청구 기준월({getPreviousYearMonth(selectedYM, 1)})
              </button>
              <button
                type="button"
                onClick={() => setBatchYM(selectedYM)}
                className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors cursor-pointer"
              >
                당월({selectedYM})
              </button>
            </div>
          </div>

          {/* 성공 메시지 */}
          {batchSaveMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2.5 shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{batchSaveMsg}</span>
            </div>
          )}

          {/* 10세대 일괄 입력 폼 테이블 */}
          <form onSubmit={handleSaveAllBatch} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-600">
                • <strong>{batchYM}월 5일 검침분</strong> 입력 중 (키보드 Tab 키로 다음 호수로 빠르게 이동 가능)
              </div>
              <div className="text-xs font-semibold text-slate-700 flex items-center gap-3">
                <span>
                  입력 완료:{' '}
                  <strong className="text-blue-600">
                    {DEFAULT_UNITS.filter((u) => batchValues[u] !== undefined && batchValues[u] !== '').length}
                  </strong>{' '}
                  / 10 세대
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-3 px-4 font-semibold w-24">호수</th>
                    <th className="py-3 px-3 text-right font-semibold">
                      직전달 ({getPreviousYearMonth(batchYM, 1)}) 수치
                    </th>
                    <th className="py-3 px-4 text-center font-bold text-blue-700 w-48">
                      {batchYM}월 계량기 수치 (톤)
                    </th>
                    <th className="py-3 px-3 text-right font-semibold">
                      증가 사용량 (톤)
                    </th>
                    <th className="py-3 px-3 text-center font-semibold w-24">
                      상태
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {DEFAULT_UNITS.map((unit, index) => {
                    const prevYM = getPreviousYearMonth(batchYM, 1);
                    const allMeters = Api.getMeterRecords();
                    const prevRec = allMeters.find((m) => m.unit === unit && m.yearMonth === prevYM);
                    const prevVal = prevRec ? prevRec.value : null;

                    const currentValStr = batchValues[unit] || '';
                    const hasVal = currentValStr !== '' && !isNaN(Number(currentValStr));
                    const currentNum = hasVal ? parseFloat(currentValStr) : null;
                    const diff =
                      currentNum !== null && prevVal !== null
                        ? Math.max(0, Math.round((currentNum - prevVal) * 100) / 100)
                        : null;

                    return (
                      <tr key={unit} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                          <span>{unit}</span>
                        </td>

                        <td className="py-3 px-3 text-right text-slate-600 font-medium">
                          {prevVal !== null ? `${prevVal} 톤` : <span className="text-slate-400">기록없음</span>}
                        </td>

                        <td className="py-2.5 px-4 text-center">
                          <div className="relative max-w-[170px] mx-auto">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              placeholder={prevVal !== null ? String(prevVal) : '0.0'}
                              value={currentValStr}
                              onChange={(e) => {
                                const val = e.target.value;
                                setBatchValues((prev) => ({ ...prev, [unit]: val }));
                              }}
                              className={`w-full px-3 py-1.5 text-sm font-bold text-center border rounded-xl outline-none transition-all ${
                                hasVal
                                  ? 'border-blue-400 bg-blue-50/40 text-blue-900 focus:ring-2 focus:ring-blue-500'
                                  : 'border-slate-300 bg-white text-slate-700 focus:ring-2 focus:ring-blue-400'
                              }`}
                            />
                            <span className="absolute right-2.5 top-2 text-[10px] text-slate-400 pointer-events-none">
                              톤
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-right font-bold">
                          {diff !== null ? (
                            <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                              +{diff.toFixed(2)} 톤
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-center">
                          {hasVal ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md">
                              <Check className="w-3 h-3 text-emerald-600" />
                              입력완료
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
                              미입력
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 하단 일괄 저장 액션 바 */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-600">
                * 저장 시 구글 시트('MeterData' 탭) 및 로컬 데이터베이스에 10개 세대가 즉시 일괄 갱신됩니다.
              </div>

              <button
                type="submit"
                disabled={batchLoading}
                className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {batchLoading ? (
                  <span>구글 시트에 일괄 저장 중...</span>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>10개 세대 수치 한 번에 저장하기</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 탭 3: 고지서 및 총무정보 입력/수정 */}
      {activeTab === 'billing' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <Calculator className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {selectedYM}월 수도 및 공용전기 고지서 정보 입력
              </h3>
              <p className="text-xs text-slate-500">
                고지서 총액 및 3개월 순환 총무 계좌정보를 입력하면 즉시 단가와 세대별 요금이 자동 계산됩니다.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveBilling} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  고지서 전체 수도요금 (원)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    required
                    value={totalBill}
                    onChange={(e) => setTotalBill(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="예: 248500"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400">원</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  고지서 전체 사용량 (톤)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    required
                    value={totalUsage}
                    onChange={(e) => setTotalUsage(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="예: 142"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400">톤</span>
                </div>
              </div>
            </div>

            {/* 실시간 단가 계산기 프리뷰 박스 */}
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs space-y-1">
              <div className="flex justify-between items-center text-blue-900 font-semibold">
                <span>자동 산출 1톤당 단가:</span>
                <span className="text-base font-black text-blue-700">
                  {previewUnitPrice.toFixed(2)} 원 / 톤
                </span>
              </div>
              <p className="text-[11px] text-blue-600">
                * 계산식: (수도요금 {totalBill.toLocaleString()}원 - 정액료 2,190원) ÷ {totalUsage}톤
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                고지서 전체 공용 전기료 (원)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  required
                  value={commonElectric}
                  onChange={(e) => setCommonElectric(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="예: 85000"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400">원</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                10개 세대에 균등 1/N 분할되어 세대당{' '}
                <strong className="text-slate-800">
                  {Math.round(commonElectric / 10).toLocaleString()}원
                </strong>
                씩 부과됩니다.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                <h4 className="text-xs font-bold text-slate-800">
                  3개월 순환 총무 및 입금 계좌 정보
                </h4>
                <span className="text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-semibold">
                  최근 입력 정보 자동 유지 & 저장 시 {selectedYM}월에 고정
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">
                💡 가장 최근에 입력한 총무 정보가 자동으로 불러와지며, [저장] 시 {selectedYM}월 고지서에 확정 고정되어 세대원 영수증에 표시됩니다.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    현재 총무 이름 / 호수
                  </label>
                  <input
                    type="text"
                    required
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                    placeholder="예: 203호 김총무"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    입금받을 계좌번호 및 예금주
                  </label>
                  <input
                    type="text"
                    required
                    value={accountInfo}
                    onChange={(e) => setAccountInfo(e.target.value)}
                    placeholder="예: 카카오뱅크 3333-12-8976543 (예금주: 김민수)"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    세대원 화면에 입금 계좌로 표시되며, 복사 버튼이 활성화됩니다.
                  </p>
                </div>
              </div>
            </div>

            {billingSaveMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-medium flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{billingSaveMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>고지서 및 총무정보 저장하기</span>
            </button>
          </form>
        </div>
      )}

      {/* 탭 3: 세대별 개별 영수증 확인 (관리자 조회용) */}
      {activeTab === 'preview' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                세대별 개별 고지서 영수증 미리보기
              </h3>
              <p className="text-xs text-slate-500">
                특정 세대 입주민이 요금 문의를 할 때 바로 영수증 형태로 확인할 수 있습니다.
              </p>
            </div>

            {/* 호수 선택 버튼 */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {DEFAULT_UNITS.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setPreviewUnit(u)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                    previewUnit === u
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          {previewSingle ? (
            <div className="max-w-md mx-auto p-5 rounded-2xl border border-slate-200 bg-slate-50/50 shadow-sm space-y-4">
              <div className="text-center border-b pb-3 border-slate-200">
                <span className="text-xs font-bold text-blue-600 block">{selectedYM}월 고지서</span>
                <h4 className="text-lg font-black text-slate-900">{previewSingle.unit} 납부 영수증</h4>
                <p className="text-[11px] text-slate-500">
                  {settlementData?.period.description}
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">지지난달 수치 ({previewSingle.prev2Month})</span>
                  <span className="font-semibold">{previewSingle.prev2Value ?? '미입력'} 톤</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">지난달 수치 ({previewSingle.prevMonth})</span>
                  <span className="font-semibold">{previewSingle.prevValue ?? '미입력'} 톤</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 text-blue-700 font-bold">
                  <span>실사용량</span>
                  <span>{previewSingle.usage.toFixed(2)} 톤</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">수도요금 (단가 {previewSingle.unitPrice.toLocaleString()}원)</span>
                  <span className="font-semibold">{previewSingle.waterFee.toLocaleString()} 원</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">수도 기본 정액료</span>
                  <span className="font-semibold">{previewSingle.fixedFee.toLocaleString()} 원</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">공용 전기료 (1/10)</span>
                  <span className="font-semibold">{previewSingle.commonElectricFee.toLocaleString()} 원</span>
                </div>
                <div className="pt-2 border-t-2 border-slate-300 flex justify-between items-center text-sm font-black text-slate-900">
                  <span>최종 납부 총액</span>
                  <span className="text-lg text-blue-600">{previewSingle.finalAmount.toLocaleString()} 원</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs">
                <span className="block text-[11px] text-amber-800 font-semibold">
                  입금 계좌: {settlementData?.billing.accountInfo}
                </span>
                <span className="text-[11px] text-amber-700">
                  담당 총무: {settlementData?.billing.managerName}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-400 py-8 text-xs">
              선택한 세대의 정산 데이터가 없습니다.
            </div>
          )}
        </div>
      )}

      {/* 탭 4: 세대 비밀번호 초기화 관리 */}
      {activeTab === 'password' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <KeyRound className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">
                세대별 비밀번호 초기화 (관리자 권한)
              </h3>
              <p className="text-xs text-slate-500">
                세대원이 비밀번호를 잊어버린 경우, 해당 호수 이름으로 비밀번호를 초기화(리셋)할 수 있습니다.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              관리자 비밀번호 확인
            </label>
            <input
              type="password"
              value={adminAuthPw}
              onChange={(e) => setAdminAuthPw(e.target.value)}
              placeholder="admin 비밀번호"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              초기 관리자 비밀번호: <strong>admin1234</strong>
            </p>
          </div>

          {pwResetMsg && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-800 text-xs font-medium">
              {pwResetMsg}
            </div>
          )}

          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-700">10개 세대 초기화 목록</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEFAULT_UNITS.map((unit) => (
                <div
                  key={unit}
                  className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-slate-600" />
                    <span className="text-xs font-bold text-slate-800">{unit}</span>
                  </div>
                  <button
                    type="button"
                    disabled={pwResetLoading}
                    onClick={() => handleResetPassword(unit)}
                    className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    '{unit}'으로 리셋
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 관리자 대리 검침값 수정 모달 */}
      {editUnitModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <h4 className="text-sm font-bold text-slate-900 mb-2">
              {editUnitModal} 대리 검침 수치 수정
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              세대원이 직접 입력하지 못했을 때 관리자가 대신 수치를 입력/수정합니다.
            </p>

            <form onSubmit={handleSaveProxyMeter} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  검침 대상 연월
                </label>
                <input
                  type="month"
                  value={editUnitMonth}
                  onChange={(e) => setEditUnitMonth(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  계량기 수치 (톤)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  value={editUnitValue}
                  onChange={(e) => setEditUnitValue(e.target.value)}
                  placeholder="예: 334.8"
                  className="w-full px-3 py-2 text-sm font-semibold border border-slate-300 rounded-lg outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditUnitModal(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
