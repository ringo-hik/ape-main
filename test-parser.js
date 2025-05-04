/**
 * Simple test for CommandParserService
 */

const { CommandParserService } = require('./dist/core/command/CommandParserService');
const parser = new CommandParserService();

// Test 1: @ without colon
console.log('Test 1: @ without colon');
const result1 = parser.parse('@알려줘');
console.log('Result:', result1);
console.log('Success:', result1 === null);

// Test 2: @ with colon
console.log('\nTest 2: @ with colon');
const result2 = parser.parse('@git:status');
console.log('Result:', result2);
console.log('Success:', result2 !== null && result2.agentId === 'git' && result2.command === 'status');

// Test 3: slash command
console.log('\nTest 3: slash command');
const result3 = parser.parse('/help');
console.log('Result:', result3);
console.log('Success:', result3 !== null && result3.agentId === 'core' && result3.command === 'help');