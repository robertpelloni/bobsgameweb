import { NDGameEngine } from './NDGameEngine';
import { ND, NDButton } from './ND';
import { networkManager } from '../../puzzle';
import { Sprite, Texture, RenderTexture, Container, Graphics, Text, Application } from 'pixi.js';

export class LibretroGame extends NDGameEngine {
  public titleMenuShowing: boolean = true;
  private coreWorker: Worker | null = null;
  
  private screenSprite: Sprite | null = null;
  private screenTexture: RenderTexture | null = null;
  private menuContainer: Container | null = null;
  private app: Application | null = null;

  private cores = [
    { name: 'Nestopia (NES)', url: '/cores/nestopia.wasm' },
    { name: 'Gambatte (GB/GBC)', url: '/cores/gambatte.wasm' },
    { name: 'Genesis Plus GX (MegaDrive)', url: '/cores/genesis_plus_gx.wasm' }
  ];

  constructor(nd: ND, app?: Application) {
    super(nd);
    this.app = app || null;
  }

  public override init() {
    super.init();
    this.titleMenuShowing = true;
    
    // Create the emulator output texture (256x256 buffer usually)
    this.screenTexture = RenderTexture.create({ width: 256, height: 256 });
    this.screenSprite = new Sprite(this.screenTexture);
    this.nd.topScreen.addChild(this.screenSprite);

    this.createMenu();
    
    // Initialize the WebWorker using Vite's worker loader
    this.coreWorker = new Worker(new URL('./LibretroWorker.ts', import.meta.url), { type: 'module' });
    this.coreWorker.onmessage = (e) => this.handleWorkerMessage(e.data);
  }

  private handleWorkerMessage(msg: any) {
      switch (msg.type) {
          case 'frame':
              this.updateScreen(msg.data);
              break;
          case 'core_loaded':
              console.log('[LibretroGame] Core ready.');
              break;
          case 'rom_loaded':
              console.log('[LibretroGame] ROM ready. Starting...');
              break;
          case 'state_saved':
              this.saveStateToCloud(msg.data);
              break;
      }
  }

  private saveStateToCloud(data: Uint8Array) {
      const playerName = localStorage.getItem('playerName') || 'WebPlayer';
      networkManager.emit('saveEmulatorState', {
          name: playerName,
          state: Array.from(data) // Convert to array for JSON serialization
      });
      console.log('[LibretroGame] Save state pushed to cloud.');
  }

  private updateScreen(data: Uint8ClampedArray) {
      if (!this.screenTexture || !this.app) return;
      
      // Zero-copy update would be better, but for demo we use a canvas source
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      const imgData = new ImageData(new Uint8ClampedArray(data.buffer) as any, 256, 256);
      ctx.putImageData(imgData, 0, 0);
      
      const tex = Texture.from(canvas);
      const sprite = new Sprite(tex);
      
      this.app.renderer.render({
          container: sprite,
          target: this.screenTexture,
          clear: true
      });
  }

  private createMenu() {
    this.menuContainer = new Container();
    const bg = new Graphics();
    bg.rect(0, 0, 256, 192);
    bg.fill(0x333333);
    this.menuContainer.addChild(bg);

    const title = new Text({
        text: 'nD LIBRETRO CORE SELECT',
        style: { fill: 0xffffff, fontSize: 14, fontWeight: 'bold' }
    });
    title.anchor.set(0.5);
    title.position.set(128, 30);
    this.menuContainer.addChild(title);

    this.cores.forEach((core, i) => {
        const btn = new Container();
        btn.position.set(128, 70 + i * 30);
        
        const bbg = new Graphics();
        bbg.rect(-100, -12, 200, 24);
        bbg.fill(0x444466);
        btn.addChild(bbg);

        const txt = new Text({ text: core.name, style: { fill: 0xcccccc, fontSize: 12 } });
        txt.anchor.set(0.5);
        btn.addChild(txt);

        btn.eventMode = 'static';
        btn.on('pointerdown', () => this.loadCore(core.url));
        this.menuContainer!.addChild(btn);
    });

    const romBtn = new Container();
    romBtn.position.set(128, 160);
    const romBg = new Graphics();
    romBg.rect(-100, -12, 200, 24);
    romBg.fill(0x006600);
    romBtn.addChild(romBg);
    const romTxt = new Text({ text: 'LOAD TEST ROM', style: { fill: '#ffffff', fontSize: 12 } });
    romTxt.anchor.set(0.5);
    romBtn.addChild(romTxt);
    romBtn.eventMode = 'static';
    romBtn.on('pointerdown', () => this.loadTestRom());
    this.menuContainer!.addChild(romBtn);

    const saveStateBtn = new Container();
    saveStateBtn.position.set(64, 160);
    const saveBg = new Graphics();
    saveBg.rect(-50, -12, 100, 24);
    saveBg.fill(0xaa6600);
    saveStateBtn.addChild(saveBg);
    const saveTxt = new Text({ text: 'SAVE STATE', style: { fill: '#fff', fontSize: 10 } });
    saveTxt.anchor.set(0.5);
    saveStateBtn.addChild(saveTxt);
    saveStateBtn.eventMode = 'static';
    saveStateBtn.on('pointerdown', () => this.coreWorker?.postMessage({ type: 'save_state' }));
    this.menuContainer!.addChild(saveStateBtn);

    const loadStateBtn = new Container();
    loadStateBtn.position.set(192, 160);
    const loadBg = new Graphics();
    loadBg.rect(-50, -12, 100, 24);
    loadBg.fill(0x0066aa);
    loadStateBtn.addChild(loadBg);
    const loadTxt = new Text({ text: 'LOAD STATE', style: { fill: '#fff', fontSize: 10 } });
    loadTxt.anchor.set(0.5);
    loadStateBtn.addChild(loadTxt);
    loadStateBtn.eventMode = 'static';
    loadStateBtn.on('pointerdown', () => this.requestStateFromCloud());
    this.menuContainer!.addChild(loadStateBtn);

    this.nd.bottomScreen.addChild(this.menuContainer);
  }

  private requestStateFromCloud() {
      const playerName = localStorage.getItem('playerName') || 'WebPlayer';
      networkManager.emit('loadEmulatorState', playerName);
      networkManager.once('emulatorStateLoaded', (data: any) => {
          if (data.success) {
              const buffer = new Uint8Array(data.state);
              this.coreWorker?.postMessage({ type: 'load_state', data: buffer }, [buffer.buffer]);
          }
      });
  }

  private loadTestRom() {
      // For demo, we'll send a dummy buffer to trigger the worker loop
      const dummyRom = new ArrayBuffer(1024);
      this.coreWorker?.postMessage({ type: 'load_rom', data: dummyRom }, [dummyRom]);
  }

  public override cleanup() {
    if (this.coreWorker) {
      this.coreWorker.terminate();
      this.coreWorker = null;
    }
    if (this.screenSprite) {
      this.screenSprite.removeFromParent();
      this.screenSprite.destroy();
    }
    if (this.menuContainer) {
      this.menuContainer.removeFromParent();
      this.menuContainer.destroy({ children: true });
    }
  }

  public override update(dt: number) {
    if (!this.titleMenuShowing) {
      // Collect input for the core
      const inputMask = this.getNDInputMask();
      this.coreWorker?.postMessage({ type: 'input', data: inputMask });
    }
  }

  private getNDInputMask(): number {
    let mask = 0;
    if (this.nd.isButtonPressed(NDButton.UP)) mask |= (1 << 0);
    if (this.nd.isButtonPressed(NDButton.DOWN)) mask |= (1 << 1);
    if (this.nd.isButtonPressed(NDButton.LEFT)) mask |= (1 << 2);
    if (this.nd.isButtonPressed(NDButton.RIGHT)) mask |= (1 << 3);
    if (this.nd.isButtonPressed(NDButton.A)) mask |= (1 << 4);
    if (this.nd.isButtonPressed(NDButton.B)) mask |= (1 << 5);
    if (this.nd.isButtonPressed(NDButton.START)) mask |= (1 << 6);
    if (this.nd.isButtonPressed(NDButton.SELECT)) mask |= (1 << 7);
    return mask;
  }

  public loadCore(coreUrl: string) {
    console.log('[LibretroGame] Loading core:', coreUrl);
    this.titleMenuShowing = false;
    this.menuContainer!.visible = false;
    
    this.coreWorker?.postMessage({ type: 'load_core', data: { url: coreUrl } });
  }

  public override titleMenuUpdate() {}
}
