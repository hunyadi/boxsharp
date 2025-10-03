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
- **Lightweight.** Minimal network load for faster performance.
- **No dependencies.** Built with 100% CSS and pure JavaScript (ES2020, Web Components); no third-party libraries required.

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
