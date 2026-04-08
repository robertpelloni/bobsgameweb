/**
 * RandomCharacter — randomly-generated NPC with procedural appearance.
 * Walks around rooms, warps between areas, and has randomized color sets.
 *
 * Ported from okgame C++ Engine/entity/RandomCharacter.
 */
import { Character, Direction } from './Character';

export interface CharacterAppearance {
    genderIndex: number;
    archetypeIndex: number;
    shoeColorIndex: number;
    shirtColorIndex: number;
    pantsColorIndex: number;
    skinColorIndex: number;
    eyeColorIndex: number;
    hairColorIndex: number;
}

export class RandomCharacter extends Character {
    kid = false;
    adult = false;
    male = false;
    female = false;
    car = false;

    appearance: CharacterAppearance;

    // AI state
    private cameFrom = '';
    private gotThere = false;
    private wanderRange = 64;

    constructor(
        options: Partial<{
            name: string;
            x: number;
            y: number;
            kid: boolean;
            adult: boolean;
            male: boolean;
            female: boolean;
            car: boolean;
        }> = {},
    ) {
        super({ name: options.name ?? 'NPC', x: options.x, y: options.y });
        this.kid = options.kid ?? false;
        this.adult = options.adult ?? true;
        this.male = options.male ?? false;
        this.female = options.female ?? false;
        this.car = options.car ?? false;

        this.appearance = this.generateRandomAppearance();
    }

    // ============================================================
    // Appearance
    // ============================================================

    private generateRandomAppearance(): CharacterAppearance {
        return {
            genderIndex: this.male ? 0 : this.female ? 1 : Math.floor(Math.random() * 2),
            archetypeIndex: Math.floor(Math.random() * 4),
            shoeColorIndex: Math.floor(Math.random() * 16),
            shirtColorIndex: Math.floor(Math.random() * 16),
            pantsColorIndex: Math.floor(Math.random() * 16),
            skinColorIndex: Math.floor(Math.random() * 8),
            eyeColorIndex: Math.floor(Math.random() * 8),
            hairColorIndex: Math.floor(Math.random() * 16),
        };
    }

    setAppearance(appearance: CharacterAppearance): void {
        this.appearance = appearance;
    }

    randomizeAppearance(): void {
        this.appearance = this.generateRandomAppearance();
    }

    // ============================================================
    // AI Behavior
    // ============================================================

    update(dt: number): void {
        super.update(dt);

        // Random wandering AI
        if (this.standing && this.ticksToStand <= 0) {
            if (Math.random() < 0.01) {
                // Start walking to a random nearby point
                this.targetX = this.x + (Math.random() - 0.5) * this.wanderRange * 2;
                this.targetY = this.y + (Math.random() - 0.5) * this.wanderRange * 2;
                this.targetX = Math.max(0, this.targetX);
                this.targetY = Math.max(0, this.targetY);
            } else if (Math.random() < 0.005) {
                // Stand idle for a while
                this.ticksToStand = Math.floor(Math.random() * 180) + 60;
            }
        }

        // Walk toward target
        if (this.targetX >= 0 && this.targetY >= 0) {
            const arrived = this.walkToXY(this.targetX, this.targetY, true);
            if (arrived) {
                this.targetX = -1;
                this.targetY = -1;
                this.ticksToStand = Math.floor(Math.random() * 120) + 30;
            }
        }

        // Random direction change while idle
        if (this.standing && Math.random() < 0.005) {
            this.direction = Math.floor(Math.random() * 4) as Direction;
        }
    }

    // ============================================================
    // Serialization
    // ============================================================

    toAppearanceString(): string {
        const a = this.appearance;
        return `${a.genderIndex},${a.archetypeIndex},${a.shoeColorIndex},${a.shirtColorIndex},${a.pantsColorIndex},${a.skinColorIndex},${a.eyeColorIndex},${a.hairColorIndex}`;
    }

    static fromAppearanceString(s: string): CharacterAppearance {
        const parts = s.split(',').map(Number);
        return {
            genderIndex: parts[0] ?? 0,
            archetypeIndex: parts[1] ?? 0,
            shoeColorIndex: parts[2] ?? 0,
            shirtColorIndex: parts[3] ?? 0,
            pantsColorIndex: parts[4] ?? 0,
            skinColorIndex: parts[5] ?? 0,
            eyeColorIndex: parts[6] ?? 0,
            hairColorIndex: parts[7] ?? 0,
        };
    }
}
