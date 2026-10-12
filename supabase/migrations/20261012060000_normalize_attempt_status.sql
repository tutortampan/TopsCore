-- Normalize attempt statuses to lowercase to match application logic
UPDATE attempts SET status = LOWER(status) WHERE status IN ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'AUTO_SUBMITTED', 'EXPIRED', 'CANCELLED');
