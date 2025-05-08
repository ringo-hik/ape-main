import * as vscode from 'vscode';
/**
 * Event data object passed to event handlers
 */
export interface EventData {
    /** Unique event ID */
    id: string;
    /** Event source (usually plugin ID or system component) */
    source: string;
    /** Event type */
    type: string;
    /** Timestamp when the event was created */
    timestamp: Date;
    /** Event payload */
    payload: any;
}
/**
 * Event handler function
 */
export type EventHandler = (event: EventData) => void;
/**
 * Event filter for subscribing to specific events
 */
export interface EventFilter {
    /** Filter by source */
    source?: string | RegExp;
    /** Filter by event type */
    type?: string | RegExp;
}
/**
 * Event emitter for plugin communication
 */
export interface EventEmitter {
    /**
     * Subscribe to events
     * @param filter Optional filter to limit which events are received
     * @param handler Event handler function
     * @returns Disposable for unsubscribing
     */
    on(filter: EventFilter | null, handler: EventHandler): vscode.Disposable;
    /**
     * Subscribe to a single event occurrence
     * @param filter Optional filter to limit which events are received
     * @param handler Event handler function
     * @returns Disposable for unsubscribing
     */
    once(filter: EventFilter | null, handler: EventHandler): vscode.Disposable;
    /**
     * Emit an event
     * @param type Event type
     * @param payload Event payload
     * @param source Event source (defaults to 'system')
     * @returns The emitted event data
     */
    emit(type: string, payload: any, source?: string): EventData;
}
