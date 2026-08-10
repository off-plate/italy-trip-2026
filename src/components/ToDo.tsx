import { useStore } from '../store'
import { TODO_GROUPS } from '../data/todo'

export default function ToDo() {
  const { todoState, setTodoDone } = useStore()
  const total = TODO_GROUPS.reduce((n, g) => n + g.items.length, 0)
  const done = Object.values(todoState).filter(Boolean).length

  return (
    <div className="todo">
      <div className="panel-head">
        <h1>To Do</h1>
        <p>{done} z {total} hotovo</p>
      </div>

      {TODO_GROUPS.map((g) => (
        <div key={g.id} className="todo-group">
          <div className="ov-h">{g.title}</div>
          <ul className="todo-list">
            {g.items.map((it) => {
              const checked = !!todoState[it.id]
              return (
                <li key={it.id} className={`todo-item ${checked ? 'todo-done' : ''}`}>
                  <label className="todo-row">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => setTodoDone(it.id, e.target.checked)}
                    />
                    <span className="todo-label">{it.label}</span>
                  </label>
                  {it.note && <span className="todo-note">{it.note}</span>}
                  {it.link && (
                    <a className="todo-link" href={it.link} target="_blank" rel="noreferrer">
                      {it.linkLabel ?? 'Otevřít →'}
                    </a>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}
