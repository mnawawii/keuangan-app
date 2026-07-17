import { useState, useMemo, useEffect } from 'react'
import { downloadYearlyReport } from '../lib/pdf'
import { exportYearlyCSV, exportYearlyExcel } from '../lib/exportData'
import YearlyTrendChart from './YearlyTrendChart'

function formatRupiah(n) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID')
}

function initials(name, email) {
  const source = (name && name.trim()) || email || ''
  const parts = source.split(' ').filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export default function Profile({ user, profile, transactions, onSaveProfile }) {
  const [year, setYear] = useState(new Date().getFullYear())
  const [nameInput, setNameInput] = useState('')
  const [editing, setEditing] = useState(false)
  const [savingName, setSavingName] = useState(false)

  useEffect(() => {
    setNameInput(profile?.full_name || '')
  }, [profile])

  const joinDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '-'

  const monthlyRows = useMemo(() => {
    const rows = []
    for (let m = 0; m < 12; m++) {
      const key = `${year}-${String(m + 1).padStart(2, '0')}`
      const monthTx = transactions.filter((t) => t.transaction_date?.slice(0, 7) === key)
      let income = 0
      let expense = 0
      monthTx.forEach((t) => {
        if (t.type === 'income') income += Number(t.amount)
        else expense += Number(t.amount)
      })
      rows.push({
        key,
        label: new Date(year, m, 1).toLocaleDateString('id-ID', { month: 'long' }),
        income,
        expense,
        balance: income - expense,
        hasData: monthTx.length > 0,
      })
    }
    return rows
  }, [transactions, year])

  const yearTotals = useMemo(
    () =>
      monthlyRows.reduce(
        (acc, m) => ({ income: acc.income + m.income, expense: acc.expense + m.expense, balance: acc.balance + m.balance }),
        { income: 0, expense: 0, balance: 0 }
      ),
    [monthlyRows]
  )

  const maxAbs = Math.max(1, ...monthlyRows.map((m) => Math.max(m.income, m.expense)))

  async function handleSaveName(e) {
    e.preventDefault()
    setSavingName(true)
    await onSaveProfile(nameInput.trim())
    setSavingName(false)
    setEditing(false)
  }

  function handleDownloadPDF() {
    downloadYearlyReport({
      userName: profile?.full_name,
      userEmail: user.email,
      year,
      monthlyRows,
      yearTotals,
    })
  }

  return (
    <>
      <div className="profile-card">
        <div className="avatar-circle">{initials(profile?.full_name, user.email)}</div>
        <div className="profile-info">
          {editing ? (
            <form className="profile-edit-form" onSubmit={handleSaveName}>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Nama lengkap"
                autoFocus
              />
              <button className="btn btn-primary btn-small" type="submit" disabled={savingName}>
                {savingName ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button
                className="btn btn-ghost btn-small"
                type="button"
                onClick={() => {
                  setEditing(false)
                  setNameInput(profile?.full_name || '')
                }}
              >
                Batal
              </button>
            </form>
          ) : (
            <>
              <div className="profile-name">
                {profile?.full_name || 'Belum ada nama'}
                <button className="link-btn" onClick={() => setEditing(true)}>
                  Edit
                </button>
              </div>
              <div className="profile-email">{user.email}</div>
              <div className="profile-meta">Bergabung sejak {joinDate}</div>
            </>
          )}
        </div>
      </div>

      <div className="month-nav">
        <button aria-label="Tahun sebelumnya" onClick={() => setYear(year - 1)}>‹</button>
        <span className="month-label">{year}</span>
        <button aria-label="Tahun berikutnya" onClick={() => setYear(year + 1)}>›</button>
        <div className="export-group">
          <button onClick={handleDownloadPDF}>PDF</button>
          <button onClick={() => exportYearlyCSV(monthlyRows, year)}>CSV</button>
          <button onClick={() => exportYearlyExcel(monthlyRows, year)}>Excel</button>
        </div>
      </div>

      <div className="hero-card">
        <div className="hero-label">Ringkasan tahun {year}</div>
        <div className="hero-amount">{formatRupiah(yearTotals.balance)}</div>
        <div className="hero-stats">
          <div className="stat-pill">
            <span className="stat-icon income">↑</span>
            <div>
              <div className="stat-text-label">Total Pemasukan</div>
              <div className="stat-text-value">{formatRupiah(yearTotals.income)}</div>
            </div>
          </div>
          <div className="stat-pill">
            <span className="stat-icon expense">↓</span>
            <div>
              <div className="stat-text-label">Total Pengeluaran</div>
              <div className="stat-text-value">{formatRupiah(yearTotals.expense)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel chart-panel">
        <div className="panel-title">Tren Pemasukan & Pengeluaran</div>
        <YearlyTrendChart monthlyRows={monthlyRows} />
      </div>

      <div className="panel">
        <div className="panel-title">Ringkasan per Bulan</div>
        <div className="yearly-list">
          {monthlyRows.map((m) => (
            <div className="yearly-row" key={m.key}>
              <span className="yearly-month">{m.label}</span>
              <div className="yearly-bars">
                <div className="yearly-bar-track">
                  <div className="yearly-bar income" style={{ width: `${(m.income / maxAbs) * 100}%` }} />
                </div>
                <div className="yearly-bar-track">
                  <div className="yearly-bar expense" style={{ width: `${(m.expense / maxAbs) * 100}%` }} />
                </div>
              </div>
              <span className={`yearly-balance ${m.balance < 0 ? 'negative' : ''}`}>
                {m.hasData ? formatRupiah(m.balance) : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
