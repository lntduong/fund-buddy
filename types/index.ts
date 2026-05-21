export interface Member {
  id: string;
  name: string;
  avatar: string;
  current_balance: number; // positive = fund surplus/owed, negative = in debt
}

export interface Activity {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  total_amount: number;
  paid_by_member_id: string;
  notes?: string;
  // Dynamic fields computed after joining
  payer_name?: string;
  payer_avatar?: string;
  participant_count?: number;
}

export interface Transaction {
  id: string;
  member_id: string;
  activity_id: string; // can be empty or 'fund' for general contributions
  amount: number; // positive = pay in, negative = expense
  type: 'thu_quy' | 'chi_an_choi';
  status: 'da_tra' | 'chua_tra';
  // Dynamic fields
  member_name?: string;
  member_avatar?: string;
  activity_title?: string;
}
