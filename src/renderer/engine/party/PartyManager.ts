/**
 * PartyManager — manages adventuring parties for multiplayer RPG play.
 *
 * Parties allow multiple players to explore, battle, and complete quests together.
 * The party leader can invite, kick, and set objectives. All members share
 * quest progress, see each other on the minimap, and enter combat together.
 *
 * Usage:
 *   const party = new PartyManager();
 *   party.createParty(leaderId, "The Brave Ones");
 *   party.invitePlayer(partyId, playerId);
 *   party.acceptInvite(partyId, playerId);
 *   party.startBattle(monster); // All members join combat
 */
export interface PartyMember {
	id: string;
	name: string;
	role: "leader" | "member";
	joinedAt: number;
	hp: number;
	maxHp: number;
	level: number;
	isReady: boolean;
}

export interface Party {
	id: string;
	name: string;
	members: PartyMember[];
	maxMembers: number;
	created: number;
	state: "open" | "in_combat" | "in_dungeon" | "disbanded";
	objective: string | null;
	sharedQuests: string[];
	sharedXP: number;
}

export interface PartyInvite {
	partyId: string;
	fromId: string;
	fromName: string;
	timestamp: number;
}

export class PartyManager {
	private parties: Map<string, Party> = new Map();
	private playerParty: Map<string, string> = new Map(); // playerId -> partyId
	private invites: Map<string, PartyInvite[]> = new Map(); // playerId -> invites

	/**
	 * Create a new party with the given player as leader.
	 */
	createParty(leaderId: string, leaderName: string, partyName = "New Party"): Party {
		// Leave existing party if in one
		if (this.playerParty.has(leaderId)) {
			this.leaveParty(leaderId);
		}

		const partyId = `party-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
		const party: Party = {
			id: partyId,
			name: partyName,
			members: [{
				id: leaderId,
				name: leaderName,
				role: "leader",
				joinedAt: Date.now(),
				hp: 100,
				maxHp: 100,
				level: 1,
				isReady: true,
			}],
			maxMembers: 4,
			created: Date.now(),
			state: "open",
			objective: null,
			sharedQuests: [],
			sharedXP: 0,
		};

		this.parties.set(partyId, party);
		this.playerParty.set(leaderId, partyId);

		return party;
	}

	/**
	 * Invite a player to a party.
	 */
	invitePlayer(partyId: string, targetId: string, fromName: string): boolean {
		const party = this.parties.get(partyId);
		if (!party || party.state === "disbanded") return false;
		if (party.members.length >= party.maxMembers) return false;
		if (this.playerParty.has(targetId)) return false; // Already in a party

		if (!this.invites.has(targetId)) this.invites.set(targetId, []);
		this.invites.get(targetId)!.push({
			partyId,
			fromId: party.members[0]!.id,
			fromName,
			timestamp: Date.now(),
		});

		return true;
	}

	/**
	 * Accept a party invite.
	 */
	acceptInvite(targetId: string, targetName: string, partyId: string): Party | null {
		const invites = this.invites.get(targetId);
		if (!invites) return null;

		const invite = invites.find(inv => inv.partyId === partyId);
		if (!invite) return null;

		const party = this.parties.get(partyId);
		if (!party || party.state === "disbanded") return null;
		if (party.members.length >= party.maxMembers) return null;

		// Remove invite
		this.invites.set(targetId, invites.filter(inv => inv.partyId !== partyId));

		// Add to party
		party.members.push({
			id: targetId,
			name: targetName,
			role: "member",
			joinedAt: Date.now(),
			hp: 100,
			maxHp: 100,
			level: 1,
			isReady: false,
		});

		this.playerParty.set(targetId, partyId);

		return party;
	}

	/**
	 * Remove a player from their party.
	 */
	leaveParty(playerId: string): boolean {
		const partyId = this.playerParty.get(playerId);
		if (!partyId) return false;

		const party = this.parties.get(partyId);
		if (!party) return false;

		party.members = party.members.filter(m => m.id !== playerId);
		this.playerParty.delete(playerId);

		// If leader left, promote next member or disband
		if (party.members.length === 0) {
			party.state = "disbanded";
			this.parties.delete(partyId);
		} else if (party.members[0]!.role !== "leader") {
			party.members[0]!.role = "leader";
		}

		return true;
	}

	/**
	 * Kick a player from a party (leader only).
	 */
	kickPlayer(leaderId: string, targetId: string): boolean {
		const partyId = this.playerParty.get(leaderId);
		if (!partyId) return false;

		const party = this.parties.get(partyId);
		if (!party) return false;

		const leader = party.members.find(m => m.id === leaderId);
		if (!leader || leader.role !== "leader") return false;

		return this.leaveParty(targetId);
	}

	/**
	 * Set a player's ready status.
	 */
	setReady(playerId: string, ready: boolean): void {
		const partyId = this.playerParty.get(playerId);
		if (!partyId) return;
		const party = this.parties.get(partyId);
		if (!party) return;

		const member = party.members.find(m => m.id === playerId);
		if (member) member.isReady = ready;
	}

	/**
	 * Check if all members are ready.
	 */
	isAllReady(partyId: string): boolean {
		const party = this.parties.get(partyId);
		if (!party) return false;
		return party.members.every(m => m.isReady);
	}

	/**
	 * Get the party a player belongs to.
	 */
	getPlayerParty(playerId: string): Party | null {
		const partyId = this.playerParty.get(playerId);
		return partyId ? this.parties.get(partyId) ?? null : null;
	}

	/**
	 * Get pending invites for a player.
	 */
	getInvites(playerId: string): PartyInvite[] {
		return this.invites.get(playerId) ?? [];
	}

	/**
	 * Get all open parties (for listing).
	 */
	getOpenParties(): Party[] {
		return [...this.parties.values()].filter(p => p.state === "open");
	}

	/**
	 * Distribute XP to all party members.
	 */
	distributeXP(partyId: string, amount: number): void {
		const party = this.parties.get(partyId);
		if (!party) return;

		const share = Math.floor(amount / party.members.length);
		party.sharedXP += amount;

		// Each member gets equal share
		for (const member of party.members) {
			member.level = Math.floor(member.level + share / 100); // Simplified leveling
		}
	}

	/**
	 * Set party state.
	 */
	setState(partyId: string, state: Party["state"]): void {
		const party = this.parties.get(partyId);
		if (party) party.state = state;
	}

	/**
	 * Set party objective.
	 */
	setObjective(partyId: string, objective: string): void {
		const party = this.parties.get(partyId);
		if (party) party.objective = objective;
	}
}
