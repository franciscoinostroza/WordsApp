import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { sm2 } from '../lib/sm2'

export function useReviews(deckId = null, refreshKey = 0) {
  const { userId } = useAuth()
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const forceAll = refreshKey > 0

  const fetchDueCards = useCallback(async () => {
    if (!userId) return
    setLoading(true)

    if (forceAll) {
      const today = new Date().toISOString().split('T')[0]
      if (deckId) {
        const { data: deckCards } = await supabase
          .from('flashcards')
          .select('id')
          .eq('deck_id', deckId)
          .eq('user_id', userId)
        if (deckCards?.length) {
          await supabase
            .from('reviews')
            .update({ due_date: today })
            .in('flashcard_id', deckCards.map(c => c.id))
            .eq('user_id', userId)
        }
      } else {
        await supabase
          .from('reviews')
          .update({ due_date: today })
          .eq('user_id', userId)
      }
    }

    let query = supabase
      .from('reviews')
      .select('*, flashcards(*)')
      .eq('user_id', userId)
      .lte('due_date', new Date().toISOString().split('T')[0])
      .order('due_date', { ascending: true })

    if (deckId) {
      const { data: deckCards } = await supabase
        .from('flashcards')
        .select('id')
        .eq('deck_id', deckId)
        .eq('user_id', userId)

      if (deckCards?.length) {
        query = query.in('flashcard_id', deckCards.map((c) => c.id))
      } else {
        setCards([])
        setLoading(false)
        return
      }
    }

    const { data } = await query
    setCards(data || [])
    setLoading(false)
  }, [userId, deckId, forceAll, refreshKey])

  useEffect(() => { fetchDueCards() }, [fetchDueCards]) // eslint-disable-line react-hooks/set-state-in-effect

  const rateCard = async (review, quality) => {
    const result = sm2(review, quality)

    const { error } = await supabase
      .from('reviews')
      .update({
        due_date: result.due_date,
        interval: result.interval,
        ease_factor: result.ease_factor,
        repetitions: result.repetitions,
        last_quality: result.last_quality,
        updated_at: new Date().toISOString(),
      })
      .eq('id', review.id)

    if (error) throw error
    setCards((prev) => prev.filter((c) => c.id !== review.id))
  }

  return { cards, loading, fetchDueCards, rateCard }
}
