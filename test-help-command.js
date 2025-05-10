const vscode = require('vscode');

/**
 * Test script to verify that the help command works correctly
 */
async function testHelpCommand() {
  console.log('Testing help command registration and execution...');
  
  try {
    // Get all VS Code commands
    const commands = await vscode.commands.getCommands(true);
    
    // Check if the help command is registered
    const hasHelpCommand = commands.includes('ape.help');
    const hasShowCommandHelp = commands.includes('ape.showCommandHelp');
    
    console.log(`ape.help command registered: ${hasHelpCommand}`);
    console.log(`ape.showCommandHelp command registered: ${hasShowCommandHelp}`);
    
    if (!hasHelpCommand) {
      console.error('ERROR: ape.help command is not registered!');
      return;
    }
    
    // Test executing the help command
    console.log('Executing ape.help command...');
    await vscode.commands.executeCommand('ape.help');
    
    console.log('If no errors are shown and a webview panel is opened, the help command is working correctly.');
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Export the test function
module.exports = testHelpCommand;