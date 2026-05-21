'use server';

import { revalidatePath } from 'next/cache';
import * as sheets from '../lib/google-sheets';
import { Member, Activity, Transaction } from '../types';

// Helper to generate unique IDs
const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

// 1. FETCH MEMBERS DATA
export async function getMembersData(): Promise<Member[]> {
  return await sheets.getMembers();
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
      const payer = memberMap.get(act.paid_by_member_id);
      return {
        ...act,
        payer_name: payer ? payer.name : 'Không rõ',
        payer_avatar: payer ? payer.avatar : '',
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
  paidByMemberId: string,
  participantIds: string[],
  notes: string = ''
) {
  try {
    if (!title.trim()) throw new Error('Tiêu đề hoạt động không được để trống');
    if (totalAmount <= 0) throw new Error('Số tiền phải lớn hơn 0');
    if (!paidByMemberId) throw new Error('Vui lòng chọn người ứng tiền');
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
      paid_by_member_id: paidByMemberId,
      notes: notes.trim(),
    };

    // Add activity record
    const addActSuccess = await sheets.addActivity(newActivity);
    if (!addActSuccess) throw new Error('Không thể thêm hoạt động vào Google Sheets');

    // Financial split math
    const numParticipants = participantIds.length;
    const splitAmount = Math.round(totalAmount / numParticipants);
    const transactionsToAdd: Transaction[] = [];

    // Fetch members to update balances
    const allMembers = await sheets.getMembers();
    const memberMap = new Map(allMembers.map((m) => [m.id, m]));

    // 1. Transaction representing the out-of-pocket payment by the payer
    const payerTransaction: Transaction = {
      id: generateId('tx_pay'),
      member_id: paidByMemberId,
      activity_id: activityId,
      amount: totalAmount,
      type: 'chi_an_choi',
      status: 'da_tra', // The payer already spent this money
    };
    transactionsToAdd.push(payerTransaction);

    // 2. Transactions representing each participant's share
    participantIds.forEach((pId) => {
      const isPayer = pId === paidByMemberId;
      const shareTransaction: Transaction = {
        id: generateId('tx_share'),
        member_id: pId,
        activity_id: activityId,
        amount: -splitAmount,
        type: 'chi_an_choi',
        // Payer's own share is instantly resolved ("da_tra"), others' shares are unpaid ("chua_tra")
        status: isPayer ? 'da_tra' : 'chua_tra',
      };
      transactionsToAdd.push(shareTransaction);
    });

    // Write all transactions in one batch
    const addTxSuccess = await sheets.addTransactions(transactionsToAdd);
    if (!addTxSuccess) throw new Error('Không thể thêm các giao dịch vào Google Sheets');

    // 3. Update balances in the members list
    // Math:
    // - Payer gets: +totalAmount - splitAmount (if participant) or +totalAmount (if not participant)
    // - Non-payer participant gets: -splitAmount
    const isPayerParticipant = participantIds.includes(paidByMemberId);
    
    for (const member of allMembers) {
      let balanceChange = 0;
      
      if (member.id === paidByMemberId) {
        balanceChange += totalAmount;
      }
      
      if (participantIds.includes(member.id)) {
        balanceChange -= splitAmount;
      }

      if (balanceChange !== 0) {
        const newBalance = member.current_balance + balanceChange;
        await sheets.updateMemberBalance(member.id, newBalance);
      }
    }

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

    // Financial balance adjustments
    // Since B owed X and has now paid, B's balance increases by -amount (positive value)
    const debtAmount = Math.abs(targetTx.amount);
    const debtorId = targetTx.member_id;

    // Find who paid for this activity originally to credit them
    const activities = await sheets.getActivities();
    const activity = activities.find((a) => a.id === targetTx.activity_id);
    if (!activity) throw new Error('Hoạt động liên kết không tồn tại');
    
    const payerId = activity.paid_by_member_id;

    // Fetch members to update balances
    const allMembers = await sheets.getMembers();
    const debtor = allMembers.find((m) => m.id === debtorId);
    const payer = allMembers.find((m) => m.id === payerId);

    if (debtor) {
      // Debtor balance increases by debtAmount (brings closer to 0 or positive)
      const newDebtorBalance = debtor.current_balance + debtAmount;
      await sheets.updateMemberBalance(debtorId, newDebtorBalance);
    }

    if (payer && payerId !== debtorId) {
      // Payer balance decreases by debtAmount (since they have received the cash directly, their credit decreases)
      const newPayerBalance = payer.current_balance - debtAmount;
      await sheets.updateMemberBalance(payerId, newPayerBalance);
    }

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
    if (amount <= 0) throw new Error('Số tiền đóng quỹ phải lớn hơn 0');

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

    // Update member balance (+amount)
    const allMembers = await sheets.getMembers();
    const member = allMembers.find((m) => m.id === memberId);
    if (member) {
      const newBalance = member.current_balance + amount;
      await sheets.updateMemberBalance(memberId, newBalance);
    }

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

    // Update member balance (-amount)
    const allMembers = await sheets.getMembers();
    const member = allMembers.find((m) => m.id === memberId);
    if (member) {
      const newBalance = member.current_balance - amount;
      await sheets.updateMemberBalance(memberId, newBalance);
    }

    revalidatePath('/');
    revalidatePath('/members');
    return { success: true };
  } catch (error: any) {
    console.error('Add Reimbursement error:', error);
    return { success: false, error: error.message || 'Lỗi hệ thống' };
  }
}
