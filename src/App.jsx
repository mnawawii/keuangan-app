import { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'
import Auth from './Auth'

function App() {
  const [user, setUser] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [type, setType] = useState('expense')
  const [categoryId, setCategoryId] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
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
    setTransactions(data || [])
  }

  async function addTransaction(e) {
    e.preventDefault()
    if (!amount) return
    await supabase.from('transactions').insert({
      user_id: user.id,
      category_id: categoryId || null,
      type,
      amount: parseFloat(amount),
      note,
      transaction_date: new Date().toISOString().slice(0, 10),
    })
    setAmount(''); setNote('')
  }

  async function addDefaultCategories() {
    const defaults = [
      { name: 'Makan', group_type: 'needs' },
      { name: 'Sewa', group_type: 'needs' },
      { name: 'Hiburan', group_type: 'wants' },
      { name: 'Belanja', group_type: 'wants' },
      { name: 'Tabungan', group_type: 'savings' },
      { name: 'Investasi', group_type: 'savings' },
    ]
    await supabase.from('categories').insert(defaults.map((d) => ({ ...d, user_id: user.id })))
    fetchCategories()
  }

  if (!user) return <Auth onLogin={setUser} />

  const totalByGroup = { needs: 0, wants: 0, savings: 0 }
  transactions.forEach((t) => {
    if (t.type === 'expense' && t.categories?.group_type) {
      totalByGroup[t.categories.group_type] += Number(t.amount)
    }
  })

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>Pencatatan Keuangan</h1>
        <button onClick={() => supabase.auth.signOut()}>Logout</button>
      </div>

      {categories.length === 0 && (
        <button onClick={addDefaultCategories}>Buat Kategori Default (50/30/20)</button>
      )}

      <h3>Ringkasan Pengeluaran</h3>
      <ul>
        <li>Needs (50%): Rp {totalByGroup.needs.toLocaleString('id-ID')}</li>
        <li>Wants (30%): Rp {totalByGroup.wants.toLocaleString('id-ID')}</li>
        <li>Savings (20%): Rp {totalByGroup.savings.toLocaleString('id-ID')}</li>
      </ul>

      <h3>Tambah Transaksi</h3>
      <form onSubmit={addTransaction}>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="expense">Pengeluaran</option>
          <option value="income">Pemasukan</option>
        </select>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Pilih kategori</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input type="number" placeholder="Jumlah" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <input placeholder="Catatan" value={note} onChange={(e) => setNote(e.target.value)} />
        <button type="submit">Simpan</button>
      </form>

      <h3>Riwayat Transaksi</h3>
      <ul>
        {transactions.map((t) => (
          <li key={t.id}>
            {t.transaction_date} — {t.type === 'expense' ? '-' : '+'}Rp {Number(t.amount).toLocaleString('id-ID')}
            {t.categories ? ` (${t.categories.name})` : ''} {t.note && `— ${t.note}`}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default App
