import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { sm2 } from '../lib/sm2'

export function useReviews(deckId = null, refreshKey = 0) {
  const { userId } = useAuth()
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)

  const ensureReviews = useCallback(async () => {
    if (!userId) return
    const { data: flashcards } = await supabase
      .from('flashcards')
      .select('id, word, image_url')
      .eq('user_id', userId)

    const { data: existingReviews } = await supabase
      .from('reviews')
      .select('flashcard_id')
      .eq('user_id', userId)

    const existingIds = new Set(existingReviews?.map(r => r.flashcard_id) || [])
    const missingCards = (flashcards || []).filter(c => !existingIds.has(c.id))

    if (missingCards.length > 0) {
      const today = new Date().toISOString().split('T')[0]
      const reviews = missingCards.map(c => ({
        flashcard_id: c.id,
        user_id: userId,
        due_date: today,
        interval: 0,
        ease_factor: 2.5,
        repetitions: 0,
      }))
      await supabase.from('reviews').insert(reviews)
    }

    const cardsWithoutImage = (flashcards || []).filter(c => !c.image_url)
    if (cardsWithoutImage.length > 0) {
      for (const c of cardsWithoutImage) {
        await supabase.from('flashcards').update({
          image_url: `https://picsum.photos/seed/${encodeURIComponent(c.word.replace(/\s+/g, '-'))}/400/300`
        }).eq('id', c.id)
      }
    }
  }, [userId])

  const fetchDueCards = useCallback(async () => {
    if (!userId) return
    setLoading(true)

    if (refreshKey > 0) {
      await ensureReviews()
    }

    let query = supabase
      .from('reviews')
      .select('*, flashcards(*)')
      .eq('user_id', userId)

    if (refreshKey === 0) {
      query = query.lte('due_date', new Date().toISOString().split('T')[0])
    }

    query = query.order('due_date', { ascending: true })

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

    const { data, error } = await query
    if (error) console.error('useReviews fetch error:', error)
    setCards(data || [])
    setLoading(false)
  }, [userId, deckId, refreshKey, ensureReviews])

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
