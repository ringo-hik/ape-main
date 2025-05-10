/**
 * This file contains a fixed version of the extractTextContent function for chatViewService.ts
 * The original function had syntax errors around handling of code elements
 */

export function fixedExtractTextContent(element: HTMLElement): string {
  let text = '';

  // Process all child nodes
  // Use array spread to convert NodeList to Array for better TypeScript compatibility
  [...Array.from(element.childNodes)].forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      // Text nodes are added directly
      text += node.textContent;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const elemNode = node as HTMLElement;
      
      // Handle code blocks specially
      if (elemNode.classList && elemNode.classList.contains('code-block-container')) {
        // Get language name from code block header
        const languageElement = elemNode.querySelector('.code-block-language');
        const language = languageElement ? languageElement.textContent?.trim() : '';

        // Get code content
        const codeElement = elemNode.querySelector('code');
        if (codeElement) {
          const code = codeElement.textContent || '';
          // Add formatted code block 
          text += '"""' + language + '\n' + code + '\n"""\n\n';
        }
      }
      // Handle lists
      else if (elemNode.tagName === 'UL' || elemNode.tagName === 'OL') {
        // Process all list items
        const listItems = elemNode.querySelectorAll('li');
        listItems.forEach(item => {
          const prefix = elemNode.tagName === 'UL' ? '- ' : '1. ';
          text += prefix + item.textContent?.trim() + '\n';
        });
        text += '\n';
      }
      // Handle other element types
      else {
        // Heading elements
        if (elemNode.tagName === 'H1') text += '# ' + elemNode.textContent + '\n\n';
        else if (elemNode.tagName === 'H2') text += '## ' + elemNode.textContent + '\n\n';
        else if (elemNode.tagName === 'H3') text += '### ' + elemNode.textContent + '\n\n';
        else if (elemNode.tagName === 'H4') text += '#### ' + elemNode.textContent + '\n\n';
        else if (elemNode.tagName === 'H5') text += '##### ' + elemNode.textContent + '\n\n';
        else if (elemNode.tagName === 'H6') text += '###### ' + elemNode.textContent + '\n\n';
        // Paragraph
        else if (elemNode.tagName === 'P') text += elemNode.textContent + '\n\n';
        // Blockquote
        else if (elemNode.tagName === 'BLOCKQUOTE') {
          const lines = elemNode.textContent?.split('\n') || [];
          lines.forEach(line => {
            text += '> ' + line + '\n';
          });
          text += '\n';
        }
        // Inline code (with safe null check)
        else if (elemNode.tagName === 'CODE' && !elemNode.closest('.code-block-container')) {
          text += '`' + (elemNode.textContent || '') + '`';
        }
        // File attachment
        else if (elemNode.classList && elemNode.classList.contains('attached-file')) {
          const fileName = elemNode.querySelector('.attachment-name')?.textContent || 'attached file';
          text += '첨부된 파일: ' + fileName + '\n\n';
        }
        // Process other elements recursively
        else {
          text += fixedExtractTextContent(elemNode);
        }
      }
    }
  });

  return text;
}