import { EntityId } from './Entity';

export abstract class Component {
    public entityId: EntityId = -1;
    
    // Naming component type for reflection/serialization
    public abstract readonly typeName: string;
}
