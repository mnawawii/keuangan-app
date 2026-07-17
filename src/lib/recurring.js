import { supabase } from './supabaseClient'

export async function generateRecurringTransactions(recurringList, existingTransactions, userId) {
  const now = new Date()
  const currentMonthKey = now.toISOString().slice(0, 7)
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

  for (const r of recurringList) {
    if (!r.active) continue
    const alreadyExists = existingTransactions.some(
      (t) => t.recurring_id === r.id && t.transaction_date?.slice(0, 7) === currentMonthKey
    )
    if (alreadyExists) continue

    const day = Math.min(r.day_of_month, daysInMonth)
    const txDate = `${currentMonthKey}-${String(day).padStart(2, '0')}`

    await supabase.from('transactions').insert({
      user_id: userId,
      category_id: r.category_id,
      type: r.type,
      amount: r.amount,
      note: r.note || 'Transaksi berulang',
      transaction_date: txDate,
      recurring_id: r.id,
    })
  }
}
