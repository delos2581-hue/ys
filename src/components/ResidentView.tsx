import React, { useState, useEffect } from 'react';
import {
  Calendar,
  CreditCard,
  Check,
  Copy,
  Printer,
  Gauge,
  Info,
  Clock,
  Sparkles,
  ChevronRight,
  Receipt
} from 'lucide-react';
import { Api, getPreviousYearMonth } from '../services/api';
import { MeterRecord, SettlementData, User } from '../types';

interface ResidentViewProps {
  user: User;
  onRefreshData?: () => void;
}

export const ResidentView: React.FC<ResidentViewProps> = ({ user }) => {
  const unit = user.unit || '101호';

  // 기본 연월 세팅 (현재 연월 기준, 기본 2026-06)
  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedBillingYM, setSelectedBillingYM] = useState('2026-06');
  const [inputYM, setInputYM] = useState('2026-06');

  // 계량기 입력 상태
  const [meterValueInput, setMeterValueInput] = useState('');
  const [meterInputLoading, setMeterInputLoading] = useState(false);
  const [meterSuccessMsg, setMeterSuccessMsg] = useState<string | null>(null);

  // 정산 데이터 상태
  const [settlementData, setSettlementData] = useState<SettlementData | null>(null);
  const [loadingSettlement, setLoadingSettlement] = useState(false);

  // 검침 이력
  const [meterHistory, setMeterHistory] = useState<MeterRecord[]>([]);

  // 복사 피드백
  const [copiedAccount, setCopiedAccount] = useState(false);

  // 데이터 로드
  const loadData = async () => {
    setLoadingSettlement(true);
    try {
      const data = await Api.getSettlementData(selectedBillingYM, unit);
      setSettlementData(data);

      const history = Api.getMeterRecords(unit);
      setMeterHistory(history);

      // 이미 입력된 당월 값이 있다면 인풋에 채우기
      const currentEntry = history.find((h) => h.yearMonth === inputYM);
      if (currentEntry) {
        setMeterValueInput(String(currentEntry.value));
      } else {
        setMeterValueInput('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSettlement(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBillingYM, unit, inputYM]);

  // 계량기 수치 저장 핸들러
  const handleSaveMeter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meterValueInput || isNaN(Number(meterValueInput))) {
      alert('올바른 숫자 형태의 계량기 수치를 입력해주세요.');
      return;
    }

    setMeterInputLoading(true);
    setMeterSuccessMsg(null);
    try {
      const val = parseFloat(meterValueInput);
      const res = await Api.saveMeterValue(unit, inputYM, val);
      setMeterSuccessMsg(res.message);
      await loadData();
    } catch {
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setMeterInputLoading(false);
    }
  };

  // 계좌번호 복사 핸들러
  const handleCopyAccount = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  // 인쇄 핸들러
  const handlePrint = () => {
    window.print();
  };

  const single = settlementData?.singleResult;
  const billing = settlementData?.billing;

  // 지난달 입력값 확인
  const prevMonthStr = getPreviousYearMonth(inputYM, 1);
  const prevMonthRecord = meterHistory.find((h) => h.yearMonth === prevMonthStr);
  const expectedDiff =
    meterValueInput && prevMonthRecord
      ? Math.max(0, parseFloat(meterValueInput) - prevMonthRecord.value)
      : null;

  return (
    <div className="space-y-6">
      {/* 5일 정기 검침 권장 배너 */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 rounded-2xl p-4 sm:p-5 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center shrink-0">
            <Gauge className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-white/20 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">
                매월 5일 정기검침
              </span>
              <h2 className="text-base sm:text-lg font-bold">
                {unit} 당월 계량기 수치를 입력해주세요
              </h2>
            </div>
            <p className="text-xs text-blue-100 mt-0.5">
              세대는 매월 5일 당월 계량기 수치를 저장하며, 수도요금은 지지난달 5일~지난달 5일 실사용량을 기준으로 정산됩니다.
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-blue-200">측정 대상 세대</div>
          <div className="text-xl font-black tracking-tight">{unit}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 좌측: 계량기 수치 입력 카드 (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Gauge className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  {unit} 계량기 수치 입력
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">단위: 톤(m³)</span>
            </div>

            <form onSubmit={handleSaveMeter} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  검침 연월 (당월 5일 기준)
                </label>
                <div className="relative">
                  <input
                    type="month"
                    value={inputYM}
                    onChange={(e) => setInputYM(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* 이전 달 수치 참고 안내 */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>지난달 ({prevMonthStr}) 검침값:</span>
                  <span className="font-semibold text-slate-800">
                    {prevMonthRecord ? `${prevMonthRecord.value} 톤` : '기록 없음'}
                  </span>
                </div>
                {expectedDiff !== null && !isNaN(expectedDiff) && (
                  <div className="flex justify-between text-blue-600 pt-1 border-t border-slate-200 font-semibold">
                    <span>예상 증가 사용량:</span>
                    <span>+{expectedDiff.toFixed(2)} 톤</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  이번 달 계량기 표시 수치
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={meterValueInput}
                    onChange={(e) => setMeterValueInput(e.target.value)}
                    placeholder="예: 349.5"
                    className="w-full px-3 py-2.5 text-base font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <span className="absolute right-3 top-3 text-xs font-semibold text-slate-400">
                    톤
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  <Info className="w-3 h-3 text-slate-400" />
                  계량기 검정색 숫자(정수)와 빨간색 바늘(소수점)을 확인하여 입력하세요.
                </p>
              </div>

              {meterSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-medium flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{meterSuccessMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={meterInputLoading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {meterInputLoading ? (
                  <span>저장 중...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>당월 계량기 수치 저장하기</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* 내 세대 검침 기록 카드 */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>{unit} 최근 검침 기록</span>
            </h4>
            {meterHistory.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">저장된 검침 기록이 없습니다.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-500">
                      <th className="py-2">검침연월</th>
                      <th className="py-2 text-right">계량기 수치</th>
                      <th className="py-2 text-right">입력일시</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {meterHistory.slice(0, 6).map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 font-medium text-slate-800">{item.yearMonth}</td>
                        <td className="py-2 text-right font-semibold text-blue-600">
                          {item.value.toFixed(1)} 톤
                        </td>
                        <td className="py-2 text-right text-slate-400 text-[11px]">
                          {item.updatedAt.split(' ')[0]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* 우측: 당월 내 세대 요금 및 총무 계좌 정산 영수증 카드 (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:border-none print:shadow-none">
            {/* 상단 탭/헤더 */}
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/30 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {unit} 정산 고지서 & 납부 영수증
                  </h3>
                  <p className="text-xs text-slate-500">
                    {settlementData?.period?.description || '지지난달 5일 ~ 지난달 5일 사용분 기준'}
                  </p>
                </div>
              </div>

              {/* 청구월 선택 */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600">청구월:</span>
                <select
                  value={selectedBillingYM}
                  onChange={(e) => setSelectedBillingYM(e.target.value)}
                  className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="2026-06">2026년 06월 고지서</option>
                  <option value="2026-05">2026년 05월 고지서</option>
                  <option value="2026-07">2026년 07월 고지서</option>
                </select>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg border border-slate-200 transition-colors"
                  title="고지서 인쇄"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 영수증 바디 */}
            <div className="p-6">
              {loadingSettlement ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  요금 정산 데이터를 불러오는 중입니다...
                </div>
              ) : single ? (
                <div className="space-y-6">
                  {/* 정산 기준 및 사용량 요약 */}
                  <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <div>
                      <span className="block text-[11px] text-slate-500">
                        지지난달 ({single.prev2Month}) 수치
                      </span>
                      <span className="text-sm font-bold text-slate-800">
                        {single.prev2Value !== null ? `${single.prev2Value} 톤` : '미입력'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[11px] text-slate-500">
                        지난달 ({single.prevMonth}) 수치
                      </span>
                      <span className="text-sm font-bold text-slate-800">
                        {single.prevValue !== null ? `${single.prevValue} 톤` : '미입력'}
                      </span>
                    </div>
                    <div className="bg-blue-100/60 rounded-lg p-1">
                      <span className="block text-[11px] font-semibold text-blue-700">
                        실사용량 ({single.prevMonth}월 청구)
                      </span>
                      <span className="text-base font-black text-blue-800">
                        {single.usage.toFixed(2)} 톤
                      </span>
                    </div>
                  </div>

                  {/* 세부 계산 내역 명세표 */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center justify-between border-b pb-1.5 border-slate-100">
                      <span>요금 세부 산출 내역</span>
                      <span className="text-[11px] font-normal text-slate-500">
                        1톤당 수도 단가: {single.unitPrice.toLocaleString()}원
                      </span>
                    </h4>

                    <div className="space-y-2 text-xs">
                      {/* 1. 세대별 수도요금 */}
                      <div className="flex justify-between items-center py-1">
                        <div>
                          <span className="font-semibold text-slate-700">① 세대별 실사용 수도요금</span>
                          <span className="text-slate-400 text-[11px] block">
                            사용량 {single.usage}톤 × 단가 {single.unitPrice.toLocaleString()}원
                          </span>
                        </div>
                        <span className="font-bold text-slate-900">
                          {single.waterFee.toLocaleString()} 원
                        </span>
                      </div>

                      {/* 2. 정액료 */}
                      <div className="flex justify-between items-center py-1">
                        <div>
                          <span className="font-semibold text-slate-700">② 수도 기본 정액료</span>
                          <span className="text-slate-400 text-[11px] block">
                            수도 정액료 총 2,190원 ÷ 10세대 균등 분할
                          </span>
                        </div>
                        <span className="font-bold text-slate-900">
                          {single.fixedFee.toLocaleString()} 원
                        </span>
                      </div>

                      {/* 3. 공용 전기료 */}
                      <div className="flex justify-between items-center py-1">
                        <div>
                          <span className="font-semibold text-slate-700">③ 세대별 공용 전기료</span>
                          <span className="text-slate-400 text-[11px] block">
                            전체 {billing?.commonElectric?.toLocaleString() || 0}원 ÷ 10세대 (1/N 균등)
                          </span>
                        </div>
                        <span className="font-bold text-slate-900">
                          {single.commonElectricFee.toLocaleString()} 원
                        </span>
                      </div>

                      {/* 최종 납부 금액 합계 */}
                      <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                        <div>
                          <span className="text-sm font-bold text-slate-900">
                            {unit} 최종 납부 총액
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            수도요금 + 정액료(219원) + 공용전기료
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xl sm:text-2xl font-black text-blue-600">
                            {single.finalAmount.toLocaleString()}
                          </span>
                          <span className="text-sm font-bold text-blue-600 ml-1">원</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 총무 정보 및 계좌 입금 안내 카드 (3개월 순환 관리) */}
                  <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-amber-700" />
                        <span className="text-xs font-bold text-amber-900">
                          관리비 입금 안내 (3개월 순환 총무)
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold bg-amber-200/60 text-amber-800 px-2 py-0.5 rounded-full">
                        담당: {billing?.managerName || '총무 정보 미등록'}
                      </span>
                    </div>

                    <div className="bg-white/80 backdrop-blur-xs p-3 rounded-xl border border-amber-200 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[11px] text-slate-500 block">입금 계좌번호</span>
                        <span className="text-sm font-bold text-slate-900 select-all">
                          {billing?.accountInfo || '계좌 정보가 등록되지 않았습니다.'}
                        </span>
                      </div>
                      {billing?.accountInfo && (
                        <button
                          type="button"
                          onClick={() => handleCopyAccount(billing.accountInfo)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                            copiedAccount
                              ? 'bg-emerald-600 text-white'
                              : 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                          }`}
                        >
                          {copiedAccount ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>복사완료!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>계좌 복사</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] text-amber-800">
                      * 입금 시 입금자명을 <strong>'{unit}'</strong>으로 입력해주시면 원활한 확인이 가능합니다.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500 text-xs space-y-2">
                  <p className="font-semibold text-slate-700">
                    {selectedBillingYM}월 고지서 정산 데이터가 아직 등록되지 않았습니다.
                  </p>
                  <p className="text-slate-400">
                    관리자가 고지서 금액을 입력하고 세대별 검침값이 등록되면 자동으로 계산됩니다.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
