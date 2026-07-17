import * as XLSX from 'xlsx'

function slug(s) {
  return s.replace(/\s+/g, '-').toLowerCase()
}

function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function exportMonthlyCSV(transactions, monthLabel) {
  const header = ['Tanggal', 'Jenis', 'Kategori', 'Catatan', 'Jumlah']
  const rows = transactions.map((t) => [
    t.transaction_date,
    t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
    t.categories?.name || '-',
    (t.note || '-').replace(/,/g, ';'),
    t.amount,
  ])
  const csv = [header, ...rows].map((r) => r.join(',')).join('\n')
  downloadBlob(csv, `transaksi-${slug(monthLabel)}.csv`, 'text/csv;charset=utf-8;')
}

export function exportMonthlyExcel(transactions, monthLabel) {
  const data = transactions.map((t) => ({
    Tanggal: t.transaction_date,
    Jenis: t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
    Kategori: t.categories?.name || '-',
    Catatan: t.note || '-',
    Jumlah: Number(t.amount),
  }))
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Transaksi')
  XLSX.writeFile(wb, `transaksi-${slug(monthLabel)}.xlsx`)
}

export function exportYearlyCSV(monthlyRows, year) {
  const header = ['Bulan', 'Pemasukan', 'Pengeluaran', 'Saldo']
  const rows = monthlyRows.map((m) => [m.label, m.income, m.expense, m.balance])
  const csv = [header, ...rows].map((r) => r.join(',')).join('\n')
  downloadBlob(csv, `ringkasan-tahunan-${year}.csv`, 'text/csv;charset=utf-8;')
}

export function exportYearlyExcel(monthlyRows, year) {
  const data = monthlyRows.map((m) => ({
    Bulan: m.label,
    Pemasukan: m.income,
    Pengeluaran: m.expense,
    Saldo: m.balance,
  }))
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Ringkasan Tahunan')
  XLSX.writeFile(wb, `ringkasan-tahunan-${year}.xlsx`)
}
