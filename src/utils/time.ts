/**
 * Time and opening hours utility functions
 */

/**
 * Convert 24-hour time string (HH:mm) to 12-hour format
 */
export function formatTimeTo12Hour(time24: string): string {
  if (!time24 || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(time24)) {
    return time24;
  }
  
  const [hours, minutes] = time24.split(':').map(Number);
  
  if (hours === 0) {
    return `12:${minutes.toString().padStart(2, '0')} AM`;
  } else if (hours < 12) {
    return `${hours}:${minutes.toString().padStart(2, '0')} AM`;
  } else if (hours === 12) {
    return `12:${minutes.toString().padStart(2, '0')} PM`;
  } else {
    return `${hours - 12}:${minutes.toString().padStart(2, '0')} PM`;
  }
}

/**
 * Convert 12-hour time to 24-hour format (HH:mm)
 */
export function formatTimeTo24Hour(time12: string): string {
  const match = time12.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    return time12;
  }
  
  let [, hours, minutes, period] = match;
  let hour24 = parseInt(hours, 10);
  
  if (period.toLowerCase() === 'am') {
    if (hour24 === 12) {
      hour24 = 0;
    }
  } else {
    if (hour24 !== 12) {
      hour24 += 12;
    }
  }
  
  return `${hour24.toString().padStart(2, '0')}:${minutes}`;
}

/**
 * Check if opening hours span overnight (e.g., 18:00 - 02:00)
 */
export function isOvernightHours(openTime: string, closeTime: string): boolean {
  if (!openTime || !closeTime) {
    return false;
  }
  
  const [openHour] = openTime.split(':').map(Number);
  const [closeHour] = closeTime.split(':').map(Number);
  
  return closeHour < openHour;
}

/**
 * Format opening hours for display (handles overnight)
 */
export function formatOpeningHours(openTime: string, closeTime: string, use12Hour = false): string {
  if (!openTime || !closeTime) {
    return 'Hours not set';
  }
  
  const formatTime = use12Hour ? formatTimeTo12Hour : (time: string) => time;
  const formattedOpen = formatTime(openTime);
  const formattedClose = formatTime(closeTime);
  
  if (isOvernightHours(openTime, closeTime)) {
    return `${formattedOpen} – ${formattedClose} (+1 day)`;
  }
  
  return `${formattedOpen} – ${formattedClose}`;
}

/**
 * Generate time options for time picker (15-minute intervals)
 */
export function generateTimeOptions(): { label: string; value: string }[] {
  const options: { label: string; value: string }[] = [];
  
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const time24 = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const time12 = formatTimeTo12Hour(time24);
      
      options.push({
        label: `${time12} (${time24})`,
        value: time24,
      });
    }
  }
  
  return options;
}

/**
 * Get current time in HH:mm format
 */
export function getCurrentTime(): string {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Validate if a time string is in valid HH:mm format
 */
export function isValidTimeFormat(time: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
}