/**
 * Tooltip — hover tooltip system for menu items and UI elements.
 *
 * Shows a styled tooltip box near the cursor when hovering over
 * interactive elements. Supports PixiJS containers and HTML elements.
 */
import { Container, Graphics, Text, TextStyle } from "pixi.js";

export class Tooltip {
	private container: Container;
	private background: Graphics;
	private text: Text;
	private visible = false;
	private targetX = 0;
	private targetY = 0;

	constructor(private screenWidth: number, private screenHeight: number) {
		this.container = new Container();
		this.container.zIndex = 10000;
		this.container.visible = false;

		this.background = new Graphics();
		this.container.addChild(this.background);

		this.text = new Text({
			text: "",
			style: new TextStyle({
				fill: 0xeeeeff,
				fontSize: 12,
				fontFamily: "Arial, sans-serif",
				lineHeight: 16,
				wordWrap: true,
				wordWrapWidth: 200,
			}),
		});
		this.text.position.set(6, 4);
		this.container.addChild(this.text);
	}

	/** Get the PixiJS container to add to the stage */
	getContainer(): Container {
		return this.container;
	}

	/** Show tooltip at position with given text */
	show(x: number, y: number, content: string): void {
		this.text.text = content;

		// Measure text bounds
		const bounds = this.text.getBounds();
		const padX = 12;
		const padY = 8;
		const w = bounds.width + padX;
		const h = bounds.height + padY;

		// Position tooltip (prefer below-right, flip if near edge)
		let tx = x + 12;
		let ty = y + 16;
		if (tx + w > this.screenWidth) tx = x - w - 4;
		if (ty + h > this.screenHeight) ty = y - h - 4;

		// Draw background
		this.background.clear();
		this.background.roundRect(0, 0, w, h, 4);
		this.background.fill({ color: 0x1a1a2e, alpha: 0.95 });
		this.background.stroke({ color: 0x4466aa, width: 1 });
		// Arrow pointing up-left
		this.background.moveTo(4, 0);
		this.background.lineTo(8, -4);
		this.background.lineTo(12, 0);
		this.background.fill(0x1a1a2e);

		this.container.position.set(tx, ty);
		this.container.visible = true;
		this.visible = true;
	}

	/** Hide the tooltip */
	hide(): void {
		this.container.visible = false;
		this.visible = false;
	}

	/** Update tooltip position (call on mouse move) */
	updatePosition(x: number, y: number): void {
		if (!this.visible) return;
		this.show(x, y, this.text.text);
	}

	/** Resize for screen changes */
	resize(width: number, height: number): void {
		this.screenWidth = width;
		this.screenHeight = height;
	}

	/** Destroy resources */
	destroy(): void {
		this.container.destroy({ children: true });
	}
}
