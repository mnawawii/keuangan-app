import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = ['#48607A', '#a9762a', '#2f7d5c', '#a1503b', '#7c6a9c', '#c9a227', '#3f6b6b', '#8a4b6b']

function formatRupiah(n) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID')
}

export default function CategoryPieChart({ transactions }) {
  const byCategory = {}
  transactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      const name = t.categories?.name || 'Tanpa kategori'
      byCategory[name] = (byCategory[name] || 0) + Number(t.amount)
    })

  const data = Object.entries(byCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  if (data.length === 0) {
    return <div className="empty-state">Belum ada data pengeluaran untuk ditampilkan.</div>
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={58}
          outerRadius={92}
          paddingAngle={2}
        >
          {data.map((entry, i) => (
            <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => formatRupiah(value)} />
        <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'Inter, sans-serif' }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
