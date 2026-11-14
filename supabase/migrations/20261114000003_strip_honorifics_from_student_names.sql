-- ==============================================================================
-- Migration: 20261114000003_strip_honorifics_from_student_names.sql
-- Description: Clean legacy 'Mr.' and 'Miss' prefixes from students.name.
-- Governing Rule: AGENTS.md Rule 2.23 & DECISION-053
-- Standard Student Name (studentName): Authentic name is stored clean in database.
-- Honorific titles (Mr. / Miss) are strictly exclusive to Student Dashboard display.
-- ==============================================================================

UPDATE students
SET name = TRIM(REGEXP_REPLACE(name, '^(mr\.?|miss|mrs\.?|ms\.?)\s+', '', 'i'))
WHERE name ~* '^(mr\.?|miss|mrs\.?|ms\.?)\s+';
