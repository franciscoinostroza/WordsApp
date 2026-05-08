export function sm2(card, quality) {
  let { repetitions, ease_factor, interval } = card

  if (quality >= 3) {
    if (repetitions === 0) interval = 1
    else if (repetitions === 1) interval = 6
    else interval = Math.round(interval * ease_factor)
    repetitions += 1
  } else {
    repetitions = 0
    interval = 1
  }

  ease_factor = Math.max(1.3, ease_factor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))

  const due_date = new Date()
  due_date.setDate(due_date.getDate() + interval)

  return {
    repetitions,
    ease_factor: Math.round(ease_factor * 100) / 100,
    interval,
    due_date: due_date.toISOString().split('T')[0],
    last_quality: quality,
  }
}

export const QUALITY_LABELS = {
  0: 'Blackout',
  1: 'Incorrecto',
  2: 'Casi',
  3: 'Correcto (difícil)',
  4: 'Correcto (fácil)',
  5: 'Perfecto',
}
