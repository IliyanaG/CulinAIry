import { Minus, Plus, UsersRound } from 'lucide-react'

interface ServingsSelectorProps {
  value: number
  onChange: (value: number) => void
}

const minimumServings = 1
const maximumServings = 12

export function ServingsSelector({ value, onChange }: ServingsSelectorProps) {
  return (
    <div
      aria-label="Servings"
      className="servings-selector"
      role="group"
    >
      <span className="servings-label">
        <UsersRound aria-hidden="true" size={16} />
        Serves
      </span>
      <div className="servings-stepper">
        <button
          aria-label="Decrease servings"
          disabled={value <= minimumServings}
          onClick={() => onChange(Math.max(minimumServings, value - 1))}
          type="button"
        >
          <Minus aria-hidden="true" size={15} />
        </button>
        <output aria-live="polite" className="servings-value">
          {value}
        </output>
        <button
          aria-label="Increase servings"
          disabled={value >= maximumServings}
          onClick={() => onChange(Math.min(maximumServings, value + 1))}
          type="button"
        >
          <Plus aria-hidden="true" size={15} />
        </button>
      </div>
    </div>
  )
}
