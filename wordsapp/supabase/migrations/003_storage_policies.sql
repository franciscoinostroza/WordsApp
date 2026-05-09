-- Storage policies for flashcard images
-- Users can only manage their own images (bucket path: {userId}/{filename})

CREATE POLICY "Users can read own images"
ON storage.objects FOR SELECT
USING (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
USING (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]);
