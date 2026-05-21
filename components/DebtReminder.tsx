'use client';

import { useState } from 'react';
import { MessageSquare, Copy, Check, X } from 'lucide-react';
import { Member } from '../types';

interface DebtReminderProps {
  member: Member;
  maxDebt: number;
}

export default function DebtReminder({ member, maxDebt }: DebtReminderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [templateIndex, setTemplateIndex] = useState(0);

  const debtAmount = Math.abs(member.current_balance);
  const formattedDebt = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(debtAmount);

  // Friendly Vietnamese debt reminder templates
  const templates = [
    `Ê ${member.name} ơi, sương sương hôm trước đi quẩy hết ${formattedDebt} nè. Bắn giùm tui nha để ví tui đỡ khóc ròng nè! 😘💸 Chuyển khoản gấp nha bạn hiền!`,
    `Alo alo ${member.name} iu dấu! Hóa đơn ${formattedDebt} còn chưa thấy ting ting kìa. Trả nợ nhanh để tình bạn chúng ta bền lâu nha! 🤪 Moa moa!`,
    `Ting ting hộ tớ ${formattedDebt} nha ${member.name}! Nợ nần là dây oan, thanh toán nhanh cho đời thanh thản nè! Cảm ơn nhiều nhaaa! 🌸💳`,
    `${member.name} ơi, quỹ nhóm đang réo gọi tên bạn với con số ${formattedDebt}. Gửi lại sớm giúp mình để kết toán nha! Chúc bạn một ngày tốt lành khum bị đòi nợ nữa haha! ☀️`,
  ];

  const handleCopy = () => {
    navigator.clipboard.writeText(templates[templateIndex]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-2.5 py-1.5 rounded-lg border border-rose-100 dark:border-rose-900/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 active:scale-95 transition-all duration-200"
      >
        <MessageSquare className="w-3.5 h-3.5" />
        Nhắc nợ
      </button>

      {/* Slide-up bottom sheet for mobile / Modal for desktop */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs">
          {/* Backdrop Click */}
          <div className="absolute inset-0" onClick={() => setIsOpen(false)} />
          
          {/* Bottom Sheet */}
          <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl p-6 shadow-2xl border-t border-zinc-200 dark:border-zinc-800 max-h-[85dvh] overflow-y-auto pb-12 transition-all duration-300 animate-slide-up">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 dark:text-zinc-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-rose-500 dark:text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full">
                Nhắc nợ vui vẻ
              </span>
              <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50 mt-2">
                Đòi nợ bạn: {member.name}
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Số tiền nợ: <span className="font-bold text-rose-600 dark:text-rose-400">{formattedDebt}</span>
              </p>
            </div>

            {/* Template Selector */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1.5 scrollbar-none">
              {templates.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setTemplateIndex(index)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                    templateIndex === index
                      ? 'bg-emerald-500 text-white dark:bg-emerald-600 shadow-md'
                      : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-600 dark:text-zinc-300'
                  }`}
                >
                  Mẫu {index + 1}
                </button>
              ))}
            </div>

            {/* Message Preview */}
            <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 min-h-[100px] flex items-center justify-center relative mb-6">
              <p className="text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed text-center font-medium italic">
                "{templates[templateIndex]}"
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 py-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleCopy}
                className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 dark:from-emerald-600 dark:to-teal-600 hover:from-emerald-600 hover:to-teal-600 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-98 transition-all"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Đã copy!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy tin nhắn
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
