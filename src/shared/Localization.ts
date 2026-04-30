export type Language = 'en' | 'jp' | 'es' | 'fr' | 'de';

export class Localization {
    private static currentLanguage: Language = 'en';
    private static strings: Map<string, Map<Language, string>> = new Map();

    public static setLanguage(lang: Language): void {
        this.currentLanguage = lang;
    }

    public static register(key: string, translations: Partial<Record<Language, string>>): void {
        const entry = new Map<Language, string>();
        for (const [lang, text] of Object.entries(translations)) {
            entry.set(lang as Language, text as string);
        }
        this.strings.set(key, entry);
    }

    public static get(key: string): string {
        const entry = this.strings.get(key);
        if (!entry) return key;
        return entry.get(this.currentLanguage) || entry.get('en') || key;
    }
}
