import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'TAEJU SANTA – 크리스마스 소원을 잇는 산타 프로젝트',
  description: '보육원 아이들의 크리스마스 소원을 함께 이루는 디지털 산타 프로젝트',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
