'use client';

import { useState } from 'react';
import { addActivityAction, confirmTransactionPaidAction } from '../app/actions';
import { Member, Activity, Transaction } from '../types';
import { Calendar, User, DollarSign, Users, PlusCircle, Check, X, FileText, CheckCircle2, AlertCircle, RefreshCw, ChevronDown, Search } from 'lucide-react';
import { isUrl, getInitials, getAvatarColor } from '../lib/utils';

interface ActivitiesClientProps {
  initialMembers: Member[];
  initialActivities: Activity[];
  initialTransactions: Transaction[];
  openAddByDefault?: boolean;
}

export default function ActivitiesClient({
  initialMembers,
  initialActivities,
  initialTransactions,
  openAddByDefault = false,
}: ActivitiesClientProps) {
  
  // State variables
  const [showAddForm, setShowAddForm] = useState(openAddByDefault);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState('all');

  // Form values
  const [title, setTitle] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [paidBy, setPaidBy] = useState('quy_chung');
  const [participants, setParticipants] = useState<string[]>(initialMembers.map((m) => m.id)); // Default select all
  const [notes, setNotes] = useState('');
  const [splitMode, setSplitMode] = useState<'equal' | 'individual'>('equal');
  const [customShares, setCustomShares] = useState<{ [memberId: string]: string }>({});

  // Custom dropdown states
  const [showPayerDropdown, setShowPayerDropdown] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [payerSearchQuery, setPayerSearchQuery] = useState('');

  const handlePaidByToggle = (mode: 'quy_chung' | 'rieng') => {
    if (mode === 'quy_chung') {
      setPaidBy('quy_chung');
    } else {
      if (paidBy === 'quy_chung') {
        setPaidBy(initialMembers[0]?.id || '');
      }
    }
  };

  const handleSplitModeChange = (mode: 'equal' | 'individual') => {
    setSplitMode(mode);
    if (mode === 'individual') {
      const currentTotal = getNumericValue(totalAmount);
      if (currentTotal > 0 && participants.length > 0) {
        const splitVal = Math.round(currentTotal / participants.length);
        const formattedSplit = formatRawValue(splitVal.toString());
        const newShares: { [memberId: string]: string } = {};
        participants.forEach((pId) => {
          newShares[pId] = formattedSplit;
        });
        setCustomShares(newShares);
      }
    }
  };

  // Auto-format currency typing (Vietnamese dots separation)
  const formatRawValue = (val: string) => {
    const numeric = val.replace(/[^0-9]/g, '');
    if (!numeric) return '';
    return new Intl.NumberFormat('vi-VN').format(parseInt(numeric));
  };

  const getNumericValue = (formatted: string) => {
    return parseInt(formatted.replace(/[^0-9]/g, '')) || 0;
  };

  // Helper to toggle participants
  const toggleParticipant = (memberId: string) => {
    setParticipants((prev) => {
      const next = prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId];
      
      if (splitMode === 'individual') {
        const sum = next.reduce((acc, mId) => {
          return acc + getNumericValue(customShares[mId] || '');
        }, 0);
        setTotalAmount(sum > 0 ? formatRawValue(sum.toString()) : '');
      }
      
      return next;
    });
  };

  const selectAllParticipants = () => {
    const all = initialMembers.map((m) => m.id);
    setParticipants(all);
    if (splitMode === 'individual') {
      const sum = all.reduce((acc, mId) => {
        return acc + getNumericValue(customShares[mId] || '');
      }, 0);
      setTotalAmount(sum > 0 ? formatRawValue(sum.toString()) : '');
    }
  };

  const deselectAllParticipants = () => {
    setParticipants([]);
    if (splitMode === 'individual') {
      setTotalAmount('');
    }
  };

  const updateCustomShare = (memberId: string, val: string) => {
    const formatted = formatRawValue(val);
    const updated = {
      ...customShares,
      [memberId]: formatted,
    };
    setCustomShares(updated);
    
    const sum = Object.keys(updated).reduce((acc, mId) => {
      if (participants.includes(mId)) {
        return acc + getNumericValue(updated[mId]);
      }
      return acc;
    }, 0);
    
    setTotalAmount(sum > 0 ? formatRawValue(sum.toString()) : '');
  };

  // Form submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!title.trim()) {
      setFormError('Vui lòng nhập tiêu đề hoạt động');
      return;
    }

    const amount = getNumericValue(totalAmount);
    if (amount <= 0) {
      setFormError('Số tiền phải lớn hơn 0');
      return;
    }

    if (participants.length === 0) {
      setFormError('Vui lòng chọn ít nhất 1 người tham gia');
      return;
    }

    // Individual split validation
    const numericShares: { [memberId: string]: number } = {};
    if (splitMode === 'individual') {
      for (const pId of participants) {
        const shareVal = getNumericValue(customShares[pId] || '');
        if (shareVal <= 0) {
          setFormError(`Vui lòng nhập số tiền hợp lệ cho ${initialMembers.find((m) => m.id === pId)?.name}`);
          return;
        }
        numericShares[pId] = shareVal;
      }
    }

    setIsSubmitting(true);
    const res = await addActivityAction(
      title,
      amount,
      paidBy,
      participants,
      notes,
      splitMode === 'individual' ? numericShares : undefined
    );
    setIsSubmitting(false);

    if (res.success) {
      setFormSuccess('Ghi nhận cuộc vui thành công!');
      // Reset form
      setTitle('');
      setTotalAmount('');
      setPaidBy('quy_chung');
      setSplitMode('equal');
      setCustomShares({});
      setParticipants(initialMembers.map((m) => m.id));
      setNotes('');
      
      setTimeout(() => {
        setShowAddForm(false);
        setFormSuccess('');
      }, 1000);
    } else {
      setFormError(res.error || 'Đã xảy ra lỗi');
    }
  };

  // Settle individual debt handler
  const handleConfirmPaid = async (txId: string) => {
    if (confirm('Xác nhận thành viên này đã hoàn tiền xong?')) {
      const res = await confirmTransactionPaidAction(txId);
      if (!res.success) {
        alert(res.error || 'Đã xảy ra lỗi khi duyệt thanh toán');
      }
    }
  };

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const getActivityMonthKey = (date: string) => {
    const [year, month] = date.split('-');
    return year && month ? `${year}-${month}` : 'unknown';
  };

  const formatMonthLabel = (monthKey: string) => {
    if (monthKey === 'unknown') return 'Không rõ tháng';
    const [year, month] = monthKey.split('-');
    return `Tháng ${month}/${year}`;
  };

  const monthOptions = Array.from(
    new Set(initialActivities.map((act) => getActivityMonthKey(act.date)))
  ).sort((a, b) => b.localeCompare(a));
  const selectedMonthLabel = selectedMonthFilter === 'all'
    ? 'Tất cả tháng'
    : formatMonthLabel(selectedMonthFilter);

  // Map participants and transaction details to each activity
  const activitiesWithParticipants = initialActivities.map((act) => {
    // Find all transaction records associated with this activity ID
    const actTxs = initialTransactions.filter((t) => t.activity_id === act.id);
    
    // Split shares are the negative transactions (amount < 0)
    const participantTxs = actTxs.filter((t) => t.amount < 0);
    
    return {
      ...act,
      participants: participantTxs.map((t) => ({
        txId: t.id,
        memberId: t.member_id,
        memberName: t.member_name || 'Thành viên',
        memberAvatar: t.member_avatar || '',
        shareAmount: Math.abs(t.amount),
        status: t.status, // da_tra, chua_tra
      })),
    };
  });

  const filteredActivities = selectedMonthFilter === 'all'
    ? activitiesWithParticipants
    : activitiesWithParticipants.filter((act) => getActivityMonthKey(act.date) === selectedMonthFilter);

  return (
    <div className="space-y-6">
      {/* Title Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
            Nhật Ký Ăn Chơi
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Lưu lại các cuộc vui và tự động chia đều tiền.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-md shadow-emerald-500/20 active:scale-95 transition-all duration-200"
        >
          <PlusCircle className="w-4.5 h-4.5" />
          Thêm
        </button>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setShowMonthDropdown(!showMonthDropdown)}
          className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm cursor-pointer transition-all text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="truncate text-zinc-800 dark:text-zinc-200">
              {selectedMonthLabel}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
        </button>

        {showMonthDropdown && (
          <div className="fixed inset-0 z-10" onClick={() => setShowMonthDropdown(false)} />
        )}

        {showMonthDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-xl z-20 overflow-hidden flex flex-col max-h-60 animate-in fade-in-50 slide-in-from-top-1 duration-100">
            <div className="overflow-y-auto py-1 max-h-56 divide-y divide-zinc-50 dark:divide-zinc-850/50">
              {['all', ...monthOptions].map((monthKey) => {
                const isSelected = selectedMonthFilter === monthKey;
                return (
                  <button
                    key={monthKey}
                    type="button"
                    onClick={() => {
                      setSelectedMonthFilter(monthKey);
                      setShowMonthDropdown(false);
                    }}
                    className={`flex items-center justify-between w-full px-3.5 py-2.5 text-left text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer ${
                      isSelected ? 'bg-emerald-500/5 text-emerald-600 dark:text-emerald-400' : 'text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="truncate">
                        {monthKey === 'all' ? 'Tất cả tháng' : formatMonthLabel(monthKey)}
                      </span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-500 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add Activity Slide-up Sheet */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs">
          <div className="absolute inset-0" onClick={() => setShowAddForm(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl p-6 shadow-2xl border-t border-zinc-200 dark:border-zinc-800 max-h-[85dvh] overflow-y-auto animate-slide-up">
            <button
              onClick={() => setShowAddForm(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 dark:text-zinc-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-500" />
              Thêm Buổi Ăn Chơi Mới
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 pb-16">
              {/* Event Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                  Tên sự kiện / Buổi đi chơi
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Ăn lẩu Haidilao, Trà sữa Koi..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Paid By / Event Type Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                  Nguồn chi trả / Loại cuộc vui
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200/40 dark:border-zinc-800/40">
                  <button
                    type="button"
                    onClick={() => handlePaidByToggle('quy_chung')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      paidBy === 'quy_chung'
                        ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-zinc-200/20 dark:border-zinc-700/20'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    Sử dụng Quỹ chung 💰
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePaidByToggle('rieng')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      paidBy !== 'quy_chung'
                        ? 'bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-sm border border-zinc-200/20 dark:border-zinc-700/20'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    Cuộc vui riêng (Tiền túi) 💸
                  </button>
                </div>
              </div>

              {/* Payer Dropdown selector (only if private event) */}
              {paidBy !== 'quy_chung' && (
                <div className="space-y-1.5 animate-slide-up">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                    Thành viên nào ứng tiền?
                  </label>
                  <div className="relative">
                    {/* Trigger Button */}
                    <button
                      type="button"
                      onClick={() => setShowPayerDropdown(!showPayerDropdown)}
                      className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm cursor-pointer transition-all text-left"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {paidBy && paidBy !== 'quy_chung' ? (
                          (() => {
                            const m = initialMembers.find((member) => member.id === paidBy);
                            if (!m) return <span className="text-zinc-400 dark:text-zinc-500">Chọn người ứng...</span>;
                            return (
                              <>
                                {isUrl(m.avatar) ? (
                                  <img src={m.avatar} alt={m.name} className="w-5 h-5 rounded-full object-cover shrink-0" />
                                ) : (
                                  <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[8px] shrink-0 ${getAvatarColor(m.id)}`}>
                                    {getInitials(m.name)}
                                  </div>
                                )}
                                <span className="truncate text-zinc-800 dark:text-zinc-200">
                                  {m.name}
                                </span>
                              </>
                            );
                          })()
                        ) : (
                          <span className="text-zinc-400 dark:text-zinc-500 font-normal">Chọn người ứng...</span>
                        )}
                      </div>
                      <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
                    </button>

                    {/* Dropdown Overlay Click-away */}
                    {showPayerDropdown && (
                      <div className="fixed inset-0 z-10" onClick={() => setShowPayerDropdown(false)} />
                    )}

                    {/* Dropdown Menu */}
                    {showPayerDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-xl z-20 overflow-hidden flex flex-col max-h-60 animate-in fade-in-50 slide-in-from-top-1 duration-100">
                        {/* Search Field */}
                        <div className="p-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2 shrink-0">
                          <Search className="w-3.5 h-3.5 text-zinc-400" />
                          <input
                            type="text"
                            placeholder="Tìm thành viên..."
                            value={payerSearchQuery}
                            onChange={(e) => setPayerSearchQuery(e.target.value)}
                            className="w-full bg-transparent border-0 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none placeholder-zinc-450"
                            autoFocus
                          />
                          {payerSearchQuery && (
                            <button type="button" onClick={() => setPayerSearchQuery('')} className="text-zinc-450 hover:text-zinc-600 dark:hover:text-zinc-300">
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        {/* Items List */}
                        <div className="overflow-y-auto py-1 max-h-48 divide-y divide-zinc-50 dark:divide-zinc-850/50">
                          {initialMembers
                            .filter((m) => m.name.toLowerCase().includes(payerSearchQuery.toLowerCase()))
                            .map((m) => {
                              const isSelected = paidBy === m.id;
                              return (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => {
                                    setPaidBy(m.id);
                                    setShowPayerDropdown(false);
                                    setPayerSearchQuery('');
                                  }}
                                  className={`flex items-center justify-between w-full px-3.5 py-2.5 text-left text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer ${
                                    isSelected ? 'bg-amber-500/5 text-amber-600 dark:text-amber-400' : 'text-zinc-700 dark:text-zinc-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    {isUrl(m.avatar) ? (
                                      <img src={m.avatar} alt={m.name} className="w-6 h-6 rounded-full object-cover shrink-0" />
                                    ) : (
                                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[9px] shrink-0 ${getAvatarColor(m.id)}`}>
                                        {getInitials(m.name)}
                                      </div>
                                    )}
                                    <span className="truncate">{m.name}</span>
                                  </div>
                                  {isSelected && <Check className="w-4 h-4 text-amber-500 shrink-0" />}
                                </button>
                              );
                            })}
                          {initialMembers.filter((m) => m.name.toLowerCase().includes(payerSearchQuery.toLowerCase())).length === 0 && (
                            <div className="p-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
                              Không tìm thấy thành viên
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Split Mode Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                  Cách chia chi phí
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200/40 dark:border-zinc-800/40">
                  <button
                    type="button"
                    onClick={() => handleSplitModeChange('equal')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      splitMode === 'equal'
                        ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-zinc-200/20 dark:border-zinc-700/20'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    Chia đều 👥
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSplitModeChange('individual')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      splitMode === 'individual'
                        ? 'bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-sm border border-zinc-200/20 dark:border-zinc-700/20'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    Nhập số tiền riêng 🔢
                  </button>
                </div>
              </div>

              {/* Cost Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                  Tổng số tiền chi tiêu (VND) {splitMode === 'individual' && <span className="text-[10px] text-zinc-400 font-medium">(Tự động tính từ tổng tiền lẻ)</span>}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="100.000"
                    value={totalAmount}
                    onChange={(e) => {
                      if (splitMode === 'equal') {
                        setTotalAmount(formatRawValue(e.target.value));
                      }
                    }}
                    readOnly={splitMode === 'individual'}
                    className={`w-full pl-3 pr-8 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      splitMode === 'individual' ? 'opacity-85 select-none bg-zinc-100/50 dark:bg-zinc-900/50' : ''
                    }`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">đ</span>
                </div>
              </div>

              {/* Participant checklist */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                    Ai tham gia cuộc vui? ({participants.length} người)
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAllParticipants}
                      className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Chọn hết
                    </button>
                    <span className="text-[10px] text-zinc-300">|</span>
                    <button
                      type="button"
                      onClick={deselectAllParticipants}
                      className="text-[10px] font-bold text-zinc-400 hover:underline cursor-pointer"
                    >
                      Bỏ hết
                    </button>
                  </div>
                </div>
                
                {splitMode === 'equal' ? (
                  <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto border border-zinc-200/50 dark:border-zinc-800/80 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950">
                    {initialMembers.map((member) => {
                      const isChecked = participants.includes(member.id);
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => toggleParticipant(member.id)}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left text-xs font-semibold transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-emerald-500/10 dark:bg-emerald-400/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50'
                          }`}
                        >
                          {isUrl(member.avatar) ? (
                            <img
                              src={member.avatar}
                              alt={member.name}
                              className="w-5 h-5 rounded-full object-cover"
                            />
                          ) : (
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] ${getAvatarColor(member.id)}`}>
                              {getInitials(member.name)}
                            </div>
                          )}
                          <span className="truncate flex-1">{member.name}</span>
                          {isChecked && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto border border-zinc-200/50 dark:border-zinc-800/80 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950">
                    {initialMembers.map((member) => {
                      const isChecked = participants.includes(member.id);
                      return (
                        <div
                          key={member.id}
                          className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                            isChecked
                              ? 'bg-amber-500/5 dark:bg-amber-400/5 border-amber-500/20 text-zinc-900 dark:text-zinc-100'
                              : 'bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 opacity-60'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleParticipant(member.id)}
                            className="flex items-center gap-2 text-left text-xs font-bold flex-1 cursor-pointer"
                          >
                            <div className="relative">
                              {isUrl(member.avatar) ? (
                                <img
                                  src={member.avatar}
                                  alt={member.name}
                                  className="w-7 h-7 rounded-full object-cover"
                                />
                              ) : (
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] ${getAvatarColor(member.id)}`}>
                                  {getInitials(member.name)}
                                </div>
                              )}
                              {isChecked && (
                                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 flex items-center justify-center text-white text-[8px]">
                                  <Check className="w-2.5 h-2.5" />
                                </span>
                              )}
                            </div>
                            <span className="truncate flex-1 font-semibold">{member.name}</span>
                          </button>
                          
                          {isChecked && (
                            <div className="relative w-32 shrink-0 animate-slide-up">
                              <input
                                type="text"
                                inputMode="numeric"
                                placeholder="Nhập số tiền"
                                value={customShares[member.id] || ''}
                                onChange={(e) => updateCustomShare(member.id, e.target.value)}
                                className="w-full pl-2 pr-6 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 text-right"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-400">đ</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                  Ghi chú (Không bắt buộc)
                </label>
                <textarea
                  placeholder="Ví dụ: Chưa tính tiền nước, Hoàng Long nợ nước riêng..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              {formError && <p className="text-xs text-rose-500 font-semibold">{formError}</p>}
              {formSuccess && <p className="text-xs text-emerald-500 font-semibold">{formSuccess}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-98 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {splitMode === 'equal' ? 'Xác Nhận Chia Đều' : 'Xác Nhận Chia Lẻ'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Activities Feed */}
      <div className="space-y-5">
        {filteredActivities.length === 0 ? (
          <div className="py-12 text-center text-zinc-400 dark:text-zinc-500 bg-white dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-700/50 rounded-3xl p-6 space-y-2">
            <span className="text-3xl">🍕</span>
            <p className="text-xs font-semibold">
              {selectedMonthFilter === 'all'
                ? 'Chưa có nhật ký ăn chơi nào được lưu.'
                : `Chưa có sự kiện nào trong ${formatMonthLabel(selectedMonthFilter).toLowerCase()}.`}
            </p>
            <p className="text-[10px] text-zinc-400">Hãy nhấn nút "Thêm" phía trên để tạo sự kiện đầu tiên.</p>
          </div>
        ) : (
          filteredActivities.map((act) => {
            return (
              <div
                key={act.id}
                className="bg-white dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-700/50 rounded-3xl p-5 shadow-sm space-y-4"
              >
                {/* Event header info */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1 pr-3">
                    <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider bg-zinc-100 dark:bg-zinc-950 px-2 py-0.5 rounded-md">
                      {act.date}
                    </span>
                    <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-50 leading-tight">
                      {act.title}
                    </h3>
                    {act.notes && (
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-start gap-1 font-medium bg-zinc-50 dark:bg-zinc-950 p-2 rounded-xl border border-zinc-200/20 dark:border-zinc-800/40">
                        <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                        <span>{act.notes}</span>
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">
                      {formatVND(act.total_amount)}
                    </p>
                    <p className="text-[9px] font-semibold text-zinc-400 mt-1">
                      {act.participants.length} người tham gia
                    </p>
                  </div>
                </div>

                {/* Who paid card section */}
                {act.paid_by_member_id === 'quy_chung' ? (
                  <div className="bg-emerald-500/5 dark:bg-emerald-400/5 border border-emerald-500/10 dark:border-emerald-400/10 rounded-2xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-base bg-gradient-to-tr from-emerald-500 to-teal-400 text-white">
                        💰
                      </div>
                      <div>
                        <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                          Nguồn thanh toán
                        </p>
                        <p className="text-xs font-extrabold text-zinc-800 dark:text-zinc-100 mt-0.5">
                          Quỹ chung nhóm
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
                        Chi từ quỹ
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/30 dark:border-zinc-800/40 rounded-2xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {isUrl(act.payer_avatar) ? (
                        <img
                          src={act.payer_avatar}
                          alt={act.payer_name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${getAvatarColor(act.paid_by_member_id)}`}>
                          {getInitials(act.payer_name || '')}
                        </div>
                      )}
                      <div>
                        <p className="text-[9px] text-zinc-400 font-bold uppercase">
                          Người ứng tiền
                        </p>
                        <p className="text-xs font-bold text-zinc-800 dark:text-zinc-100 mt-0.5">
                          {act.payer_name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full uppercase">
                        Đã thanh toán
                      </span>
                    </div>
                  </div>
                )}

                {/* Participants detail split breakdown */}
                <div className="space-y-2.5">
                  <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Thành viên chia sẻ chi phí
                  </h4>
                  
                  <div className="space-y-2.5">
                    {act.participants.map((p) => {
                      const isUnpaid = p.status === 'chua_tra';
                      const isPayer = p.memberId === act.paid_by_member_id;
                      
                      return (
                        <div
                          key={p.memberId}
                          className="flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            {isUrl(p.memberAvatar) ? (
                              <img
                                src={p.memberAvatar}
                                alt={p.memberName}
                                className="w-6.5 h-6.5 rounded-full object-cover"
                              />
                            ) : (
                              <div className={`w-6.5 h-6.5 rounded-full flex items-center justify-center font-bold text-[10px] ${getAvatarColor(p.memberId)}`}>
                                {getInitials(p.memberName || '')}
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-zinc-800 dark:text-zinc-200 leading-tight">
                                {p.memberName}
                              </p>
                              <span className="text-[9px] text-zinc-400 font-semibold mt-0.5 block">
                                Chia sẻ: {formatVND(p.shareAmount)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {act.paid_by_member_id === 'quy_chung' ? (
                              <span className="text-[9.5px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full uppercase flex items-center gap-0.5 tracking-wider">
                                <CheckCircle2 className="w-3 h-3" />
                                Đã trừ quỹ
                              </span>
                            ) : isPayer ? (
                              <span className="text-[9.5px] font-semibold text-zinc-400 flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-700/50 px-2 py-0.5 rounded-md">
                                Tự chi trả
                              </span>
                            ) : isUnpaid ? (
                              <button
                                onClick={() => handleConfirmPaid(p.txId)}
                                className="flex items-center gap-1 text-[9.5px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/25 px-2.5 py-1.5 rounded-lg border border-amber-500/20 active:scale-95 transition-all"
                              >
                                <AlertCircle className="w-3.5 h-3.5" />
                                Đã trả?
                              </button>
                            ) : (
                              <span className="text-[9.5px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full uppercase flex items-center gap-0.5">
                                <CheckCircle2 className="w-3 h-3" />
                                Đã trả
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
