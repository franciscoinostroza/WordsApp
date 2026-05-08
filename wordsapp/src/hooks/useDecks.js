import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useDecks() {
  const { userId } = useAuth()
  const [decks, setDecks] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchDecks = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase
      .from('decks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setDecks(data || [])
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchDecks() }, [fetchDecks]) // eslint-disable-line react-hooks/set-state-in-effect

  const createDeck = async (name, description, color) => {
    const { data, error } = await supabase
      .from('decks')
      .insert({ user_id: userId, name, description, color })
      .select()
      .single()
    if (error) throw error
    setDecks((prev) => [data, ...prev])
    return data
  }

  const deleteDeck = async (id) => {
    const { error } = await supabase.from('decks').delete().eq('id', id)
    if (error) throw error
    setDecks((prev) => prev.filter((d) => d.id !== id))
  }

  const updateDeck = async (id, updates) => {
    const { data, error } = await supabase
      .from('decks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setDecks((prev) => prev.map((d) => (d.id === id ? { ...d, ...data } : d)))
    return data
  }

  return { decks, loading, fetchDecks, createDeck, deleteDeck, updateDeck }
}

export function useDeck(id) {
  const { userId } = useAuth()
  const [deck, setDeck] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId || !id) return
    supabase
      .from('decks')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()
      .then(({ data }) => {
        setDeck(data)
        setLoading(false)
      })
  }, [userId, id])

  return { deck, loading }
}
