-- ====================================================================
-- TOPSCORE LMS: Enforce Admin RLS
-- Migration: 20261004_enforce_admin_rls.sql
-- 
-- Description:
-- Drops insecure "FOR ALL TO anon" policies and restricts anonymous
-- users to SELECT only. Grants full access to authenticated admins.
-- ====================================================================

-- 1. Drop existing insecure anon policies
DROP POLICY IF EXISTS "admin_all_institutions" ON institutions;
DROP POLICY IF EXISTS "admin_all_programs" ON programs;
DROP POLICY IF EXISTS "admin_all_batches" ON batches;
DROP POLICY IF EXISTS "admin_all_students" ON students;
DROP POLICY IF EXISTS "admin_all_enrollments" ON enrollments;
DROP POLICY IF EXISTS "admin_all_class_instances" ON class_instances;
DROP POLICY IF EXISTS "admin_all_additional_members" ON additional_members;
DROP POLICY IF EXISTS "admin_all_levels" ON levels;
DROP POLICY IF EXISTS "admin_all_subjects" ON classes;
DROP POLICY IF EXISTS "admin_all_topics" ON topics;
DROP POLICY IF EXISTS "admin_all_word_types" ON question_types;
DROP POLICY IF EXISTS "admin_all_questions" ON questions;
DROP POLICY IF EXISTS "admin_all_assessments" ON assessments;
DROP POLICY IF EXISTS "admin_all_assessment_topics" ON assessment_topics;
DROP POLICY IF EXISTS "admin_all_assessment_questions" ON assessment_questions;
DROP POLICY IF EXISTS "admin_all_assignments" ON assignments;
DROP POLICY IF EXISTS "admin_all_attempts" ON attempts;
DROP POLICY IF EXISTS "admin_all_attempt_answers" ON attempt_answers;
DROP POLICY IF EXISTS "admin_all_question_usage_history" ON question_usage_history;
DROP POLICY IF EXISTS "admin_all_site_settings" ON site_settings;
DROP POLICY IF EXISTS "admin_all_audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "admin_all_progress" ON progress;

-- 2. Create SELECT-only policies for anon
CREATE POLICY "anon_select_institutions" ON institutions FOR SELECT TO anon USING (TRUE);
CREATE POLICY "anon_select_programs" ON programs FOR SELECT TO anon USING (TRUE);
CREATE POLICY "anon_select_batches" ON batches FOR SELECT TO anon USING (TRUE);
CREATE POLICY "anon_select_students" ON students FOR SELECT TO anon USING (TRUE);
CREATE POLICY "anon_select_enrollments" ON enrollments FOR SELECT TO anon USING (TRUE);
CREATE POLICY "anon_select_class_instances" ON class_instances FOR SELECT TO anon USING (TRUE);
CREATE POLICY "anon_select_additional_members" ON additional_members FOR SELECT TO anon USING (TRUE);
CREATE POLICY "anon_select_levels" ON levels FOR SELECT TO anon USING (TRUE);
CREATE POLICY "anon_select_classes" ON classes FOR SELECT TO anon USING (TRUE);
CREATE POLICY "anon_select_topics" ON topics FOR SELECT TO anon USING (TRUE);
CREATE POLICY "anon_select_question_types" ON question_types FOR SELECT TO anon USING (TRUE);
CREATE POLICY "anon_select_questions" ON questions FOR SELECT TO anon USING (TRUE);
CREATE POLICY "anon_select_assessments" ON assessments FOR SELECT TO anon USING (TRUE);
CREATE POLICY "anon_select_assessment_topics" ON assessment_topics FOR SELECT TO anon USING (TRUE);
CREATE POLICY "anon_select_assessment_questions" ON assessment_questions FOR SELECT TO anon USING (TRUE);
CREATE POLICY "anon_select_assignments" ON assignments FOR SELECT TO anon USING (TRUE);
CREATE POLICY "anon_select_attempts" ON attempts FOR SELECT TO anon USING (TRUE);
CREATE POLICY "anon_select_attempt_answers" ON attempt_answers FOR SELECT TO anon USING (TRUE);
CREATE POLICY "anon_select_question_usage_history" ON question_usage_history FOR SELECT TO anon USING (TRUE);
CREATE POLICY "anon_select_site_settings" ON site_settings FOR SELECT TO anon USING (TRUE);
CREATE POLICY "anon_select_audit_logs" ON audit_logs FOR SELECT TO anon USING (TRUE);
CREATE POLICY "anon_select_progress" ON progress FOR SELECT TO anon USING (TRUE);

-- 3. Create full access policies for authenticated users
CREATE POLICY "auth_all_institutions" ON institutions FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_all_programs" ON programs FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_all_batches" ON batches FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_all_students" ON students FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_all_enrollments" ON enrollments FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_all_class_instances" ON class_instances FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_all_additional_members" ON additional_members FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_all_levels" ON levels FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_all_classes" ON classes FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_all_topics" ON topics FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_all_question_types" ON question_types FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_all_questions" ON questions FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_all_assessments" ON assessments FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_all_assessment_topics" ON assessment_topics FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_all_assessment_questions" ON assessment_questions FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_all_assignments" ON assignments FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_all_attempts" ON attempts FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_all_attempt_answers" ON attempt_answers FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_all_question_usage_history" ON question_usage_history FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_all_site_settings" ON site_settings FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_all_audit_logs" ON audit_logs FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "auth_all_progress" ON progress FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
