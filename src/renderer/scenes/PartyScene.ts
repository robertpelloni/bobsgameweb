/**
 * PartyScene — manage your adventuring party.
 *
 * Shows party members, invites, and party objectives.
 * Players can create, join, leave, and manage parties.
 */
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { Scene, type SceneConfig } from "../state/Scene";
import { StateManager } from "../state/StateManager";
import { InputManager, Key } from "../input/InputManager";
import { PartyManager, type Party, type PartyInvite } from "../engine/party/PartyManager";
import { getPlayerDisplayName } from "../data/AchievementIdentity";

export class PartyScene extends Scene {
	private partyManager: PartyManager;
	private currentParty: Party | null = null;
	private invites: PartyInvite[] = [];
	private selectedIndex = 0;
	private options: string[] = [];
	private menuTexts: Text[] = [];
	private infoText!: Text;
	private menuContainer!: Container;

	constructor(config: SceneConfig) {
		super(config);
		this.partyManager = new PartyManager();
	}

	public async create(): Promise<void> {
		this.createBackground();
		this.createTitle();
		this.createMenu();
		this.refreshMenu();
	}

	private createBackground(): void {
		const bg = new Graphics();
		for (let i = 0; i < 20; i++) {
			const ratio = i / 20;
			const r = Math.floor(3 + ratio * 10);
			const g = Math.floor(5 + ratio * 12);
			const b = Math.floor(10 + ratio * 22);
			bg.rect(0, (this.height / 20) * i, this.width, this.height / 20 + 1);
			bg.fill((r << 16) | (g << 8) | b);
		}
		this.container.addChild(bg);
	}

	private createTitle(): void {
		const title = new Text({
			text: "⚔ PARTY",
			style: new TextStyle({
				fontFamily: "Arial Black, Arial, sans-serif",
				fontSize: 28,
				fill: 0xffaa00,
				fontWeight: "bold",
			}),
		});
		title.anchor.set(0.5);
		title.position.set(this.width / 2, 25);
		this.container.addChild(title);
	}

	private createMenu(): void {
		this.menuContainer = new Container();
		this.menuContainer.position.set(this.width / 2 - 140, 70);
		this.container.addChild(this.menuContainer);

		this.infoText = new Text({
			text: "",
			style: new TextStyle({ fill: 0x88aacc, fontSize: 12 }),
		});
		this.infoText.position.set(20, this.height - 60);
		this.container.addChild(this.infoText);
	}

	private refreshMenu(): void {
		this.menuContainer.removeChildren();
		this.menuTexts = [];
		this.options = [];

		this.currentParty = this.partyManager.getPlayerParty("local");
		this.invites = this.partyManager.getInvites("local");

		if (this.currentParty) {
			// Show party members
			const partyHeader = new Text({
				text: `Party: ${this.currentParty.name} (${this.currentParty.members.length}/${this.currentParty.maxMembers})`,
				style: new TextStyle({ fill: 0xffcc44, fontSize: 16, fontWeight: "bold" }),
			});
			this.menuContainer.addChild(partyHeader);

			for (const member of this.currentParty.members) {
				const memberText = new Text({
					text: `  ${member.role === "leader" ? "👑" : "  "} ${member.name} Lv${member.level} HP:${member.hp}/${member.maxHp} ${member.isReady ? "✓" : "..."}`,
					style: new TextStyle({ fill: 0xaabbcc, fontSize: 13 }),
				});
				memberText.position.set(0, 30 + this.menuContainer.children.length * 24);
				this.menuContainer.addChild(memberText);
			}

			this.options.push("Ready Up", "Leave Party");
			if (this.currentParty.members[0]?.id === "local") {
				this.options.push("Set Objective", "Disband Party");
			}
		} else {
			// No party — show options
			const noParty = new Text({
				text: "You are not in a party.",
				style: new TextStyle({ fill: 0x667788, fontSize: 14 }),
			});
			this.menuContainer.addChild(noParty);

			this.options.push("Create Party");

			// Show invites
			if (this.invites.length > 0) {
				for (const inv of this.invites) {
					this.options.push(`Accept: ${inv.fromName}`);
				}
			}

			// Show open parties
			const openParties = this.partyManager.getOpenParties();
			for (const p of openParties.slice(0, 3)) {
				this.options.push(`Join: ${p.name} (${p.members.length}/${p.maxMembers})`);
			}
		}

		this.options.push("Back");

		// Render menu options
		const startY = this.currentParty ? 30 + this.currentParty.members.length * 24 + 10 : 30;
		for (let i = 0; i < this.options.length; i++) {
			const text = new Text({
				text: (i === this.selectedIndex ? "▸ " : "  ") + this.options[i],
				style: new TextStyle({
					fill: i === this.selectedIndex ? 0x44ff88 : 0x667788,
					fontSize: 14,
				}),
			});
			text.position.set(0, startY + i * 28);
			this.menuContainer.addChild(text);
			this.menuTexts.push(text);
		}

		this.infoText.text = "↑↓ Navigate  |  Enter: Select  |  ESC: Back";
	}

	protected onUpdate(dt: number): void {
		if (InputManager.isUpPressed()) {
			this.selectedIndex = Math.max(0, this.selectedIndex - 1);
			this.updateCursor();
		}
		if (InputManager.isDownPressed()) {
			this.selectedIndex = Math.min(this.options.length - 1, this.selectedIndex + 1);
			this.updateCursor();
		}
		if (InputManager.isActionPressed() || InputManager.isKeyPressed(Key.Enter)) {
			this.executeOption(this.options[this.selectedIndex]);
		}
		if (InputManager.isCancelPressed()) {
			StateManager.pop();
		}
	}

	private updateCursor(): void {
		for (let i = 0; i < this.menuTexts.length; i++) {
			this.menuTexts[i].text = (i === this.selectedIndex ? "▸ " : "  ") + this.options[i];
			this.menuTexts[i].style.fill = i === this.selectedIndex ? 0x44ff88 : 0x667788;
		}
	}

	private executeOption(option: string): void {
		if (!option) return;

		if (option === "Back") {
			StateManager.pop();
		} else if (option === "Create Party") {
			const name = getPlayerDisplayName() + "'s Party";
			this.partyManager.createParty("local", getPlayerDisplayName() || "Player", name);
			this.selectedIndex = 0;
			this.refreshMenu();
		} else if (option === "Leave Party") {
			this.partyManager.leaveParty("local");
			this.selectedIndex = 0;
			this.refreshMenu();
		} else if (option === "Ready Up") {
			this.partyManager.setReady("local", true);
			this.refreshMenu();
		} else if (option === "Disband Party") {
			if (this.currentParty) {
				for (const m of this.currentParty.members) {
					this.partyManager.leaveParty(m.id);
				}
			}
			this.selectedIndex = 0;
			this.refreshMenu();
		} else if (option === "Set Objective") {
			if (this.currentParty) {
				this.partyManager.setObjective(this.currentParty.id, "Explore TOWNYUU");
				this.refreshMenu();
			}
		} else if (option.startsWith("Accept:")) {
			const fromName = option.replace("Accept: ", "");
			const invite = this.invites.find(inv => inv.fromName === fromName);
			if (invite) {
				this.partyManager.acceptInvite("local", getPlayerDisplayName() || "Player", invite.partyId);
				this.selectedIndex = 0;
				this.refreshMenu();
			}
		} else if (option.startsWith("Join:")) {
			const partyName = option.replace("Join: ", "").split(" (")[0];
			const openParties = this.partyManager.getOpenParties();
			const party = openParties.find(p => p.name === partyName);
			if (party) {
				this.partyManager.acceptInvite("local", getPlayerDisplayName() || "Player", party.id);
				this.selectedIndex = 0;
				this.refreshMenu();
			}
		}
	}
}
