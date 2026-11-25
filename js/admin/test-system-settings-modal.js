// TOPS CORE — Test System Settings Modal (Phase 306 -> Unified Vocabulary System Proxy)
// Seamlessly delegates to the unified Vocabulary System Studio (SSOT)
import { openAutoGenerateModal } from './auto-gen-modal.js?v=20261125_v681';

export async function openTestSystemSettingsModal(options = {}) {
  const {
    classId = null,
    className = 'Vocabulary Class',
    onComplete = null
  } = options;

  return openAutoGenerateModal({
    explicitClassId: classId,
    className,
    onComplete
  });
}
