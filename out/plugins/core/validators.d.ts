import { JSONPluginSchema, JSONPluginValidationResult } from '../types/json-plugin-schema';
import { PluginMetadata, Plugin } from '../types/plugin';
/**
 * Utility class for validating and parsing JSON plugins
 */
export declare class PluginValidator {
    private ajv;
    private jsonPluginSchema;
    constructor();
    /**
     * Build JSON schema from TypeScript interface
     * This is a simplified version - in production, we would use a more sophisticated approach
     */
    private buildJsonSchema;
    /**
     * Validate a JSON plugin against the schema
     * @param jsonPlugin The JSON plugin to validate
     * @returns Validation result with errors if any
     */
    validateJsonPlugin(jsonPlugin: any): JSONPluginValidationResult;
    /**
     * Convert a JSON plugin to a plugin instance
     * @param jsonPlugin The JSON plugin schema
     * @param pluginPath The path to the plugin file
     * @returns A plugin instance
     */
    convertJsonToPlugin(jsonPlugin: JSONPluginSchema, pluginPath: string): {
        metadata: PluginMetadata;
        plugin: Plugin;
    };
    /**
     * Parse a JSON plugin file
     * @param content The file content as string
     * @returns Parsed JSON plugin or null if parsing fails
     */
    parseJsonPluginFile(content: string): JSONPluginSchema | null;
}
