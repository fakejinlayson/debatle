"""Generate Debatle's pixel-art gavel icon.

python scripts/make_icon.py [preview_dir]

Drawn like the people in the hall (src/components/Crowd.tsx): flat chunky
blocks in two tones, a main colour plus a darker shade, with no outlines.
Transparent background. Edit the pixel map below and re-run. Writes
src/app/icon.svg (crisp at any size), src/app/favicon.ico (16/32/48) and
src/app/apple-icon.png (180x180). With preview_dir, also writes previews on
light and dark backgrounds there.
"""
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "src" / "app"

# Debatle palette (src/app/globals.css). "." is transparent.
PALETTE = {
    "B": "#d9a441",  # brass
    "b": "#8a6a2e",  # brass shade
    "W": "#6b4330",  # oak
    "w": "#3b2620",  # dark oak
}

# 16x16. A tilted barrel-shaped head on a handle, two tones each (generated
# from rotated shapes, then baked here so it can be hand-tweaked).
PIXELS = """
........B.......
.......BBB......
......BBBBB.....
.....BBBBBBb....
....BBBBBBbb....
...BBBBBBbb.....
..BBBBBBbb......
.BBBBBBbb.......
BBBBBBbbWw......
.BBBBbb.WWw.....
..BBbb...WWw....
...bb.....WWw...
...........WWw..
............WWw.
.............WW.
................
"""


def grid():
    rows = PIXELS.strip("\n").split("\n")
    assert len(rows) == 16 and all(len(r) == 16 for r in rows), [len(r) for r in rows]
    return rows


def write_svg(rows, path):
    # One rect per horizontal run of the same colour; crispEdges keeps pixels sharp.
    rects = []
    for y, row in enumerate(rows):
        x = 0
        while x < 16:
            c, run = row[x], 1
            while x + run < 16 and row[x + run] == c:
                run += 1
            if c != ".":
                rects.append(f'<rect x="{x}" y="{y}" width="{run}" height="1" fill="{PALETTE[c]}"/>')
            x += run
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">'
        + "".join(rects)
        + "</svg>\n"
    )
    path.write_text(svg, encoding="utf-8")


def render(rows, size):
    img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, c in enumerate(row):
            if c != ".":
                img.putpixel((x, y), tuple(int(PALETTE[c][i : i + 2], 16) for i in (1, 3, 5)) + (255,))
    return img.resize((size, size), Image.NEAREST)


def main():
    rows = grid()
    write_svg(rows, APP / "icon.svg")
    # Next.js only accepts .ico files whose embedded PNGs are RGBA.
    render(rows, 48).save(APP / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    # iOS fills transparency with black, so the home-screen icon gets Debatle's ink background.
    apple = Image.new("RGBA", (180, 180), (20, 13, 16, 255))
    apple.alpha_composite(render(rows, 144), (18, 18))
    apple.convert("RGB").save(APP / "apple-icon.png")
    if len(sys.argv) > 1:
        out = Path(sys.argv[1])
        out.mkdir(parents=True, exist_ok=True)
        sheet = Image.new("RGBA", (16 * 3 * 2 + 32 * 3 * 2 + 70, 32 * 3 + 20), (0, 0, 0, 0))
        x = 10
        for bg in ((255, 255, 255, 255), (32, 33, 36, 255)):  # light tab, dark tab
            for sz in (16, 32):
                tile = Image.new("RGBA", (sz, sz), bg)
                tile.alpha_composite(render(rows, sz))
                sheet.paste(tile.resize((sz * 3, sz * 3), Image.NEAREST), (x, 10))
                x += sz * 3 + 10
        sheet.save(out / "tabs.png")
        render(rows, 256).save(out / "icon_256.png")
    print("wrote src/app/icon.svg, favicon.ico, apple-icon.png")


if __name__ == "__main__":
    main()
