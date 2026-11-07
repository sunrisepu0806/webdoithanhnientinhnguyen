export async function registrationCount(id: string): Promise<number | null> {
  try {
    const response = await fetch('/api/registration-count?activityId=' + encodeURIComponent(id));
    if (!response.ok) return null;
    const {count} = await response.json();
    return Number.isSafeInteger(count) && count >= 0 ? count : null;
  } catch { return null; }
}
