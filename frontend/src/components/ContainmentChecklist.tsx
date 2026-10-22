import React, { useState } from 'react';
import { CheckSquare, Square, Plus, ShieldCheck, UserCheck, Trash2 } from 'lucide-react';
import type { ChecklistItem } from '../types';
import { playTacticalClick } from '../crypto/audio';

interface ContainmentChecklistProps {
  items: ChecklistItem[];
  onToggleItem: (id: string) => void;
  onAddItem: (title: string) => void;
  onDeleteItem: (id: string) => void;
}

export const ContainmentChecklist: React.FC<ContainmentChecklistProps> = ({
  items,
  onToggleItem,
  onAddItem,
  onDeleteItem,
}) => {
  const [newTitle, setNewTitle] = useState('');

  const completedCount = items.filter((i) => i.completed).length;
  const progressPercent = items.length === 0 ? 0 : Math.round((completedCount / items.length) * 100);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    playTacticalClick();
    onAddItem(newTitle.trim());
    setNewTitle('');
  };

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldCheck size={18} color="var(--accent-green)" />
          <h2 style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.04em' }}>
            CONTAINMENT RUNBOOK
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {completedCount}/{items.length} COMPLETE
          </span>
          <span
            className="badge"
            style={{
              background: progressPercent === 100 ? 'rgba(0, 255, 163, 0.15)' : 'rgba(0, 240, 255, 0.1)',
              color: progressPercent === 100 ? 'var(--accent-green)' : 'var(--accent-cyan)',
              border: progressPercent === 100 ? '1px solid var(--accent-green)' : '1px solid var(--accent-cyan)',
            }}
          >
            {progressPercent}%
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ width: '100%', height: '3px', background: 'rgba(255, 255, 255, 0.05)' }}>
        <div
          style={{
            height: '100%',
            width: `${progressPercent}%`,
            background: progressPercent === 100 ? 'var(--accent-green)' : 'var(--accent-cyan)',
            boxShadow: `0 0 8px ${progressPercent === 100 ? 'var(--accent-green)' : 'var(--accent-cyan)'}`,
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '10px 14px',
              background: item.completed ? 'rgba(0, 255, 163, 0.04)' : 'rgba(255, 255, 255, 0.02)',
              border: item.completed ? '1px solid rgba(0, 255, 163, 0.2)' : '1px solid var(--border-subtle)',
              borderRadius: '8px',
              transition: 'all 0.2s ease',
            }}
          >
            <button
              onClick={() => {
                playTacticalClick();
                onToggleItem(item.id);
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: item.completed ? 'var(--accent-green)' : 'var(--text-muted)',
                marginTop: '2px',
              }}
            >
              {item.completed ? <CheckSquare size={18} /> : <Square size={18} />}
            </button>

            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: item.completed ? 'var(--text-secondary)' : '#f0f4fc',
                  textDecoration: item.completed ? 'line-through' : 'none',
                }}
              >
                {item.title}
              </div>

              {item.completed && item.completedBy && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <UserCheck size={12} color="var(--accent-green)" />
                  <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--accent-green)' }}>
                    Secured by {item.completedBy} at {item.completedAt ? new Date(item.completedAt).toLocaleTimeString() : ''}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                playTacticalClick();
                onDeleteItem(item.id);
              }}
              title="Remove task"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '2px',
                opacity: 0.6,
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Add Task Input */}
      <form
        onSubmit={handleAddSubmit}
        style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          gap: '8px',
          background: 'rgba(0, 0, 0, 0.3)',
        }}
      >
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add containment checklist step..."
          className="font-mono"
          style={{
            flex: 1,
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            padding: '8px 12px',
            color: '#fff',
            fontSize: '0.8rem',
            outline: 'none',
          }}
        />
        <button type="submit" className="btn btn-secondary" style={{ padding: '8px 12px' }}>
          <Plus size={15} />
          <span>ADD</span>
        </button>
      </form>
    </div>
  );
};
