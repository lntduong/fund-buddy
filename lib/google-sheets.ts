import { google } from 'googleapis';
import { Member, Activity, Transaction } from '../types';

const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKey = process.env.GOOGLE_PRIVATE_KEY;
const spreadsheetId = process.env.GOOGLE_SHEET_ID;

// Helper to get authorized sheets client
function getSheetsClient() {
  if (!clientEmail || !privateKey || !spreadsheetId) {
    throw new Error('Google sheets environment variables (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID) are not configured.');
  }

  const formattedKey = privateKey.replace(/\\n/g, '\n');

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: formattedKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

// 1. GET MEMBERS
export async function getMembers(): Promise<Member[]> {
  try {
    const sheets = getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'members!A2:D',
    });

    const rows = response.data.values || [];
    return rows.map((row) => ({
      id: row[0] || '',
      name: row[1] || '',
      avatar: row[2] || '',
      current_balance: parseFloat(row[3] || '0'),
    }));
  } catch (error) {
    console.error('Error fetching members from Google Sheets:', error);
    return [];
  }
}

// 2. GET ACTIVITIES
export async function getActivities(): Promise<Activity[]> {
  try {
    const sheets = getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'activities!A2:F',
    });

    const rows = response.data.values || [];
    return rows.map((row) => ({
      id: row[0] || '',
      title: row[1] || '',
      date: row[2] || '',
      total_amount: parseFloat(row[3] || '0'),
      paid_by_member_id: row[4] || '',
      notes: row[5] || '',
    }));
  } catch (error) {
    console.error('Error fetching activities from Google Sheets:', error);
    return [];
  }
}

// 3. GET TRANSACTIONS
export async function getTransactions(): Promise<Transaction[]> {
  try {
    const sheets = getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'transactions!A2:F',
    });

    const rows = response.data.values || [];
    return rows.map((row) => ({
      id: row[0] || '',
      member_id: row[1] || '',
      activity_id: row[2] || '',
      amount: parseFloat(row[3] || '0'),
      type: row[4] as 'thu_quy' | 'chi_an_choi',
      status: row[5] as 'da_tra' | 'chua_tra',
    }));
  } catch (error) {
    console.error('Error fetching transactions from Google Sheets:', error);
    return [];
  }
}

// 4. ADD MEMBER
export async function addMember(member: Member): Promise<boolean> {
  try {
    const sheets = getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'members!A2:D',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[member.id, member.name, member.avatar, member.current_balance.toString()]],
      },
    });
    return true;
  } catch (error) {
    console.error('Error appending member to Google Sheets:', error);
    return false;
  }
}

// 5. ADD ACTIVITY
export async function addActivity(activity: Activity): Promise<boolean> {
  try {
    const sheets = getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'activities!A2:F',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          activity.id,
          activity.title,
          activity.date,
          activity.total_amount.toString(),
          activity.paid_by_member_id,
          activity.notes || '',
        ]],
      },
    });
    return true;
  } catch (error) {
    console.error('Error appending activity to Google Sheets:', error);
    return false;
  }
}

// 6. ADD TRANSACTION (APPEND SINGLE OR MULTIPLE)
export async function addTransactions(transactions: Transaction[]): Promise<boolean> {
  try {
    const sheets = getSheetsClient();
    const values = transactions.map((t) => [
      t.id,
      t.member_id,
      t.activity_id,
      t.amount.toString(),
      t.type,
      t.status,
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'transactions!A2:F',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });
    return true;
  } catch (error) {
    console.error('Error appending transactions to Google Sheets:', error);
    return false;
  }
}

// 7. UPDATE MEMBER BALANCE
export async function updateMemberBalance(memberId: string, newBalance: number): Promise<boolean> {
  try {
    const sheets = getSheetsClient();
    
    // Find the row number for the member
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'members!A:A',
    });
    
    const rows = response.data.values || [];
    const rowIndex = rows.findIndex((row) => row[0] === memberId);
    
    if (rowIndex === -1) {
      console.error(`Member with ID ${memberId} not found in Google Sheets.`);
      return false;
    }
    
    // Rows are 0-indexed in array, but 1-indexed in Sheets. 
    // Header is row 1, so array index matches sheet row index + 1
    const sheetRowNumber = rowIndex + 1;
    
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `members!D${sheetRowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[newBalance.toString()]],
      },
    });
    
    return true;
  } catch (error) {
    console.error(`Error updating balance for member ${memberId}:`, error);
    return false;
  }
}

// 8. UPDATE TRANSACTION STATUS
export async function updateTransactionStatus(transactionId: string, newStatus: 'da_tra' | 'chua_tra'): Promise<boolean> {
  try {
    const sheets = getSheetsClient();
    
    // Find the row number for the transaction
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'transactions!A:A',
    });
    
    const rows = response.data.values || [];
    const rowIndex = rows.findIndex((row) => row[0] === transactionId);
    
    if (rowIndex === -1) {
      console.error(`Transaction with ID ${transactionId} not found in Google Sheets.`);
      return false;
    }
    
    const sheetRowNumber = rowIndex + 1;
    
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `transactions!F${sheetRowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[newStatus]],
      },
    });
    
    return true;
  } catch (error) {
    console.error(`Error updating transaction status for ${transactionId}:`, error);
    return false;
  }
}
