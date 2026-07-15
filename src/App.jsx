import { useState, useEffect, useMemo } from 'react'
import { supabase } from './lib/supabaseClient'
import Auth from './Auth'

const TARGETS = { needs: 50, wants: 30, savings: 20 }
const GROUP_LABEL = { needs: 'Kebutuhan', wants: 'Keinginan', savings: 'Tabungan' }

function formatRupiah(n) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID')
}

function monthLabel(date) {
  return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}

function monthKey(date) {
  return date.toISOString().slice(0, 7)
}

function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [cursorDate, setCursorDate] = useState(new Date())

  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [type, setType] = useState('expense')
  const [categoryId, setCategoryId] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) return
    fetchCategories()
    fetchTransactions()

    const channel = supabase
      .channel('transactions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, fetchTransactions)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, fetchCategories)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user])

  async function fetchCategories() {
    const { data } = await supabase.from('categories').select('*').order('name')
    setCategories(data || [])
  }

  async function fetchTransactions() {
    const { data } = await supabase
      .from('transactions')
      .select('*, categories(name, group_type)')
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
    setTransactions(data || [])
  }

  async function addTransaction(e) {
    e.preventDefault()
    if (!amount) return
    setSaving(true)
    await supabase.from('transactions').insert({
      user_id: user.id,
      category_id: categoryId || null,
      type,
      amount: parseFloat(amount),
      note,
      transaction_date: new Date().toISOString().slice(0, 10),
    })
    setAmount('')
    setNote('')
    setCategoryId('')
    setSaving(false)
  }

  async function deleteTransaction(id) {
    await supabase.from('transactions').delete().eq('id', id)
  }

  async function addDefaultCategories() {
    const defaults = [
      { name: 'Makan', group_type: 'needs' },
      { name: 'Sewa / Kos', group_type: 'needs' },
      { name: 'Transportasi', group_type: 'needs' },
      { name: 'Hiburan', group_type: 'wants' },
      { name: 'Belanja', group_type: 'wants' },
      { name: 'Nongkrong', group_type: 'wants' },
      { name: 'Tabungan', group_type: 'savings' },
      { name: 'Investasi', group_type: 'savings' },
    ]
    await supabase.from('categories').insert(defaults.map((d) => ({ ...d, user_id: user.id })))
    fetchCategories()
  }

  const currentMonthKey = monthKey(cursorDate)

  const monthTransactions = useMemo(
    () => transactions.filter((t) => t.transaction_date?.slice(0, 7) === currentMonthKey),
    [transactions, currentMonthKey]
  )

  const totals = useMemo(() => {
    let income = 0
    let expense = 0
    const byGroup = { needs: 0, wants: 0, savings: 0 }
    monthTransactions.forEach((t) => {
      const val = Number(t.amount)
      if (t.type === 'income') income += val
      else {
        expense += val
        const g = t.categories?.group_type
        if (g) byGroup[g] += val
      }
    })
    return { income, expense, balance: income - expense, byGroup }
  }, [monthTransactions])

  const health = useMemo(() => {
    const { income, expense, balance, byGroup } = totals

    if (income === 0) {
      return {
        status: 'netral',
        label: 'Belum Ada Data',
        summary: 'Catat pemasukan bulan ini supaya analisis kesehatan keuangan bisa dihitung.',
        items: [],
      }
    }

    const needsPct = (byGroup.needs / income) * 100
    const wantsPct = (byGroup.wants / income) * 100
    const savingsPct = (byGroup.savings / income) * 100

    const items = []
    let issueCount = 0

    if (needsPct > TARGETS.needs) {
      issueCount++
      items.push({
        type: 'warning',
        text: `Pengeluaran kebutuhan ${needsPct.toFixed(0)}% dari pemasukan, melebihi target ${TARGETS.needs}%.`,
      })
    } else {
      items.push({
        type: 'good',
        text: `Pengeluaran kebutuhan ${needsPct.toFixed(0)}% dari pemasukan, masih dalam target ${TARGETS.needs}%.`,
      })
    }

    if (wantsPct > TARGETS.wants) {
      issueCount++
      items.push({
        type: 'warning',
        text: `Pengeluaran keinginan ${wantsPct.toFixed(0)}% dari pemasukan, di atas target ${TARGETS.wants}%.`,
      })
    } else {
      items.push({
        type: 'good',
        text: `Pengeluaran keinginan ${wantsPct.toFixed(0)}% dari pemasukan, masih dalam target ${TARGETS.wants}%.`,
      })
    }

    if (savingsPct < TARGETS.savings) {
      issueCount++
      items.push({
        type: 'warning',
        text: `Tabungan baru ${savingsPct.toFixed(0)}% dari pemasukan, di bawah target ${TARGETS.savings}%.`,
      })
    } else {
      items.push({
        type: 'good',
        text: `Tabungan ${savingsPct.toFixed(0)}% dari pemasukan, sudah mencapai target ${TARGETS.savings}%.`,
      })
    }

    if (balance < 0) {
      items.unshift({
        type: 'critical',
        text: `Pengeluaran melebihi pemasukan sebesar ${formatRupiah(Math.abs(balance))} bulan ini.`,
      })
      return {
        status: 'tidak-sehat',
        label: 'Tidak Sehat',
        summary: 'Pengeluaran bulan ini lebih besar dari pemasukan. Ini yang paling perlu segera ditinjau.',
        items,
      }
    }

    if (issueCount === 0) {
      return {
        status: 'sehat',
        label: 'Sehat',
        summary: 'Alokasi kebutuhan, keinginan, dan tabungan bulan ini sudah sesuai target 50/30/20.',
        items,
      }
    }

    return {
      status: 'perlu-perhatian',
      label: 'Perlu Perhatian',
      summary: `${issueCount} dari 3 alokasi belum sesuai target. Cek rincian di bawah untuk tahu bagian mana yang perlu disesuaikan.`,
      items,
    }
  }, [totals])

  if (authLoading) return null
  if (!user) return <Auth onLogin={setUser} />

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand">
          <span className="brand-mark">Catatan Keuangan</span>
          <span className="brand-title">Dashboard</span>
        </div>
        <div className="topbar-right">
          <span className="user-email">{user.email}</span>
          <button className="btn btn-ghost" onClick={() => supabase.auth.signOut()}>
            Keluar
          </button>
        </div>
      </div>

      <div className="month-nav">
        <button
          aria-label="Bulan sebelumnya"
          onClick={() => setCursorDate(new Date(cursorDate.getFullYear(), cursorDate.getMonth() - 1, 1))}
        >
          ‹
        </button>
        <span className="month-label">{monthLabel(cursorDate)}</span>
        <button
          aria-label="Bulan berikutnya"
          onClick={() => setCursorDate(new Date(cursorDate.getFullYear(), cursorDate.getMonth() + 1, 1))}
        >
          ›
        </button>
      </div>

      <div className="hero-card">
        <div className="hero-label">Saldo bersih bulan ini</div>
        <div className="hero-amount">{formatRupiah(totals.balance)}</div>
        <div className="hero-stats">
          <div className="stat-pill">
            <span className="stat-icon income">↑</span>
            <div>
              <div className="stat-text-label">Pemasukan</div>
              <div className="stat-text-value">{formatRupiah(totals.income)}</div>
            </div>
          </div>
          <div className="stat-pill">
            <span className="stat-icon expense">↓</span>
            <div>
              <div className="stat-text-label">Pengeluaran</div>
              <div className="stat-text-value">{formatRupiah(totals.expense)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="health-card">
        <div className="health-head">
          <span className="health-title">Analisis Kesehatan Keuangan</span>
          <span className={`health-badge ${health.status}`}>{health.label}</span>
        </div>
        <p className="health-summary">{health.summary}</p>
        {health.items.length > 0 && (
          <div className="health-list">
            {health.items.map((item, i) => (
              <div className="health-item" key={i}>
                <span className={`health-dot ${item.type}`} />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="budget-grid">
        {Object.keys(TARGETS).map((group) => {
          const spent = totals.byGroup[group]
          const pctOfIncome = totals.income > 0 ? (spent / totals.income) * 100 : 0
          return (
            <div className="budget-card" key={group}>
              <div className="budget-card-head">
                <span className="budget-name">{GROUP_LABEL[group]}</span>
                <span className="budget-target">target {TARGETS[group]}%</span>
              </div>
              <div className="budget-bar-track">
                <div
                  className={`budget-bar-fill ${group}`}
                  style={{ width: `${Math.min(pctOfIncome, 100)}%` }}
                />
                <div className="budget-target-tick" style={{ left: `${TARGETS[group]}%` }} />
              </div>
              <div className="budget-amount">
                <strong>{formatRupiah(spent)}</strong>
                {totals.income > 0 ? ` · ${pctOfIncome.toFixed(0)}% dari pemasukan` : ' · catat pemasukan dulu'}
              </div>
            </div>
          )
        })}
      </div>

      <div className="content-grid">
        <div className="panel">
          <div className="panel-title">Tambah Transaksi</div>

          {categories.length === 0 && (
            <div className="empty-cta">
              <p>Belum ada kategori. Buat kategori default 50/30/20 untuk mulai.</p>
              <button className="btn btn-primary" onClick={addDefaultCategories}>
                Buat Kategori Default
              </button>
            </div>
          )}

          <form className="tx-form" onSubmit={addTransaction}>
            <div className="type-toggle">
              <button
                type="button"
                className={type === 'expense' ? 'active expense' : ''}
                onClick={() => setType('expense')}
              >
                Pengeluaran
              </button>
              <button
                type="button"
                className={type === 'income' ? 'active income' : ''}
                onClick={() => setType('income')}
              >
                Pemasukan
              </button>
            </div>

            <div className="field">
              <label>Jumlah</label>
              <input
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            {type === 'expense' && (
              <div className="field">
                <label>Kategori</label>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="">Pilih kategori</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {GROUP_LABEL[c.group_type]}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="field">
              <label>Catatan</label>
              <input
                type="text"
                placeholder="Opsional"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan Transaksi'}
            </button>
          </form>
        </div>

        <div className="panel">
          <div className="panel-title">Riwayat Transaksi — {monthLabel(cursorDate)}</div>
          {monthTransactions.length === 0 ? (
            <div className="empty-state">Belum ada transaksi bulan ini. Tambahkan transaksi pertamamu.</div>
          ) : (
            <div className="tx-list">
              {monthTransactions.map((t) => (
                <div className="tx-row" key={t.id}>
                  <span className={`tx-icon ${t.type}`}>{t.type === 'income' ? '↑' : '↓'}</span>
                  <div className="tx-main">
                    <div className="tx-note">{t.note || (t.categories ? t.categories.name : 'Transaksi')}</div>
                    <div className="tx-meta">
                      <span>{new Date(t.transaction_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                      {t.categories && (
                        <span className={`category-badge ${t.categories.group_type}`}>{t.categories.name}</span>
                      )}
                    </div>
                  </div>
                  <span className={`tx-amount ${t.type}`}>
                    {t.type === 'income' ? '+' : '-'}
                    {formatRupiah(t.amount)}
                  </span>
                  <button className="tx-delete" onClick={() => deleteTransaction(t.id)} aria-label="Hapus transaksi">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
