'use server';

import { revalidatePath } from 'next/cache';
import * as sheets from '../lib/google-sheets';
import { Member, Activity, Transaction } from '../types';

// Helper to generate unique IDs
const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

// Helper to recalculate and sync dynamic balances to Google Sheets
function computeMemberBalances(
  members: Member[],
  transactions: Transaction[],
  activities: Activity[]
): Member[] {
  const activityMap = new Map(activities.map((a) => [a.id, a]));

  return members.map((member) => {
    const memberTransactions = transactions.filter((t) => t.member_id === member.id);

    // 1. Sum of all 'thu_quy' (fund contributions/reimbursements) transactions
    const totalThuQuy = memberTransactions
      .filter((t) => t.type === 'thu_quy')
      .reduce((sum, t) => sum + t.amount, 0);

    // 2. Sum of all 'chi_an_choi' transactions that belong to COMMON FUND activities
    const commonExpenses = memberTransactions
      .filter((t) => t.type === 'chi_an_choi')
      .filter((t) => {
        const act = activityMap.get(t.activity_id);
        return act && act.paid_by_member_id === 'quy_chung';
      })
      .reduce((sum, t) => sum + t.amount, 0); // these amounts are negative

    // 3. Sum of all UNPAID private debt ('chi_an_choi' & paid_by_member_id !== 'quy_chung' & status === 'chua_tra')
    const unpaidPrivateDebt = memberTransactions
      .filter((t) => t.type === 'chi_an_choi' && t.status === 'chua_tra')
      .filter((t) => {
        const act = activityMap.get(t.activity_id);
        return act && act.paid_by_member_id !== 'quy_chung';
      })
      .reduce((sum, t) => sum + t.amount, 0); // these amounts are negative

    // 4. Sum of all UNPAID private credits (other members' 'chua_tra' transactions for activities where this member is the payer)
    const myPaidPrivateActivities = activities.filter((a) => a.paid_by_member_id === member.id);
    const myPaidPrivateActIds = new Set(myPaidPrivateActivities.map((a) => a.id));

    const unpaidPrivateCredit = transactions
      .filter((t) => t.type === 'chi_an_choi' && t.status === 'chua_tra' && t.member_id !== member.id)
      .filter((t) => myPaidPrivateActIds.has(t.activity_id))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0); // these should be positive credits

    const computedBalance = totalThuQuy + commonExpenses + unpaidPrivateDebt + unpaidPrivateCredit;

    return {
      ...member,
      current_balance: computedBalance,
    };
  });
}

// Helper to recalculate and sync dynamic balances to Google Sheets
export async function syncMemberBalances() {
  const [members, transactions, activities] = await Promise.all([
    sheets.getMembers(),
    sheets.getTransactions(),
    sheets.getActivities(),
  ]);

  const computedMembers = computeMemberBalances(members, transactions, activities);
  
  for (const member of computedMembers) {
    const originalMember = members.find((m) => m.id === member.id);
    if (originalMember && originalMember.current_balance !== member.current_balance) {
      await sheets.updateMemberBalance(member.id, member.current_balance);
    }
  }
}

// 1. FETCH MEMBERS DATA
export async function getMembersData(): Promise<Member[]> {
  const [members, transactions, activities] = await Promise.all([
    sheets.getMembers(),
    sheets.getTransactions(),
    sheets.getActivities(),
  ]);

  return computeMemberBalances(members, transactions, activities);
}

// 2. FETCH ACTIVITIES DATA (WITH PAYER INFO)
export async function getActivitiesData(): Promise<Activity[]> {
  const [activities, members] = await Promise.all([
    sheets.getActivities(),
    sheets.getMembers(),
  ]);

  const memberMap = new Map(members.map((m) => [m.id, m]));

  // Sort activities by date descending
  return activities
    .map((act) => {
      const isQuyChung = act.paid_by_member_id === 'quy_chung';
      const payer = memberMap.get(act.paid_by_member_id);
      return {
        ...act,
        payer_name: isQuyChung ? 'Quỹ chung' : (payer ? payer.name : 'Không rõ'),
        payer_avatar: isQuyChung ? '' : (payer ? payer.avatar : ''),
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// 3. FETCH TRANSACTIONS DATA (WITH DETAILS)
export async function getTransactionsData(): Promise<Transaction[]> {
  const [transactions, members, activities] = await Promise.all([
    sheets.getTransactions(),
    sheets.getMembers(),
    sheets.getActivities(),
  ]);

  const memberMap = new Map(members.map((m) => [m.id, m]));
  const activityMap = new Map(activities.map((a) => [a.id, a]));

  // Sort by date / ID descending
  return transactions
    .map((t) => {
      const member = memberMap.get(t.member_id);
      const activity = activityMap.get(t.activity_id);
      
      let activityTitle = 'Hoạt động chung';
      if (activity) {
        activityTitle = activity.title;
      } else if (t.type === 'thu_quy') {
        if (t.activity_id && t.activity_id.startsWith('quy_thang_')) {
          const parts = t.activity_id.split('_');
          activityTitle = `Đóng quỹ tháng ${parts[2]}/${parts[3]}`;
        } else {
          activityTitle = 'Đóng quỹ nhóm';
        }
      }

      return {
        ...t,
        member_name: member ? member.name : 'Không rõ',
        member_avatar: member ? member.avatar : '',
        activity_title: activityTitle,
      };
    })
    .reverse(); // Newest first
}

// 4. ACTION: ADD MEMBER
export async function addMemberAction(name: string, avatarUrl?: string) {
  try {
    if (!name.trim()) throw new Error('Tên thành viên không được để trống');

    const avatar = avatarUrl && avatarUrl.trim() !== '' ? avatarUrl.trim() : '';
    const newMember: Member = {
      id: generateId('mem'),
      name: name.trim(),
      avatar,
      current_balance: 0,
    };

    const success = await sheets.addMember(newMember);
    if (!success) throw new Error('Không thể thêm thành viên vào Google Sheets');

    revalidatePath('/');
    revalidatePath('/members');
    return { success: true };
  } catch (error: any) {
    console.error('Add Member Action error:', error);
    return { success: false, error: error.message || 'Lỗi hệ thống' };
  }
}

// 5. ACTION: ADD ACTIVITY (EAT/DRINK LOG + AUTO-SPLIT BILL)
export async function addActivityAction(
  title: string,
  totalAmount: number,
  paidByMemberId: string, // 'quy_chung' or member ID
  participantIds: string[],
  notes: string = '',
  customShares?: { [memberId: string]: number }
) {
  try {
    if (!title.trim()) throw new Error('Tiêu đề hoạt động không được để trống');
    if (totalAmount <= 0) throw new Error('Số tiền phải lớn hơn 0');
    if (!participantIds || participantIds.length === 0) {
      throw new Error('Vui lòng chọn ít nhất một người tham gia');
    }

    const activityId = generateId('act');
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const newActivity: Activity = {
      id: activityId,
      title: title.trim(),
      date,
      total_amount: totalAmount,
      paid_by_member_id: paidByMemberId, // Can be 'quy_chung' or member ID
      notes: notes.trim(),
    };

    // Add activity record
    const addActSuccess = await sheets.addActivity(newActivity);
    if (!addActSuccess) throw new Error('Không thể thêm hoạt động vào Google Sheets');

    const transactionsToAdd: Transaction[] = [];
    const isQuyChung = paidByMemberId === 'quy_chung';

    // Transactions representing each participant's share
    participantIds.forEach((pId) => {
      let shareAmount = 0;
      if (customShares && customShares[pId] !== undefined) {
        shareAmount = customShares[pId];
      } else {
        shareAmount = Math.round(totalAmount / participantIds.length);
      }

      let status: 'da_tra' | 'chua_tra' = 'da_tra';
      if (!isQuyChung) {
        // For private events, payer's own share is 'da_tra' (settled), others are 'chua_tra'
        status = pId === paidByMemberId ? 'da_tra' : 'chua_tra';
      }

      const shareTransaction: Transaction = {
        id: generateId('tx_share'),
        member_id: pId,
        activity_id: activityId,
        amount: -shareAmount,
        type: 'chi_an_choi',
        status,
      };
      transactionsToAdd.push(shareTransaction);
    });

    // Write all transactions in one batch
    const addTxSuccess = await sheets.addTransactions(transactionsToAdd);
    if (!addTxSuccess) throw new Error('Không thể thêm các giao dịch vào Google Sheets');

    // Recalculate and sync all member balances
    await syncMemberBalances();

    revalidatePath('/');
    revalidatePath('/activities');
    revalidatePath('/members');
    return { success: true };
  } catch (error: any) {
    console.error('Add Activity Action error:', error);
    return { success: false, error: error.message || 'Lỗi hệ thống' };
  }
}

// 6. ACTION: CONFIRM A DEBT TRANSACTION AS PAID (CONFIRM SETTLEMENT)
export async function confirmTransactionPaidAction(transactionId: string) {
  try {
    const transactions = await sheets.getTransactions();
    const targetTx = transactions.find((t) => t.id === transactionId);

    if (!targetTx) throw new Error('Giao dịch không tồn tại');
    if (targetTx.status === 'da_tra') throw new Error('Giao dịch này đã được thanh toán trước đó');
    if (targetTx.amount >= 0) throw new Error('Không thể phê duyệt giao dịch thu nhập');

    // Mark the transaction as paid (da_tra)
    const updateTxSuccess = await sheets.updateTransactionStatus(transactionId, 'da_tra');
    if (!updateTxSuccess) throw new Error('Không thể cập nhật trạng thái giao dịch');

    // Recalculate and sync all member balances
    await syncMemberBalances();

    revalidatePath('/');
    revalidatePath('/activities');
    revalidatePath('/members');
    return { success: true };
  } catch (error: any) {
    console.error('Confirm Paid Action error:', error);
    return { success: false, error: error.message || 'Lỗi hệ thống' };
  }
}

// 7. ACTION: ADD GENERAL FUND CONTRIBUTION (ĐÓNG QUỸ)
export async function addFundContributionAction(memberId: string, amount: number, activityId: string = 'general_fund') {
  try {
    if (!memberId) throw new Error('Vui lòng chọn thành viên đóng quỹ');
    if (amount === 0) throw new Error('Số tiền đóng quỹ phải khác 0');

    const transactionId = generateId('tx_fund');
    
    const newTx: Transaction = {
      id: transactionId,
      member_id: memberId,
      activity_id: activityId, // can be general_fund or quy_thang_MM_YYYY
      amount: amount,
      type: 'thu_quy',
      status: 'da_tra',
    };

    // Add transaction record
    const addTxSuccess = await sheets.addTransactions([newTx]);
    if (!addTxSuccess) throw new Error('Không thể thêm giao dịch đóng quỹ');

    // Recalculate and sync all member balances
    await syncMemberBalances();

    revalidatePath('/');
    revalidatePath('/members');
    return { success: true };
  } catch (error: any) {
    console.error('Add Fund Contribution error:', error);
    return { success: false, error: error.message || 'Lỗi hệ thống' };
  }
}

// 8. ACTION: ADD REIMBURSEMENT (REIMBURSE OUT-OF-POCKET EXPENSES FROM FUND)
export async function addReimbursementAction(memberId: string, amount: number) {
  try {
    if (!memberId) throw new Error('Vui lòng chọn thành viên nhận tiền');
    if (amount <= 0) throw new Error('Số tiền hoàn trả phải lớn hơn 0');

    const transactionId = generateId('tx_reimb');

    // A reimbursement reduces the member's balance (they get paid cash out of the fund, reducing their group credit)
    const newTx: Transaction = {
      id: transactionId,
      member_id: memberId,
      activity_id: 'reimbursement',
      amount: -amount, // Negative transaction representing drawing cash from the fund
      type: 'thu_quy', // Still categorized as fund transaction
      status: 'da_tra',
    };

    const addTxSuccess = await sheets.addTransactions([newTx]);
    if (!addTxSuccess) throw new Error('Không thể tạo giao dịch hoàn tiền');

    // Recalculate and sync all member balances
    await syncMemberBalances();

    revalidatePath('/');
    revalidatePath('/members');
    return { success: true };
  } catch (error: any) {
    console.error('Add Reimbursement error:', error);
    return { success: false, error: error.message || 'Lỗi hệ thống' };
  }
}
