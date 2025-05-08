import * as vscode from 'vscode';
import { EventData, EventEmitter, EventFilter, EventHandler } from '../types/events';
/**
 * Implementation of EventEmitter interface
 */
export declare class EventEmitterImpl implements EventEmitter {
    private _eventId;
    private _handlers;
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
    /**
     * Check if an event matches a filter
     * @param event Event to check
     * @param filter Filter to apply (or null for all events)
     * @returns Whether the event matches the filter
     */
    private _matchesFilter;
}
