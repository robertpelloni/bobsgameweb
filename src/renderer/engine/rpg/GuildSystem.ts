/**
 * GuildSystem — party/guild management for the RPG world.
 *
 * Features:
 * - Guild creation and management
 * - Member roles (leader, officer, member, recruit)
 * - Guild level and experience
 * - Guild perks and bonuses
 * - Member roster with online status
 * - Guild bank (shared gold)
 * - Guild quests and contributions
 *
 * Usage:
 *   const guild = new GuildSystem();
 *   guild.createGuild("Dragon Slayers", "player_1");
 *   guild.addMember("player_2", "member");
 *   guild.contributeGold("player_1", 100);
 */

export type GuildRole = "leader" | "officer" | "member" | "recruit";

export interface GuildMember {
	id: string;
	name: string;
	role: GuildRole;
	joinDate: number;
	contribution: number;
	online: boolean;
	level: number;
}

export interface GuildPerk {
	id: string;
	name: string;
	description: string;
	requiredLevel: number;
	bonus: Record<string, number>;
	active: boolean;
}

export interface GuildQuest {
	id: string;
	name: string;
	description: string;
	target: number;
	progress: number;
	reward: { gold: number; xp: number };
	complete: boolean;
}

const ROLE_HIERARCHY: Record<GuildRole, number> = {
	leader: 3, officer: 2, member: 1, recruit: 0,
};

const GUILD_PERKS: GuildPerk[] = [
	{ id: "xp_boost_1", name: "Learning I", description: "+10% XP gain", requiredLevel: 2, bonus: { xpMultiplier: 0.1 }, active: false },
	{ id: "gold_boost_1", name: "Merchant I", description: "+10% gold from battles", requiredLevel: 3, bonus: { goldMultiplier: 0.1 }, active: false },
	{ id: "defense_1", name: "Shield Wall I", description: "+5% defense in guild areas", requiredLevel: 4, bonus: { defenseBonus: 0.05 }, active: false },
	{ id: "xp_boost_2", name: "Learning II", description: "+20% XP gain", requiredLevel: 5, bonus: { xpMultiplier: 0.2 }, active: false },
	{ id: "gold_boost_2", name: "Merchant II", description: "+20% gold from battles", requiredLevel: 7, bonus: { goldMultiplier: 0.2 }, active: false },
	{ id: "rare_find", name: "Treasure Hunter", description: "+15% rare item find", requiredLevel: 8, bonus: { rareFindBonus: 0.15 }, active: false },
	{ id: "defense_2", name: "Shield Wall II", description: "+10% defense in guild areas", requiredLevel: 10, bonus: { defenseBonus: 0.1 }, active: false },
	{ id: "legendary_luck", name: "Fortune's Favor", description: "+25% legendary drop rate", requiredLevel: 15, bonus: { legendaryBonus: 0.25 }, active: false },
];

const GUILD_QUESTS: GuildQuest[] = [
	{ id: "gq_1", name: "First Steps", description: "Defeat 10 enemies together", target: 10, progress: 0, reward: { gold: 50, xp: 100 }, complete: false },
	{ id: "gq_2", name: "Forest Clear", description: "Clear the Dark Forest encounter zones", target: 5, progress: 0, reward: { gold: 150, xp: 300 }, complete: false },
	{ id: "gq_3", name: "Dragon Bounty", description: "Defeat the Ancient Dragon", target: 1, progress: 0, reward: { gold: 500, xp: 1000 }, complete: false },
	{ id: "gq_4", name: "Guild Wealth", description: "Contribute 1000 gold to the guild bank", target: 1000, progress: 0, reward: { gold: 200, xp: 500 }, complete: false },
];

export class GuildSystem {
	public name = "";
	public level = 1;
	public xp = 0;
	public xpToNext = 100;
	public bankGold = 0;
	public members: Map<string, GuildMember> = new Map();
	public perks: GuildPerk[] = [];
	public quests: GuildQuest[] = [];
	public createdAt = 0;
	public motto = "";
	public exists = false;

	/** Create a new guild */
	createGuild(name: string, leaderId: string, leaderName = "Leader"): void {
		this.name = name;
		this.exists = true;
		this.createdAt = Date.now();
		this.level = 1;
		this.xp = 0;
		this.xpToNext = 100;
		this.bankGold = 0;
		this.perks = GUILD_PERKS.map(p => ({ ...p }));
		this.quests = GUILD_QUESTS.map(q => ({ ...q }));

		this.members.set(leaderId, {
			id: leaderId,
			name: leaderName,
			role: "leader",
			joinDate: Date.now(),
			contribution: 0,
			online: true,
			level: 1,
		});
	}

	/** Disband the guild */
	disband(): void {
		this.name = "";
		this.exists = false;
		this.members.clear();
		this.bankGold = 0;
		this.level = 1;
		this.xp = 0;
	}

	/** Add a member to the guild */
	addMember(id: string, name = "Adventurer", role: GuildRole = "recruit"): boolean {
		if (!this.exists || this.members.has(id)) return false;
		if (this.members.size >= 20) return false; // Max 20 members

		this.members.set(id, {
			id,
			name,
			role,
			joinDate: Date.now(),
			contribution: 0,
			online: false,
			level: 1,
		});
		return true;
	}

	/** Remove a member */
	removeMember(id: string): boolean {
		if (!this.exists) return false;
		const member = this.members.get(id);
		if (!member) return false;
		if (member.role === "leader") return false; // Can't remove leader
		return this.members.delete(id);
	}

	/** Promote a member */
	promoteMember(id: string): GuildRole | null {
		const member = this.members.get(id);
		if (!member || member.role === "leader") return null;

		const hierarchy: GuildRole[] = ["recruit", "member", "officer", "leader"];
		const idx = hierarchy.indexOf(member.role);
		if (idx < hierarchy.length - 1) {
			member.role = hierarchy[idx + 1]!;
			return member.role;
		}
		return null;
	}

	/** Demote a member */
	demoteMember(id: string): GuildRole | null {
		const member = this.members.get(id);
		if (!member || member.role === "recruit") return null;

		const hierarchy: GuildRole[] = ["recruit", "member", "officer", "leader"];
		const idx = hierarchy.indexOf(member.role);
		if (idx > 0) {
			member.role = hierarchy[idx - 1]!;
			return member.role;
		}
		return null;
	}

	/** Set member online status */
	setOnline(id: string, online: boolean): void {
		const member = this.members.get(id);
		if (member) member.online = online;
	}

	/** Contribute gold to guild bank */
	contributeGold(memberId: string, amount: number): boolean {
		if (!this.exists || amount <= 0) return false;
		const member = this.members.get(memberId);
		if (!member) return false;

		this.bankGold += amount;
		member.contribution += amount;

		// Add guild XP for contributions
		this.addXp(Math.floor(amount * 0.1));

		// Update quest progress
		this.updateQuestProgress("gq_4", amount);

		return true;
	}

	/** Withdraw gold from guild bank */
	withdrawGold(memberId: string, amount: number): boolean {
		if (!this.exists || amount <= 0 || amount > this.bankGold) return false;
		const member = this.members.get(memberId);
		if (!member || ROLE_HIERARCHY[member.role] < ROLE_HIERARCHY.officer) return false;

		this.bankGold -= amount;
		return true;
	}

	/** Add XP to guild */
	addXp(amount: number): void {
		this.xp += amount;
		while (this.xp >= this.xpToNext) {
			this.xp -= this.xpToNext;
			this.level++;
			this.xpToNext = Math.floor(this.xpToNext * 1.5);
			this.checkPerks();
		}
	}

	/** Check and activate perks based on level */
	private checkPerks(): void {
		for (const perk of this.perks) {
			if (this.level >= perk.requiredLevel && !perk.active) {
				perk.active = true;
			}
		}
	}

	/** Update quest progress */
	updateQuestProgress(questId: string, amount: number): void {
		const quest = this.quests.find(q => q.id === questId);
		if (!quest || quest.complete) return;

		quest.progress = Math.min(quest.progress + amount, quest.target);
		if (quest.progress >= quest.target) {
			quest.complete = true;
			this.bankGold += quest.reward.gold;
			this.addXp(quest.reward.xp);
		}
	}

	/** Get total active perk bonuses */
	getActiveBonuses(): Record<string, number> {
		const bonuses: Record<string, number> = {};
		for (const perk of this.perks) {
			if (!perk.active) continue;
			for (const [key, value] of Object.entries(perk.bonus)) {
				bonuses[key] = (bonuses[key] ?? 0) + value;
			}
		}
		return bonuses;
	}

	/** Get online member count */
	getOnlineCount(): number {
		let count = 0;
		for (const member of this.members.values()) {
			if (member.online) count++;
		}
		return count;
	}

	/** Get member count */
	getMemberCount(): number {
		return this.members.size;
	}

	/** Get member by ID */
	getMember(id: string): GuildMember | undefined {
		return this.members.get(id);
	}

	/** Check if user can perform admin actions */
	canAdmin(userId: string): boolean {
		const member = this.members.get(userId);
		return member !== undefined && ROLE_HIERARCHY[member.role] >= ROLE_HIERARCHY.officer;
	}

	/** Serialize to save data */
	toJSON(): Record<string, unknown> {
		return {
			name: this.name,
			level: this.level,
			xp: this.xp,
			xpToNext: this.xpToNext,
			bankGold: this.bankGold,
			members: Array.from(this.members.values()),
			perks: this.perks,
			quests: this.quests,
			createdAt: this.createdAt,
			exists: this.exists,
		};
	}

	/** Deserialize from save data */
	static fromJSON(data: Record<string, unknown>): GuildSystem {
		const guild = new GuildSystem();
		guild.name = (data.name as string) ?? "";
		guild.level = (data.level as number) ?? 1;
		guild.xp = (data.xp as number) ?? 0;
		guild.xpToNext = (data.xpToNext as number) ?? 100;
		guild.bankGold = (data.bankGold as number) ?? 0;
		guild.createdAt = (data.createdAt as number) ?? 0;
		guild.exists = (data.exists as boolean) ?? false;
		guild.perks = (data.perks as GuildPerk[]) ?? GUILD_PERKS.map(p => ({ ...p }));
		guild.quests = (data.quests as GuildQuest[]) ?? GUILD_QUESTS.map(q => ({ ...q }));

		const members = data.members as GuildMember[] | undefined;
		if (members) {
			for (const m of members) {
				guild.members.set(m.id, m);
			}
		}
		return guild;
	}
}
