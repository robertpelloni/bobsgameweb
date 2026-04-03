import { System } from '../System';
import { EntityId } from '../Entity';
import { Component } from '../Component';
import { AudioReactiveComponent } from '../components/AudioReactiveComponent';
import { TransformComponent } from '../components/TransformComponent';
import { AudioManager } from '../../../audio/AudioManager';

export class AudioReactiveSystem extends System {
    private dataArray: any = new Uint8Array(128);

    public update(dt: number, entities: Map<EntityId, Map<string, Component>>): void {
        const analyzer = (AudioManager as any).analyzer as AnalyserNode;
        if (!analyzer) return;

        analyzer.getByteFrequencyData(this.dataArray);

        for (const [entityId, components] of entities) {
            const reactive = components.get('AudioReactive') as AudioReactiveComponent;
            const transform = components.get('Transform') as TransformComponent;

            if (reactive && transform) {
                const value = this.dataArray[reactive.frequencyBin] / 255;
                const impact = value * reactive.sensitivity;

                if (reactive.property === 'scale') {
                    transform.scaleX = 1.0 + impact;
                    transform.scaleY = 1.0 + impact;
                } else if (reactive.property === 'rotation') {
                    transform.rotation += impact * dt;
                } else if (reactive.property === 'alpha') {
                    // Update sprite alpha if we had access to it here
                }
            }
        }
    }
}
