# APE: Agentic Pipeline Extension

> Agentic Vision. Development Illuminated.  
> Seamless • Plugin-driven • Lightweight For Our Developer.

## 🚀 Overview

APE (Agentic Pipeline Extension) is a VSCode extension that seamlessly integrates AI capabilities into your development workflow. It provides a robust set of tools designed to enhance productivity, streamline coding tasks, and facilitate intelligent interaction with your codebase.

## ✨ Key Features

- **AI-Powered Chat Interface**: Communicate with large language models directly within VSCode
- **Code Analysis**: Get insights and recommendations for your code
- **Git Integration**: Automate commits and conflict resolution
- **Extensible Plugin System**: Expand functionality through plugins
- **Smart Context Awareness**: Maintains conversation context for more relevant responses

## 🔧 Installation

```bash
# Install dependencies
npm install

# Build the extension
npm run build

# Or use the build script for more options
./build.sh
```

## 📋 Requirements

- **Node.js**: v14.0.0 or higher
- **npm**: v6.0.0 or higher
- **Visual Studio Code**: v1.70.0 or higher

## 🎮 Usage

### Starting a Conversation

1. Click the APE icon in the activity bar
2. Type your question or request in the chat input
3. Press Enter to send your message
4. Review the AI's response

### Using Code Analysis

1. Select code in the editor
2. Right-click and choose "APE: Analyze Code"
3. Or use the keyboard shortcut: Ctrl+` (Cmd+` on Mac)

### Command Palette

Access all APE features through the command palette (F1 or Ctrl+Shift+P):

- `APE: Open Chat` - Opens the chat interface
- `APE: Analyze Code` - Analyzes selected code
- `APE: Git Commit` - Creates intelligent commit messages
- And many more commands

## ⚙️ Configuration

Customize APE through VS Code settings:

- **LLM Settings**: Configure endpoints, API keys, and models
- **Memory Settings**: Control conversation history and context
- **UI Settings**: Adjust appearance and behavior
- **Git Integration**: Set up auto-commit and conflict resolution
- **Plugin Settings**: Manage plugin behavior

## 🧩 Plugin System

APE features a powerful plugin architecture that allows third-party developers to extend and enhance the extension's functionality. Whether you're building integrations with other tools or adding custom features, the plugin system provides a comprehensive API surface for your needs.

### For Plugin Users

Discover and manage plugins in APE:

- List installed plugins: `APE: List Plugins`
- Activate or deactivate plugins: `APE: Activate/Deactivate Plugin`
- Configure plugin settings: `APE: Open Plugin Settings`

### For Plugin Developers

The APE plugin system provides a robust framework for extending the extension:

#### Plugin Architecture

- **TypeScript-based:** Write plugins using TypeScript with full type safety
- **Lifecycle Management:** Plugins follow a managed lifecycle (discovery, registration, activation, deactivation)
- **Dependency Resolution:** Define dependencies between plugins for modular architectures
- **Sandboxed Execution:** Plugins run in isolated contexts for stability and security

#### Available APIs

Plugins have access to a comprehensive set of APIs:

- **LLM Service API:** Send requests to language models and process responses
- **Memory Service API:** Create and manage conversation sessions
- **UI Service API:** Create custom UI elements and interact with VSCode's interface
- **File System API:** Read and write files, manage directories
- **Git Service API:** Interact with Git repositories and version control
- **Workspace API:** Access workspace information and file operations
- **Debug API:** Integrate with VSCode's debugging capabilities
- **Event System:** Communicate between plugins using a pub/sub event system

#### Event System

The event system enables powerful inter-plugin communication through a publish-subscribe pattern:

- **Event Types:** Custom event types for various workflows
- **Filters:** Subscribe to specific event sources or types
- **Payload:** Pass structured data between components
- **Asynchronous:** Non-blocking event processing

Example of event communication:

```typescript
// Plugin A: Publishing events
context.api.events.emit('data:processed', {
  result: processedData,
  timestamp: new Date()
}, 'my-plugin.processor');

// Plugin B: Subscribing to events
const subscription = context.api.events.on({
  // Filter for specific event types
  type: 'data:processed',
  // Optional: filter by source
  source: 'my-plugin.processor'
}, (event) => {
  // Handle the event
  console.log(`Received processed data: ${event.payload.result}`);
  // Use the data for further processing
});

// Store subscription for cleanup
context.subscriptions.push(subscription);
```

Event filters support both exact matches and regular expressions, making it easy to create flexible event handling systems.

#### Getting Started with Plugin Development

1. Create a new TypeScript file with the Plugin interface:
   ```typescript
   import { Plugin, PluginContext } from '../types/plugin';
   
   export class MyCustomPlugin implements Plugin {
     async activate(context: PluginContext): Promise<void> {
       // Your plugin initialization code here
       context.log('My plugin activated!');
       
       // Register commands, create UI elements, etc.
       const disposable = context.api.registerCommand(
         'my-plugin.helloWorld', 
         () => context.api.ui.showInformationMessage('Hello from my plugin!')
       );
       
       // Store disposables for cleanup
       context.subscriptions.push(disposable);
     }
     
     async deactivate(): Promise<void> {
       // Cleanup code when plugin is deactivated
     }
   }
   ```

2. Define plugin metadata:
   ```typescript
   const metadata = {
     id: 'my-company.my-plugin',
     name: 'My Custom Plugin',
     version: '1.0.0',
     description: 'Adds awesome new functionality to APE',
     author: 'Your Name',
     dependencies: [], // Other plugins this depends on
     features: [
       {
         type: 'command',
         id: 'helloWorld',
         name: 'Hello World',
         description: 'Shows a greeting message'
       }
     ]
   };
   ```

3. Register your plugin with APE's plugin registry

#### Security Best Practices

When developing plugins, follow these security guidelines:

1. **Input Validation**
   - Validate all external inputs, including command arguments and event payloads
   - Use TypeScript's type system to ensure data structure integrity
   - Never execute dynamic code from untrusted sources

2. **Secure Storage**
   - Use the plugin context's storage for persistent data
   - Never store sensitive information like API keys in plaintext
   - Utilize the built-in secure storage for credentials

3. **Resource Management**
   - Clean up resources by storing disposables in the context.subscriptions array
   - Implement proper deactivation logic
   - Use try/catch blocks for error handling in critical sections

4. **Permission Model**
   - Request only the permissions your plugin needs
   - Document required permissions clearly
   - Handle permission denial gracefully

5. **Secure Communication**
   - Use HTTPS for all external API calls
   - Implement proper authentication
   - Consider rate limiting for external service calls

For comprehensive documentation, code examples, and best practices, refer to the [Plugin Development Guide](https://github.com/your-repo/plugin-docs).

## 🛠️ Development

```
extension/
├── src/                  # Source code
│   ├── extension.ts      # Entry point
│   ├── core/             # Core functionality
│   ├── plugins/          # Plugin system
│   ├── ui/               # UI components
│   └── types/            # Type definitions
├── resources/            # Resource files
└── out/                  # Build output
```

## 🔍 Troubleshooting

If you encounter issues:

1. Restart VS Code (Developer: Reload Window)
2. Check extension logs (Help > Toggle Developer Tools > Console)
3. Reinstall dependencies (`npm install`)
4. Rebuild the extension (`npm run build`)

## 📝 License

UNLICENSED - Private use only

---

© 2025 APE Team | v0.9.1