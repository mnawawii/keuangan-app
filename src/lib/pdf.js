import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function formatRupiah(n) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID')
}

export function downloadMonthlyReport({ userName, userEmail, monthLabel, totals, health, transactions }) {
  const doc = new jsPDF()

  doc.setFontSize(16)
  doc.text('Laporan Keuangan Bulanan', 14, 18)
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(userName || userEmail, 14, 25)
  doc.text(`Periode: ${monthLabel}`, 14, 30)

  doc.setTextColor(0)
  doc.setFontSize(11)
  doc.text(`Pemasukan: ${formatRupiah(totals.income)}`, 14, 42)
  doc.text(`Pengeluaran: ${formatRupiah(totals.expense)}`, 14, 48)
  doc.text(`Saldo Bersih: ${formatRupiah(totals.balance)}`, 14, 54)
  doc.text(`Status Kesehatan Keuangan: ${health.label}`, 14, 60)

  const rows = transactions.map((t) => [
    new Date(t.transaction_date).toLocaleDateString('id-ID'),
    t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
    t.categories?.name || '-',
    t.note || '-',
    (t.type === 'income' ? '+' : '-') + formatRupiah(t.amount),
  ])

  autoTable(doc, {
    startY: 68,
    head: [['Tanggal', 'Jenis', 'Kategori', 'Catatan', 'Jumlah']],
    body: rows,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [31, 77, 63] },
  })

  doc.save(`laporan-keuangan-${monthLabel.replace(/\s+/g, '-').toLowerCase()}.pdf`)
}

export function downloadYearlyReport({ userName, userEmail, year, monthlyRows, yearTotals }) {
  const doc = new jsPDF()

  doc.setFontSize(16)
  doc.text('Laporan Keuangan Tahunan', 14, 18)
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(userName || userEmail, 14, 25)
  doc.text(`Tahun: ${year}`, 14, 30)

  doc.setTextColor(0)
  doc.setFontSize(11)
  doc.text(`Total Pemasukan: ${formatRupiah(yearTotals.income)}`, 14, 42)
  doc.text(`Total Pengeluaran: ${formatRupiah(yearTotals.expense)}`, 14, 48)
  doc.text(`Total Saldo Bersih: ${formatRupiah(yearTotals.balance)}`, 14, 54)

  const rows = monthlyRows.map((m) => [
    m.label,
    formatRupiah(m.income),
    formatRupiah(m.expense),
    formatRupiah(m.balance),
  ])

  autoTable(doc, {
    startY: 62,
    head: [['Bulan', 'Pemasukan', 'Pengeluaran', 'Saldo']],
    body: rows,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [31, 77, 63] },
  })

  doc.save(`laporan-keuangan-${year}.pdf`)
}
