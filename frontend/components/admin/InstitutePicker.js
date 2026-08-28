'use client';

// A faculty member can be affiliated with several institutes, so this is a
// checkbox list rather than a <select>. A plain multi-select needs ctrl/cmd
// -clicking to pick more than one, which is easy to miss and awkward on
// touch; checkboxes make "you may tick several" obvious without instruction.
export default function InstitutePicker({ institutes, selected, onChange, disabled }) {
  function toggle(inst) {
    onChange(selected.includes(inst)
      ? selected.filter((i) => i !== inst)
      : [...selected, inst]);
  }

  return (
    <div className="form-group">
      <label>Institutes * <span className="muted">(select one or more)</span></label>
      <div className="institute-picker">
        {institutes.map((inst) => (
          <label key={inst} className={`institute-option ${selected.includes(inst) ? 'checked' : ''}`}>
            <input
              type="checkbox"
              checked={selected.includes(inst)}
              disabled={disabled}
              onChange={() => toggle(inst)}
            />
            <span>{inst}</span>
          </label>
        ))}
      </div>
      <p className="muted" style={{ marginTop: 6 }}>
        {selected.length === 0 ? 'None selected' : `${selected.length} selected`}
      </p>
    </div>
  );
}
