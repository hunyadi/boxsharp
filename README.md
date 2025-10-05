# boxsharp: a responsive lightbox pop-up window

[Demo page](https://hunyadi.info.hu/projects/boxsharp/) | [Project page](https://github.com/hunyadi/boxsharp/)

## Features

- **Modern browser support.** Works seamlessly in Chrome, Edge, Firefox, and Safari.
- **Versatile content display.** Handles images, videos, PDFs and external pages.
- **Custom captions.** Add description to each item using plain text or HTML tags.
- **Flexible navigation.** Navigate using buttons, keyboard (left/right arrows), mouse, or swipe gestures.
- **History-aware.** Supports browser *back* and *forward* buttons to close and reopen.
- **Interactive image handling.** Expand large images and pan by dragging.
- **Optimized image loading.** Automatically selects the smallest image that fills the viewport.
- **Responsive design.** Oversized content is scaled down to fit the browser window.
- **Easy integration.** Includes a simple API and ready-to-use code snippets for fast setup.
- **Lightweight.** Less than 7 KB when gzipped.
- **No dependencies.** Built with 100% CSS and pure JavaScript (ES2020, Web Components).

## Setup

For a production deployment, add the following to the `<head>` section of your HTML page:

```html
<script defer src="path/to/boxsharp.min.js" type="module"></script>
```

This contains both JavaScript code and CSS stylesheets combined into a single minified file.

For debug mode, use the following declaration instead:

```html
<script defer src="path/to/boxsharp.js" type="module"></script>
```

This contains the JavaScript code only, which loads `boxsharp.css` from the same directory where the code file is located.

## Syntax

boxsharp is implemented as a [web component](https://developer.mozilla.org/en-US/docs/Web/API/Web_components). When a `<boxsharp-link>` element is added to the HTML DOM, its attributes and child elements are analyzed to determine how the image, video or other resource appears when the user clicks the element to open the pop-up window. The following information sources are inspected for images:

* `href` attribute of `<boxsharp-link>`. If `href` points to an image file, this file is added as a source.
* `srcset` attribute. `srcset` should use the width descriptor, not the pixel density descriptor.
* `<source>` elements that are direct children of `<boxsharp-link>`. Attributes `srcset`, `type` and `media` are extracted.
* `srcset` and `src` attributes of a descendant `<img>` element. This is provided as a convenience feature to enlarge an image already shown on the page.

The following information is extracted for a video:

* `href` attribute of `<boxsharp-link>`. If `href` points to a video file, this file is added as a source.
* `<source>` elements that are direct children of `<boxsharp-link>`. Attributes `src`, `type` and `media` are extracted.
* `<source>` elements in a descendant `<video>` element. Attributes `src`, `type` and `media` of any `<source>` child elements of `<video>` are extracted. This is a convenience feature to play a video in larger size.
* `src` attribute `src` of a descendant `<video>` element.

Captions for items are extracted from the following sources:

* `<figcaption>` in an encapsulated `<figure>` element. You can put arbitrary HTML in `<figcaption>`.
* `<figcaption>` in an encapsulating `<figure>` element. This lets us use `<boxsharp-link>` in a `<figure>` element and read the caption text from the sibling element `<figcaption>`.
* `title` attribute

Some target items don't have an intrinsic size, e.g. when the pop-up window displays a web page from another site. In this case, you should explicitly set attributes `width` and `height` on `<boxsharp-link>`.

## Classic syntax

For legacy use cases, a classic syntax is available that relies on attributes of the anchor element `<a>` as opposed to `<boxsharp-link>`. You need to invoke the `scan` static method to analyze the attributes of an `<a>` element:

```javascript
import { BoxsharpCollection } from "./boxsharp/boxsharp.min.js";
document.addEventListener("DOMContentLoaded", () => {
    BoxsharpCollection.scan("boxsharp");
});
```

Once you call `scan`, the code inspects attributes `href`, `rel`, `data-srcset` and `title`, and looks for an `<img>` element wrapped in `<a>` for attributes `src`, `srcset` and `alt`. In the classic syntax, `rel` distinguishes normal links from boxsharp links:

* Anchors with a `rel` of `NAME` open a pop-up window when clicked, showing the resource referenced in `href`. `NAME` defaults to `boxsharp` (see above) but you can use any name you prefer.
* Anchors with a `rel` of `NAME-*` form a collection (gallery) in which the user is able to navigate between the items without closing the pop-up window. `*` means any sequence of characters. You have to use the same `rel` attribute for items in the same collection.

Captions are extracted from the same sources as with the modern syntax. However, anchor elements cannot nest in HTML, which prevents using links in `<figcaption>` when the entire `<figure>` element is wrapped in the defining `<a rel="...">` element. We recommend that you place the `<a rel="...">` element inside `<figure>`.

## How it works

Information extracted from `<boxsharp-link>` elements and their descendants is used to set attributes of and populate elements `<picture>` and `<video>` in a `<figure>` element. These elements are part of a web component `<boxsharp-dialog>`, which represents the lightbox pop-up window.

For an image, the attributes `srcset` and `sizes` are set on `<source>` elements inside a `<picture>` element. This helps the browser choose the optimal image given the current window size. `sizes` is configured with the value `(max-width: ${width}px) 100vw, ${width}px` where `${width}` is the largest image width. This ensures that the image scales down proportionally but doesn't grow beyond its natural size.

For a video, `<source>` elements of a `<video>` element are populated in a similar way. If the target item represents an external resource, e.g. a YouTube video or an another site, an `<iframe>` element is configured.

Size changes are intercepted via the `resize` event on `window`, and `ResizeObserver` instances registered on `<img>` and `<video>`. `<figcaption>` width is set to the current `<img>` or `<video>` width. If the elements in the pop-up window would overflow their container (i.e. scroll height is greater than client height), the width of `<img>` and `<video>` is reduced, causing their height to shrink. `<img>` and `<video>` always maintain their aspect ratio.

When an image doesn't fit in the browser window dimensions, the *expand* icon is shown. The enlarged view is implemented with a helper web component `<boxsharp-draggable>`. This component captures events triggered by drag-and-drop executed with a mouse or a gesture.

boxsharp interoperates with browser navigation events *back* and *forward* by pushing state to `history`. The *back* button lets you close the pop-up window, and *forward* reopens the window displaying the same image shown earlier. We represent items displayed in the lightbox pop-up window in serializable data structures such that they can be pushed as history states.

## Examples

**Use case:** Figure with caption opens in larger size in pop-up window.

```html
<boxsharp-link>
    <figure>
        <img alt="Preview image" src="example.png" width="640" height="480" sizes="640px"
            srcset="ex7680x4320.png 7680w, ex3840x2160.png 3840w, ex1920x1080.png 1920w, ex1024x768.png 1024w, example.png 640w"
        />
        <figcaption>Figure caption. Created by <a href="https://hunyadi.info.hu/levente/" target="_blank">Levente Hunyadi</a>.</figcaption>
    </figure>
</boxsharp-link>
```

**Use case:** Set of thumbnails opens a navigable gallery of related images.

```html
<boxsharp-link group="flag" loop="true" srcset="...">
    <img src="https://placehold.co/300x200/CD2A3E/FFFFFF.png" width="75" height="50" alt="A red image" />
</boxsharp-link>
<boxsharp-link group="flag" srcset="...">
    <img src="https://placehold.co/300x200/FFFFFF/CCCCCC.png" width="75" height="50" alt="A white image" />
</boxsharp-link>
<boxsharp-link group="flag" srcset="...">
    <img src="https://placehold.co/300x200/436F4D/FFFFFF.png" width="75" height="50" alt="A green image" />
</boxsharp-link>
```

**Use case:** Clickable content opens a video playing in a pop-up window.

```html
<boxsharp-link href="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4">
    <span class="hyperlink">▶️ Big Buck Bunny</span>
</boxsharp-link>
```

**Use case:** Thumbnail image opens an external website in an `<iframe>`.

```html
<boxsharp-link width="800" height="600" href="https://www.wikipedia.org/">
    <img src="https://upload.wikimedia.org/wikipedia/en/8/80/Wikipedia-logo-v2.svg" />
</boxsharp-link>
```

## Acknowledgments

This project has been inspired by [boxplus](https://www.hunyadi.info.hu/projects/boxplusx/index.html).
