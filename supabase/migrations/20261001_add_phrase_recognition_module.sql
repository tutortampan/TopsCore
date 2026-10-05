-- ============================================================
-- MIGRATION: ADD PHRASE_RECOGNITION MODULE
-- Separates Phrase/Idiom/Expression dropdown assessment
-- from VOCAB_MASTERY to its own named engine.
-- ============================================================

INSERT INTO public.modules (name, module_type, description, config_schema)
VALUES (
  'Phrase Recognition',
  'PHRASE_RECOGNITION',
  'Student sees an Indonesian phrase/idiom/expression and selects the correct English equivalent from a calibrated dropdown of 10 options. Auto-graded. Source: Vocabulary Vault (word_type IN Idiom, Proverb, Expression, Phrase).',
  '{
    "answer_type": "dropdown",
    "options_count": 10,
    "time_limit_seconds": 15,
    "source_types": ["Idiom", "Proverb", "Expression", "Phrase"]
  }'::jsonb
)
ON CONFLICT (module_type) DO UPDATE
SET name        = EXCLUDED.name,
    description = EXCLUDED.description,
    config_schema = EXCLUDED.config_schema;
