#!/usr/bin/env node
/**
 * CLI tool for validating and testing JSON plugins
 */
declare class PluginCLI {
    private readonly validator;
    constructor();
    /**
     * Print help information
     */
    private printHelp;
    /**
     * Validate a JSON plugin file
     * @param filePath Path to the plugin file
     */
    private validatePlugin;
    /**
     * Analyze a JSON plugin file and print its structure
     * @param filePath Path to the plugin file
     */
    private analyzePlugin;
    /**
     * Create a template JSON plugin file
     */
    private createTemplate;
    /**
     * Run the CLI tool
     * @param args Command line arguments
     */
    run(args: string[]): void;
}
export { PluginCLI };
