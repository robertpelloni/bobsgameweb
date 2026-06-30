import re

def update_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # The current ParticleSystem is CPU based
    # We will instantiate WebGPUParticleSystem as well to make it part of ECS ParticleSystem

    if "WebGPUParticleSystem" not in content:
        content = content.replace("import { Container, Graphics } from 'pixi.js';", "import { Container, Graphics } from 'pixi.js';\nimport { WebGPUParticleSystem } from '../graphics/WebGPUParticleSystem';")
        content = re.sub(r'export class ParticleSystem extends System \{', 'export class ParticleSystem extends System {\n    private gpuParticles: WebGPUParticleSystem | null = null;', content)

    # Note WebGPUParticleSystem constructor needs app and container. The ParticleSystem constructor currently only gets container.
    # It would be better to just leave the WebGPUDemoScene as the main showcase for WebGPU particles, or we could pass `app` to ParticleSystem but it might require changes across the codebase where ParticleSystem is instantiated.

update_file('src/renderer/engine/ecs/systems/ParticleSystem.ts')
