/**
 * boxsharp: a responsive lightbox pop-up window with CSS3 and vanilla JavaScript
 * @author Levente Hunyadi
 * @version 0.1
 * @copyright 2025 Levente Hunyadi
 * @see https://hunyadi.info.hu/projects/boxsharp
 * @see https://github.com/hunyadi/boxsharp
**/

/**
 * @license
 * Copyright (c) 2025 Levente Hunyadi
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/**
 * Represents an item in the `srcset` attribute of an `<img>` element.
 */
class SourceSetItem {
    /** @type {string} */
    url;
    /** @type {number} */
    width;

    /**
     * @param {string} url - URL to an image.
     * @param {number} width - A numeric resolution in the `srcset` attribute syntax, e.g. `640w`.
     */
    constructor(url, width) {
        this.url = url;
        this.width = width;
    }

    /**
     * Allows this class to be used with `sort`.
     *
     * @param {SourceSetItem} op - The item to compare against.
     * @returns {number}
     */
    compare(op) {
        return this.width - op.width;
    }
}

/**
 * Source URL and media type pairs captured by the HTML `source` element.
 */
class BoxsharpVideoSource {
    /** @type {string} */
    src;
    /** @type {?string} */
    type;

    /**
     * @param {string} src
     * @param {?string} type
     */
    constructor(src, type) {
        this.src = src;
        this.type = type;
    }
}

/**
 * Captures properties associated with an item to display.
 */
class BoxsharpItem {
    /** @type {?string} - `src` attribute value for an image, or `poster` attribute value for a video. */
    image;
    /** @type {?string} - `srcset` attribute value for an image. */
    srcset;
    /** @type {BoxsharpVideoSource[]} - Source URL and media type pairs for a video. */
    video;
    /** @type {?string} - `src` attribute value for a frame. */
    frame;
    /** @type {?string} - Alternate text for the image or video. */
    alt;
    /** @type {?string} - HTML shown below the image or video as a figure caption. */
    caption;
    /** @type {?number} - Intrinsic width of the content in CSS pixels, `null` to auto-detect. */
    width;
    /** @type {?number} - Intrinsic height of the content in CSS pixels, `null` to auto-detect. */
    height;

    constructor() {
        this.video = [];
    }

    /**
     * Extracts the caption text from a HTML `<figure>` element.
     *
     * @param {HTMLElement} elem - Element used for locating the figure.
     * @returns {?string} - Caption text as raw HTML.
     */
    static #getCaption(elem) {
        /** @type {?string} */
        let caption = null;

        let figure = elem.querySelector("figure");  // element wraps `<figure>`
        if (!figure) {
            const parent = elem.parentElement;
            if (parent && parent.tagName == "FIGURE") {  // `<figure>` is the immediate parent
                figure = parent;
            }
        }

        if (figure) {
            const figcaption = figure.querySelector("figcaption");
            if (figcaption) {
                caption = figcaption.innerHTML;
            }
        }

        if (!caption) {
            caption = elem.title;
        }

        return caption;
    }

    /**
     * Scans a link, its parent and descendant elements to extract their relevant properties.
     *
     * @param {HTMLAnchorElement | BoxsharpLink} anchor - An HTML `a` or `boxsharp-link` element to scan.
     * @returns {BoxsharpItem}
     */
    static fromLink(anchor) {
        if (!(anchor instanceof HTMLAnchorElement || anchor instanceof BoxsharpLink)) {
            throw new Error("expected: either `a` or `boxsharp-link` element");
        }

        /** @type {?string} */
        let imageURL = null;
        /** @type {?string} */
        let srcset = null;
        /** @type {?string} */
        let videoURL = null;
        /** @type {?string} */
        let frameURL = null;
        /** @type {?string} */
        let alt = null;

        const thumbnail = anchor.querySelector("img");
        if (thumbnail) {
            imageURL = thumbnail.src;
            srcset = thumbnail.srcset;
            alt = thumbnail.alt;
        }

        if (anchor.dataset.srcset) {
            srcset = anchor.dataset.srcset;
        }

        if (!imageURL && srcset) {
            // choose smallest resolution available
            let refs = [];
            const regexp = /(\S+)\s+(\d+)[wx](?:,|$)/g;
            let match;
            while ((match = regexp.exec(srcset)) !== null) {
                refs.push(new SourceSetItem(match[1], parseInt(match[2])));
            }
            refs.sort((a, b) => a.compare(b));
            if (refs) {
                imageURL = refs[0].url;
            }
        }

        const href = anchor.getAttribute("href");
        if (href) {
            const url = URL.parse(href, document.URL);
            if (url) {
                if (/\.(jpe?g|png|gif|webp|svg|bmp|tiff|avif)$/i.test(url.pathname)) {
                    if (!imageURL) {
                        imageURL = url.toString();
                    }
                } else if (/\.(mov|mpe?g|mp4|ogg|webm)$/i.test(url.pathname)) {
                    videoURL = url.toString();
                } else {
                    frameURL = url.toString();
                }
            }
        }

        const item = new BoxsharpItem();
        item.image = imageURL;
        item.srcset = srcset;
        if (videoURL) {
            item.video.push(new BoxsharpVideoSource(videoURL, null));
        }
        item.frame = frameURL;
        item.alt = alt;
        item.caption = this.#getCaption(anchor);
        return item;
    }

    /**
     * Scans a HTML `video` element to extract its relevant properties.
     *
     * @param {HTMLVideoElement | BoxsharpLink} video
     * @returns {BoxsharpItem}
     */
    static fromVideo(video) {
        /** @type {?HTMLVideoElement} */
        let elem = null;
        if (video instanceof HTMLVideoElement) {
            elem = video;
        } else {
            elem = video.querySelector("video");
        }
        if (!elem) {
            throw new Error("expected: a wrapped `video` element");
        }

        /** @type {BoxsharpVideoSource[]} */
        const sources = [];
        elem.querySelectorAll("source").forEach(source => {
            sources.push(new BoxsharpVideoSource(source.src, source.type));
        });
        if (!sources.length && elem.src) {
            sources.push(new BoxsharpVideoSource(elem.src, null));
        }

        const item = new BoxsharpItem();
        item.image = elem.poster;
        item.video = sources;
        item.caption = this.#getCaption(elem);
        return item;
    }
}

/**
 * Tests whether an element is visible.
 *
 * @param {HTMLElement} elem - The element whose visibility to check.
 * @returns {boolean}
 */
function is_visible(elem) {
    return !elem.classList.contains("hidden");
}

/**
 * @param {string} tag - HTML element to create.
 * @param {object} [props={}] - HTML element attributes.
 * @param {HTMLElement[]} children - Direct descendants of the HTML element to create.
 * @returns {HTMLElement}
 */
function HTML(tag, props = {}, ...children) {
    const element = document.createElement(tag);
    Object.assign(element, props);
    element.append(...children);
    return element;
};

class BoxsharpOptions {
    /** @type {boolean} - Whether to show the *previous* navigation button. */
    prev;
    /** @type {boolean} - Whether to show the *next* navigation button. */
    next;
}

/**
 * Lightbox pop-up window that adaptively chooses the best-fit image.
 *
 * Emits the following events as instances of `CustomEvent`:
 * - `closed` signals that the pop-up window has closed.
 * - `navigate` signals that the user has activated one of the navigation controls, e.g. clicked the *next* button.
 */
class BoxsharpDialog extends HTMLElement {
    /** @type {HTMLElement} */
    #container;
    /** @type {HTMLImageElement} */
    #image;
    /** @type {HTMLVideoElement} */
    #video;
    /** @type {HTMLIFrameElement} */
    #iframe;
    /** @type {HTMLElement} */
    #figcaption;
    /** @type {HTMLElement} */
    #prev;
    /** @type {HTMLElement} */
    #next;
    /** @type {(ev: KeyboardEvent) => void} */
    #keydownCallback;

    constructor() {
        super();
    }

    connectedCallback() {
        const shadow = this.attachShadow({ mode: "open" });

        const cssURL = new URL('./boxsharp.css', import.meta.url);
        shadow.append(
            HTML("link", { rel: "stylesheet", "href": cssURL }),
            this.#container = HTML("div", { className: "dialog" },
                HTML("figure", {},
                    this.#image = /** @type {HTMLImageElement} */ (HTML("img")),
                    this.#video = /** @type {HTMLVideoElement} */ (HTML("video", { controls: true })),
                    this.#iframe = /** @type {HTMLIFrameElement} */ (HTML("iframe", { allow: "fullscreen" })),
                    HTML("nav", { class: "pagination" },
                        this.#prev = HTML("a", { href: "#", className: "prev", ariaLabel: "←" }),
                        this.#next = HTML("a", { href: "#", className: "next", ariaLabel: "→" }),
                    ),
                    this.#figcaption = HTML("figcaption")
                )
            )
        );

        this.reset();
        this.#container.addEventListener("click", (ev) => {
            if (ev.target === this.#container) {
                this.close();
            }
        });
        this.#prev.addEventListener("click", (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            this.prev();
        });
        this.#next.addEventListener("click", (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            this.next();
        });

        this.#keydownCallback = (ev) => {
            if (!is_visible(this.#container)) {
                return;
            }

            let cancel = true;
            switch (ev.key) {
                case "Escape":
                    if (is_visible(this.#container)) {
                        this.close();
                    }
                    break;
                case "ArrowLeft":
                    if (is_visible(this.#prev)) {
                        this.prev();
                    }
                    break;
                case "ArrowRight":
                    if (is_visible(this.#next)) {
                        this.next();
                    }
                    break;
                case "Home":
                    if (is_visible(this.#prev)) {
                        this.first();
                    }
                    break;
                case "End":
                    if (is_visible(this.#next)) {
                        this.last();
                    }
                    break;
                default:
                    cancel = false;
                    break;
            }
            if (cancel) {
                ev.preventDefault();
            }
        };
        document.addEventListener("keydown", this.#keydownCallback);
    }

    disconnectedCallback() {
        document.removeEventListener("keydown", this.#keydownCallback);
    }

    /**
     * Hides the lightbox pop-up window.
     *
     * @returns {void}
     */
    reset() {
        const container = this.#container;
        container.classList.add("hidden");
        container.classList.remove("opening");
        container.classList.remove("visible");

        const image = this.#image;
        image.classList.add("hidden");
        image.removeAttribute("src");
        image.removeAttribute("srcset");
        image.removeAttribute("sizes");
        image.removeAttribute("alt");

        const video = this.#video;
        video.classList.add("hidden");
        video.pause();
        video.currentTime = 0;
        video.textContent = "";
        video.removeAttribute("src");
        video.removeAttribute("poster");
        video.load();

        const iframe = this.#iframe;
        iframe.classList.add("hidden");
        iframe.removeAttribute("width");
        iframe.removeAttribute("height");
        iframe.removeAttribute("src");

        const caption = this.#figcaption;
        caption.textContent = "";
        caption.removeAttribute("style");
    }

    /**
     * Dispatches a `CustomEvent` signaling a navigation.
     *
     * @param {string} action - The action name to be passed in the `detail` field of `CustomEvent`.
     * @returns {void}
     */
    #navigate(action) {
        this.dispatchEvent(new CustomEvent("navigate", { detail: { action } }));
    }

    /**
     * Signals navigation to the first item in a gallery.
     *
     * @returns {void}
     */
    first() {
        this.#navigate("first");
    }

    /**
     * Signals navigation to the previous item in a gallery.
     *
     * @returns {void}
     */
    prev() {
        this.#navigate("prev");
    }

    /**
     * Signals navigation to the next item in a gallery.
     *
     * @returns {void}
     */
    next() {
        this.#navigate("next");
    }

    /**
     * Signals navigation to the last item in a gallery.
     *
     * @returns {void}
     */
    last() {
        this.#navigate("last");
    }

    /**
     * Opens the lightbox pop-up window.
     *
     * @param {BoxsharpItem} item - Captures properties associated with an item to display.
     * @param {BoxsharpOptions} options - Configures the appearance of the pop-up window.
     * @returns {void}
     */
    open(item, options) {
        const { prev, next } = options;
        this.#prev.classList.toggle("hidden", !prev);
        this.#next.classList.toggle("hidden", !next);

        this.reset();

        const { image, srcset, video, frame, width, height } = item;
        if (video.length) {
            const elem = this.#video;
            const sources = video.map(source => {
                /** @type{Object<string, string>} */
                let attrs = { src: source.src };
                if (source.type) {
                    attrs.type = source.type;
                }
                return HTML("source", attrs);
            });
            elem.append(...sources);
            elem.addEventListener("loadedmetadata", () => {
                elem.width = elem.videoWidth;
                elem.height = elem.videoHeight;
                this.#figcaption.style.width = `${elem.videoWidth}px`;
                elem.classList.remove("hidden");
                this.#show(item);
            }, { once: true });
        } else if (frame) {
            const elem = this.#iframe;
            elem.src = frame;
            if (width) {
                elem.width = width + "";
            }
            if (height) {
                elem.height = height + "";
            }
            elem.addEventListener("load", () => {
                elem.classList.remove("hidden");
                this.#show(item);
            }, { once: true });
        } else if (image || srcset) {
            const preloader = new Image();
            preloader.addEventListener("load", () => {
                this.#image.classList.remove("hidden");
                this.#show(item);
            }, { once: true });
            if (srcset) {
                preloader.srcset = srcset;
                preloader.sizes = "100vw";
            } else if (image) {
                preloader.src = image;
            }
        } else {
            this.#show(item);
        }
    }

    /**
     * Displays an item in the lightbox pop-up window.
     *
     * @param {BoxsharpItem} item - Captures properties associated with an item to display.
     * @returns {void}
     */
    #show(item) {
        const { image, srcset, alt, caption } = item;

        if (image || srcset) {
            const elem = this.#image;
            if (srcset) {
                elem.srcset = srcset;
                elem.sizes = "100vw";
            } else if (image) {
                elem.src = image;
            }

            if (alt) {
                elem.alt = alt;
            }
        }

        if (caption) {
            this.#figcaption.innerHTML = caption;
        }

        const container = this.#container;
        container.classList.remove("hidden");
        container.classList.add("opening");
        void container.offsetWidth;  // force page rendering

        // trigger transition to full size
        requestAnimationFrame(() => {
            container.classList.add("visible");
            container.classList.remove("opening");
        });
    }

    /**
     * Closes the lightbox pop-up window.
     *
     * @returns {void}
     */
    close() {
        this.reset();
        this.dispatchEvent(new CustomEvent('closed'));
    }

    /**
     * Returns a singleton instance of the lightbox pop-up window.
     *
     * @returns {BoxsharpDialog}
     */
    static singleton() {
        /** @type {?BoxsharpDialog} */
        let instance = document.body.querySelector("boxsharp-dialog");
        if (!instance) {
            document.body.append(instance = /** @type {BoxsharpDialog} */ (document.createElement("boxsharp-dialog")));
        }
        return instance;
    }
}

class BoxsharpCollection {
    /** @type {BoxsharpDialog} */
    #lightbox;
    /** @type {BoxsharpItem[]} */
    #items;
    /** @type {number} */
    #index;

    /**
     * Creates a navigable collection of items to be shown in a pop-up window.
     *
     * @param {BoxsharpDialog} lightbox - A pop-up window instance.
     * @param {BoxsharpItem[]} items - An array items to show.
     */
    constructor(lightbox, items) {
        if (!items || !items.length) {
            throw new Error("expected: a non-empty array of elements");
        }

        this.#lightbox = lightbox;
        this.#items = items;
        this.#index = 0;
    }

    /**
     * Opens the pop-up window displaying an item.
     *
     * @param {number} [index] - The index of the item to show.
     * @returns {void}
     */
    open(index) {
        const navigate_fn = (/** @type {CustomEvent} */ event) => { this.#navigate(event.detail.action); };
        const lightbox = this.#lightbox;
        lightbox.addEventListener("navigate", navigate_fn);
        lightbox.addEventListener("closed", () => {
            lightbox.removeEventListener("navigate", navigate_fn);
        }, { once: true });

        this.#show(index || 0);
    }

    /**
     * Displays an item.
     *
     * @param {number} index - The index of the item to show.
     * @returns {void}
     */
    #show(index) {
        this.#index = index;
        this.#lightbox.reset();
        const options = new BoxsharpOptions();
        options.prev = index > 0;
        options.next = index < this.#items.length - 1;
        this.#lightbox.open(this.#items[this.#index], options);
    }

    /**
     * Navigates to another item in the gallery.
     *
     * @param {string} action - The action to take.
     * @returns {void}
     */
    #navigate(action) {
        const last = this.#items.length - 1;
        /** @type {?number} */
        let target = null;
        switch (action) {
            case "first":
                target = 0;
                break;
            case "prev":
                target = Math.max(0, this.#index - 1);
                break;
            case "next":
                target = Math.min(last, this.#index + 1);
                break;
            case "last":
                target = last;
                break;
        }
        if (target !== null) {
            this.#show(target);
        }
    }

    /**
     * Adds listeners to click events for eligible anchors to open the pop-up window.
     *
     * The function scans the document for occurrences of `<a>` elements with a `rel` attribute of either `NAME` or `NAME-*` where `NAME` is a user-defined
     * name, and `*` is a sequence of one or more characters.
     *
     * Anchors with a `rel` of `NAME` open a pop-up window when clicked, showing the resource referenced in `href`.
     * Anchors with a `rel` of `NAME-*` form a collection (gallery) in which the user is able to navigate between the items without closing the pop-up window.
     *
     * @param {string} [name] - The name to look for; defaults to `boxsharp`.
     * @returns {void}
     */
    static scan(name) {
        if (!name) {
            name = "boxsharp";
        }

        const lightbox = BoxsharpDialog.singleton();

        document.querySelectorAll(`a[rel=${CSS.escape(name)}]`).forEach((/** @type {HTMLAnchorElement} */ anchor) => {
            const gallery = new BoxsharpCollection(lightbox, [BoxsharpItem.fromLink(anchor)]);
            anchor.addEventListener("click", (ev) => {
                ev.preventDefault();
                gallery.open();
            });
        });

        /** @type {Object.<string, HTMLAnchorElement[]>} */
        const dictionary = {};
        document.querySelectorAll(`a[rel^=${CSS.escape(name)}-]`).forEach((/** @type {HTMLAnchorElement} */ anchor) => {
            const rel = anchor.getAttribute('rel');
            if (rel) {
                if (!dictionary[rel]) {
                    dictionary[rel] = [];
                }
                dictionary[rel].push(anchor);
            }
        });

        Object.keys(dictionary).forEach(function (key) {
            const anchors = dictionary[key];
            const gallery = new BoxsharpCollection(lightbox, anchors.map(anchor => BoxsharpItem.fromLink(anchor)));
            anchors.forEach((anchor, index) => {
                anchor.addEventListener("click", (ev) => {
                    ev.preventDefault();
                    gallery.open(index);
                });
            });
        });
    }
}

class BoxsharpLink extends HTMLElement {
    /** @type {BoxsharpCollection} */
    #gallery;

    constructor() {
        super();
    }

    connectedCallback() {
        /** @type {BoxsharpItem} */
        let item;
        const video = /** @type {?HTMLVideoElement} */ (this.querySelector("video"));
        if (video) {
            item = BoxsharpItem.fromVideo(video);
            video.addEventListener("click", (ev) => {
                ev.preventDefault();
            });
        } else {
            item = BoxsharpItem.fromLink(this);
        }

        const width = this.getAttribute("width");
        if (width) {
            item.width = parseInt(width);
        }
        const height = this.getAttribute("height");
        if (height) {
            item.height = parseInt(height);
        }

        const lightbox = BoxsharpDialog.singleton();
        this.#gallery = new BoxsharpCollection(lightbox, [item]);
        this.addEventListener("click", () => {
            this.#gallery.open();
        });
    }
}

customElements.define("boxsharp-dialog", BoxsharpDialog);
customElements.define("boxsharp-link", BoxsharpLink);

export { BoxsharpDialog, BoxsharpCollection, BoxsharpItem };
