/**
 * Creates code blocks for HTML and JavaScript snippets
 * @author Levente Hunyadi
 * @version 0.1
 * @copyright 2025 Levente Hunyadi
 * @license MIT
 * @see https://hunyadi.info.hu/projects/boxsharp
 * @see https://github.com/hunyadi/boxsharp
**/

/**
 * Removes common leading whitespace from a string.
 * @param {string} str - String to remove leading whitespace from.
 * @returns {string} - Cleaned string.
 */
function dedent(str) {
    // split into lines
    const lines = str.split("\n");

    // compute minimum indentation across non-empty lines
    let minIndent = Infinity;
    for (const line of lines) {
        if (line.trim() === "") {
            continue;  // ignore blank lines
        }
        const match = line.match(/^(\s+)/);
        if (match) {
            minIndent = Math.min(minIndent, match[1].length);
        } else {
            minIndent = 0;
            break;
        }
    }

    // remove indentation
    if (minIndent === Infinity || minIndent === 0) {
        return str;  // nothing to dedent
    }

    return lines.map(line => line.startsWith(" ".repeat(minIndent)) ? line.slice(minIndent) : line).join("\n");
}

/**
 * Creates code blocks for HTML and JavaScript snippets
 * @returns {void}
 */
function createCodeBlocks() {
    document.querySelectorAll("template.example").forEach((/** @type {HTMLTemplateElement} */ template) => {
        const div = document.createElement("div");
        const pre = document.createElement("pre");
        const code = document.createElement("code");
        div.append(template.content);
        code.className = "language-html";
        code.textContent = div.innerHTML;
        code.textContent = dedent(code.textContent).trim();
        pre.append(code);
        template.after(div, pre);
        template.remove();
    });
    document.querySelectorAll("script.example").forEach(script => {
        const pre = document.createElement("pre");
        const code = document.createElement("code");
        code.className = "language-javascript";
        code.textContent = dedent(script.textContent).trim();
        pre.append(code);
        script.after(pre);
    });
    document.querySelectorAll("pre>code").forEach(block => {
        const button = document.createElement("button");
        button.className = "copy-btn";
        button.textContent = "Copy";

        button.addEventListener("click", () => {
            navigator.clipboard.writeText(block.textContent);
            button.textContent = "Copied";
            setTimeout(() => button.textContent = "Copy", 1500);
        });

        // Insert before the <pre>, positioned over it via CSS
        block.before(button);
    });
}

export { createCodeBlocks };
