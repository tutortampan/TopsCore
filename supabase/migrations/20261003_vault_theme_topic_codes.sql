-- Add theme_code and topic_code to vocabulary_vault
ALTER TABLE public.vocabulary_vault
ADD COLUMN theme_code VARCHAR(10),
ADD COLUMN topic_code VARCHAR(10);

CREATE INDEX IF NOT EXISTS idx_vocabulary_vault_theme_code ON public.vocabulary_vault (theme_code);
CREATE INDEX IF NOT EXISTS idx_vocabulary_vault_topic_code ON public.vocabulary_vault (topic_code);
