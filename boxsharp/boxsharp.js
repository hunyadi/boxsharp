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
 * Creates an HTML `<link>` element pointing to a stylesheet.
 *
 * A minifier may substitute calls to this function with an inline instantiation of a `<style>` element from a literal string.
 *
 * @see {@link createStyle}
 * @param {string} path - Path to a stylesheet file to import, relative to the JavaScript file location.
 * @returns {HTMLElement}
 */
function createStylesheet(path) {
    const elem = document.createElement("link");
    elem.rel = "stylesheet";
    elem.href = new URL(path, import.meta.url).toString();
    return elem;
}

/**
 * Creates an HTML `<style>` element.
 *
 * A minifier may call this function with a CSS literal string as an input argument.
 *
 * @param {string} css - CSS stylesheet string.
 * @returns {HTMLElement}
 */
function createStyle(css) {
    const elem = document.createElement("style");
    elem.textContent = css;
    return elem;
}

/**
 * Implements drag to pan on a large image.
 */
class BoxsharpDraggable extends HTMLElement {
    static observedAttributes = ["src"];

    /** @type {HTMLDivElement} - The container that acts as the viewport. */
    #container;
    /** @type {HTMLImageElement} - The image to pan. */
    #draggable;

    /** @type {number} - Natural image width in CSS pixels. */
    #width = 0;
    /** @type {number} - Natural image height in CSS pixels. */
    #height = 0;

    /** @type {boolean} - True if a drag operation is in progress. */
    #isDragging = false;
    /** @type {number} - Horizontal coordinate for image position in viewport. */
    #posX = 0;
    /** @type {number} - Vertical coordinate for image position in viewport. */
    #posY = 0;
    /** @type {number} - Horizontal coordinate in browser window for starting mouse/gesture event. */
    #startX = 0;
    /** @type {number} - Vertical coordinate in browser window for starting mouse/gesture event. */
    #startY = 0;

    /** @type {(ev: MouseEvent) => void} */
    #mouseup;
    /** @type {(ev: MouseEvent) => void} */
    #mousemove;
    /** @type {(ev: TouchEvent) => void} */
    #touchend;
    /** @type {(ev: TouchEvent) => void} */
    #touchmove;

    connectedCallback() {
        const shadow = this.attachShadow({ mode: "open" });

        const style = createStyle(`
:host {
display: inline-block;
}
div {
position: relative;
overflow: hidden;
width: 100%;
height: 100%;
cursor: grab;
touch-action: none;
}
div:active {
cursor: grabbing;
}
img {
position: absolute;
user-select: none;
-webkit-user-drag: none;
}`);
        const container = this.#container = document.createElement("div");
        const draggable = this.#draggable = document.createElement("img");
        draggable.draggable = false;
        container.append(draggable);
        shadow.append(style, container);

        this.#update();

        // mouse movement event handlers
        container.addEventListener("mousedown", (ev) => {
            this.#isDragging = true;
            this.#startX = ev.pageX;
            this.#startY = ev.pageY;
        });

        this.#mouseup = (ev) => {
            if (this.#isDragging) {
                ev.preventDefault();
                this.#isDragging = false;
                this.#reposition(ev.pageX, ev.pageY);
            }
        };
        document.addEventListener("mouseup", this.#mouseup);

        this.#mousemove = (ev) => {
            if (this.#isDragging) {
                ev.preventDefault();
                this.#move(ev.pageX, ev.pageY);
            }
        };
        document.addEventListener("mousemove", this.#mousemove);

        // gesture event handlers
        container.addEventListener("touchstart", (ev) => {
            const touches = ev.touches;
            if (touches.length === 1) {
                this.#isDragging = true;
                const touch = touches[0];
                this.#startX = touch.pageX;
                this.#startY = touch.pageY;
            }
        });

        this.#touchend = (ev) => {
            if (this.#isDragging) {
                ev.preventDefault();
                this.#isDragging = false;
                const touches = ev.changedTouches;
                if (touches.length === 1) {
                    const touch = touches[0];
                    this.#reposition(touch.pageX, touch.pageY);
                }
            }
        };
        document.addEventListener("touchend", this.#touchend);

        this.#touchmove = (ev) => {
            const touches = ev.touches;
            if (this.#isDragging && touches.length === 1) {
                ev.preventDefault();
                const touch = touches[0];
                this.#move(touch.pageX, touch.pageY);
            }
        };
        document.addEventListener("touchmove", this.#touchmove);
    }

    connectedMoveCallback() {
        // nothing to do
    }

    disconnectedCallback() {
        // reset intrinsic element size
        this.style.width = "0";
        this.style.height = "0";

        document.removeEventListener("mouseup", this.#mouseup);
        document.removeEventListener("mousemove", this.#mousemove);
        document.removeEventListener("touchend", this.#touchend);
        document.removeEventListener("touchmove", this.#touchmove);
    }

    /**
     * @param {string} name
     * @param {?string} oldValue
     * @param {?string} newValue
     * @returns {void}
     */
    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case "src":
                if (oldValue !== newValue) {
                    if (newValue) {
                        const preloader = new Image();
                        preloader.addEventListener("load", () => {
                            this.#resize(preloader.naturalWidth, preloader.naturalHeight);
                        }, { once: true });
                        preloader.src = newValue;
                    } else {
                        this.#resize(0, 0);
                    }
                }
                break;
        }
    }

    /**
     * Fired on moving the mouse or performing a gesture.
     *
     * @param {number} absX - Horizontal coordinate for mouse or touch position, in event coordinates.
     * @param {number} absY - Vertical coordinate for mouse or touch position, in event coordinates.
     * @returns {{ x: number, y: number }}
     */
    #move(absX, absY) {
        const deltaX = absX - this.#startX;
        const deltaY = absY - this.#startY;

        let newX = this.#posX + deltaX;
        let newY = this.#posY + deltaY;

        const draggable = this.#draggable;
        const parentRect = this.#container.getBoundingClientRect();
        const childRect = draggable.getBoundingClientRect();

        const maxOffsetX = 0;
        const maxOffsetY = 0;
        const minOffsetX = parentRect.width - childRect.width;
        const minOffsetY = parentRect.height - childRect.height;

        newX = Math.min(maxOffsetX, Math.max(minOffsetX, newX));
        newY = Math.min(maxOffsetY, Math.max(minOffsetY, newY));

        draggable.style.transform = `translate(${newX}px, ${newY}px)`;

        return { x: newX, y: newY };
    }

    /**
     * Fired on lifting the mouse button or finishing a gesture.
     *
     * @param {number} absX - Horizontal coordinate for mouse or touch position, in event coordinates.
     * @param {number} absY - Vertical coordinate for mouse or touch position, in event coordinates.
     * @returns {void}
     */
    #reposition(absX, absY) {
        const { x, y } = this.#move(absX, absY);
        this.#posX = x;
        this.#posY = y;
    }

    /**
     * Changes the size of the image shown in the drag-to-pan viewport.
     *
     * @param {number} width
     * @param {number} height
     * @returns {void}
     */
    #resize(width, height) {
        // set intrinsic element size based on encapsulated image
        this.#width = width;
        this.#height = height;

        if (this.isConnected) {
            this.#update();
        }
    }

    /**
     * Updates the drag-to-pan viewport.
     *
     * @returns {void}
     */
    #update() {
        this.#isDragging = false;
        this.#startX = 0;
        this.#startY = 0;
        this.#posX = 0;
        this.#posY = 0;

        const draggable = this.#draggable;
        draggable.src = this.getAttribute("src") ?? "";
        this.style.width = draggable.style.width = `${this.#width}px`;
        this.style.height = draggable.style.height = `${this.#height}px`;
        draggable.style.transform = "none";
    }
}

/**
 * Serializes an object to and hydrates an object from a plain JSON string such that it can be persisted as `history.state`.
 */
class Serializable {
    /** @type {Object<string, { new(): any }>} - Maps class names to class constructors. */
    static #registry = {};

    /**
     * Registers the class for serialization and de-serialization.
     *
     * @param {{ new(): any }} cls - A class constructor.
     * @returns {void}
     */
    static register(cls) {
        Serializable.#registry[cls.name] = cls;
    }

    /**
     * Serializes the object into a JSON string.
     *
     * @returns {string} - JSON string.
     */
    toJSON() {
        return JSON.stringify(this.#toJsonObject());
    }

    /**
     * Reconstructs an object from a JSON string.
     *
     * @param {string} str - JSON String
     * @returns {any}
     */
    static fromJSON(str) {
        return Serializable.#fromJsonObject(JSON.parse(str));
    }

    /**
     * Serializes the object into a plain JSON object.
     *
     * @returns {any}
     */
    #toJsonObject() {
        /**
         * @param {any} value
         * @returns {any}
         */
        function asJSON(value) {
            return value instanceof Serializable ? value.#toJsonObject() : value;
        }

        const data = {};
        for (const [key, value] of Object.entries(this)) {
            if (Array.isArray(value)) {
                data[key] = value.map(item => asJSON(item));
            } else {
                data[key] = asJSON(value);
            }
        }
        data.__class = this.constructor.name;
        return data;
    }

    /**
     * Reconstructs a rich object from a plain JSON object.
     *
     * @param {any} json - Plain JSON object.
     * @returns {any} - Reconstructed rich object.
     */
    static #fromJsonObject(json) {
        /**
         * @param {any} obj
         * @returns {any}
         */
        function asValue(obj) {
            return obj && typeof obj === "object" && "__class" in obj ? Serializable.#fromJsonObject(obj) : obj;
        }

        const cls = Serializable.#registry[json.__class];
        const instance = new cls();  // empty instance
        for (const [key, value] of Object.entries(json)) {
            if (key === "__class") {
                continue;
            }

            if (Array.isArray(value)) {
                instance[key] = value.map(item => asValue(item));
            } else {
                instance[key] = asValue(value);
            }
        }

        return instance;
    }
}

/**
 * Represents a single item in the `srcset` attribute of an `<img>` element.
 */
class ImageSourceItem extends Serializable {
    static {
        Serializable.register(this);
    }

    /** @type {string} */
    url;
    /** @type {number} */
    width;

    /**
     * @param {string} url - URL to an image.
     * @param {number} width - A numeric resolution in the `srcset` attribute syntax, e.g. `640w`.
     * @returns {ImageSourceItem}
     */
    static create(url, width) {
        const self = new ImageSourceItem();
        self.url = url;
        self.width = width;
        return self;
    }

    /**
     * Allows this class to be used with `sort`.
     *
     * @param {ImageSourceItem} op - The item to compare against.
     * @returns {number}
     */
    compare(op) {
        return this.width - op.width;
    }
}

/**
 * Represents a parsed `srcset` attribute acquired from an `<img>` element.
 */
class ImageSourceSet extends Serializable {
    static {
        Serializable.register(this);
    }

    /** @type {ImageSourceItem[]} */
    items;

    /**
     * @returns {boolean} - True if the source set is empty.
     */
    get empty() {
        return this.items.length === 0;
    }

    /**
     * Lowest resolution image available in the set.
     *
     * @returns {string} URL to lowest resolution image.
     */
    lowest() {
        return this.items[this.items.length - 1].url;
    }

    /**
     * Highest resolution image available in the set.
     *
     * @returns {string} URL to highest resolution image.
     */
    highest() {
        return this.items[0].url;
    }

    /**
     * Returns a source set specification that allows the browser to select the smallest image size that fills the browser window.
     *
     * Ensures smallest image size is selected that fills the browser window without scaling the image beyond its natural dimensions.
     *
     * @returns {{srcset: string, sizes: string}} - Values assignable to the attributes `srcset` and `sizes`.
     */
    toObject() {
        const items = this.items;
        const width = items[0].width;
        return {
            srcset: items.map(item => `${item.url} ${item.width}w`).join(", "),
            sizes: `(max-width: ${width}px) 100vw, ${width}px`
        };
    }

    /**
     * Create a source set from a string.
     *
     * @param {string} srcset - `srcset` attribute value.
     * @returns {?ImageSourceSet}
     */
    static parse(srcset) {
        /** @type {ImageSourceItem[]} */
        let items = [];
        const regexp = /(\S+)\s+(\d+)w(?:,|$)/g;
        let match;
        while ((match = regexp.exec(srcset)) !== null) {
            items.push(ImageSourceItem.create(match[1], parseInt(match[2], 10)));
        }

        // sort descending, largest width first
        items.sort((a, b) => b.compare(a));

        if (items.length) {
            const obj = new ImageSourceSet();
            obj.items = items;
            return obj;
        } else {
            return null;
        }
    }

    /**
     * Extracts and parses the value of the `srcset` attribute.
     *
     * @param {Element} elem - The HTML element to inspect.
     * @returns {?ImageSourceSet} - The extracted source set, or `null`.
     */
    static extract(elem) {
        const value = elem.getAttribute("srcset");
        if (value) {
            const srcset = ImageSourceSet.parse(value);
            if (srcset) {
                return srcset;
            }
        }
        return null;
    }
}

class ImageSource extends Serializable {
    static {
        Serializable.register(this);
    }

    /** @type {ImageSourceSet} - Source URLs acquired from the `srcset` attribute value of an image. */
    srcset = new ImageSourceSet();
    /** @type {string | undefined} - MIME media type with optional codecs parameter. */
    type;
    /** @type {string | undefined} - Media query for the resource's intended media. */
    media;

    /**
     * @param {ImageSourceSet} srcset
     * @param {string} [type]
     * @param {string} [media]
     * @returns {ImageSource}
     */
    static create(srcset, type, media) {
        const self = new ImageSource();
        self.srcset = srcset;
        self.type = type;
        self.media = media;
        return self;
    }
}


/**
 * Source URL and media type pairs captured by the HTML `source` element.
 */
class VideoSource extends Serializable {
    static {
        Serializable.register(this);
    }

    /** @type {string} - Media source URL. */
    src;
    /** @type {string | undefined} - MIME media type with optional codecs parameter. */
    type;
    /** @type {string | undefined} - Media query for the resource's intended media. */
    media;

    /**
     * @param {string} src
     * @param {string} [type]
     * @returns {VideoSource}
     */
    static create(src, type) {
        const self = new VideoSource();
        self.src = src;
        self.type = type;
        return self;
    }
}

/**
 * Captures properties associated with an item to display.
 */
class BoxsharpItem extends Serializable {
    static {
        Serializable.register(this);
    }

    /** @type {string | undefined} - `src` attribute value for an image, or `poster` attribute value for a video. */
    image;
    /** @type {ImageSource[]} - Source URLs acquired from the `srcset` attribute value of an image. */
    source = [];
    /** @type {VideoSource[]} - Source URL and media type pairs for a video. */
    video = [];
    /** @type {string | undefined} - `src` attribute value for a frame. */
    frame;
    /** @type {string | undefined} - Alternate text for the image or video. */
    alt;
    /** @type {string | undefined} - HTML shown below the image or video as a figure caption. */
    caption;
    /** @type {number | undefined} - Intrinsic width of the content in CSS pixels, `undefined` to auto-detect. */
    width;
    /** @type {number | undefined} - Intrinsic height of the content in CSS pixels, `undefined` to auto-detect. */
    height;

    /**
     * Extracts the caption text from an encapsulating or encapsulated HTML `<figure>` element, or the element itself.
     *
     * @param {HTMLElement} elem - Element used for locating the `<figure>` element.
     * @returns {string | undefined} - Caption text as raw HTML.
     */
    static #getCaption(elem) {
        /** @type {string | undefined} */
        let caption;

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

        /** @type {string | undefined} */
        let imageURL;
        /** @type {?ImageSourceSet} */
        let srcset = null;
        /** @type {string | undefined} */
        let videoURL;
        /** @type {string | undefined} */
        let frameURL;
        /** @type {string | undefined} */
        let alt;

        const thumbnail = anchor.querySelector("img");
        if (thumbnail) {
            imageURL = thumbnail.src;
            srcset = ImageSourceSet.parse(thumbnail.srcset);
            alt = thumbnail.alt;
        }

        if (anchor.dataset.srcset) {
            srcset = ImageSourceSet.parse(anchor.dataset.srcset);
        }

        if (!imageURL && srcset) {
            imageURL = srcset.lowest();
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
        if (srcset) {
            item.source.push(ImageSource.create(srcset));
        }
        if (videoURL) {
            item.video.push(VideoSource.create(videoURL));
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

        /** @type {VideoSource[]} */
        const sources = [];
        elem.querySelectorAll("source").forEach(source => {
            sources.push(VideoSource.create(source.src, source.type));
        });
        if (!sources.length && elem.src) {
            sources.push(VideoSource.create(elem.src));
        }

        const item = new BoxsharpItem();
        item.image = elem.poster;
        item.video = sources;
        item.caption = this.#getCaption(elem);
        return item;
    }
}

/**
 * Finds the image source whose media query currently matches the document.
 *
 * @param {ImageSource[]} sources
 * @returns {ImageSource | null}
 */
function matchMedia(sources) {
    for (const source of sources) {
        const media = source.media;
        if (media) {
            const query = window.matchMedia(media);
            if (query.matches) {
                return source;
            }
        } else {
            return source;
        }
    }
    return null;
}

/**
 * Tests whether an element is visible.
 *
 * @param {HTMLElement} elem - The element whose visibility to check.
 * @returns {boolean}
 */
function isVisible(elem) {
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

class BoxsharpDialogOptions {
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
    #backdrop;
    /** @type {HTMLElement} */
    #progress;
    /** @type {HTMLElement} */
    #picture;
    /** @type {HTMLImageElement} */
    #image;
    /** @type {HTMLVideoElement} */
    #video;
    /** @type {HTMLIFrameElement} */
    #iframe;
    /** @type {HTMLElement} */
    #unavailable;
    /** @type {HTMLElement} */
    #figure;
    /** @type {HTMLElement} */
    #figcaption;
    /** @type {HTMLElement} */
    #prevNav;
    /** @type {HTMLElement} */
    #nextNav;
    /** @type {(ev: KeyboardEvent) => void} */
    #keydownCallback;
    /** @type {BoxsharpDraggable} */
    #draggable;
    /** @type {HTMLElement} */
    #expander;
    /** @type {ResizeObserver} */
    #sizeObserver;
    /** @type {(ev: Event) => void} */
    #resizeCallback;

    connectedCallback() {
        const shadow = this.attachShadow({ mode: "open" });

        shadow.append(
            createStylesheet("boxsharp.css"),
            this.#backdrop = HTML("div", { className: "backdrop" },
                this.#figure = HTML("figure", {},
                    this.#draggable = /** @type {BoxsharpDraggable} */ (HTML("boxsharp-draggable")),
                    this.#picture = /** @type {HTMLElement} */ (HTML("picture", {},
                        this.#image = /** @type {HTMLImageElement} */ (HTML("img")),
                    )),
                    this.#video = /** @type {HTMLVideoElement} */ (HTML("video", { controls: true })),
                    this.#iframe = /** @type {HTMLIFrameElement} */ (HTML("iframe", { allow: "fullscreen" })),
                    this.#unavailable = HTML("div", { className: "unavailable", textContent: "🖼️" }),
                    HTML("nav", { class: "pagination" },
                        this.#prevNav = HTML("a", { href: "#", className: "prev", ariaLabel: "←" }),
                        this.#nextNav = HTML("a", { href: "#", className: "next", ariaLabel: "→" }),
                    ),
                    this.#expander = HTML("div", { className: "expander" }),
                    this.#figcaption = HTML("figcaption"),
                ),
                this.#progress = HTML("div", { className: "progress" }),
            )
        );

        this.#sizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const width = entry.contentBoxSize[0].inlineSize;
                this.#figcaption.style.width = `${width}px`;
            }
            this.#layout();
        });

        this.reset();
        this.#backdrop.addEventListener("click", (ev) => {
            if (ev.target === this.#backdrop && !isVisible(this.#draggable)) {
                this.close();
            }
        });

        const expander = this.#expander;
        const clickCallback = () => {
            if (this.#isExpandable()) {
                this.#expand(!this.#isExpanded());
            }
        };
        expander.addEventListener("click", clickCallback);
        const image = this.#image;
        image.addEventListener("dblclick", clickCallback);

        // navigation with buttons
        this.#prevNav.addEventListener("click", (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            this.#prev();
        });
        this.#nextNav.addEventListener("click", (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            this.#next();
        });

        // navigation with keys
        this.#keydownCallback = (ev) => {
            if (!isVisible(this.#backdrop)) {
                return;
            }

            let cancel = true;
            switch (ev.key) {
                case "Escape":
                    if (isVisible(this.#backdrop)) {
                        this.close();
                    }
                    break;
                case "ArrowLeft":
                    this.#prev();
                    break;
                case "ArrowRight":
                    this.#next();
                    break;
                case "Home":
                    this.#first();
                    break;
                case "End":
                    this.#last();
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

        // navigation with swipe actions
        const backdrop = this.#backdrop;
        let startX = 0;
        let endX = 0;
        backdrop.addEventListener("touchstart", (ev) => {
            startX = ev.touches[0].pageX;
        });
        backdrop.addEventListener("touchend", (ev) => {
            const threshold = 50;  // minimum distance in CSS pixels to count as a swipe
            endX = ev.changedTouches[0].pageX;

            if (!this.#isExpanded()) {
                if (endX - startX > threshold) {  // swiped right
                    this.#prev();
                } else if (startX - endX > threshold) {  // swiped left
                    this.#next();
                }
            }
        });

        // respond to window size changes
        this.#resizeCallback = () => {
            this.#layout();
        };
        window.addEventListener("resize", this.#resizeCallback);

        // update whether expander icon is visible when container size changes
        let lastSrc;
        const imageObserver = new ResizeObserver(() => {
            if (this.#isExpanded()) {
                return;
            }

            if (image.currentSrc !== lastSrc) {
                lastSrc = image.currentSrc;
                expander.classList.toggle("hidden", !this.#isExpandable());
            }
        });
        imageObserver.observe(this.#figure);
    }

    connectedMoveCallback() {
        // nothing to do
    }

    disconnectedCallback() {
        document.removeEventListener("keydown", this.#keydownCallback);
        window.removeEventListener("resize", this.#resizeCallback);
    }

    /**
     * Determines whether the lightbox pop-up window is shown.
     *
     * @returns {boolean} True if the lightbox pop-up window is visible on the screen.
     */
    get visible() {
        return isVisible(this.#backdrop);
    }

    /**
     * Hides the lightbox pop-up window.
     *
     * @returns {void}
     */
    reset() {
        this.#sizeObserver.disconnect();

        const backdrop = this.#backdrop;
        backdrop.classList.add("hidden");
        backdrop.classList.remove("fade-in");

        this.#progress.classList.add("hidden");

        this.#figure.classList.remove("zoom-in");

        this.#expand(false);

        const removeAttributes = (/** @type {HTMLElement} */ elem, /** @type {string[]} */ attrs) => {
            attrs.forEach((attr) => { elem.removeAttribute(attr); });
        };

        const picture = this.#picture;
        picture.classList.add("hidden");
        const image = this.#image;
        image.remove();
        removeAttributes(image, ["src", "srcset", "sizes", "alt", "style"]);
        picture.textContent = "";  // remove all children
        picture.append(image);

        const draggable = this.#draggable;
        draggable.classList.add("hidden");
        draggable.removeAttribute("src");

        const video = this.#video;
        video.classList.add("hidden");
        video.pause();
        video.currentTime = 0;
        video.textContent = "";
        removeAttributes(video, ["src", "poster", "width", "height", "style"]);
        video.load();

        const iframe = this.#iframe;
        iframe.classList.add("hidden");
        removeAttributes(iframe, ["src", "width", "height"]);

        this.#unavailable.classList.add("hidden");

        const caption = this.#figcaption;
        caption.textContent = "";  // remove all children
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
    #first() {
        if (isVisible(this.#prevNav)) {
            this.#navigate("first");
        }
    }

    /**
     * Signals navigation to the previous item in a gallery.
     *
     * @returns {void}
     */
    #prev() {
        if (isVisible(this.#prevNav)) {
            this.#navigate("prev");
        }
    }

    /**
     * Signals navigation to the next item in a gallery.
     *
     * @returns {void}
     */
    #next() {
        if (isVisible(this.#nextNav)) {
            this.#navigate("next");
        }
    }

    /**
     * Signals navigation to the last item in a gallery.
     *
     * @returns {void}
     */
    #last() {
        if (isVisible(this.#nextNav)) {
            this.#navigate("last");
        }
    }

    /**
     * Opens the lightbox pop-up window.
     *
     * Loads resources to be shown in the lightbox pop-up window.
     *
     * @param {BoxsharpItem} item - Captures properties associated with an item to display.
     * @param {BoxsharpDialogOptions} options - Configures the appearance of the pop-up window.
     * @returns {void}
     */
    open(item, options) {
        const { prev, next } = options;
        this.#prevNav.classList.toggle("hidden", !prev);
        this.#nextNav.classList.toggle("hidden", !next);

        this.reset();

        const backdrop = this.#backdrop;
        backdrop.classList.add("fade-in");
        backdrop.classList.remove("hidden");
        this.#figure.classList.add("zoom-in");

        const showLoadingTimeout = setTimeout(() => {
            this.#progress.classList.remove("hidden");
        }, 500);

        const { image, source, video, frame, width, height } = item;
        if (video.length) {
            const videoElement = this.#video;
            const onVideoLoaded = () => {
                videoElement.removeEventListener("error", onVideoError);
                videoElement.width = videoElement.videoWidth;
                videoElement.height = videoElement.videoHeight;
                videoElement.classList.remove("hidden");
                this.#show(item, showLoadingTimeout);
            };
            const onVideoError = () => {
                videoElement.removeEventListener("loadedmetadata", onVideoLoaded);
                this.#unavailable.classList.remove("hidden");
                this.#show(item, showLoadingTimeout);
            };
            videoElement.addEventListener("loadedmetadata", onVideoLoaded, { once: true });
            videoElement.addEventListener("error", onVideoError, { once: true });

            if (video.length > 1) {
                const sources = video.map(source => {
                    return HTML("source", {
                        src: source.src,
                        ...(source.type && { type: source.type })
                    });
                });
                videoElement.append(...sources);
            } else {
                videoElement.src = video[0].src;
            }
            videoElement.load();
        } else if (frame) {
            const frameElement = this.#iframe;
            frameElement.src = frame;
            if (width) {
                frameElement.width = width + "";
            }
            if (height) {
                frameElement.height = height + "";
            }
            frameElement.addEventListener("load", () => {
                frameElement.classList.remove("hidden");
                this.#show(item, showLoadingTimeout);
            }, { once: true });
        } else if (image || source.length) {
            const preloader = new Image();
            preloader.addEventListener("load", () => {
                this.#picture.classList.remove("hidden");
                this.#show(item, showLoadingTimeout);
            }, { once: true });
            preloader.addEventListener("error", () => {
                this.#unavailable.classList.remove("hidden");
                this.#show(item, showLoadingTimeout);
            }, { once: true });

            const imageSource = matchMedia(source);
            if (imageSource) {
                Object.assign(preloader, imageSource.srcset.toObject());
            } else if (image) {
                preloader.src = image;
            }
        } else {
            this.#show(item, showLoadingTimeout);
        }
    }

    /**
     * Displays an item in the lightbox pop-up window.
     *
     * @param {BoxsharpItem} item - Captures properties associated with an item to display.
     * @param {number} showLoadingTimeout - A timeout handle created with `setTimeout`.
     * @returns {void}
     */
    #show(item, showLoadingTimeout) {
        const { image, source, alt, caption } = item;

        clearTimeout(showLoadingTimeout);
        this.#progress.classList.add("hidden");

        const pictureElement = this.#picture;
        const imageElement = this.#image;
        const videoElement = this.#video;
        if (image || source.length) {
            const sourceElements = source.map(imageSource => {
                return HTML("source", {
                    ...imageSource.srcset.toObject(),
                    ...(imageSource.type && { type: imageSource.type }),
                    ...(imageSource.media && { media: imageSource.media })
                });
            });
            pictureElement.append(...sourceElements);
            pictureElement.append(imageElement);

            if (image) {
                imageElement.src = image;
                for (const imageSource of source) {
                    if (!imageSource.type && !imageSource.media) {
                        Object.assign(imageElement, imageSource.srcset.toObject());
                    }
                }
            }

            if (alt) {
                imageElement.alt = alt;
            }
        }

        if (caption) {
            this.#figcaption.innerHTML = caption;
        }

        if (isVisible(pictureElement)) {
            this.#sizeObserver.observe(imageElement);
        }
        if (isVisible(videoElement)) {
            this.#sizeObserver.observe(videoElement);
        }

        // trigger transition to full size
        requestAnimationFrame(() => {
            this.#figure.classList.remove("zoom-in");
        });
    }

    /**
     * Update the state of the image magnifier.
     *
     * @param {boolean} isExpanded - The new expanded state.
     */
    #expand(isExpanded) {
        const picture = this.#picture;
        const draggable = this.#draggable;
        const expander = this.#expander;
        const observer = this.#sizeObserver;

        expander.classList.toggle("expanded", isExpanded);

        if (isExpanded) {
            observer.disconnect();

            expander.classList.remove("hidden");
            picture.classList.add("hidden");
            const srcset = ImageSourceSet.parse(this.#image.srcset);
            if (srcset && !srcset.empty) {
                draggable.setAttribute("src", srcset.highest());
            }
            draggable.classList.remove("hidden");
            this.#figcaption.removeAttribute("style");
        } else {
            draggable.classList.add("hidden");
            draggable.removeAttribute("src");
            picture.classList.remove("hidden");

            observer.observe(this.#image);
        }
    }

    /**
     * Determines whether the image is currently magnified.
     *
     * @returns {boolean}
     */
    #isExpanded() {
        return this.#expander.classList.contains("expanded");
    }

    /**
     * Determines whether the image is magnifiable.
     *
     * @returns {boolean}
     */
    #isExpandable() {
        const image = this.#image;
        let largestSrc = image.currentSrc;
        if (image.srcset) {
            const srcset = ImageSourceSet.parse(image.srcset);
            if (srcset && !srcset.empty) {
                const url = URL.parse(srcset.highest(), document.URL);
                if (url) {
                    largestSrc = url.toString();
                }
            }
        }
        return largestSrc !== image.currentSrc || image.naturalWidth !== image.width || image.naturalHeight !== image.height;
    }

    /**
     * Checks if child elements of figure overflow their container and updates the layout if necessary.
     *
     * @returns {void}
     */
    #layout() {
        /** @type {HTMLElement | undefined} */
        let target;
        const video = this.#video;
        if (isVisible(this.#picture)) {
            target = this.#image;
        } else if (isVisible(video)) {
            target = video;
        } else {
            return;
        }

        const figure = this.#figure;
        if (figure.scrollHeight < 0.8 * window.innerHeight) {
            // remove constraints if there is sufficient space
            target.style.removeProperty("width");
        }

        if (figure.scrollHeight > figure.clientHeight) {
            // decrease image or video size if it leads to overflow in container
            const factor = figure.clientHeight / figure.scrollHeight;
            const width = Math.floor(target.clientWidth * factor);
            if (width > 100 && width != target.clientWidth) {
                target.style.width = `${width}px`;
            }
        }
    }

    /**
     * Closes the lightbox pop-up window.
     *
     * @returns {void}
     */
    close() {
        this.reset();
        this.dispatchEvent(new CustomEvent("closed"));
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

/**
 * Generates a random key.
 *
 * @param {number} n - Length of output string.
 * @returns {string}
 */
function randomKey(n) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const len = chars.length;
    const result = new Array(n);  // pre-allocate array

    for (let i = 0; i < n; ++i) {
        const index = (Math.random() * len) | 0;
        result[i] = chars.charAt(index);
    }
    return result.join("");
}

class BoxsharpCollectionOptions {
    /** @type {boolean} */
    loop = false;
}

class BoxsharpCollection {
    #key = randomKey(24);
    /** @type {BoxsharpDialog} */
    #lightbox;
    /** @type {string[]} - An array of serialized `BoxsharpItem` elements. */
    #items;
    /** @type {BoxsharpCollectionOptions} */
    #options;
    /** @type {number} */
    #index;
    /** @type {((ev: CustomEvent) => void) | null} */
    #navigateCallback;
    /** @type {((ev: Event) => void) | null} */
    #closedCallback;
    /** @type {(ev: PopStateEvent) => void} */
    #popstateCallback;

    /**
     * Creates a navigable collection of items to be shown in a pop-up window.
     *
     * @param {BoxsharpDialog} lightbox - A pop-up window instance.
     * @param {BoxsharpItem[]} items - An array items to show.
     * @param {BoxsharpCollectionOptions} [options] - Configures the behavior of the pop-up window when the collection is shown.
     */
    constructor(lightbox, items, options) {
        this.#lightbox = lightbox;
        this.#items = items.map(item => item.toJSON());
        this.#options = options ?? new BoxsharpCollectionOptions();
        this.#index = 0;

        // listen to back/forward navigation
        this.#popstateCallback = (ev) => {
            // `event.state` reflects target state, not source state
            const state = ev.state;
            if (state && state.boxsharp) {
                if (!lightbox.visible) {
                    /** @type {{key: string, item: string}} */
                    const { key, item } = state.boxsharp;
                    if (key === this.#key) {
                        this.open(Serializable.fromJSON(item));
                    }
                }
            } else {
                this.reset();
            }
        };
        window.addEventListener("popstate", this.#popstateCallback);
    }

    /**
     * Number of items in the collection.
     *
     * @returns {number}
     */
    size() {
        return this.#items.length;
    }

    /**
     * Adds a new item to the collection.
     *
     * @param {BoxsharpItem} item - The item to add.
     * @returns {void}
     */
    add(item) {
        this.#items.push(item.toJSON());
    }

    /**
     * Removes an item from the collection.
     *
     * @param {BoxsharpItem} item - The item to remove.
     * @returns {void}
     */
    remove(item) {
        const items = this.#items;
        const index = items.indexOf(item.toJSON());
        if (index >= 0) {
            items.splice(index, 1);
        }
    }

    /**
     * Opens the pop-up window displaying an item.
     *
     * @param {BoxsharpItem | number} [item] - The item or the index of the item to show.
     * @returns {void}
     */
    open(item) {
        this.reset();

        if (!this.#items.length) {
            return;
        }

        /** @type {number} */
        let index = 0;
        if (item) {
            if (item instanceof BoxsharpItem) {
                index = this.#items.indexOf(item.toJSON());
            } else {
                index = item;
            }
        }

        if (index >= 0) {
            const navigateCallback = this.#navigateCallback = (ev) => { this.#navigate(ev.detail.action); };
            const closedCallback = this.#closedCallback = () => {
                lightbox.removeEventListener("navigate", navigateCallback);
                const state = history.state;
                if (state && state.boxsharp) {
                    history.back();  // return to previous state
                }
            };
            const lightbox = this.#lightbox;
            lightbox.addEventListener("navigate", navigateCallback);
            lightbox.addEventListener("closed", closedCallback, { once: true });
            this.#show(index);
        }
    }

    /**
     * Closes the pop-up window.
     *
     * @returns {void}
     */
    reset() {
        const lightbox = this.#lightbox;
        const closedCallback = this.#closedCallback;
        if (closedCallback) {
            lightbox.removeEventListener("closed", closedCallback);
            this.#closedCallback = null;
        }
        const navigateCallback = this.#navigateCallback;
        if (navigateCallback) {
            lightbox.removeEventListener("navigate", navigateCallback);
            this.#navigateCallback = null;
        }
        if (lightbox.visible) {
            lightbox.reset();
        }
    }

    /**
     * Displays an item.
     *
     * @param {number} index - The index of the item to show.
     * @returns {void}
     */
    #show(index) {
        this.#index = index;
        const item = this.#items[index];

        const state = history.state;
        const memory = { boxsharp: { key: this.#key, item: item } };
        if (state && state.boxsharp) {
            history.replaceState(memory, "", "#boxsharp");
        } else {
            history.pushState(memory, "", "#boxsharp");
        }

        const dialogOptions = new BoxsharpDialogOptions();
        const loop = this.#options.loop;
        dialogOptions.prev = loop || index > 0;
        dialogOptions.next = loop || index < this.#items.length - 1;
        requestAnimationFrame(() => {
            this.#lightbox.open(Serializable.fromJSON(item), dialogOptions);
        });
    }

    /**
     * Navigates to another item in the gallery.
     *
     * @param {string} action - The action to take.
     * @returns {void}
     */
    #navigate(action) {
        const loop = this.#options.loop;
        const last = this.#items.length - 1;
        /** @type {?number} */
        let target = null;
        switch (action) {
            case "first":
                target = 0;
                break;
            case "prev":
                target = this.#index - 1;
                if (target < 0) {
                    target = loop ? last : 0;
                }
                break;
            case "next":
                target = this.#index + 1;
                if (target > last) {
                    target = loop ? 0 : last;
                }
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
        name ??= "boxsharp";

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
            const rel = anchor.getAttribute("rel");
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
    /** @type {Map<string, BoxsharpCollection>} */
    static #groups = new Map();

    /** @type {BoxsharpCollection} */
    #collection;
    /** @type {BoxsharpItem} */
    #item;

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

        // fetch target width and height (if present)
        const width = this.getAttribute("width");
        if (width) {
            item.width = parseInt(width, 10);
        }
        const height = this.getAttribute("height");
        if (height) {
            item.height = parseInt(height, 10);
        }
        const srcset = ImageSourceSet.extract(this);
        if (srcset) {
            item.source.push(ImageSource.create(srcset));
        }

        for (const child of this.children) {
            if (child.tagName === "SOURCE") {
                const srcset = ImageSourceSet.extract(child);
                if (srcset) {
                    const imageSource = ImageSource.create(srcset);
                    imageSource.type = child.getAttribute("type") ?? undefined;
                    imageSource.media = child.getAttribute("media") ?? undefined;
                    item.source.push(imageSource);
                }
            }
        }

        // configure collection display options
        const options = new BoxsharpCollectionOptions();
        options.loop = this.#getBooleanAttribute("loop") ?? options.loop;

        const lightbox = BoxsharpDialog.singleton();

        /** @type {BoxsharpCollection | undefined} */
        let collection;
        const map = BoxsharpLink.#groups;
        const group = this.getAttribute("group");
        if (group) {
            collection = map.get(group);
        }
        if (!collection) {
            collection = new BoxsharpCollection(lightbox, [], options);
            if (group) {
                map.set(group, collection);
            }
        }
        collection.add(item);

        this.#collection = collection;
        this.#item = item;
        this.addEventListener("click", () => {
            collection.open(item);
        });
    }

    connectedMoveCallback() {
        // nothing to do
    }

    disconnectedCallback() {
        this.#collection.remove(this.#item);
    }

    /**
     * Retrieves the value of a Boolean attribute.
     *
     * @param {string} attr - Custom attribute name whose value to fetch.
     * @returns {boolean | null} - Boolean attribute value, or `null` when attribute is missing.
     */
    #getBooleanAttribute(attr) {
        switch (this.getAttribute(attr)) {
            case "1": case "true":
                return true;
            case "0": case "false":
                return false;
            default:
                return null;
        }
    }
}

customElements.define("boxsharp-draggable", BoxsharpDraggable);
customElements.define("boxsharp-dialog", BoxsharpDialog);
customElements.define("boxsharp-link", BoxsharpLink);

export { BoxsharpDialog, BoxsharpCollection, BoxsharpItem };
