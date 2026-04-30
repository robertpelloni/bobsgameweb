export interface AchievementIdentity {
    profileId: string;
    name: string;
}

export interface PersistenceIdentity {
    profileId: string;
    name: string;
}

const PROFILE_ID_KEY = 'bg_profile_id';
const PLAYER_NAME_KEY = 'playerName';

function createProfileId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `bg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getPlayerDisplayName(): string {
    const raw = (localStorage.getItem(PLAYER_NAME_KEY) || 'WebPlayer').trim();
    const normalized = raw.length > 0 ? raw : 'WebPlayer';
    return normalized.substring(0, 64);
}

export function setPlayerDisplayName(name: string): string {
    const normalized = (name || 'WebPlayer').trim() || 'WebPlayer';
    const safeName = normalized.substring(0, 64);
    localStorage.setItem(PLAYER_NAME_KEY, safeName);
    return safeName;
}

export function getOrCreateAchievementProfileId(): string {
    let profileId = localStorage.getItem(PROFILE_ID_KEY);
    if (!profileId) {
        profileId = createProfileId();
        localStorage.setItem(PROFILE_ID_KEY, profileId);
    }
    return profileId;
}

export function getAchievementProfileName(): string {
    return getPlayerDisplayName();
}

export function getAchievementIdentity(): AchievementIdentity {
    return {
        profileId: getOrCreateAchievementProfileId(),
        name: getPlayerDisplayName(),
    };
}

export function getPersistenceIdentity(): PersistenceIdentity {
    return {
        profileId: getOrCreateAchievementProfileId(),
        name: getPlayerDisplayName(),
    };
}
