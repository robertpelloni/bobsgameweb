import { System } from '../System';
import { EntityId } from '../Entity';
import { Component } from '../Component';
import { TweenComponent, Tween } from '../components/TweenComponent';

export class TweenSystem extends System {
    public update(dt: number, entities: Map<EntityId, Map<string, Component>>): void {
        for (const [entityId, components] of entities) {
            const tweenComp = components.get('Tween') as TweenComponent;
            if (tweenComp) {
                this.processTweens(dt, tweenComp, components);
            }
        }
    }

    private processTweens(dt: number, comp: TweenComponent, entityComponents: Map<string, Component>): void {
        for (let i = comp.activeTweens.length - 1; i >= 0; i--) {
            const t = comp.activeTweens[i];
            t.currentTime += dt;
            
            const progress = Math.min(t.currentTime / t.duration, 1);
            const easedProgress = t.easing(progress);
            const currentValue = t.startValue + (t.endValue - t.startValue) * easedProgress;

            // Apply to entity components
            // This requires some reflection-like mapping
            this.applyTweenValue(entityComponents, t.property, currentValue);

            if (progress >= 1) {
                comp.activeTweens.splice(i, 1);
            }
        }
    }

    private applyTweenValue(components: Map<string, Component>, property: string, value: number): void {
        // Simple mapping demo: Transform.x, Transform.y, Sprite.alpha
        const [compName, propName] = property.split('.');
        const targetComp = components.get(compName) as any;
        if (targetComp && propName in targetComp) {
            targetComp[propName] = value;
        }
    }
}
