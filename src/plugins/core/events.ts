import * as vscode from 'vscode';
import { EventData, EventEmitter, EventFilter, EventHandler } from '../types/events';

/**
 * Implementation of EventEmitter interface
 */
export class EventEmitterImpl implements EventEmitter {
  private _eventId = 0;
  private _handlers: Map<string, { filter: EventFilter | null; handler: EventHandler }> = new Map();
  
  /**
   * Subscribe to events
   * @param filter Optional filter to limit which events are received
   * @param handler Event handler function
   * @returns Disposable for unsubscribing
   */
  public on(filter: EventFilter | null, handler: EventHandler): vscode.Disposable {
    const handlerId = `handler_${++this._eventId}`;
    this._handlers.set(handlerId, { filter, handler });
    
    return {
      dispose: () => {
        this._handlers.delete(handlerId);
      }
    };
  }
  
  /**
   * Subscribe to a single event occurrence
   * @param filter Optional filter to limit which events are received
   * @param handler Event handler function
   * @returns Disposable for unsubscribing
   */
  public once(filter: EventFilter | null, handler: EventHandler): vscode.Disposable {
    const handlerId = `once_handler_${++this._eventId}`;
    
    // Create a wrapper handler that self-disposes after one execution
    const onceHandler: EventHandler = (event) => {
      // Call the original handler
      handler(event);
      
      // Self-dispose after execution
      this._handlers.delete(handlerId);
    };
    
    this._handlers.set(handlerId, { filter, handler: onceHandler });
    
    return {
      dispose: () => {
        this._handlers.delete(handlerId);
      }
    };
  }
  
  /**
   * Emit an event
   * @param type Event type
   * @param payload Event payload
   * @param source Event source (defaults to 'system')
   * @returns The emitted event data
   */
  public emit(type: string, payload: any, source: string = 'system'): EventData {
    // Create event data
    const event: EventData = {
      id: `event_${Date.now()}_${++this._eventId}`,
      source,
      type,
      timestamp: new Date(),
      payload
    };
    
    // Call all handlers that match the filter
    for (const { filter, handler } of this._handlers.values()) {
      if (this._matchesFilter(event, filter)) {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in event handler for ${event.type}:`, error);
        }
      }
    }
    
    return event;
  }
  
  /**
   * Check if an event matches a filter
   * @param event Event to check
   * @param filter Filter to apply (or null for all events)
   * @returns Whether the event matches the filter
   */
  private _matchesFilter(event: EventData, filter: EventFilter | null): boolean {
    // If no filter, match all events
    if (!filter) {
      return true;
    }
    
    // Check source filter
    if (filter.source !== undefined) {
      if (typeof filter.source === 'string') {
        if (event.source !== filter.source) {
          return false;
        }
      } else if (filter.source instanceof RegExp) {
        if (!filter.source.test(event.source)) {
          return false;
        }
      }
    }
    
    // Check type filter
    if (filter.type !== undefined) {
      if (typeof filter.type === 'string') {
        if (event.type !== filter.type) {
          return false;
        }
      } else if (filter.type instanceof RegExp) {
        if (!filter.type.test(event.type)) {
          return false;
        }
      }
    }
    
    // Passed all filters
    return true;
  }
}