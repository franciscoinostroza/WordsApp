import { supabase } from './supabase'

export async function updateStreak(userId) {
  const today = new Date().toISOString().split('T')[0]
  const { data: user } = await supabase
    .from('users')
    .select('streak_days, last_study_date')
    .eq('id', userId)
    .single()

  const lastDate = user?.last_study_date
  let streak = user?.streak_days || 0

  if (lastDate !== today) {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    if (lastDate === yesterdayStr) {
      streak += 1
    } else if (lastDate) {
      streak = 1
    } else {
      streak = 1
    }

    await supabase.from('users').update({
      streak_days: streak,
      last_study_date: today,
    }).eq('id', userId)
  }

  return streak
}

export async function updateProgressStats(userId, { wordsStudied = 0, wordsLearned = 0, quizScore = null, minutesStudied = 0 }) {
  const today = new Date().toISOString().split('T')[0]

  const { data: existing } = await supabase
    .from('progress_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single()

  if (existing) {
    await supabase.from('progress_stats').update({
      words_studied: existing.words_studied + wordsStudied,
      words_learned: existing.words_learned + wordsLearned,
      quiz_score_avg: quizScore !== null ? quizScore : existing.quiz_score_avg,
      minutes_studied: existing.minutes_studied + minutesStudied,
    }).eq('id', existing.id)
  } else {
    await supabase.from('progress_stats').insert({
      user_id: userId,
      date: today,
      words_studied: wordsStudied,
      words_learned: wordsLearned,
      quiz_score_avg: quizScore || 0,
      minutes_studied: minutesStudied,
    })
  }
}
