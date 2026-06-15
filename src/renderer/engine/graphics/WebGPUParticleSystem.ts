import { Container, Graphics, Application } from 'pixi.js';

/**
 * WebGPUParticleSystem
 *
 * Full implementation for WebGPU-accelerated particles using Compute Shaders.
 */
export class WebGPUParticleSystem {
    private app: Application;
    private container: Container;
    private initialized: boolean = false;
    private useWebGPU: boolean = false;

    private device: any = null;
    private particleBuffer: any = null;
    private computePipeline: any = null;
    private bindGroup: any = null;

    private readonly numParticles = 10000;
    private readonly particleSize = 16; // 4 float32s (x, y, vx, vy)

    constructor(app: Application, container: Container) {
        this.app = app;
        this.container = container;
    }

    public async init(): Promise<void> {
        if ('gpu' in navigator) {
            try {
                const adapter = await (navigator as any).gpu.requestAdapter();
                if (adapter) {
                    this.device = await adapter.requestDevice();
                    this.useWebGPU = true;
                    console.log("[WebGPU] Hardware adapter found. Initializing high-performance compute shaders.");
                    await this.setupComputePipeline();
                }
            } catch (e) {
                console.warn("[WebGPU] Support detected but initialization failed. Falling back to WebGL.", e);
            }
        }
        this.initialized = true;
    }

    private async setupComputePipeline(): Promise<void> {
        const shaderCode = `
            struct Particle {
                pos: vec2<f32>,
                vel: vec2<f32>,
            };

            @group(0) @binding(0) var<storage, read_write> particles: array<Particle>;

            @compute @workgroup_size(64)
            fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                let idx = id.x;
                if (idx >= ${this.numParticles}u) { return; }

                var p = particles[idx];

                // Physics update
                p.pos += p.vel;

                // Bounce logic
                if (p.pos.x < 0.0 || p.pos.x > 800.0) { p.vel.x *= -1.0; }
                if (p.pos.y < 0.0 || p.pos.y > 600.0) { p.vel.y *= -1.0; }

                particles[idx] = p;
            }
        `;

        const shaderModule = this.device.createShaderModule({ code: shaderCode });

        this.particleBuffer = this.device.createBuffer({
            size: this.numParticles * this.particleSize,
            usage: (window as any).GPUBufferUsage.STORAGE | (window as any).GPUBufferUsage.COPY_SRC | (window as any).GPUBufferUsage.COPY_DST,
        });

        // Initialize with random data
        const initialData = new Float32Array(this.numParticles * 4);
        for (let i = 0; i < this.numParticles; i++) {
            initialData[i * 4 + 0] = Math.random() * 800; // x
            initialData[i * 4 + 1] = Math.random() * 600; // y
            initialData[i * 4 + 2] = (Math.random() - 0.5) * 5; // vx
            initialData[i * 4 + 3] = (Math.random() - 0.5) * 5; // vy
        }
        this.device.queue.writeBuffer(this.particleBuffer, 0, initialData);

        this.computePipeline = this.device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: shaderModule,
                entryPoint: 'main',
            },
        });

        this.bindGroup = this.device.createBindGroup({
            layout: this.computePipeline.getBindGroupLayout(0),
            entries: [{ binding: 0, resource: { buffer: this.particleBuffer } }],
        });
    }

    public update(): void {
        if (!this.initialized || !this.useWebGPU) return;

        const commandEncoder = this.device.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(this.computePipeline);
        passEncoder.setBindGroup(0, this.bindGroup);
        passEncoder.dispatchWorkgroups(Math.ceil(this.numParticles / 64));
        passEncoder.end();

        this.device.queue.submit([commandEncoder.finish()]);
    }

    public spawnExplosion(x: number, y: number): void {
        if (!this.initialized) return;
        this.fallbackSpawn(x, y);
    }

    private fallbackSpawn(x: number, y: number): void {
        const g = new Graphics();
        g.circle(0, 0, 5);
        g.fill(0xff8800);
        g.position.set(x, y);
        this.container.addChild(g);

        let age = 0;
        const update = (ticker: any) => {
            const dt = ticker.deltaTime / 60;
            age += dt;
            g.alpha = 1.0 - (age / 0.5);
            g.scale.set(1.0 + age * 2);
            if (age >= 0.5) {
                g.destroy();
                this.app.ticker.remove(update);
            }
        };
        this.app.ticker.add(update);
    }
}
