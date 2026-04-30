import { Component } from '../Component';

export class LocalizationComponent extends Component {
    public readonly typeName = 'Localization';
    public textKey: string = "";
    public lastLanguage: string = "";
}
