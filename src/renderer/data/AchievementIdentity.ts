export function getAchievementProfileName(): string {
    const raw = (localStorage.getItem('playerName') || 'WebPlayer').trim();
    const normalized = raw.length > 0 ? raw : 'WebPlayer';
    return normalized.substring(0, 64);
}
