-- Add category column to vocabulary_vault and establish trigger for words/phrases classification
ALTER TABLE vocabulary_vault ADD COLUMN IF NOT EXISTS category VARCHAR(32) DEFAULT 'words';

UPDATE vocabulary_vault SET category = CASE
  WHEN LOWER(word_type) IN ('expression', 'idiom', 'proverb', 'phrase') THEN 'phrases'
  ELSE 'words'
END;

CREATE OR REPLACE FUNCTION set_vocabulary_vault_category()
RETURNS TRIGGER AS $$
BEGIN
  IF LOWER(NEW.word_type) IN ('expression', 'idiom', 'proverb', 'phrase') THEN
    NEW.category := 'phrases';
  ELSE
    NEW.category := 'words';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_vocabulary_vault_category ON vocabulary_vault;
CREATE TRIGGER trg_set_vocabulary_vault_category
BEFORE INSERT OR UPDATE OF word_type ON vocabulary_vault
FOR EACH ROW EXECUTE FUNCTION set_vocabulary_vault_category();

NOTIFY pgrst, 'reload schema';
