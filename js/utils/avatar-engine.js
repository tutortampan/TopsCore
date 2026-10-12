/**
 * avatar-engine.js
 * 
 * 3:4 Center-Crop Avatar Engine, Supabase Storage Uploader, Zero-Egress SVG Avatars & Cache Busting.
 */

/**
 * Strips honorific prefix ('Mr.', 'Miss', 'Mrs.', 'Ms.') from student names.
 */
export function stripHonorific(name) {
  if (!name) return '';
  return String(name).trim().replace(/^(mr\.?|miss\.?|mrs\.?|ms\.?)\s+/i, '').trim();
}

/**
 * Extracts true student initial ignoring honorific prefix.
 */
export function getStudentInitial(name) {
  const stripped = stripHonorific(name);
  return stripped ? stripped.charAt(0).toUpperCase() : 'S';
}

/**
 * Generates lightweight, zero-egress styled inline SVG avatar for 3:4 aspect ratio.
 */
export function generateAvatarSvg(name = '', gender = '') {
  const initial = getStudentInitial(name);
  const g = String(gender || '').toLowerCase().trim();
  const isMale = g === 'male' || g === 'm' || g === 'laki-laki' || g === 'l';
  const isFemale = g === 'female' || g === 'f' || g === 'perempuan' || g === 'p';
  
  const bgGrad1 = isMale ? '#3b82f6' : isFemale ? '#ec4899' : '#6366f1';
  const bgGrad2 = isMale ? '#1d4ed8' : isFemale ? '#be185d' : '#4338ca';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 320" width="240" height="320">
  <defs>
    <linearGradient id="avatarGrad_${initial}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bgGrad1}" />
      <stop offset="100%" stop-color="${bgGrad2}" />
    </linearGradient>
  </defs>
  <rect width="240" height="320" rx="16" fill="url(#avatarGrad_${initial})" />
  <circle cx="120" cy="120" r="50" fill="rgba(255,255,255,0.2)" />
  <path d="M 36 288 C 36 210, 204 210, 204 288 Z" fill="rgba(255,255,255,0.2)" />
  <text x="120" y="138" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="54" font-weight="800" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${initial}</text>
</svg>`;
}

/**
 * Returns a Data URI for the zero-egress SVG avatar.
 */
export function generateAvatarDataUri(name = '', gender = '') {
  const svg = generateAvatarSvg(name, gender);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Center-crops and compresses image to 3:4 WebP (Client-side Canvas)
 */
export async function processAndCompressAvatar(file, type = "student") {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("No file provided."));
    const isStudent = type === "student";
    const TARGET_WIDTH = isStudent ? 240 : 300;
    const TARGET_HEIGHT = isStudent ? 320 : 400;
    const MAX_SIZE_KB = isStudent ? 30 : 80;
    const QUALITY = isStudent ? 0.75 : 0.85;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = TARGET_WIDTH;
        canvas.height = TARGET_HEIGHT;
        const ctx = canvas.getContext("2d");

        const ratio = img.width / img.height;
        const targetRatio = TARGET_WIDTH / TARGET_HEIGHT;

        let sx, sy, sWidth, sHeight;

        if (ratio > targetRatio) {
          // Too wide: Crop left and right equally
          sHeight = img.height;
          sWidth = img.height * targetRatio;
          sx = (img.width - sWidth) / 2;
          sy = 0;
        } else {
          // Too tall: Apply proportional vertical crop (35% top bias, 65% bottom bias)
          sWidth = img.width;
          sHeight = img.width / targetRatio;
          sx = 0;
          sy = (img.height - sHeight) * 0.35;
        }

        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);

        // Attempt WebP, fallback to JPEG
        let format = "image/webp";
        let currentQuality = QUALITY;
        let dataUrl = canvas.toDataURL(format, currentQuality);
        let sizeKB = (dataUrl.length * 0.75) / 1024;

        // Adaptive compression if size exceeds limit
        while (sizeKB > MAX_SIZE_KB && currentQuality > 0.3) {
          currentQuality -= 0.1;
          dataUrl = canvas.toDataURL(format, currentQuality);
          sizeKB = (dataUrl.length * 0.75) / 1024;
        }

        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Invalid image file."));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("File read error."));
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads student avatar as binary WebP into Supabase Storage bucket 'student-avatars',
 * returning the public CDN URL. Falls back to compressed dataURL if storage is unavailable.
 */
export async function uploadStudentAvatar(file, studentId = null) {
  if (!file) throw new Error("No file provided.");
  const TARGET_WIDTH = 240;
  const TARGET_HEIGHT = 320;
  const QUALITY = 0.75;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = TARGET_WIDTH;
          canvas.height = TARGET_HEIGHT;
          const ctx = canvas.getContext("2d");

          const ratio = img.width / img.height;
          const targetRatio = TARGET_WIDTH / TARGET_HEIGHT;

          let sx, sy, sWidth, sHeight;
          if (ratio > targetRatio) {
            sHeight = img.height;
            sWidth = img.height * targetRatio;
            sx = (img.width - sWidth) / 2;
            sy = 0;
          } else {
            sWidth = img.width;
            sHeight = img.width / targetRatio;
            sx = 0;
            sy = (img.height - sHeight) * 0.35;
          }

          ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);

          // Convert canvas to WebP Blob
          const blob = await new Promise(r => canvas.toBlob(r, 'image/webp', QUALITY));
          if (!blob) throw new Error("Canvas to WebP blob conversion failed.");

          // Dynamically import Supabase client factory
          let getSupabase;
          try {
            const mod = await import('../supabase.js?v=5.1.0');
            getSupabase = mod.getSupabase;
          } catch (_) {
            const mod = await import('../supabase.js');
            getSupabase = mod.getSupabase;
          }

          const sb = await getSupabase();
          const cleanId = String(studentId || 'temp_' + Date.now()).replace(/[^a-zA-Z0-9_-]/g, '_');
          const fileName = `student_${cleanId}_${Date.now()}.webp`;

          const { error: uploadErr } = await sb.storage
            .from('student-avatars')
            .upload(fileName, blob, {
              contentType: 'image/webp',
              upsert: true
            });

          if (uploadErr) {
            console.warn('[AvatarEngine] Supabase storage upload failed, falling back to dataUrl:', uploadErr.message);
            const dataUrl = canvas.toDataURL('image/webp', QUALITY);
            return resolve(dataUrl);
          }

          const { data: pubData } = sb.storage.from('student-avatars').getPublicUrl(fileName);
          resolve(pubData.publicUrl);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error("Invalid image file."));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("File read error."));
    reader.readAsDataURL(file);
  });
}

/**
 * Cache-busting URL helper with graceful fallback to zero-egress SVG avatar.
 */
export function getBustedAvatarUrl(url, name = '', gender = '') {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return generateAvatarDataUri(name, gender);
  }
  const clean = url.trim();
  if (clean.startsWith('data:')) return clean;
  const separator = clean.includes('?') ? '&' : '?';
  return `${clean}${separator}t=${Date.now()}`;
}
