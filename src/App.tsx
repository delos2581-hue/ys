/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User } from './types';
import { getGasUrl } from './services/api';
import { Header } from './components/Header';
import { LoginView } from './components/LoginView';
import { ResidentView } from './components/ResidentView';
import { AdminView } from './components/AdminView';
import { GasGuideModal } from './components/GasGuideModal';
import { SettingsModal } from './components/SettingsModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('villa_current_user_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    // 기본으로 101호 세대원 로그인 상태로 시작하여 즉시 화면을 확인할 수 있도록 배려
    return { id: '101호', role: 'resident', unit: '101호' };
  });

  const [hasGasUrl, setHasGasUrl] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  useEffect(() => {
    const url = getGasUrl();
    setHasGasUrl(Boolean(url && url.trim().length > 0));
  }, [isSettingsOpen]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('villa_current_user_v1', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('villa_current_user_v1');
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {/* 헤더 (로그인되어 있을 때 노출) */}
      {currentUser && (
        <Header
          user={currentUser}
          hasGasUrl={hasGasUrl}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenGuide={() => setIsGuideOpen(true)}
          onOpenChangePassword={() => setIsChangePasswordOpen(true)}
          onLogout={handleLogout}
        />
      )}

      {/* 메인 컨텐츠 영역 */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        {!currentUser ? (
          <LoginView
            onLoginSuccess={handleLoginSuccess}
            onOpenGuide={() => setIsGuideOpen(true)}
          />
        ) : currentUser.role === 'admin' ? (
          <AdminView user={currentUser} />
        ) : (
          <ResidentView user={currentUser} />
        )}
      </main>

      {/* 하단 푸터 */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 빌라 수도 및 공용전기 10세대 자동 정산 시스템 • GitHub & Vercel 배포 최적화</p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsGuideOpen(true)}
              className="text-blue-600 hover:underline cursor-pointer"
            >
              GitHub & Vercel 배포 가이드
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              구글 시트 연동 설정
            </button>
          </div>
        </div>
      </footer>

      {/* 모달 레이어 */}
      <GasGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          const url = getGasUrl();
          setHasGasUrl(Boolean(url && url.trim().length > 0));
        }}
        onOpenGuide={() => setIsGuideOpen(true)}
      />

      {currentUser && (
        <ChangePasswordModal
          user={currentUser}
          isOpen={isChangePasswordOpen}
          onClose={() => setIsChangePasswordOpen(false)}
        />
      )}
    </div>
  );
}
