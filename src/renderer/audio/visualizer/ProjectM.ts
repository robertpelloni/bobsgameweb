import butterchurn from 'butterchurn';
import butterchurnPresets from 'butterchurn-presets';
import { Howler } from 'howler';
import { AudioManager } from '../AudioManager';

export class ProjectMVisualizer {
    private canvas: HTMLCanvasElement;
    private visualizer: any;
    private presets: any;
    private audioContext: AudioContext;
    private sourceNode: MediaElementAudioSourceNode | null = null;
    private initialized: boolean = false;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.audioContext = Howler.ctx as AudioContext;
        this.presets = butterchurnPresets.getPresets();
    }

    public init(): void {
        if (this.initialized) return;

        this.visualizer = butterchurn.createVisualizer(this.audioContext, this.canvas, {
            width: this.canvas.width,
            height: this.canvas.height
        });

        // Use the global analyzer if available
        const globalAnalyzer = (AudioManager as any).analyzer;
        if (globalAnalyzer) {
            // butterchurn usually creates its own, but we can attempt to sync
        }

        // Load a random preset
        const presetKeys = Object.keys(this.presets);
        const randomPreset = this.presets[presetKeys[Math.floor(Math.random() * presetKeys.length)]];
        this.visualizer.loadPreset(randomPreset, 0.0);

        // Connect Howler master gain to the visualizer
        Howler.masterGain.connect(this.visualizer.destination);
        
        this.initialized = true;
    }

    public render(): void {
        if (!this.initialized) return;
        this.visualizer.render();
    }

    public resize(width: number, height: number): void {
        if (!this.initialized) return;
        this.visualizer.setRendererSize(width, height);
    }

    public loadPreset(name: string): void {
        if (!this.initialized || !this.presets[name]) return;
        this.visualizer.loadPreset(this.presets[name], 2.0); // 2 second blend
    }

<<<<<<< HEAD
<<<<<<< HEAD
=======
    public loadRandomPreset(): string {
        if (!this.initialized) return "";
        const keys = Object.keys(this.presets);
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        this.visualizer.loadPreset(this.presets[randomKey], 2.0);
        return randomKey;
    }

>>>>>>> origin/jules-3-0-10-sanitization-and-editor-updates-534417342975684788
=======
>>>>>>> origin/jules-3-0-9-engine-sync-12991498515375513677
    public destroy(): void {
        if (this.initialized) {
            Howler.masterGain.disconnect(this.visualizer.destination);
            this.initialized = false;
        }
    }
}
