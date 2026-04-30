import { Component } from '../Component';
import { EventSheet } from '../../eventsheet/EventSheet';

export class EventSheetComponent extends Component {
    public readonly typeName = 'EventSheet';
    public eventSheets: EventSheet[] = [];
    public variables: Map<string, any> = new Map();
}
