export interface EventCondition {
    type: string;
    params: any;
}

export interface EventAction {
    type: string;
    params: any;
}

export interface EventBlock {
    conditions: EventCondition[];
    actions: EventAction[];
    subEvents?: EventBlock[];
}

export class EventSheet {
    public name: string = "New Event Sheet";
    public blocks: EventBlock[] = [];
}
