import React, { useState } from 'react';
import { Building2, Key, User as UserIcon, Shield, Home, HelpCircle, ArrowRight, Check } from 'lucide-react';
import { Api } from '../services/api';
import { User } from '../types';
import { DEFAULT_UNITS } from '../services/defaultData';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
  onOpenGuide: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, onOpenGuide }) => {
  const [id, setId] = useState('101호');
  const [password, setPassword] = useState('101호');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await Api.login(id.trim(), password.trim());
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setError(res.message || '로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.');
      }
    } catch {
      setError('서버 연결 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUnit = (unitName: string) => {
    setId(unitName);
    setPassword(unitName); // 초기 비밀번호는 호수명
    setError(null);
  };

  const handleSelectAdmin = () => {
    setId('admin');
    setPassword('admin1234');
    setError(null);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* 상단 헤더 배너 */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-8 text-white text-center">
          <div className="w-14 h-14 bg-white/10 backdrop-blur-xs rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-inner">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">빌라 수도·공용전기 정산기</h2>
          <p className="text-blue-100 text-xs mt-1">
            10세대 계량기 검침 수치 및 고지서 자동 정산 시스템
          </p>
        </div>

        {/* 폼 본문 */}
        <div className="p-6">
          {/* 빠른 호수 선택 칩 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-600">빠른 호수 선택</span>
              <button
                type="button"
                onClick={handleSelectAdmin}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded cursor-pointer"
              >
                <Shield className="w-3 h-3" />
                관리자(admin)
              </button>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {DEFAULT_UNITS.map((unit) => {
                const isSelected = id === unit;
                return (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => handleSelectUnit(unit)}
                    className={`py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {unit}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                아이디 (호수 또는 admin)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  placeholder="예: 101호 또는 admin"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                비밀번호
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="초기: 호수명과 동일 (예: 101호)"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>로그인 처리 중...</span>
              ) : (
                <>
                  <span>로그인</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* 초기 계정 안내 박스 */}
          <div className="mt-6 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5 text-slate-600">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5 text-blue-600" />
              <span>초기 계정 안내</span>
            </div>
            <p>
              • <strong>세대원:</strong> 아이디 = 호수명(예: <span className="text-blue-600">101호</span>) / 비밀번호 = 호수명
            </p>
            <p>
              • <strong>관리자:</strong> 아이디 = <span className="text-indigo-600">admin</span> / 비밀번호 = <span className="text-indigo-600">admin1234</span>
            </p>
            <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
              * 로그인 후 우측 상단 열쇠 아이콘에서 언제든 비밀번호를 변경할 수 있습니다.
            </p>
          </div>

          {/* 가이드 바로가기 버튼 */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={onOpenGuide}
              className="text-xs text-slate-500 hover:text-blue-600 inline-flex items-center gap-1 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>GitHub & Vercel 배포 및 Google Apps Script 연동 방법 보기</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
