'use client';

import { useState } from 'react';
import { addMemberAction, addFundContributionAction, addReimbursementAction } from '../app/actions';
import { Member, Transaction, Activity } from '../types';
import { UserPlus, Wallet, Search, TrendingUp, TrendingDown, ArrowRightLeft, Plus, DollarSign, Check, X, RefreshCw, Calendar, ChevronDown, ChevronLeft, ChevronRight, Globe } from 'lucide-react';
import { isUrl, getInitials, getAvatarColor } from '../lib/utils';

interface MembersClientProps {
  initialMembers: Member[];
  initialTransactions: Transaction[];
  initialActivities?: Activity[];
  openContributionByDefault?: boolean;
}

export default function MembersClient({ 
  initialMembers, 
  initialTransactions, 
  initialActivities,
  openContributionByDefault = false 
}: MembersClientProps) {
  
  // State variables
  const [search, setSearch] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [showFundAction, setShowFundAction] = useState(openContributionByDefault);
  const [isReimbursement, setIsReimbursement] = useState(false); // Toggle between Nộp quỹ & Rút quỹ
  
  // Month calculation helpers
  const now = new Date();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const currentYear = String(now.getFullYear());
  const currentMonthTag = `quy_thang_${currentMonth}_${currentYear}`;
  const currentMonthLabel = `Tháng ${currentMonth}/${currentYear}`;

  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = String(prevMonthDate.getMonth() + 1).padStart(2, '0');
  const prevYear = String(prevMonthDate.getFullYear());
  const prevMonthTag = `quy_thang_${prevMonth}_${prevYear}`;

  const [selectedMonth, setSelectedMonth] = useState(currentMonthTag);

  // Custom dropdown states
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [showCalendarDropdown, setShowCalendarDropdown] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [selectedDayDate, setSelectedDayDate] = useState<Date | null>(new Date());
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(new Date());
  
  // Form values
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberAvatar, setNewMemberAvatar] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [fundAmount, setFundAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Auto-format currency typing (Vietnamese dots separation)
  const formatRawValue = (val: string) => {
    const numeric = val.replace(/[^0-9]/g, '');
    if (!numeric) return '';
    return new Intl.NumberFormat('vi-VN').format(parseInt(numeric));
  };

  const getNumericValue = (formatted: string) => {
    return parseInt(formatted.replace(/[^0-9]/g, '')) || 0;
  };

  // Helper to generate grid of days for calendar
  const getDaysInMonthGrid = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevTotalDays = new Date(year, month, 0).getDate();
    
    const cells = [];
    
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push({
        day: prevTotalDays - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevTotalDays - i)
      });
    }
    
    for (let i = 1; i <= totalDays; i++) {
      cells.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i)
      });
    }
    
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      cells.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i)
      });
    }
    
    return cells;
  };

  // Filter members based on search
  const filteredMembers = initialMembers.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  // Financial Stats
  // Total contributions (positive/negative thu_quy transactions)
  const totalFundContributions = initialTransactions
    .filter((t) => t.type === 'thu_quy')
    .reduce((sum, t) => sum + t.amount, 0);

  // Total cost of all events
  const totalEventExpenses = initialActivities 
    ? initialActivities.reduce((sum, a) => sum + a.total_amount, 0)
    : initialTransactions
        .filter((t) => t.type === 'chi_an_choi' && t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // Available cash in the common fund
  const groupFunds = totalFundContributions - totalEventExpenses;

  // Handle Add Member
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    
    if (!newMemberName.trim()) {
      setFormError('Vui lòng nhập tên thành viên');
      return;
    }

    setIsSubmitting(true);
    const res = await addMemberAction(newMemberName, newMemberAvatar);
    setIsSubmitting(false);

    if (res.success) {
      setFormSuccess('Thêm thành viên thành công!');
      setNewMemberName('');
      setNewMemberAvatar('');
      setTimeout(() => {
        setShowAddMember(false);
        setFormSuccess('');
      }, 1000);
    } else {
      setFormError(res.error || 'Đã xảy ra lỗi');
    }
  };

  // Handle Fund Contribution or Reimbursement
  const handleFundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!selectedMemberId) {
      setFormError('Vui lòng chọn thành viên');
      return;
    }

    const amount = getNumericValue(fundAmount);
    if (amount <= 0) {
      setFormError('Số tiền phải lớn hơn 0');
      return;
    }

    setIsSubmitting(true);
    let res;
    if (isReimbursement) {
      res = await addReimbursementAction(selectedMemberId, amount);
    } else {
      res = await addFundContributionAction(selectedMemberId, amount, selectedMonth);
    }
    setIsSubmitting(false);

    if (res.success) {
      setFormSuccess(isReimbursement ? 'Hoàn tiền thành công!' : 'Đóng quỹ thành công!');
      setFundAmount('');
      setTimeout(() => {
        setShowFundAction(false);
        setFormSuccess('');
      }, 1200);
    } else {
      setFormError(res.error || 'Đã xảy ra lỗi');
    }
  };

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Title Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
            Quản Lý Thành Viên
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Quản lý số dư, đóng quỹ và rút tiền nhóm.
          </p>
        </div>
        <button
          onClick={() => {
            setShowAddMember(true);
            setShowFundAction(false);
          }}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-md shadow-emerald-500/20 active:scale-95 transition-all duration-200"
        >
          <UserPlus className="w-4 h-4" />
          Mới
        </button>
      </div>

      {/* Stats row & Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-700/50 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-zinc-400 font-bold uppercase">Quỹ khả dụng</p>
            <p className="text-sm font-extrabold text-zinc-800 dark:text-zinc-100">{formatVND(groupFunds)}</p>
          </div>
        </div>

        <button
          onClick={() => {
            setShowFundAction(true);
            setShowAddMember(false);
          }}
          className="bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 border border-zinc-200/60 dark:border-zinc-700/60 rounded-2xl p-4 flex items-center gap-3 text-left w-full shadow-sm active:scale-98 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-zinc-400 font-bold uppercase">Nộp / Rút quỹ</p>
            <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Click để thực hiện</p>
          </div>
        </button>
      </div>

      {/* Add Member Bottom Sheet/Form Overlay */}
      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs">
          <div className="absolute inset-0" onClick={() => setShowAddMember(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl p-6 pb-8 shadow-2xl border-t border-zinc-200 dark:border-zinc-800 max-h-[85dvh] overflow-y-auto animate-slide-up">
            <button
              onClick={() => setShowAddMember(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 dark:text-zinc-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50 mb-4">
              Thêm Thành Viên Mới
            </h3>

            <form onSubmit={handleAddMember} className="space-y-4 pb-16">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                  Tên thành viên
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Hoàng Long, Mỹ Duyên..."
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                  URL Ảnh Đại Diện (Không bắt buộc)
                </label>
                <input
                  type="text"
                  placeholder="Để trống để tự động chọn avatar ngẫu nhiên"
                  value={newMemberAvatar}
                  onChange={(e) => setNewMemberAvatar(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {formError && <p className="text-xs text-rose-500 font-semibold">{formError}</p>}
              {formSuccess && <p className="text-xs text-emerald-500 font-semibold">{formSuccess}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-98 transition-all"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Thêm Thành Viên
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Nộp/Rút Quỹ Bottom Sheet */}
      {showFundAction && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs">
          <div className="absolute inset-0" onClick={() => setShowFundAction(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl p-6 pb-8 shadow-2xl border-t border-zinc-200 dark:border-zinc-800 max-h-[85dvh] overflow-y-auto animate-slide-up">
            <button
              onClick={() => setShowFundAction(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 dark:text-zinc-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Toggle Action Type Tab */}
            <div className="flex bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl mb-4 border border-zinc-200/40 dark:border-zinc-800/40">
              <button
                type="button"
                onClick={() => setIsReimbursement(false)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  !isReimbursement
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm'
                    : 'text-zinc-400 dark:text-zinc-500'
                }`}
              >
                Nộp quỹ / Trả nợ
              </button>
              <button
                type="button"
                onClick={() => setIsReimbursement(true)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  isReimbursement
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm'
                    : 'text-zinc-400 dark:text-zinc-500'
                }`}
              >
                Rút quỹ / Hoàn tiền
              </button>
            </div>

            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-50 mb-4">
              {isReimbursement ? 'Rút Tiền Khỏi Quỹ Chung' : 'Nộp Quỹ Hoặc Trả Nợ'}
            </h3>

            <form onSubmit={handleFundSubmit} className="space-y-4 pb-16">
              {/* Member Selection */}
              <div className="space-y-1.5 relative">
                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                  Chọn thành viên
                </label>
                
                {/* Trigger Button */}
                <button
                  type="button"
                  onClick={() => setShowMemberDropdown(!showMemberDropdown)}
                  className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm cursor-pointer transition-all text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {selectedMemberId ? (
                      (() => {
                        const m = initialMembers.find((member) => member.id === selectedMemberId);
                        if (!m) return <span className="text-zinc-400 dark:text-zinc-500">Chọn thành viên...</span>;
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
                              {m.name} <span className="text-[10px] font-normal text-zinc-400">({formatVND(m.current_balance)})</span>
                            </span>
                          </>
                        );
                      })()
                    ) : (
                      <span className="text-zinc-400 dark:text-zinc-500 font-normal">Chọn thành viên...</span>
                    )}
                  </div>
                  <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
                </button>

                {/* Dropdown Overlay Click-away */}
                {showMemberDropdown && (
                  <div className="fixed inset-0 z-10" onClick={() => setShowMemberDropdown(false)} />
                )}

                {/* Dropdown Menu */}
                {showMemberDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-xl z-20 overflow-hidden flex flex-col max-h-60 animate-in fade-in-50 slide-in-from-top-1 duration-100">
                    {/* Search Field */}
                    <div className="p-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2 shrink-0">
                      <Search className="w-3.5 h-3.5 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Tìm thành viên..."
                        value={memberSearchQuery}
                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                        className="w-full bg-transparent border-0 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none placeholder-zinc-450"
                        autoFocus
                      />
                      {memberSearchQuery && (
                        <button type="button" onClick={() => setMemberSearchQuery('')} className="text-zinc-450 hover:text-zinc-600 dark:hover:text-zinc-300">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    {/* Items List */}
                    <div className="overflow-y-auto py-1 max-h-48 divide-y divide-zinc-50 dark:divide-zinc-850/50">
                      {initialMembers
                        .filter((m) => m.name.toLowerCase().includes(memberSearchQuery.toLowerCase()))
                        .map((m) => {
                          const isSelected = selectedMemberId === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setSelectedMemberId(m.id);
                                setShowMemberDropdown(false);
                                setMemberSearchQuery('');
                              }}
                              className={`flex items-center justify-between w-full px-3.5 py-2.5 text-left text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer ${
                                isSelected ? 'bg-emerald-500/5 text-emerald-600 dark:text-emerald-400' : 'text-zinc-700 dark:text-zinc-300'
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
                                <div className="truncate flex flex-col">
                                  <span>{m.name}</span>
                                  <span className="text-[10px] font-normal text-zinc-400">
                                    Số dư: {formatVND(m.current_balance)}
                                  </span>
                                </div>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-emerald-500 shrink-0" />}
                            </button>
                          );
                        })}
                      {initialMembers.filter((m) => m.name.toLowerCase().includes(memberSearchQuery.toLowerCase())).length === 0 && (
                        <div className="p-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
                          Không tìm thấy thành viên
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Month Selection */}
              {!isReimbursement && (
                <div className="space-y-1.5 relative">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                    Kỳ đóng quỹ
                  </label>
                  
                  {/* Trigger Button */}
                  <button
                    type="button"
                    onClick={() => setShowCalendarDropdown(!showCalendarDropdown)}
                    className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
                      <span className="truncate">
                        {selectedMonth === 'general_fund'
                          ? 'Đóng quỹ chung (Không theo tháng)'
                          : (() => {
                              const parts = selectedMonth.split('_');
                              return `Đóng quỹ tháng ${parts[2]}/${parts[3]}`;
                            })()}
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
                  </button>

                  {/* Dropdown Overlay Click-away */}
                  {showCalendarDropdown && (
                    <div className="fixed inset-0 z-10" onClick={() => setShowCalendarDropdown(false)} />
                  )}

                  {/* Dropdown Menu (Calendar) */}
                  {showCalendarDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-xl z-20 flex flex-col gap-3.5 animate-in fade-in-50 slide-in-from-top-1 duration-100">
                      
                      {/* Calendar Header */}
                      <div className="flex items-center justify-between px-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1))}
                          className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-450 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer active:scale-95 transition-all"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-[10px] font-extrabold text-zinc-800 dark:text-zinc-100 uppercase tracking-wider">
                          Tháng {String(calendarViewDate.getMonth() + 1).padStart(2, '0')}, {calendarViewDate.getFullYear()}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1))}
                          className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-450 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer active:scale-95 transition-all"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Weekday Row */}
                      <div className="grid grid-cols-7 gap-1 text-center shrink-0">
                        {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((wd) => (
                          <span key={wd} className="text-[9px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest py-0.5">
                            {wd}
                          </span>
                        ))}
                      </div>

                      {/* Day Cells Grid */}
                      <div className="grid grid-cols-7 gap-1">
                        {getDaysInMonthGrid(calendarViewDate).map((cell, idx) => {
                          const cellMonth = String(cell.date.getMonth() + 1).padStart(2, '0');
                          const cellYear = String(cell.date.getFullYear());
                          const cellTag = `quy_thang_${cellMonth}_${cellYear}`;
                          
                          const isMonthSelected = selectedMonth === cellTag;
                          const isDaySelected = selectedDayDate && 
                            selectedDayDate.getDate() === cell.date.getDate() &&
                            selectedDayDate.getMonth() === cell.date.getMonth() &&
                            selectedDayDate.getFullYear() === cell.date.getFullYear();
                          const isToday = new Date().toDateString() === cell.date.toDateString();

                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setSelectedMonth(cellTag);
                                setSelectedDayDate(cell.date);
                                setShowCalendarDropdown(false);
                              }}
                              className={`w-full aspect-square rounded-lg flex items-center justify-center text-xs font-bold transition-all cursor-pointer relative active:scale-95 ${
                                !cell.isCurrentMonth
                                  ? 'text-zinc-300 dark:text-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-850/30'
                                  : isDaySelected
                                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                                  : isMonthSelected
                                  ? 'bg-emerald-500/10 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-850'
                              }`}
                            >
                              <span>{cell.day}</span>
                              {isToday && !isDaySelected && (
                                <span className="absolute bottom-1.5 w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* General Fund Toggle (Quick Button) */}
                      <div className="border-t border-zinc-100 dark:border-zinc-800 pt-2 mt-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMonth('general_fund');
                            setSelectedDayDate(null);
                            setShowCalendarDropdown(false);
                          }}
                          className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                            selectedMonth === 'general_fund'
                              ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                              : 'bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-850 text-indigo-600 dark:text-indigo-400'
                          }`}
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>Đóng quỹ chung (Không theo tháng)</span>
                        </button>
                      </div>
                      
                    </div>
                  )}
                </div>
              )}

              {/* Amount input with dynamic DOTS formatting */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                  Số tiền (VND)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Ví dụ: 100.000"
                    value={fundAmount}
                    onChange={(e) => setFundAmount(formatRawValue(e.target.value))}
                    className="w-full pl-4 pr-10 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                    đ
                  </span>
                </div>
              </div>

              {formError && <p className="text-xs text-rose-500 font-semibold">{formError}</p>}
              {formSuccess && <p className="text-xs text-emerald-500 font-semibold">{formSuccess}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all ${
                  isReimbursement
                    ? 'bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 shadow-rose-500/20'
                    : 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 shadow-indigo-500/20'
                }`}
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Wallet className="w-4 h-4" />
                )}
                {isReimbursement ? 'Xác Nhận Rút Tiền' : 'Xác Nhận Nộp Quỹ'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Monthly Contribution Tracker */}
      <div className="bg-white dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-700/50 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-6 rounded-full bg-emerald-500" />
            <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-100 tracking-tight">
              Theo dõi Đóng Quỹ {currentMonthLabel}
            </h4>
          </div>
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md uppercase">
            Tháng này
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {initialMembers.map((member) => {
            const hasPaidThisMonth = initialTransactions.some(
              (tx) => tx.member_id === member.id && tx.activity_id === currentMonthTag && tx.type === 'thu_quy'
            );

            return (
              <div
                key={member.id}
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                  hasPaidThisMonth
                    ? 'bg-emerald-500/5 dark:bg-emerald-400/5 border-emerald-500/20 text-emerald-800 dark:text-emerald-400'
                    : 'bg-rose-500/5 dark:bg-rose-400/5 border-rose-500/20 text-rose-800 dark:text-rose-400'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {isUrl(member.avatar) ? (
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-7.5 h-7.5 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className={`w-7.5 h-7.5 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${getAvatarColor(member.id)}`}>
                      {getInitials(member.name)}
                    </div>
                  )}
                  <span className="text-xs font-bold truncate">{member.name}</span>
                </div>

                <div className="shrink-0">
                  {hasPaidThisMonth ? (
                    <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-500/10 uppercase tracking-wide">
                      Đã đóng
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        const message = `Alo alo ${member.name} iu dấu! Tiền đóng quỹ Tháng ${currentMonth}/${currentYear} chưa thấy ting ting nè. Bắn giùm tui nha! 😘💸`;
                        navigator.clipboard.writeText(message);
                        alert(`Đã copy tin nhắn nhắc nộp quỹ tháng ${currentMonth}/${currentYear} cho ${member.name}!`);
                      }}
                      className="text-[9px] font-extrabold px-2 py-1 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 uppercase tracking-wide active:scale-95 transition-all cursor-pointer"
                    >
                      Nhắc nhở
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          placeholder="Tìm kiếm thành viên..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-2xl border border-zinc-200/80 dark:border-zinc-750 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm transition-all"
        />
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
      </div>

      {/* Member Cards Grid */}
      <div className="space-y-3">
        {filteredMembers.length === 0 ? (
          <div className="py-10 text-center text-zinc-400 dark:text-zinc-500 bg-white dark:bg-zinc-800 rounded-3xl border border-zinc-200/50 dark:border-zinc-700/50 p-6 space-y-2">
            <p className="text-xs font-semibold">Không tìm thấy thành viên phù hợp</p>
          </div>
        ) : (
          filteredMembers.map((member) => {
            const hasSurplus = member.current_balance > 0;
            const hasDebt = member.current_balance < 0;

            return (
              <div
                key={member.id}
                className="bg-white dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-700/50 rounded-2.5xl p-4.5 shadow-xs flex items-center justify-between hover:scale-[1.01] transition-transform duration-200"
              >
                <div className="flex items-center gap-3">
                  {isUrl(member.avatar) ? (
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-11 h-11 rounded-full object-cover border border-zinc-100 dark:border-zinc-700 shadow-xs"
                    />
                  ) : (
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shadow-xs ${getAvatarColor(member.id)}`}>
                      {getInitials(member.name)}
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-50 leading-tight">
                      {member.name}
                    </h4>
                    <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider mt-1 block">
                      ID: {member.id.split('_')[2] || member.id}
                    </span>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <p className="text-[10px] text-zinc-400 font-bold uppercase">
                    Số dư hiện tại
                  </p>
                  <p
                    className={`text-xs font-extrabold ${
                      hasSurplus
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : hasDebt
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    {hasSurplus ? '+' : ''}
                    {formatVND(member.current_balance)}
                  </p>
                  <span
                    className={`inline-block text-[8px] font-extrabold px-1.5 py-0.5 rounded-sm uppercase tracking-wide ${
                      hasSurplus
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : hasDebt
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        : 'bg-zinc-100 dark:bg-zinc-700/60 text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    {hasSurplus ? 'Dư tiền' : hasDebt ? 'Thiếu tiền' : 'Đã cân bằng'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Dynamic Member Transaction History Panel */}
      <div className="bg-white dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-700/50 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-6 rounded-full bg-indigo-500" />
            <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-100 tracking-tight">
              Lịch sử giao dịch gần đây
            </h4>
          </div>
          <ArrowRightLeft className="w-4 h-4 text-zinc-400" />
        </div>

        {initialTransactions.length === 0 ? (
          <div className="py-6 text-center text-zinc-400 dark:text-zinc-500 space-y-2">
            <p className="text-xs font-semibold">Chưa có giao dịch nào được thực hiện.</p>
          </div>
        ) : (
          <div className="space-y-3.5 max-h-[250px] overflow-y-auto pr-1">
            {initialTransactions.slice(0, 8).map((tx) => {
              const isPositive = tx.amount >= 0;
              const formattedAmount = formatVND(tx.amount);
              return (
                <div key={tx.id} className="flex items-center justify-between text-xs pb-3 border-b border-zinc-100 dark:border-zinc-700/20 last:border-b-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    {isUrl(tx.member_avatar) ? (
                      <img
                        src={tx.member_avatar}
                        alt={tx.member_name}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] ${getAvatarColor(tx.member_id)}`}>
                        {getInitials(tx.member_name || '')}
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-zinc-800 dark:text-zinc-100 leading-tight">
                        {tx.member_name}
                      </p>
                      <p className="text-[9px] text-zinc-400 mt-0.5">
                        {tx.type === 'thu_quy' ? (
                          <span className="text-indigo-500 font-semibold">Giao dịch Quỹ</span>
                        ) : (
                          <span className="text-teal-500 font-semibold">{tx.activity_title}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-extrabold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {isPositive ? '+' : ''}{formattedAmount}
                    </p>
                    <span className={`text-[8px] font-bold uppercase ${tx.status === 'da_tra' ? 'text-emerald-500' : 'text-orange-500'}`}>
                      {tx.status === 'da_tra' ? 'Khớp' : 'Chờ trả'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
