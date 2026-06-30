import re

def update_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # The goal is to add a WebGPU Particle button in the main menu to showcase Phase 3 expansion.

    if "WebGPU Particles" not in content:
        # Find the menu items array and insert a new item
        pattern = r'const items: MenuItem\[\] = \['
        replacement = 'const items: MenuItem[] = [\n\t\t\t{ label: "WebGPU Particles", action: () => this.openWebGPUDemo() },'
        content = re.sub(pattern, replacement, content, 1)

        # Add the openWebGPUDemo function
        function_code = '''
	private async openWebGPUDemo(): Promise<void> {
		const { WebGPUDemoScene } = await import("./WebGPUDemoScene");
		const demoScene = new WebGPUDemoScene({
			name: "webgpu-demo",
			app: this.app,
			camera: this.camera ?? undefined,
		});
		SceneTransition.pushWithFade(this.app, demoScene);
	}
'''
        # Insert before openLobby
        content = re.sub(r'(\tprivate async openLobby)', function_code + r'\n\1', content, 1)

    with open(filepath, 'w') as f:
        f.write(content)

update_file('src/renderer/scenes/MainMenuScene.ts')
