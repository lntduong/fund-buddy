'use client';

import { useState } from 'react';
import { Camera, Share2, Download, RefreshCw } from 'lucide-react';

interface ScreenshotButtonProps {
  targetId: string;
}

export default function ScreenshotButton({ targetId }: ScreenshotButtonProps) {
  const [isCapturing, setIsCapturing] = useState(false);

  const handleCapture = async () => {
    if (isCapturing) return;
    setIsCapturing(true);

    try {
      // Dynamically import html2canvas-pro on client side
      const html2canvas = (await import('html2canvas-pro')).default;
      const element = document.getElementById(targetId);

      if (!element) {
        alert('Không tìm thấy vùng dữ liệu cần chụp hình.');
        setIsCapturing(false);
        return;
      }

      // We add some inline styles temporarily or configuration to make sure it renders beautifully
      const canvas = await html2canvas(element, {
        useCORS: true, // Allow cross-origin images
        allowTaint: true,
        scale: 2, // Double resolution for crystal-clear screenshots
        backgroundColor: document.documentElement.classList.contains('dark') ? '#18181b' : '#fafafa', // match zinc-900 or zinc-50
        logging: false,
        onclone: (clonedDoc) => {
          // You can perform any cleanup on the cloned DOM here if needed
          const clonedElement = clonedDoc.getElementById(targetId);
          if (clonedElement) {
            clonedElement.style.padding = '16px';
            clonedElement.style.borderRadius = '24px';
          }
        }
      });

      const dataUrl = canvas.toDataURL('image/png');

      // Check if Web Share API is available and supports files (mostly on mobile)
      if (navigator.share && navigator.canShare) {
        try {
          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
          if (blob) {
            const file = new File([blob], 'fund-buddy-tong-quan.png', { type: 'image/png' });
            
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: 'Tổng quan quỹ nhóm Fund Buddy',
                text: 'Báo cáo số dư tài khoản và tình hình chi tiêu ăn chơi của nhóm mình nè!',
              });
              setIsCapturing(false);
              return;
            }
          }
        } catch (shareError) {
          console.log('Chia sẻ thất bại, chuyển sang tải xuống trực tiếp:', shareError);
        }
      }

      // Desktop / Fallback: Direct Download
      const link = document.createElement('a');
      link.download = `fund-buddy-tong-quan-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Screenshot capture error:', error);
      alert('Đã xảy ra lỗi khi chụp hình màn hình. Vui lòng thử lại sau.');
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <button
      onClick={handleCapture}
      disabled={isCapturing}
      className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-450 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 active:scale-95 disabled:opacity-70 rounded-xl border border-emerald-150 dark:border-emerald-900/40 shadow-sm active:scale-98 transition-all duration-200 cursor-pointer"
      title="Chụp màn hình tổng quan"
    >
      {isCapturing ? (
        <>
          <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
          <span>Đang chụp...</span>
        </>
      ) : (
        <>
          <Camera className="w-4 h-4 text-emerald-500" />
          <span>Chụp ảnh</span>
        </>
      )}
    </button>
  );
}
