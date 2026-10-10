import React from 'react';
import { Building2, KeyRound, LogOut, Settings, HelpCircle, Shield, Home, CheckCircle2, AlertCircle } from 'lucide-react';
import { User } from '../types';

interface HeaderProps {
  user: User;
  hasGasUrl: boolean;
  onOpenSettings: () => void;
  onOpenGuide: () => void;
  onOpenChangePassword: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  hasGasUrl,
  onOpenSettings,
  onOpenGuide,
  onOpenChangePassword,
  onLogout
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* 로고 & 타이틀 */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
                빌라 수도·공용전기 정산기
              </h1>
              <span className="hidden sm:inline-block text-[11px] font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100">
                10세대 순환관리
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              매월 5일 검침 수치 및 고지서 기반 자동 정산
            </p>
          </div>
        </div>

        {/* 사용자 정보 및 액션 버튼 */}
        <div className="flex items-center flex-wrap gap-2">
          {/* 연동 상태 뱃지 */}
          <button
            onClick={onOpenSettings}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              hasGasUrl
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
            }`}
            title="클릭하여 Google Apps Script 연동 설정을 확인하세요"
          >
            {hasGasUrl ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">구글 시트 연동됨</span>
                <span className="sm:hidden">시트 연동</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">로컬 모드 (연동 설정)</span>
                <span className="sm:hidden">로컬 모드</span>
              </>
            )}
          </button>

          {/* 배포 & 연동 가이드 버튼 */}
          <button
            onClick={onOpenGuide}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden md:inline">GitHub & Vercel 배포 가이드</span>
            <span className="md:hidden">가이드</span>
          </button>

          {/* 현재 로그인 계정 뱃지 */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800">
            {user.role === 'admin' ? (
              <>
                <Shield className="w-3.5 h-3.5 text-indigo-600" />
                <span>관리자 (admin)</span>
              </>
            ) : (
              <>
                <Home className="w-3.5 h-3.5 text-blue-600" />
                <span>{user.unit}</span>
              </>
            )}
          </div>

          {/* 비밀번호 변경 */}
          <button
            onClick={onOpenChangePassword}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors"
            title="비밀번호 변경"
          >
            <KeyRound className="w-4 h-4" />
          </button>

          {/* 환경설정 */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors"
            title="연동 설정"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* 로그아웃 */}
          <button
            onClick={onLogout}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
            title="로그아웃"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">로그아웃</span>
          </button>
        </div>
      </div>
    </header>
  );
};
