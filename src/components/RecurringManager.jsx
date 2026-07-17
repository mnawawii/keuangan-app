import { useState } from 'react'
import Modal from './Modal'

const GROUP_LABEL = { needs: 'Kebutuhan', wants: 'Keinginan', savings: 'Tabungan' }

function formatRupiah(n) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID')
}

export default function RecurringManager({ recurring, categories, onAdd, onUpdate, onDelete, onClose }) {
  const [type, setType] = useState('expense')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [note, setNote] = useState('')
  const [dayOfMonth, setDayOfMonth] = useState('1')
  const [saving, setSaving] = useState(false)

  async function handleAdd(e) {
    e.preventDefault()
    if (!amount) return
    setSaving(true)
    await onAdd({
      type,
      amount: parseFloat(amount),
      category_id: type === 'expense' ? categoryId || null : null,
      note,
      day_of_month: parseInt(dayOfMonth, 10),
      active: true,
    })
    setAmount('')
    setNote('')
    setCategoryId('')
    setSaving(false)
  }

  async function handleDelete(id) {
    if (confirm('Hapus transaksi berulang ini? Transaksi yang sudah tercatat sebelumnya tidak ikut terhapus.')) {
      await onDelete(id)
    }
  }

  return (
    <Modal title="Transaksi Berulang" onClose={onClose}>
      <p className="modal-hint">
        Transaksi ini otomatis tercatat setiap bulan pada tanggal yang ditentukan, setiap kali kamu membuka aplikasi.
      </p>

      <div className="manager-list">
        {recurring.length === 0 && <p className="empty-state">Belum ada transaksi berulang.</p>}
        {recurring.map((r) => (
          <div className="manager-row" key={r.id}>
            <span className={`tx-amount ${r.type}`}>
              {r.type === 'income' ? '+' : '-'}
              {formatRupiah(r.amount)}
            </span>
            <span className="manager-sub">
              Tgl {r.day_of_month} · {r.categories?.name || 'Tanpa kategori'} {r.note ? `· ${r.note}` : ''}
            </span>
            <button
              className={`link-btn ${r.active ? '' : 'muted'}`}
              onClick={() => onUpdate(r.id, { active: !r.active })}
            >
              {r.active ? 'Aktif' : 'Nonaktif'}
            </button>
            <button className="link-btn danger" onClick={() => handleDelete(r.id)}>
              Hapus
            </button>
          </div>
        ))}
      </div>

      <form className="manager-add-form recurring-form" onSubmit={handleAdd}>
        <div className="type-toggle">
          <button type="button" className={type === 'expense' ? 'active expense' : ''} onClick={() => setType('expense')}>
            Pengeluaran
          </button>
          <button
            type="button"
            className={type === 'income' ? 'active income' : ''}
            onClick={() => { setType('income'); setCategoryId('') }}
          >
            Pemasukan
          </button>
        </div>
        <div className="field-row">
          <div className="field">
            <label>Jumlah</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div className="field">
            <label>Tanggal tiap bulan</label>
            <select value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)}>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
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
            placeholder="Contoh: Gaji, Netflix, Sewa kos"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <button className="btn btn-primary btn-small" type="submit" disabled={saving}>
          Tambah Transaksi Berulang
        </button>
      </form>
    </Modal>
  )
}
