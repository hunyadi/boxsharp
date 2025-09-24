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

    /** @type {HTMLImageElement} - The image to pan. */
    #draggable;

    /** @type {number} - Natural image width in CSS pixels. */
    #width = 0;
    /** @type {number} - Natural image height in CSS pixels. */
    #height = 0;

    /** @type {boolean} - True if a drag operation is in progress. */
    #isDragging = false;
    /** @type {number} */
    #startX = 0;
    /** @type {number} */
    #startY = 0;
    /** @type {number} */
    #posX = 0;
    /** @type {number} */
    #posY = 0;

    /** @type {(ev: MouseEvent) => void} */
    #mouseup;
    /** @type {(ev: MouseEvent) => void} */
    #mousemove;

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
}
div:active {
cursor: grabbing;
}
img {
position: absolute;
user-select: none;
-webkit-user-drag: none;
}`);
        const container = document.createElement("div");
        const draggable = this.#draggable = document.createElement("img");
        container.append(draggable);
        shadow.append(style, container);

        this.#update();

        container.addEventListener("mousedown", (ev) => {
            this.#isDragging = true;
            this.#startX = ev.clientX;
            this.#startY = ev.clientY;
        });

        this.#mouseup = () => {
            this.#isDragging = false;
            const left = parseInt(draggable.style.left, 10);
            const top = parseInt(draggable.style.top, 10);
            this.#posX = left;
            this.#posY = top;
        };
        document.addEventListener("mouseup", this.#mouseup);

        this.#mousemove = (ev) => {
            if (!this.#isDragging) {
                return;
            }

            const dx = ev.clientX - this.#startX;
            const dy = ev.clientY - this.#startY;

            let newX = this.#posX + dx;
            let newY = this.#posY + dy;

            const parentRect = container.getBoundingClientRect();
            const childRect = draggable.getBoundingClientRect();

            const maxOffsetX = 0;
            const maxOffsetY = 0;
            const minOffsetX = parentRect.width - childRect.width;
            const minOffsetY = parentRect.height - childRect.height;

            newX = Math.min(maxOffsetX, Math.max(minOffsetX, newX));
            newY = Math.min(maxOffsetY, Math.max(minOffsetY, newY));

            draggable.style.left = `${newX}px`;
            draggable.style.top = `${newY}px`;
        };
        document.addEventListener("mousemove", this.#mousemove);
    }

    disconnectedCallback() {
        // reset intrinsic element size
        this.style.width = "0";
        this.style.height = "0";

        document.removeEventListener("mouseup", this.#mouseup);
        document.removeEventListener("mousemove", this.#mousemove);
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
        draggable.src = this.getAttribute("src") || "";
        this.style.width = draggable.style.width = `${this.#width}px`;
        this.style.height = draggable.style.height = `${this.#height}px`;
        draggable.style.left = "0";
        draggable.style.top = "0";
    }
}

/**
 * Represents a single item in the `srcset` attribute of an `<img>` element.
 */
class ImageSource {
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
     * @param {ImageSource} op - The item to compare against.
     * @returns {number}
     */
    compare(op) {
        return this.width - op.width;
    }
}

/**
 * Represents a parsed `srcset` attribute acquired from an `<img>` element.
 */
class ImageSourceSet {
    /** @type {ImageSource[]} */
    items;

    /**
     * @param {ImageSource[]} items
     */
    constructor(items) {
        this.items = items;
    }

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
     * Ensures smallest image size is selected that fills the browser window without scaling the image beyond its natural dimensions.
     *
     * @returns {string} A value assignable to the attribute `sizes`.
     */
    toClampedSizes() {
        const width = this.items[0].width;
        return `(max-width: ${width}px) 100vw, ${width}px`;
    }

    /**
     * Returns a source set specification that allows the browser to select the smallest image size that fills the browser window.
     *
     * @returns {string} - A value assignable to the attribute `srcset`.
     */
    toString() {
        return this.items.map(item => `${item.url} ${item.width}w`).join(", ");
    }

    /**
     * Create a source set from a string.
     *
     * @param {string} srcset - `srcset` attribute value.
     * @returns {ImageSourceSet}
     */
    static parse(srcset) {
        /** @type {ImageSource[]} */
        let items = [];
        const regexp = /(\S+)\s+(\d+)w(?:,|$)/g;
        let match;
        while ((match = regexp.exec(srcset)) !== null) {
            items.push(new ImageSource(match[1], parseInt(match[2])));
        }
        if (items.length) {
            // sort descending, largest width first
            items.sort((a, b) => b.compare(a));
        }
        return new ImageSourceSet(items);
    }
}

/**
 * Source URL and media type pairs captured by the HTML `source` element.
 */
class VideoSource {
    /** @type {string} - Media source URL. */
    src;
    /** @type {?string} - Media type. */
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
    /** @type {ImageSourceSet} - Source URLs acquired from the `srcset` attribute value of an image. */
    srcset = new ImageSourceSet([]);
    /** @type {VideoSource[]} - Source URL and media type pairs for a video. */
    video = [];
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
        /** @type {ImageSourceSet} */
        let srcset = new ImageSourceSet([]);
        /** @type {?string} */
        let videoURL = null;
        /** @type {?string} */
        let frameURL = null;
        /** @type {?string} */
        let alt = null;

        const thumbnail = anchor.querySelector("img");
        if (thumbnail) {
            imageURL = thumbnail.src;
            srcset = ImageSourceSet.parse(thumbnail.srcset);
            alt = thumbnail.alt;
        }

        if (anchor.dataset.srcset) {
            srcset = ImageSourceSet.parse(anchor.dataset.srcset);
        }

        if (!imageURL && !srcset.empty) {
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
        item.srcset = srcset;
        if (videoURL) {
            item.video.push(new VideoSource(videoURL, null));
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
            sources.push(new VideoSource(source.src, source.type));
        });
        if (!sources.length && elem.src) {
            sources.push(new VideoSource(elem.src, null));
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
    #backdrop;
    /** @type {HTMLElement} */
    #progress;
    /** @type {HTMLImageElement} */
    #image;
    /** @type {HTMLVideoElement} */
    #video;
    /** @type {HTMLIFrameElement} */
    #iframe;
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

    connectedCallback() {
        const shadow = this.attachShadow({ mode: "open" });

        shadow.append(
            createStylesheet("boxsharp.css"),
            this.#backdrop = HTML("div", { className: "backdrop" },
                this.#figure = HTML("figure", {},
                    this.#draggable = /** @type {BoxsharpDraggable} */ (HTML("boxsharp-draggable")),
                    this.#image = /** @type {HTMLImageElement} */ (HTML("img")),
                    this.#video = /** @type {HTMLVideoElement} */ (HTML("video", { controls: true })),
                    this.#iframe = /** @type {HTMLIFrameElement} */ (HTML("iframe", { allow: "fullscreen" })),
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

        this.reset();
        this.#backdrop.addEventListener("click", (ev) => {
            if (ev.target === this.#backdrop && !isVisible(this.#draggable)) {
                this.close();
            }
        });

        const image = this.#image;
        const expander = this.#expander;
        const clickCallback = () => {
            if (this.#expandable()) {
                this.#expand(expander.classList.toggle("expanded"));
            }
        };
        expander.addEventListener("click", clickCallback);
        image.addEventListener("dblclick", clickCallback);

        // navigation with buttons
        this.#prevNav.addEventListener("click", (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            this.prev();
        });
        this.#nextNav.addEventListener("click", (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            this.next();
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
                    if (isVisible(this.#prevNav)) {
                        this.prev();
                    }
                    break;
                case "ArrowRight":
                    if (isVisible(this.#nextNav)) {
                        this.next();
                    }
                    break;
                case "Home":
                    if (isVisible(this.#prevNav)) {
                        this.first();
                    }
                    break;
                case "End":
                    if (isVisible(this.#nextNav)) {
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

        // navigation with swipe actions
        const backdrop = this.#backdrop;
        let startX = 0;
        let endX = 0;
        backdrop.addEventListener("touchstart", (ev) => {
            startX = ev.touches[0].clientX;
            console.log(startX);
        });
        backdrop.addEventListener("touchend", (ev) => {
            const threshold = 50;  // minimum distance in CSS pixels to count as a swipe
            endX = ev.changedTouches[0].clientX;
            if (endX - startX > threshold) {  // swiped right
                if (isVisible(this.#prevNav)) {
                    this.prev();
                }
            } else if (startX - endX > threshold) {  // swiped left
                if (isVisible(this.#nextNav)) {
                    this.next();
                }
            }
        });

        // update whether expander icon is visible when container size changes
        let lastSrc;
        const observer = new ResizeObserver(() => {
            if (expander.classList.contains("expanded")) {
                return;
            }

            if (image.currentSrc !== lastSrc) {
                lastSrc = image.currentSrc;
                expander.classList.toggle("hidden", !this.#expandable());
            }
        });
        observer.observe(this.#figure);
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
        const backdrop = this.#backdrop;
        backdrop.classList.add("hidden");
        backdrop.classList.remove("fade-in");

        this.#progress.classList.add("hidden");

        this.#figure.classList.remove("zoom-in");

        this.#expand(false);

        const removeAttributes = (/** @type {HTMLElement} */ elem, /** @type {string[]} */ attrs) => {
            attrs.forEach((attr) => { elem.removeAttribute(attr); });
        };

        const image = this.#image;
        image.classList.add("hidden");
        removeAttributes(image, ["src", "srcset", "sizes", "alt"]);

        const draggable = this.#draggable;
        draggable.classList.add("hidden");
        draggable.removeAttribute("src");

        const video = this.#video;
        video.classList.add("hidden");
        video.pause();
        video.currentTime = 0;
        video.textContent = "";
        removeAttributes(video, ["src", "poster", "width", "height"]);
        video.load();

        const iframe = this.#iframe;
        iframe.classList.add("hidden");
        removeAttributes(iframe, ["src", "width", "height"]);

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
     * Loads resources to be shown in the lightbox pop-up window.
     *
     * @param {BoxsharpItem} item - Captures properties associated with an item to display.
     * @param {BoxsharpOptions} options - Configures the appearance of the pop-up window.
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
                this.#show(item, showLoadingTimeout);
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
                this.#show(item, showLoadingTimeout);
            }, { once: true });
        } else if (image || !srcset.empty) {
            const preloader = new Image();
            preloader.addEventListener("load", () => {
                this.#image.classList.remove("hidden");
                this.#show(item, showLoadingTimeout);
            }, { once: true });
            if (!srcset.empty) {
                preloader.srcset = srcset.toString();
                preloader.sizes = srcset.toClampedSizes();
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
        const { image, srcset, alt, caption } = item;

        clearTimeout(showLoadingTimeout);
        this.#progress.classList.add("hidden");

        if (image || !srcset.empty) {
            const elem = this.#image;
            if (!srcset.empty) {
                elem.srcset = srcset.toString();
                elem.sizes = srcset.toClampedSizes();
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

        // trigger transition to full size
        requestAnimationFrame(() => {
            this.#figure.classList.remove("zoom-in");
        });
    }

    /**
     * Update the state of the image magnifier.
     *
     * @param {boolean} isExpanded
     */
    #expand(isExpanded) {
        const image = this.#image;
        const draggable = this.#draggable;
        const expander = this.#expander;

        expander.classList.toggle("expanded", isExpanded);

        if (isExpanded) {
            expander.classList.remove("hidden");
            image.classList.add("hidden");
            const srcset = ImageSourceSet.parse(this.#image.srcset);
            if (!srcset.empty) {
                draggable.setAttribute("src", srcset.highest());
            }
            draggable.classList.remove("hidden");
        } else {
            draggable.classList.add("hidden");
            draggable.removeAttribute("src");
            image.classList.remove("hidden");
        }
    }

    /**
     * Determines whether the image is magnifiable.
     *
     * @returns {boolean}
     */
    #expandable() {
        const image = this.#image;
        let largestSrc = image.currentSrc;
        if (image.srcset) {
            const srcset = ImageSourceSet.parse(image.srcset);
            if (!srcset.empty) {
                const url = URL.parse(srcset.highest(), document.URL);
                if (url) {
                    largestSrc = url.toString();
                }
            }
        }
        return largestSrc !== image.currentSrc || image.naturalWidth !== image.width || image.naturalHeight !== image.height;
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
        requestAnimationFrame(() => {
            this.#lightbox.open(this.#items[this.#index], options);
        });
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

customElements.define("boxsharp-draggable", BoxsharpDraggable);
customElements.define("boxsharp-dialog", BoxsharpDialog);
customElements.define("boxsharp-link", BoxsharpLink);

export { BoxsharpDialog, BoxsharpCollection, BoxsharpItem };
