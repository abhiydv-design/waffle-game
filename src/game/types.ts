export type IngredientCategory='main'|'optional';
export type Ingredient={id:string;name:string;category:IngredientCategory;asset?:string};
export type GamePhase='loading'|'ready'|'camera-setup'|'microphone-setup'|'playing'|'complete';
export type FeedbackTone='success'|'warning'|'info';
export type GameFeedback={message:string;tone:FeedbackTone;id:number}|null;
