import Link from 'next/link';
import { getMembersData, getActivitiesData, getTransactionsData } from './actions';
import { PlusCircle, Wallet, ArrowDownRight, Calendar, Users, TrendingUp } from 'lucide-react';
import DebtReminder from '../components/DebtReminder';
import { isUrl, getInitials, getAvatarColor } from '../lib/utils';
import ScreenshotButton from '../components/ScreenshotButton';

export const revalidate = 0; // Force SSR

export default async function DashboardPage() {
  const [members, activities, transactions] = await Promise.all([
    getMembersData(),
    getActivitiesData(),
    getTransactionsData(),
  ]);

  // Calculations
  const totalFund = members.reduce((sum, m) => (m.current_balance > 0 ? sum + m.current_balance : sum), 0);
  const totalDebt = Math.abs(members.reduce((sum, m) => (m.current_balance < 0 ? sum + m.current_balance : sum), 0));
  const totalExpenses = activities.reduce((sum, a) => sum + a.total_amount, 0);

  // Debtors ranking (sorted by most negative balance first)
  const debtors = members
    .filter((m) => m.current_balance < 0)
    .sort((a, b) => a.current_balance - b.current_balance);

  const maxDebt = debtors.length > 0 ? Math.abs(debtors[0].current_balance) : 1;

  // Format currency helper
  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  // Recent 4 activities
  const recentActivities = activities.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Welcome & Quick Info */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
            Chào mừng quay lại! 👋
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Hôm nay nhóm mình ăn chơi gì nhỉ?
          </p>
        </div>
        <ScreenshotButton targetId="dashboard-capture" />
      </div>

      <div id="dashboard-capture" className="space-y-6 bg-zinc-50 dark:bg-zinc-900 p-1.5 rounded-3xl">
        {/* Hero Financial Stats Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 dark:from-emerald-700 dark:to-teal-900 text-white p-6 shadow-xl shadow-emerald-500/10">
        {/* Decorative subtle grid */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:14px_24px]" />
        
        <div className="relative z-10 space-y-5">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-emerald-100 text-xs font-semibold tracking-wider uppercase opacity-90">
                Tổng quỹ khả dụng
              </span>
              <h3 className="text-3xl font-extrabold tracking-tight mt-1">
                {formatVND(totalFund)}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10">
              <Wallet className="w-6 h-6 text-emerald-100" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
            <div>
              <span className="text-emerald-100/70 text-[10px] uppercase font-bold tracking-wider">
                Tổng nợ thành viên
              </span>
              <p className="text-sm font-bold flex items-center gap-1 mt-1 text-rose-200">
                <ArrowDownRight className="w-4 h-4" />
                {formatVND(totalDebt)}
              </p>
            </div>
            <div>
              <span className="text-emerald-100/70 text-[10px] uppercase font-bold tracking-wider">
                Tổng chi tiêu ăn chơi
              </span>
              <p className="text-sm font-bold flex items-center gap-1 mt-1 text-emerald-200">
                <TrendingUp className="w-4 h-4" />
                {formatVND(totalExpenses)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Banner */}
      <div className="grid grid-cols-2 gap-3.5">
        <Link
          href="/activities?add=true"
          className="flex items-center justify-center gap-2 py-3.5 px-4 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100 border border-zinc-200/60 dark:border-zinc-700/60 rounded-2xl text-xs font-bold shadow-sm transition-all active:scale-98"
        >
          <PlusCircle className="w-4.5 h-4.5 text-emerald-500" />
          Thêm cuộc vui
        </Link>
        <Link
          href="/members?contribution=true"
          className="flex items-center justify-center gap-2 py-3.5 px-4 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl text-xs font-bold shadow-sm transition-all active:scale-98"
        >
          <Wallet className="w-4.5 h-4.5" />
          Nộp quỹ / Trả nợ
        </Link>
      </div>

      {/* Debtors Leaderboard */}
      <div className="bg-white dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-700/50 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-6 rounded-full bg-rose-500" />
            <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-100 tracking-tight">
              Bảng Xếp Hạng Nợ Nhiều Nhất 💸
            </h4>
          </div>
          <span className="text-[10px] font-bold text-rose-500 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md uppercase">
            Nợ nhiều nhất
          </span>
        </div>

        {debtors.length === 0 ? (
          <div className="py-6 text-center text-zinc-400 dark:text-zinc-500 space-y-2">
            <span className="text-2xl">🎉</span>
            <p className="text-xs font-medium">Tuyệt vời! Cả nhóm đang hòa đồng, không ai nợ nần ai.</p>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            {debtors.map((member, index) => {
              const debtPercent = Math.min((Math.abs(member.current_balance) / maxDebt) * 100, 100);
              return (
                <div key={member.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        {isUrl(member.avatar) ? (
                          <img
                            src={member.avatar}
                            alt={member.name}
                            className="w-10 h-10 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
                          />
                        ) : (
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border border-zinc-200 dark:border-zinc-700 shadow-sm ${getAvatarColor(member.id)}`}>
                            {getInitials(member.name)}
                          </div>
                        )}
                        <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-zinc-900 dark:bg-zinc-700 text-[10px] text-white flex items-center justify-center font-bold border border-white dark:border-zinc-800 shadow-sm">
                          #{index + 1}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-50 leading-tight">
                          {member.name}
                        </p>
                        <p className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
                          Đang nợ: {formatVND(Math.abs(member.current_balance))}
                        </p>
                      </div>
                    </div>
                    
                    {/* Copy reminder action component */}
                    <DebtReminder member={member} maxDebt={maxDebt} />
                  </div>
                  
                  {/* Progress bar representing debt severity */}
                  <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-700/50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-500 transition-all duration-500"
                      style={{ width: `${debtPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Activities Log */}
      <div className="bg-white dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-700/50 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-6 rounded-full bg-emerald-500" />
            <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-100 tracking-tight">
              Các cuộc vui gần đây
            </h4>
          </div>
          <Link
            href="/activities"
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Xem tất cả
          </Link>
        </div>

        {recentActivities.length === 0 ? (
          <div className="py-8 text-center text-zinc-400 dark:text-zinc-500 space-y-2">
            <span className="text-2xl">🍻</span>
            <p className="text-xs font-medium">Chưa ghi nhận cuộc đi chơi nào.</p>
            <p className="text-[10px] text-zinc-400">Ấn "Thêm cuộc vui" bên trên để tạo nhé!</p>
          </div>
        ) : (
          <div className="space-y-4 pt-1 divide-y divide-zinc-100 dark:divide-zinc-700/30">
            {recentActivities.map((act, index) => (
              <div key={act.id} className={`flex items-center justify-between ${index > 0 ? 'pt-3.5' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-700 flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400 border border-zinc-200/30 dark:border-zinc-600/30">
                    <Calendar className="w-4 h-4 text-emerald-500" />
                    <span className="text-[8px] font-bold mt-0.5">{act.date.split('-')[2]}/{act.date.split('-')[1]}</span>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-zinc-950 dark:text-zinc-50 leading-tight">
                      {act.title}
                    </h5>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-400 mt-1 flex items-center gap-1">
                      {isUrl(act.payer_avatar) ? (
                        <img
                          src={act.payer_avatar}
                          alt={act.payer_name}
                          className="w-3.5 h-3.5 rounded-full object-cover"
                        />
                      ) : (
                        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold text-[7px] ${getAvatarColor(act.paid_by_member_id)}`}>
                          {getInitials(act.payer_name || '')}
                        </div>
                      )}
                      <span className="font-semibold text-zinc-500 dark:text-zinc-300">{act.payer_name}</span> ứng tiền
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-50">
                    {formatVND(act.total_amount)}
                  </span>
                  <p className="text-[9px] font-medium text-zinc-400 mt-0.5">
                    Đã chia đều
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
