import { useState } from 'react'
import Modal from './Modal'

const GROUP_LABEL = { needs: 'Kebutuhan', wants: 'Keinginan', savings: 'Tabungan' }

export default function CategoryManager({ categories, onAdd, onUpdate, onDelete, onClose }) {
  const [name, setName] = useState('')
  const [group, setGroup] = useState('needs')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editGroup, setEditGroup] = useState('needs')
  const [saving, setSaving] = useState(false)

  async function handleAdd(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await onAdd({ name: name.trim(), group_type: group })
    setName('')
    setSaving(false)
  }

  function startEdit(c) {
    setEditingId(c.id)
    setEditName(c.name)
    setEditGroup(c.group_type)
  }

  async function saveEdit(id) {
    if (!editName.trim()) return
    await onUpdate(id, { name: editName.trim(), group_type: editGroup })
    setEditingId(null)
  }

  async function handleDelete(id) {
    if (confirm('Hapus kategori ini? Transaksi yang memakai kategori ini tidak ikut terhapus, hanya kategorinya dikosongkan.')) {
      await onDelete(id)
    }
  }

  return (
    <Modal title="Kelola Kategori" onClose={onClose}>
      <div className="manager-list">
        {categories.length === 0 && <p className="empty-state">Belum ada kategori.</p>}
        {categories.map((c) => (
          <div className="manager-row" key={c.id}>
            {editingId === c.id ? (
              <>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} />
                <select value={editGroup} onChange={(e) => setEditGroup(e.target.value)}>
                  <option value="needs">Kebutuhan</option>
                  <option value="wants">Keinginan</option>
                  <option value="savings">Tabungan</option>
                </select>
                <button className="link-btn" onClick={() => saveEdit(c.id)}>Simpan</button>
                <button className="link-btn muted" onClick={() => setEditingId(null)}>Batal</button>
              </>
            ) : (
              <>
                <span className={`category-badge ${c.group_type}`}>{c.name}</span>
                <span className="manager-sub">{GROUP_LABEL[c.group_type]}</span>
                <button className="link-btn" onClick={() => startEdit(c)}>Ubah</button>
                <button className="link-btn danger" onClick={() => handleDelete(c.id)}>Hapus</button>
              </>
            )}
          </div>
        ))}
      </div>

      <form className="manager-add-form" onSubmit={handleAdd}>
        <input
          type="text"
          placeholder="Nama kategori baru"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select value={group} onChange={(e) => setGroup(e.target.value)}>
          <option value="needs">Kebutuhan</option>
          <option value="wants">Keinginan</option>
          <option value="savings">Tabungan</option>
        </select>
        <button className="btn btn-primary btn-small" type="submit" disabled={saving}>
          Tambah
        </button>
      </form>
    </Modal>
  )
}
