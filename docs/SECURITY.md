# TopsCore Security Blueprint

## 1. Overview
This document outlines the strict security requirements and Access Control architecture for the TopsCore LMS. All features—particularly administrative panels—must rigorously adhere to these principles.

## 2. Authentication
TopsCore uses Supabase Authentication.
- All users must authenticate via email/password or PIN (for students).
- JWTs are generated upon successful login.
- These JWTs must be passed in the `Authorization` header as a Bearer token for all Edge Function invocations.

## 3. Role-Based Access Control (RBAC)
The system enforces strict RBAC via the `users` table and its `role` column.
- **Admin**: Has full access to all CRUD operations, Vault configurations, Assessment Generation (Blueprints), and user management.
- **Teacher**: Has limited access; can oversee assigned batches, grade manual tests, and override student scores. Cannot globally modify Vaults or Blueprints unless authorized.
- **Student**: Has read-only access to their assigned Assessments via their `batch_id` and `level_id`. Can insert into `attempts` and `attempt_answers`.

## 4. Edge Function Security
All sensitive operations must be routed through Supabase Edge Functions. 
### Admin-Only Functions
Functions performing administrative tasks (e.g., `import-questions`, `import-students`, `generate-module-template`) MUST:
1. Verify the JWT token via `supabaseClient.auth.getUser()`.
2. Query the `users` table using the authenticated user's ID.
3. Validate that the user's `role` is exactly `admin` (or `teacher` where applicable).
4. Return a `403 Forbidden` response immediately if the user lacks the correct role, before processing any payload.

## 5. Row Level Security (RLS)
Supabase PostgreSQL RLS must be enabled on all tables.
- **Admin Access**: Admin users have `ALL` privileges on all tables via RLS policies that check their role.
- **Student Access**: 
  - `students`: Read their own profile.
  - `assessments`: Read only if `status = 'PUBLISHED'` and they have an active assignment or belong to the matching level/class hierarchy.
  - `attempts` & `attempt_answers`: Insert/Update only where `student_id = auth.uid()`.

## 6. Zero-Trust Admin Routes
No frontend route (e.g., Vault, Blueprint, Assessment Builder) should ever assume trust. Even if a user accesses an admin HTML page directly, any API calls to create, read, update, or delete sensitive data must be blocked by RLS or Edge Function Role Checks. Client-side hiding of buttons is insufficient for security.
