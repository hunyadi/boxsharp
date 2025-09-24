"""
boxsharp: a responsive lightbox pop-up window with CSS3 and vanilla JavaScript

:author: Levente Hunyadi
:version: 0.1
:copyright: 2025 Levente Hunyadi
:see: https://hunyadi.info.hu/projects/boxsharp
:see: https://github.com/hunyadi/boxsharp
"""

# Install CSS minifier for Python with `pip install rcssmin`

import json
import re
from pathlib import Path

import rcssmin  # type: ignore


def _css_substitute(text: str) -> str:
    """
    Minifies a string that represents a CSS stylesheet, and produces a function call that gives that stylesheet as a `<style>` element.

    The JavaScript function `createStyle` is implemented as:
    ```
    function createStyle(css) {
        const elem = document.createElement("style");
        elem.textContent = css;
        return elem;
    }
    ```
    """

    text = rcssmin.cssmin(text)  # type: ignore
    return f"createStyle({json.dumps(text)})"


def _string_value(m: re.Match[str]) -> str:
    "String value captured by a quoted string or template literal."

    if (value := m["double"]) is not None:
        return value
    elif (value := m["single"]) is not None:
        return value
    elif (value := m["multi"]) is not None:
        if "${" in value:
            raise ValueError("expected: a literal string without template substitutions")
        return value
    else:
        raise ValueError("expected: quoted string or template literal")


_ARG_LIST = r"""\((?:"(?P<double>[^"]+)"|'(?P<single>[^']+)'|`(?P<multi>[^`]+)`)\)"""


def css_file_substitute(javascript: str) -> str:
    "Replace stylesheet file includes with minified stylesheet text content."

    def _repl(m: re.Match[str]) -> str:
        path = _string_value(m)
        with open(root / path, "r", encoding="utf-8") as f:
            return _css_substitute(f.read())

    return re.sub("createStylesheet" + _ARG_LIST, _repl, javascript)


def css_text_substitute(javascript: str) -> str:
    "Replace multi-line stylesheet literal strings with minified stylesheet text content."

    def _repl(m: re.Match[str]) -> str:
        return _css_substitute(_string_value(m))

    return re.sub("createStyle" + _ARG_LIST, _repl, javascript)


root = Path(__file__).parent / "boxsharp"
with open(root / "boxsharp.js", "r", encoding="utf-8") as f:
    javascript = f.read()

javascript = css_file_substitute(javascript)
javascript = css_text_substitute(javascript)

with open(root / "boxsharp.sub.js", "w", encoding="utf-8") as f:
    f.write(javascript)
