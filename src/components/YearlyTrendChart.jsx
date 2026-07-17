import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

function formatRupiah(n) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID')
}

function formatShort(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'jt'
  if (n >= 1000) return (n / 1000).toFixed(0) + 'rb'
  return n
}

export default function YearlyTrendChart({ monthlyRows }) {
  const data = monthlyRows.map((m) => ({
    name: m.label.slice(0, 3),
    Pemasukan: m.income,
    Pengeluaran: m.expense,
  }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ded9c9" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'Inter, sans-serif' }} axisLine={{ stroke: '#ded9c9' }} tickLine={false} />
        <YAxis tickFormatter={formatShort} tick={{ fontSize: 11, fontFamily: 'Inter, sans-serif' }} axisLine={false} tickLine={false} width={44} />
        <Tooltip formatter={(value) => formatRupiah(value)} />
        <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'Inter, sans-serif' }} />
        <Bar dataKey="Pemasukan" fill="#2f7d5c" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Pengeluaran" fill="#a1503b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
