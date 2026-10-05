-- ============================================================
-- MIGRATION: ADD PAIR_STORYTELLING MODULE
-- Modul ke-10: Dua siswa merekam cerita secara mandiri
-- di HP masing-masing, dihubungkan via pair_session_id.
-- ============================================================

INSERT INTO public.modules (name, module_type, description, config_schema)
VALUES (
  'Pair Storytelling',
  'PAIR_STORYTELLING',
  'Two students independently record story retelling sessions on their own devices. The system links them via a shared pair_session_id. Topics are auto-aggregated from previous Task IDs. Each student is evaluated individually (tense, duration, topic coverage), and results are shown as a combined pair report.',
  '{
    "format": "paired_independent",
    "min_duration_sec": 3600,
    "topic_source": "aggregated_from_tasks",
    "elements_to_assess": ["tense_consistency", "topic_coverage", "fluency", "duration"],
    "pair_matching": "manual_or_auto",
    "result_view": "individual_plus_combined"
  }'::jsonb
)
ON CONFLICT (module_type) DO UPDATE
SET name          = EXCLUDED.name,
    description   = EXCLUDED.description,
    config_schema = EXCLUDED.config_schema;
