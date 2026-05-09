import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const BUCKET = 'images'

function extractPath(url) {
  if (!url) return null
  const idx = url.indexOf(`/public/${BUCKET}/`)
  if (idx === -1) return null
  return url.slice(idx + `/public/${BUCKET}/`.length)
}

async function uploadImage(userId, file) {
  const ext = file.name.split('.').pop()
  const filename = `${crypto.randomUUID()}.${ext}`
  const path = `${userId}/${filename}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

async function deleteImage(url) {
  const path = extractPath(url)
  if (!path) return
  await supabase.storage.from(BUCKET).remove([path])
}

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

  const createFlashcard = async (card, imageFile) => {
    let image_url = null
    if (imageFile) {
      image_url = await uploadImage(userId, imageFile)
    }

    const { data, error } = await supabase
      .from('flashcards')
      .insert({ ...card, image_url, deck_id: deckId, user_id: userId })
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
    const card = flashcards.find((f) => f.id === id)
    const { error } = await supabase.from('flashcards').delete().eq('id', id)
    if (error) throw error
    if (card?.image_url) await deleteImage(card.image_url).catch(() => {})
    setFlashcards((prev) => prev.filter((f) => f.id !== id))
  }

  const updateFlashcard = async (id, updates, imageFile) => {
    const prevCard = flashcards.find((f) => f.id === id)

    if (imageFile || updates.removeImage) {
      if (prevCard?.image_url) await deleteImage(prevCard.image_url).catch(() => {})
      updates.image_url = null
    }

    if (imageFile) {
      updates.image_url = await uploadImage(userId, imageFile)
    }

    delete updates.removeImage

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
