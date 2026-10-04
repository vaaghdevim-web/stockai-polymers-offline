/**
 * Frontend Brand Display Normalization Utility
 *
 * Normalizes user-visible company and plant name presentations:
 * "Sri Vidha Polymers" -> "Sri Vidhya Polymers"
 * "Sri Vidha" -> "Sri Vidhya"
 *
 * Preserves backend integrity: backend master data, API request payloads,
 * and entity IDs remain untouched. Only presentation labels are normalized.
 */

export function normalizeBrandName(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/Sri\s+Vidha\s+Polymers/gi, 'Sri Vidhya Polymers')
    .replace(/Sri\s+Vidha\b/gi, 'Sri Vidhya')
    .replace(/\bVidha\s+Polymers/gi, 'Vidhya Polymers');
}

export function formatPlantName(plantName, fallback = 'Sri Vidhya Polymers - Unit 1') {
  if (!plantName) return fallback;
  return normalizeBrandName(plantName);
}
