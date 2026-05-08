import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useFlashcards(deckId) {
  const { userId } = useAuth()
  const [flashcards, setFlashcards] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchFlashcards = useCallback(async () => {
    if (!userId || !deckId) return
    setLoading(true)
    const { data } = await supabase
      .from('flashcards')
      .select('*')
      .eq('deck_id', deckId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setFlashcards(data || [])
    setLoading(false)
  }, [userId, deckId])

  useEffect(() => { fetchFlashcards() }, [fetchFlashcards]) // eslint-disable-line react-hooks/set-state-in-effect

  const createFlashcard = async (card) => {
    const { data, error } = await supabase
      .from('flashcards')
      .insert({ ...card, deck_id: deckId, user_id: userId })
      .select()
      .single()
    if (error) throw error

    await supabase.from('reviews').insert({
      flashcard_id: data.id,
      user_id: userId,
      due_date: new Date().toISOString().split('T')[0],
      interval: 0,
      ease_factor: 2.5,
      repetitions: 0,
    })

    setFlashcards((prev) => [data, ...prev])
    return data
  }

  const deleteFlashcard = async (id) => {
    const { error } = await supabase.from('flashcards').delete().eq('id', id)
    if (error) throw error
    setFlashcards((prev) => prev.filter((f) => f.id !== id))
  }

  const updateFlashcard = async (id, updates) => {
    const { data, error } = await supabase
      .from('flashcards')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setFlashcards((prev) => prev.map((f) => (f.id === id ? { ...f, ...data } : f)))
    return data
  }

  return { flashcards, loading, fetchFlashcards, createFlashcard, deleteFlashcard, updateFlashcard }
}
