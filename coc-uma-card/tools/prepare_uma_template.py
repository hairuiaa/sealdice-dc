from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "template.png"
OUT_DIR = ROOT / "assets"
BLANK = OUT_DIR / "uma_template_blank.png"
PREVIEW = OUT_DIR / "uma_template_preview.png"
GUIDE = OUT_DIR / "uma_template_guide.png"
MAP_FILE = OUT_DIR / "uma_template_map.json"

FONT_CANDIDATES = [
    "/System/Library/Fonts/Hiragino Sans GB.ttc",
    "/System/Library/Fonts/STHeiti Medium.ttc",
    "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
]

BROWN = (104, 45, 0)
WHITE = (255, 255, 255)
GREEN = (92, 205, 0)
ORANGE = (245, 166, 20)
LIGHT_PANEL = (246, 252, 255)


FIELDS = {
    "character_name": {"box": [690, 178, 1038, 268], "font": 58, "anchor": "mm"},
    "player_name": {"box": [820, 288, 1000, 325], "font": 30, "anchor": "lm"},
    "profession": {"box": [672, 400, 932, 454], "font": 42, "anchor": "mm"},
    "eval_points": {"box": [225, 500, 390, 558], "font": 48, "anchor": "lm"},
    "overall_rank": {"box": [418, 218, 673, 322], "font": 58, "anchor": "mm"},
    "speed_rank": {"box": [55, 690, 140, 773], "font": 34, "anchor": "mm"},
    "speed_value": {"box": [156, 699, 238, 764], "font": 50, "anchor": "mm"},
    "stamina_rank": {"box": [280, 690, 365, 773], "font": 34, "anchor": "mm"},
    "stamina_value": {"box": [382, 699, 464, 764], "font": 50, "anchor": "mm"},
    "power_rank": {"box": [505, 690, 590, 773], "font": 34, "anchor": "mm"},
    "power_value": {"box": [607, 699, 690, 764], "font": 50, "anchor": "mm"},
    "guts_rank": {"box": [730, 690, 815, 773], "font": 34, "anchor": "mm"},
    "guts_value": {"box": [832, 699, 915, 764], "font": 50, "anchor": "mm"},
    "wisdom_rank": {"box": [955, 690, 1040, 773], "font": 34, "anchor": "mm"},
    "wisdom_value": {"box": [1057, 699, 1140, 764], "font": 50, "anchor": "mm"},
    "combat_grade": {"box": [230, 842, 330, 932], "font": 56, "anchor": "mm"},
    "combat_text": {"box": [360, 846, 1116, 928], "font": 34, "anchor": "lm"},
    "explore_grade": {"box": [230, 976, 330, 1066], "font": 56, "anchor": "mm"},
    "explore_text": {"box": [360, 980, 1116, 1062], "font": 34, "anchor": "lm"},
    "survive_grade": {"box": [230, 1110, 330, 1200], "font": 56, "anchor": "mm"},
    "survive_text": {"box": [360, 1114, 1116, 1196], "font": 34, "anchor": "lm"},
}


def font(size: int) -> ImageFont.FreeTypeFont:
    for path in FONT_CANDIDATES:
        if Path(path).exists():
            return ImageFont.truetype(path, size=size)
    return ImageFont.load_default(size=size)


def rounded(draw: ImageDraw.ImageDraw, box: list[int], radius: int, fill, outline=None, width: int = 1) -> None:
    draw.rounded_rectangle(tuple(box), radius=radius, fill=fill, outline=outline, width=width)


def cover_with_blur(img: Image.Image, box: list[int], radius: int = 10, fill=(246, 252, 255, 238)) -> None:
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    patch = img.crop(tuple(box)).filter(ImageFilter.GaussianBlur(14))
    overlay.paste(patch.convert("RGBA"), tuple(box[:2]))
    mask = Image.new("L", img.size, 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle(tuple(box), radius=radius, fill=255)
    img.alpha_composite(overlay)
    tint = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(tint).rounded_rectangle(tuple(box), radius=radius, fill=fill)
    img.alpha_composite(tint)


def draw_centered_text(
    draw: ImageDraw.ImageDraw,
    box: list[int],
    text: str,
    size: int,
    fill=BROWN,
    stroke_width: int = 0,
    stroke_fill=WHITE,
) -> None:
    fnt = font(size)
    x0, y0, x1, y1 = box
    cx = (x0 + x1) / 2
    cy = (y0 + y1) / 2
    draw.text(
        (cx, cy),
        text,
        font=fnt,
        fill=fill,
        anchor="mm",
        stroke_width=stroke_width,
        stroke_fill=stroke_fill,
    )


def draw_left_text(
    draw: ImageDraw.ImageDraw,
    box: list[int],
    text: str,
    size: int,
    fill=BROWN,
    stroke_width: int = 0,
    stroke_fill=WHITE,
    pad_x: int = 0,
) -> None:
    fnt = font(size)
    x0, y0, _, y1 = box
    draw.text(
        (x0 + pad_x, (y0 + y1) / 2),
        text,
        font=fnt,
        fill=fill,
        anchor="lm",
        stroke_width=stroke_width,
        stroke_fill=stroke_fill,
    )


def build_blank() -> Image.Image:
    img = Image.open(SOURCE).convert("RGBA")
    draw = ImageDraw.Draw(img)

    cover_with_blur(img, FIELDS["character_name"]["box"], radius=18)
    cover_with_blur(img, FIELDS["player_name"]["box"], radius=8)
    draw.rounded_rectangle((224, 500, 396, 558), radius=10, fill=(250, 250, 246))

    draw.rounded_rectangle((682, 402, 922, 452), radius=8, fill=ORANGE)
    draw.line((684, 404, 920, 404), fill=(255, 196, 45), width=3)
    draw.line((684, 450, 920, 450), fill=(208, 120, 0), width=3)

    for key in ["speed_value", "stamina_value", "power_value", "guts_value", "wisdom_value"]:
        draw.rounded_rectangle(tuple(FIELDS[key]["box"]), radius=8, fill=(250, 250, 250))

    # Fixed bottom slots for derived COC suitability.
    for grade_key, text_key in [
        ("combat_grade", "combat_text"),
        ("explore_grade", "explore_text"),
        ("survive_grade", "survive_text"),
    ]:
        rounded(draw, FIELDS[grade_key]["box"], 18, (255, 255, 255), (105, 204, 28), 4)
        rounded(draw, FIELDS[text_key]["box"], 18, (255, 255, 255), (208, 232, 197), 3)

    return img.convert("RGB")


def build_preview(blank: Image.Image) -> Image.Image:
    img = blank.convert("RGBA")
    draw = ImageDraw.Draw(img)

    draw_centered_text(draw, FIELDS["character_name"]["box"], "调查员样卡", 54, stroke_width=3)
    draw_left_text(draw, FIELDS["player_name"]["box"], "玩家A", 30, stroke_width=2)
    draw_centered_text(draw, FIELDS["profession"]["box"], "私家侦探", 42, fill=WHITE, stroke_width=2, stroke_fill=(180, 92, 0))
    draw_left_text(draw, FIELDS["eval_points"]["box"], "18,640", 48)
    draw_centered_text(draw, FIELDS["overall_rank"]["box"], "S", 68, fill=(255, 160, 0), stroke_width=3)

    stats = [
        ("speed_rank", "speed_value", "A", "920"),
        ("stamina_rank", "stamina_value", "B", "760"),
        ("power_rank", "power_value", "C", "610"),
        ("guts_rank", "guts_value", "S", "1030"),
        ("wisdom_rank", "wisdom_value", "A", "880"),
    ]
    for rank_key, value_key, rank, value in stats:
        draw_centered_text(draw, FIELDS[rank_key]["box"], rank, 34, fill=(90, 90, 90))
        draw_centered_text(draw, FIELDS[value_key]["box"], value, 44)

    rows = [
        ("combat_grade", "combat_text", "B", "近战稳定，枪械应对一般"),
        ("explore_grade", "explore_text", "A", "侦查、聆听与线索整理能力突出"),
        ("survive_grade", "survive_text", "S", "意志强，受压后仍能继续行动"),
    ]
    for grade_key, text_key, grade, text in rows:
        draw_centered_text(draw, FIELDS[grade_key]["box"], grade, 58, fill=(72, 174, 0))
        draw_left_text(draw, FIELDS[text_key]["box"], text, 34, pad_x=24)

    return img.convert("RGB")


def build_guide(blank: Image.Image) -> Image.Image:
    img = blank.convert("RGBA")
    draw = ImageDraw.Draw(img)
    guide_font = font(18)
    for idx, (key, data) in enumerate(FIELDS.items(), start=1):
        box = data["box"]
        draw.rectangle(tuple(box), outline=(230, 30, 30), width=3)
        draw.text((box[0], max(0, box[1] - 22)), f"{idx} {key}", font=guide_font, fill=(230, 30, 30))
    return img.convert("RGB")


def main() -> None:
    OUT_DIR.mkdir(exist_ok=True)
    blank = build_blank()
    blank.save(BLANK)
    build_preview(blank).save(PREVIEW)
    build_guide(blank).save(GUIDE)
    MAP_FILE.write_text(json.dumps(FIELDS, ensure_ascii=False, indent=2), encoding="utf-8")
    print(BLANK)
    print(PREVIEW)
    print(GUIDE)
    print(MAP_FILE)


if __name__ == "__main__":
    main()
