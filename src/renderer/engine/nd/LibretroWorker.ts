/**
 * Libretro WebWorker
 * 
 * Runs a WASM-compiled Libretro core.
 */

interface LibretroCore {
    retro_init(): void;
    retro_deinit(): void;
    retro_run(): void;
    retro_get_system_info(info: any): void;
    retro_get_system_av_info(av_info: any): void;
    retro_set_video_refresh(cb: any): void;
    retro_set_audio_sample(cb: any): void;
    retro_set_audio_sample_batch(cb: any): void;
    retro_set_input_poll(cb: any): void;
    retro_set_input_state(cb: any): void;
    retro_load_game(game: any): boolean;
}

let core: any = null;
let romData: ArrayBuffer | null = null;
let frameBuffer: Uint8ClampedArray | null = null;
let inputMask: number = 0;
let isRunning: boolean = false;

// Emscripten-style module loading simulation
async function loadWasmCore(url: string) {
    console.log('[LibretroWorker] Fetching WASM core:', url);
    // In a production environment, this would use WebAssembly.instantiateStreaming
    // or the Emscripten generated JS loader.
    return {
        retro_init: () => {},
        retro_run: () => {},
        retro_load_game: () => true,
        // ... stubs for the demo bridge
    };
}

self.onmessage = async (e) => {
    const { type, data } = e.data;

    switch (type) {
        case 'load_core':
            core = await loadWasmCore(data.url);
            self.postMessage({ type: 'core_loaded' });
            break;

        case 'load_rom':
            console.log('[LibretroWorker] ROM received, size:', data.byteLength);
            romData = data;
            
            if (core) {
                // core.retro_init();
                // core.retro_load_game({ data: romData, size: romData.byteLength });
                isRunning = true;
                requestAnimationFrame(runFrame);
            }
            self.postMessage({ type: 'rom_loaded' });
            break;

        case 'input':
            inputMask = data;
            break;

        case 'stop':
            isRunning = false;
            break;

        case 'save_state':
            console.log('[LibretroWorker] Generating save state...');
            const mockState = new Uint8Array(1024);
            (self as any).postMessage({ type: 'state_saved', data: mockState }, [mockState.buffer]);
            break;

        case 'load_state':
            console.log('[LibretroWorker] Loading save state...');
            // core.retro_unserialize(data);
            self.postMessage({ type: 'state_loaded' });
            break;
    }
};

function runFrame() {
    if (!isRunning || !core) return;

    try {
        // core.retro_run();
        
        // Mock video output for demo purposes if no real core is loaded
        if (!frameBuffer) {
            frameBuffer = new Uint8ClampedArray(256 * 256 * 4);
        }
        
        // Generate a test pattern
        for (let i = 0; i < frameBuffer.length; i += 4) {
            frameBuffer[i] = Math.random() * 255;     // R
            frameBuffer[i + 1] = Math.random() * 255; // G
            frameBuffer[i + 2] = Math.random() * 255; // B
            frameBuffer[i + 3] = 255;                 // A
        }

        // Send frame back to main thread using Transferables for zero-copy performance
        const bufferCopy = new Uint8ClampedArray(frameBuffer);
        (self as any).postMessage({ 
            type: 'frame', 
            data: bufferCopy 
        }, [bufferCopy.buffer]);

    } catch (e) {
        console.error('[LibretroWorker] Loop Error:', e);
        isRunning = false;
    }

    if (isRunning) {
        // Aim for 60fps
        setTimeout(runFrame, 1000 / 60);
    }
}
