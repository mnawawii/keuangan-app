import { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'
import { generateRecurringTransactions } from './lib/recurring'
import Auth from './Auth'
import Dashboard from './components/Dashboard'
import Profile from './components/Profile'

function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [recurring, setRecurring] = useState([])
  const [profile, setProfile] = useState(null)
  const [view, setView] = useState('dashboard')

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
    fetchProfile()

    async function init() {
      const txData = await fetchTransactions()
      const recData = await fetchRecurring()
      await generateRecurringTransactions(recData, txData, user.id)
      await fetchTransactions()
    }
    init()

    const channel = supabase
      .channel('app-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, fetchTransactions)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, fetchCategories)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchProfile)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recurring_transactions' }, fetchRecurring)
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
    return data || []
  }

  async function fetchRecurring() {
    const { data } = await supabase
      .from('recurring_transactions')
      .select('*, categories(name, group_type)')
      .order('day_of_month')
    setRecurring(data || [])
    return data || []
  }

  async function fetchProfile() {
    const { data } = await supabase.from('profiles').select('*').maybeSingle()
    setProfile(data)
  }

  async function saveProfile(fullName) {
    await supabase
      .from('profiles')
      .upsert({ id: user.id, full_name: fullName, updated_at: new Date().toISOString() })
    fetchProfile()
  }

  async function addTransaction(payload) {
    await supabase.from('transactions').insert({ ...payload, user_id: user.id })
  }

  async function updateTransaction(id, payload) {
    await supabase.from('transactions').update(payload).eq('id', id)
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
  }

  async function addCategory(payload) {
    await supabase.from('categories').insert({ ...payload, user_id: user.id })
  }

  async function updateCategory(id, payload) {
    await supabase.from('categories').update(payload).eq('id', id)
  }

  async function deleteCategory(id) {
    await supabase.from('categories').delete().eq('id', id)
  }

  async function addRecurring(payload) {
    await supabase.from('recurring_transactions').insert({ ...payload, user_id: user.id })
  }

  async function updateRecurring(id, payload) {
    await supabase.from('recurring_transactions').update(payload).eq('id', id)
  }

  async function deleteRecurring(id) {
    await supabase.from('recurring_transactions').delete().eq('id', id)
  }

  if (authLoading) return null
  if (!user) return <Auth onLogin={setUser} />

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand">
          <span className="brand-mark">Catatan Keuangan</span>
          <span className="brand-title">{view === 'dashboard' ? 'Dashboard' : 'Profil & Ringkasan Tahunan'}</span>
        </div>
        <div className="topbar-right">
          <nav className="tabs">
            <button className={view === 'dashboard' ? 'tab-btn active' : 'tab-btn'} onClick={() => setView('dashboard')}>
              Dashboard
            </button>
            <button className={view === 'profile' ? 'tab-btn active' : 'tab-btn'} onClick={() => setView('profile')}>
              Profil
            </button>
          </nav>
          <button className="btn btn-ghost" onClick={() => supabase.auth.signOut()}>
            Keluar
          </button>
        </div>
      </div>

      {view === 'dashboard' ? (
        <Dashboard
          user={user}
          profile={profile}
          transactions={transactions}
          categories={categories}
          recurring={recurring}
          onAddTransaction={addTransaction}
          onUpdateTransaction={updateTransaction}
          onDeleteTransaction={deleteTransaction}
          onAddDefaultCategories={addDefaultCategories}
          onAddCategory={addCategory}
          onUpdateCategory={updateCategory}
          onDeleteCategory={deleteCategory}
          onAddRecurring={addRecurring}
          onUpdateRecurring={updateRecurring}
          onDeleteRecurring={deleteRecurring}
        />
      ) : (
        <Profile user={user} profile={profile} transactions={transactions} onSaveProfile={saveProfile} />
      )}
    </div>
  )
}

export default App
