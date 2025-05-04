/**
 * Code Blocks Functionality
 * 
 * Handles code block rendering, syntax highlighting, and copy functionality
 */

class CodeBlockProcessor {
  constructor() {
    this.codeBlocks = new Map();
    this.blockCounter = 0;
  }

  /**
   * Processes a message content to render code blocks with syntax highlighting
   * @param {string} content - The message content to process
   * @returns {string} HTML with processed code blocks
   */
  processContent(content) {
    if (!content) return '';
    
    // Clear previous blocks for this processing round
    this.blockCounter = 0;
    
    // Process markdown code blocks (```language\ncode\n```)
    const processedContent = content.replace(/```(\w*)\n([\s\S]*?)```/g, (match, language, code) => {
      return this.createCodeBlockHtml(code, language);
    });
    
    // Process inline code blocks (`code`)
    return processedContent.replace(/`([^`]+)`/g, (match, code) => {
      return `<code class="inline-code">${this.escapeHtml(code)}</code>`;
    });
  }
  
  /**
   * Creates HTML for a code block with copy button
   * @param {string} code - The code content
   * @param {string} language - The programming language for syntax highlighting
   * @returns {string} HTML for the code block
   */
  createCodeBlockHtml(code, language) {
    const blockId = `code-block-${Date.now()}-${this.blockCounter++}`;
    const escapedCode = this.escapeHtml(code);
    const languageClass = language ? `language-${language}` : '';
    
    return `
      <div class="code-block-container">
        <div class="code-block-header">
          ${language ? `<span class="code-language">${language}</span>` : ''}
          <button class="copy-button" data-block-id="${blockId}" title="Copy code">
            <span class="copy-icon">📋</span>
            <span class="copy-text">Copy</span>
          </button>
        </div>
        <pre class="code-block ${languageClass}" id="${blockId}"><code>${escapedCode}</code></pre>
      </div>
    `;
  }
  
  /**
   * Escapes HTML special characters
   * @param {string} unsafe - The raw text to escape
   * @returns {string} HTML-escaped text
   */
  escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  
  /**
   * Initializes copy buttons functionality for a container
   * @param {HTMLElement} container - The container to process
   */
  initializeCopyButtons(container) {
    const copyButtons = container.querySelectorAll('.copy-button');
    
    copyButtons.forEach(button => {
      button.addEventListener('click', () => {
        const blockId = button.getAttribute('data-block-id');
        const codeBlock = document.getElementById(blockId);
        if (!codeBlock) return;
        
        const code = codeBlock.textContent;
        this.copyToClipboard(code, button);
      });
    });
  }
  
  /**
   * Copies text to clipboard and updates button UI
   * @param {string} text - Text to copy
   * @param {HTMLElement} button - The button element to update
   */
  copyToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
      const copyText = button.querySelector('.copy-text');
      const originalText = copyText.textContent;
      
      // Update button text
      copyText.textContent = 'Copied!';
      button.classList.add('copied');
      
      // Reset button text after 2 seconds
      setTimeout(() => {
        copyText.textContent = originalText;
        button.classList.remove('copied');
      }, 2000);
    }).catch(err => {
      console.error('Could not copy text: ', err);
      
      // Fallback copy method for older browsers
      this.fallbackCopyToClipboard(text, button);
    });
  }
  
  /**
   * Fallback method for copying to clipboard
   * @param {string} text - Text to copy
   * @param {HTMLElement} button - The button element to update
   */
  fallbackCopyToClipboard(text, button) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
      document.execCommand('copy');
      const copyText = button.querySelector('.copy-text');
      copyText.textContent = 'Copied!';
      button.classList.add('copied');
      
      setTimeout(() => {
        copyText.textContent = 'Copy';
        button.classList.remove('copied');
      }, 2000);
    } catch (err) {
      console.error('Fallback copy failed: ', err);
    }
    
    document.body.removeChild(textarea);
  }
  
  /**
   * Applies syntax highlighting to code blocks in a container
   * @param {HTMLElement} container - Container with code blocks to highlight
   */
  applySyntaxHighlighting(container) {
    // This is where we would apply syntax highlighting
    // For now, we'll use a simple class-based styling approach
    // In a future enhancement, integrate a library like highlight.js
    const codeBlocks = container.querySelectorAll('pre.code-block');
    
    codeBlocks.forEach(block => {
      // Add a class to enable special styling by language
      const languageClass = block.classList[1];
      if (languageClass && languageClass.startsWith('language-')) {
        const language = languageClass.replace('language-', '');
        block.classList.add(`highlight-${language}`);
      }
    });
  }
}

// Singleton instance
const codeBlockProcessor = new CodeBlockProcessor();