"""
boxsharp: a responsive lightbox pop-up window with CSS3 and vanilla JavaScript

:author: Levente Hunyadi
:version: 0.1
:copyright: 2025 Levente Hunyadi
:see: https://hunyadi.info.hu/projects/boxsharp
:see: https://github.com/hunyadi/boxsharp
"""

# Install CSS minifier for Python with `pip install rcssmin`

import enum
import json
import re
import urllib.parse
import xml.etree.ElementTree as ET
from base64 import b64decode, b64encode
from dataclasses import dataclass
from io import StringIO
from pathlib import Path

import rcssmin  # type: ignore


class Encoding(enum.Enum):
    NONE = ""
    BASE64 = "base64"


def to_data_uri(mime_type: str, data: str | bytes, *, charset: str | None = None, encoding: Encoding = Encoding.NONE) -> str:
    """
    Generates a data URI with the specified MIME type.

    Example:
    ```
    data = "árvíztűrő tükörfúrógép"
    uri = to_data_uri("text/plain", data)
    assert data == from_data_uri(uri).data.decode()
    ```

    :param data: Data to encode.
    :param mime_type: MIME type (default is `text/plain`).
    :param charset: Character encoding for text content.
    :param encoding: Payload encoding for binary content.
    :returns: Data encapsulated in a data URI.
    """

    if isinstance(data, str):
        if charset is None:
            charset = "utf-8"
        encoded = data.encode(charset)
    elif isinstance(data, bytes):
        encoded = data
    else:
        raise TypeError(f"expected: `str` or `bytes`; got: {type(data)}")

    params = [mime_type]
    if charset is not None:
        params.append(f"charset={charset}")
    header = f"data:{';'.join(params)}"
    match encoding:
        case Encoding.BASE64:
            return f"{header};base64,{b64encode(encoded).decode('ascii')}"
        case Encoding.NONE:
            if isinstance(data, bytes):
                raise TypeError("expected: Base64 payload encoding for binary content")
            payload = urllib.parse.quote(data, safe=";/?:@&=+$,-_.!~*'()#")  # minimal encoding
            return f"{header},{payload}"


@dataclass
class Content:
    """
    Data extracted from a data URL.

    :param data: Decoded binary payload.
    :param mime_type: MIME type (default is `text/plain`).
    :param charset: Character encoding for text content.
    """

    mime_type: str
    data: bytes
    charset: str | None


def from_data_uri(uri: str) -> Content:
    """
    Decodes a data URI and returns the binary data, MIME type, and character encoding.

    :param url: Data URI to decode.
    :returns: Data encapsulated in the data URI.
    """

    if not uri.startswith("data:"):
        raise ValueError("expected: data URI; got: other URI scheme")

    # split metadata and data
    try:
        header, payload = uri[5:].split(",", 1)
    except ValueError:
        raise ValueError("expected: data URI; got: invalid format") from None

    # default values
    mime_type = "text/plain"
    charset = None
    is_base64 = False

    if ";" in header:
        parts = header.split(";")
        if parts[0]:
            mime_type = parts[0]
        for part in parts[1:]:
            if part == "base64":
                is_base64 = True
            elif part.startswith("charset="):
                charset = part[len("charset=") :]
    elif header:
        mime_type = header

    # decode data
    if is_base64:
        data = b64decode(payload)
    else:
        data = urllib.parse.unquote_to_bytes(payload)

    return Content(mime_type, data, charset)


def _css_string_value(m: re.Match[str]) -> str:
    "String value captured by a quoted string."

    if (value := m["double"]) is not None:
        return value
    elif (value := m["single"]) is not None:
        return value
    elif (value := m["none"]) is not None:
        return value
    else:
        raise ValueError("expected: quoted string")


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

    :returns: JavaScript code.
    """

    text = rcssmin.cssmin(text)  # type: ignore
    return f"createStyle({json.dumps(text)})"


_DATA_URL = r"""url\((?:"(?P<double>data:[^"]+)"|'(?P<single>data:[^']+)'|(?P<none>data:[^()]+))\)"""


def _data_url_base64(css: str) -> str:
    "Converts all data URLs to Base64 encoding."

    def _repl(m: re.Match[str]) -> str:
        value = _css_string_value(m)
        content = from_data_uri(value)
        url = to_data_uri(content.mime_type, content.data, encoding=Encoding.BASE64)
        return f"url({url})"

    return re.sub(_DATA_URL, _repl, css)


def _data_url_substitute(js: str) -> str:
    "Substitutes data URLs embedded in strings with a function call that creates them dynamically."

    def _visit(node: ET.Element, s: StringIO) -> None:
        tag = node.tag.replace("{http://www.w3.org/2000/svg}", "", 1)
        s.write(f'SVG("{tag}"')
        if node.attrib:
            s.write(f",{json.dumps(node.attrib)}")
        else:
            s.write(", {}")
        for child in node:
            s.write(", ")
            _visit(child, s)
        s.write(")")

    def _repl(m: re.Match[str]) -> str:
        value = _css_string_value(m)
        content = from_data_uri(value)
        if content.mime_type == "image/svg+xml":
            data = content.data.decode()
            root = ET.ElementTree(ET.fromstring(data)).getroot()
            s = StringIO()
            if root is not None:
                _visit(root, s)
            return '" + createSVG(' + s.getvalue() + ') + "'
        else:
            return m.group(0)

    return re.sub(_DATA_URL, _repl, js)


def _js_string_value(m: re.Match[str]) -> str:
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


def css_file_substitute(root: Path, javascript: str) -> str:
    "Replace stylesheet file includes with minified stylesheet text content."

    def _repl(m: re.Match[str]) -> str:
        path = _js_string_value(m)
        with open(root / path, "r", encoding="utf-8") as f:
            css = f.read()
            css = _data_url_base64(css)  # convert data URIs to Base64 to avoid quoted strings
            js = _css_substitute(css)
            content = _data_url_substitute(js)
            return content

    return re.sub("createStylesheet" + _ARG_LIST, _repl, javascript)


def css_text_substitute(javascript: str) -> str:
    "Replace multi-line stylesheet literal strings with minified stylesheet text content."

    def _repl(m: re.Match[str]) -> str:
        return _css_substitute(_js_string_value(m))

    return re.sub("createStyle" + _ARG_LIST, _repl, javascript)


def main() -> None:
    root = Path(__file__).parent / "boxsharp"
    with open(root / "boxsharp.js", "r", encoding="utf-8") as f:
        javascript = f.read()

    javascript = css_file_substitute(root, javascript)
    javascript = css_text_substitute(javascript)

    with open(root / "boxsharp.sub.js", "w", encoding="utf-8") as f:
        f.write(javascript)


if __name__ == "__main__":
    main()
