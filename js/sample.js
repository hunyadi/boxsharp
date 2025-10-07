/**
 * Random text generator
 * @author Levente Hunyadi
 * @version 0.1
 * @copyright 2025 Levente Hunyadi
 * @license MIT
 * @see https://hunyadi.info.hu/projects/boxsharp
 * @see https://github.com/hunyadi/boxsharp
**/

/**
 * @typedef {Object} Range
 * @property {number} min - Lower bound of the closed interval.
 * @property {number} max - Upper bound of the closed interval.
 */

/**
 * Generates a random integer drawn from a closed range, minimum and maximum inclusive.
 *
 * @param {Range} range - Statistical distribution of the number to generate.
 * @returns {number} - A random integer in the closed range.
 */
function randomCount(range) {
    return ((Math.random() * ((range.max | 0) - (range.min | 0) + 1)) | 0) + (range.min | 0);
}

const words = [
    "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing",
    "elit", "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore",
    "et", "dolore", "magna", "aliqua", "enim", "ad", "minim", "veniam",
    "quis", "nostrud", "exercitation", "ullamco", "laboris", "nisi", "ut",
    "aliquip", "ex", "ea", "commodo", "consequat", "duis", "aute", "irure",
    "in", "reprehenderit", "voluptate", "velit", "esse", "cillum", "eu",
    "fugiat", "nulla", "pariatur", "excepteur", "sint", "occaecat",
    "cupidatat", "non", "proident", "sunt", "culpa", "qui", "officia",
    "deserunt", "mollit", "anim", "id", "est", "laborum"
];

/**
 * Generates random words in a sentence.
 *
 * @param {Range} wordRange - Statistical distribution of the number of words to generate.
 * @returns {string} - A sentence.
 */
function generateSentence(wordRange) {
    const count = randomCount(wordRange);
    /** @type {string[]} */
    const items = [];

    const first = words[Math.floor(Math.random() * words.length)];
    items.push(first.charAt(0).toUpperCase() + first.substring(1));
    for (let i = 1; i < count; i++) {
        const word = words[Math.floor(Math.random() * words.length)];
        items.push(word);
    }
    return items.join(" ") + ".";
}

/**
 * Generates random sentences in a paragraph.
 *
 * @param {Range} sentenceRange - Statistical distribution of the number of sentences to generate.
 * @param {Range} wordRange - Statistical distribution of the number of words per sentence to generate.
 * @returns {string} - A paragraph.
 */
function generateParagraph(sentenceRange, wordRange) {
    const count = randomCount(sentenceRange);
    /** @type {string[]} */
    const items = [];

    for (let i = 0; i < count; i++) {
        items.push(generateSentence(wordRange));
    }
    return items.join(" ");
}

/**
 * @typedef {Object} Distribution
 * @property {Range} [words] - Number of words per sentence.
 * @property {Range} [sentences] - Number of words per paragraph.
 * @property {Range} [paragraphs] - Number of paragraphs.
 */

/**
 * Generates sample text (a.k.a. "Lorem ipsum dolor sit amet").
 *
 * @param {Element} container - Container to append content to.
 * @param {Distribution} [distribution] - Statistical distribution of the text to generate.
 */
function generateText(container, distribution) {
    const dist = {
        words: { min: 13, max: 21 },
        sentences: { min: 5, max: 8 },
        paragraphs: { min: 34, max: 55 },
        ...distribution
    };

    const count = randomCount(dist.paragraphs);
    for (let i = 0; i < count; i++) {
        const p = document.createElement("p");
        p.textContent = generateParagraph(dist.sentences, dist.words);
        container.append(p);
    }
}

export { generateText };
