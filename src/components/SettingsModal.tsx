import React, { useState, useEffect } from 'react';
import { X, Check, Globe, RefreshCw, AlertCircle, Database, HelpCircle, Save } from 'lucide-react';
import { Api, getGasUrl, setGasUrl } from '../services/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenGuide: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenGuide
}) => {
  const [url, setUrl] = useState('');
  const [pingStatus, setPingStatus] = useState<{
    tested: boolean;
    loading: boolean;
    success?: boolean;
    message?: string;
  }>({
    tested: false,
    loading: false
  });
  const [saveFeedback, setSaveFeedback] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUrl(getGasUrl());
      setPingStatus({ tested: false, loading: false });
      setSaveFeedback(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestPing = async () => {
    if (!url.trim()) {
      setPingStatus({
        tested: true,
        loading: false,
        success: false,
        message: 'Apps Script 웹 앱 URL을 먼저 입력해주세요.'
      });
      return;
    }

    setPingStatus({ tested: true, loading: true });
    try {
      const res = await Api.pingGas(url.trim());
      setPingStatus({
        tested: true,
        loading: false,
        success: res.success,
        message: res.message
      });
    } catch {
      setPingStatus({
        tested: true,
        loading: false,
        success: false,
        message: '연결 실패: 네트워크 오류 또는 잘못된 URL입니다.'
      });
    }
  };

  const handleSave = () => {
    setGasUrl(url);
    setSaveFeedback(true);
    setTimeout(() => {
      setSaveFeedback(false);
      onClose();
    }, 1000);
  };

  const handleResetSampleData = () => {
    if (window.confirm('로컬에 저장된 모든 데이터를 기본 샘플 데이터로 복원하시겠습니까?')) {
      Api.resetToSampleData();
      alert('샘플 데이터가 복원되었습니다. 화면을 새로고침합니다.');
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* 헤더 */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Google Apps Script 연동 설정</h3>
              <p className="text-xs text-slate-500">Google 스프레드시트와 실시간 양방향 데이터 연동</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 바디 */}
        <div className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Google Apps Script 웹 앱 배포 URL
            </label>
            <div className="relative">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              * 스프레드시트 Apps Script에서 [배포] &gt; [새 배포] &gt; 유형: [웹 앱]으로 생성한 URL을 입력하세요.
            </p>
          </div>

          {/* 테스트 핑 버튼 */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pingStatus.loading}
              onClick={handleTestPing}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${pingStatus.loading ? 'animate-spin' : ''}`} />
              <span>연결 테스트 (Ping)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenGuide();
              }}
              className="text-blue-600 hover:underline flex items-center gap-1 ml-auto cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>배포 방법이 궁금하신가요?</span>
            </button>
          </div>

          {/* 핑 테스트 결과 알림 */}
          {pingStatus.tested && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2 ${
                pingStatus.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {pingStatus.success ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <span className="font-semibold block">
                  {pingStatus.success ? '연결 성공!' : '연결 실패'}
                </span>
                <span className="text-[11px] block">{pingStatus.message}</span>
              </div>
            </div>
          )}

          {/* URL이 비어있을 때 로컬 모드 안내 */}
          {!url && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] space-y-1">
              <span className="font-semibold block">💡 현재 로컬 시뮬레이션 모드 작동 중</span>
              <p>
                Apps Script URL을 등록하지 않아도 브라우저 LocalStorage를 통해 모든 세대 검침, 고지서 정산, 비밀번호 변경 기능이 100% 정상 작동합니다.
                구글 시트에 영구 저장하려면 위 가이드대로 URL을 등록해주세요.
              </p>
            </div>
          )}

          {/* 로컬 샘플 데이터 리셋 버튼 */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-slate-500 text-[11px]">테스트 중 데이터가 꼬였을 때:</span>
            <button
              type="button"
              onClick={handleResetSampleData}
              className="text-xs text-rose-600 hover:text-rose-700 font-medium hover:underline cursor-pointer"
            >
              샘플 데이터로 초기화
            </button>
          </div>
        </div>

        {/* 푸터 */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            {saveFeedback ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>저장 완료!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>설정 저장하기</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
