from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "assets"
RANK_DIR = ASSET_DIR / "rank_badges"
STAT_DIR = ASSET_DIR / "stat_badges"

SOURCE_TEMPLATE = ROOT / "template.png"
BLANK = ASSET_DIR / "uma_final_template_blank.png"
PREVIEW = ASSET_DIR / "uma_final_template_preview.png"
GUIDE = ASSET_DIR / "uma_final_template_guide.png"
MAP = ASSET_DIR / "uma_final_template_map.json"

FONT_CANDIDATES = [
    "/System/Library/Fonts/Hiragino Sans GB.ttc",
    "/System/Library/Fonts/STHeiti Medium.ttc",
    "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
]

BROWN = (103, 45, 0)
WHITE = (255, 255, 255)
GREEN = (92, 205, 0)
GREEN_DARK = (53, 170, 0)
ORANGE = (244, 164, 18)
CARD_BORDER = (219, 192, 169)

RANK_COLORS = {
    "G": ((132, 132, 132), (210, 210, 210), (82, 82, 82)),
    "F": ((90, 90, 100), (180, 180, 190), (55, 55, 65)),
    "E": ((66, 117, 164), (136, 197, 236), (38, 70, 116)),
    "D": ((55, 155, 88), (134, 229, 145), (28, 95, 58)),
    "C": ((37, 170, 185), (138, 244, 240), (20, 104, 128)),
    "B": ((52, 116, 216), (138, 205, 255), (33, 70, 160)),
    "A": ((235, 105, 54), (255, 216, 95), (170, 54, 38)),
    "S": ((253, 188, 34), (255, 248, 142), (192, 113, 0)),
    "SS": ((245, 161, 28), (255, 251, 180), (191, 83, 0)),
    "UG": ((111, 78, 236), (75, 225, 255), (170, 63, 232)),
}

GRADE_COLORS = {
    "S": (53, 170, 18),
    "A": (238, 102, 36),
    "B": (220, 72, 120),
    "C": (99, 190, 70),
    "D": (72, 134, 215),
    "E": (116, 116, 126),
    "F": (112, 112, 112),
    "G": (84, 84, 84),
    "SS": (245, 168, 28),
}

FIELDS = {
    "rank_badge": {"box": [392, 146, 606, 334]},
    "character_name": {"box": [690, 188, 1038, 266], "font": 54, "anchor": "mm"},
    "player_name": {"box": [710, 284, 1018, 326], "font": 28, "anchor": "mm"},
    "profession": {"box": [676, 398, 930, 454], "font": 40, "anchor": "mm"},
    "eval_points": {"box": [226, 501, 392, 558], "font": 48, "anchor": "lm"},
    "stats": [
        {
            "key": "speed",
            "label": "速度",
            "badge_box": [54, 684, 138, 767],
            "value_box": [153, 698, 242, 764],
        },
        {
            "key": "stamina",
            "label": "耐力",
            "badge_box": [278, 684, 362, 767],
            "value_box": [377, 698, 466, 764],
        },
        {
            "key": "power",
            "label": "力量",
            "badge_box": [503, 684, 587, 767],
            "value_box": [602, 698, 691, 764],
        },
        {
            "key": "guts",
            "label": "根性",
            "badge_box": [728, 684, 812, 767],
            "value_box": [827, 698, 916, 764],
        },
        {
            "key": "wisdom",
            "label": "智力",
            "badge_box": [953, 684, 1037, 767],
            "value_box": [1052, 698, 1141, 764],
        },
    ],
    "aptitudes": [
        {"key": "melee", "category": "战斗适性", "label": "近战", "box": [246, 838, 456, 925], "grade_box": [384, 852, 438, 912]},
        {"key": "ranged", "category": "战斗适性", "label": "远程", "box": [478, 838, 710, 925], "grade_box": [636, 852, 692, 912]},
        {"key": "city", "category": "探索适性", "label": "城市探索", "box": [246, 966, 456, 1057], "grade_box": [384, 982, 438, 1043]},
        {"key": "wild", "category": "探索适性", "label": "野外探索", "box": [478, 966, 710, 1057], "grade_box": [636, 982, 692, 1043]},
        {"key": "library", "category": "探索适性", "label": "文献调查", "box": [730, 966, 935, 1057], "grade_box": [861, 982, 918, 1043]},
        {"key": "data", "category": "探索适性", "label": "资料收集", "box": [956, 966, 1165, 1057], "grade_box": [1091, 982, 1148, 1043]},
        {"key": "endurance", "category": "生存适性", "label": "耐久生存", "box": [246, 1100, 456, 1192], "grade_box": [384, 1117, 438, 1178]},
        {"key": "emergency", "category": "生存适性", "label": "应急处理", "box": [478, 1100, 710, 1192], "grade_box": [636, 1117, 692, 1178]},
        {"key": "mental", "category": "生存适性", "label": "精神抗性", "box": [730, 1100, 935, 1192], "grade_box": [861, 1117, 918, 1178]},
        {"key": "luck", "category": "生存适性", "label": "运气", "box": [956, 1100, 1165, 1192], "grade_box": [1091, 1117, 1148, 1178]},
    ],
}


def font(size: int) -> ImageFont.FreeTypeFont:
    for path in FONT_CANDIDATES:
        if Path(path).exists():
            return ImageFont.truetype(path, size=size)
    return ImageFont.load_default(size=size)


def draw_text_fit(
    draw: ImageDraw.ImageDraw,
    box: list[int],
    text: str,
    max_size: int,
    fill=BROWN,
    anchor: str = "mm",
    stroke_width: int = 0,
    stroke_fill=WHITE,
    min_size: int = 16,
) -> None:
    x0, y0, x1, y1 = box
    max_w = x1 - x0
    max_h = y1 - y0
    size = max_size
    while size >= min_size:
        fnt = font(size)
        bbox = draw.textbbox((0, 0), text, font=fnt, stroke_width=stroke_width)
        if bbox[2] - bbox[0] <= max_w and bbox[3] - bbox[1] <= max_h:
            break
        size -= 2
    if anchor == "lm":
        pos = (x0, (y0 + y1) / 2)
    else:
        pos = ((x0 + x1) / 2, (y0 + y1) / 2)
    draw.text(pos, text, font=font(size), fill=fill, anchor=anchor, stroke_width=stroke_width, stroke_fill=stroke_fill)


def vertical_gradient(size: tuple[int, int], top, mid, bottom) -> Image.Image:
    w, h = size
    img = Image.new("RGBA", size)
    px = img.load()
    for y in range(h):
        t = y / max(1, h - 1)
        if t < 0.55:
            k = t / 0.55
            color = tuple(int(top[i] * (1 - k) + mid[i] * k) for i in range(3))
        else:
            k = (t - 0.55) / 0.45
            color = tuple(int(mid[i] * (1 - k) + bottom[i] * k) for i in range(3))
        for x in range(w):
            px[x, y] = (*color, 255)
    return img


def rounded_gradient_box(size: tuple[int, int], radius: int, colors, outline=(255, 255, 255), width=4) -> Image.Image:
    w, h = size
    grad = vertical_gradient(size, *colors)
    mask = Image.new("L", size, 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle((0, 0, w - 1, h - 1), radius=radius, fill=255)
    out = Image.new("RGBA", size, (0, 0, 0, 0))
    out.paste(grad, (0, 0), mask)
    d = ImageDraw.Draw(out)
    d.rounded_rectangle((2, 2, w - 3, h - 3), radius=radius, outline=outline, width=width)
    return out


def make_rank_badge(rank: str) -> Image.Image:
    w, h = 220, 190
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    shadow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.ellipse((24, 10, 196, 148), fill=(0, 0, 0, 90))
    shadow = shadow.filter(ImageFilter.GaussianBlur(8))
    img.alpha_composite(shadow, (0, 8))

    body = rounded_gradient_box((178, 145), 44, RANK_COLORS[rank], outline=(244, 245, 255), width=5)
    img.alpha_composite(body, (21, 7))
    d = ImageDraw.Draw(img)
    for x, y, r in [(48, 25, 5), (176, 40, 4), (66, 132, 4), (151, 20, 3)]:
        d.line((x - r, y, x + r, y), fill=(255, 255, 255, 190), width=2)
        d.line((x, y - r, x, y + r), fill=(255, 255, 255, 190), width=2)
    d.ellipse((148, 14, 207, 73), fill=(94, 126, 237, 235), outline=(255, 255, 255, 230), width=4)
    d.text((178, 44), "COC", font=font(18), anchor="mm", fill=WHITE, stroke_width=1, stroke_fill=(64, 40, 120))

    rank_size = 80 if len(rank) == 1 else 70
    d.text((101, 76), rank, font=font(rank_size), anchor="mm", fill=WHITE, stroke_width=4, stroke_fill=(86, 53, 168))

    ribbon = [(36, 131), (184, 131), (205, 155), (184, 180), (36, 180), (16, 155)]
    d.polygon(ribbon, fill=(92, 63, 178, 245))
    d.line(ribbon + [ribbon[0]], fill=(242, 232, 255, 220), width=3)
    d.text((110, 154), "RANK", font=font(36), anchor="mm", fill=WHITE, stroke_width=2, stroke_fill=(80, 45, 150))
    return img


def make_stat_badge(rank: str) -> Image.Image:
    w, h = 92, 78
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    colors = RANK_COLORS.get(rank, RANK_COLORS["E"])
    body = rounded_gradient_box((84, 70), 18, colors, outline=(255, 255, 255), width=3)
    img.alpha_composite(body, (4, 4))
    size = 42 if len(rank) == 1 else 34
    d.text((46, 38), rank, font=font(size), anchor="mm", fill=WHITE, stroke_width=3, stroke_fill=colors[2])
    return img


def cover(img: Image.Image, box: list[int], radius=12, fill=(247, 252, 255, 236)) -> None:
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    patch = img.crop(tuple(box)).filter(ImageFilter.GaussianBlur(14))
    overlay.paste(patch.convert("RGBA"), tuple(box[:2]))
    img.alpha_composite(overlay)
    tint = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(tint)
    d.rounded_rectangle(tuple(box), radius=radius, fill=fill)
    img.alpha_composite(tint)


def draw_static_template() -> Image.Image:
    img = Image.open(SOURCE_TEMPLATE).convert("RGBA")
    d = ImageDraw.Draw(img)

    # Top dynamic areas.
    cover(img, [680, 176, 1042, 274], 18)
    cover(img, [690, 282, 1035, 330], 8)
    cover(img, [392, 148, 610, 338], 18)
    cover(img, [398, 334, 688, 408], 8)
    d.rounded_rectangle((224, 500, 398, 558), radius=10, fill=(250, 250, 247, 246))
    d.rounded_rectangle((682, 402, 922, 452), radius=8, fill=ORANGE)
    d.line((684, 404, 920, 404), fill=(255, 199, 48), width=3)
    d.line((684, 450, 920, 450), fill=(206, 119, 0), width=3)
    draw_text_fit(d, [416, 338, 680, 370], "整体评级（COC换算）", 26, fill=BROWN, anchor="lm", stroke_width=1)
    draw_text_fit(d, [416, 376, 650, 408], "G ~ UG 级", 27, fill=BROWN, anchor="lm", stroke_width=1)

    # Stat header: keep icons, bake fixed Chinese labels into the template.
    header_specs = [
        (32, 257, "速度"),
        (257, 482, "耐力"),
        (482, 707, "力量"),
        (707, 932, "根性"),
        (932, 1167, "智力"),
    ]
    for left, right, label in header_specs:
        d.rounded_rectangle((left + 96, 609, right - 10, 657), radius=8, fill=GREEN)
        draw_text_fit(d, [left + 98, 603, right - 10, 662], label, 31, fill=WHITE, stroke_width=1, stroke_fill=GREEN_DARK)

    # Stat value zones.
    for stat in FIELDS["stats"]:
        d.rounded_rectangle(tuple(stat["value_box"]), radius=8, fill=(250, 250, 250, 230))

    # Bottom aptitude area.
    d.rounded_rectangle((3, 805, 1196, 1286), radius=26, fill=(255, 255, 255, 245))
    for label, y in [("战斗适性", 880), ("探索适性", 1013), ("生存适性", 1148)]:
        draw_text_fit(d, [64, y - 32, 210, y + 32], label, 34, fill=BROWN, anchor="lm")

    for item in FIELDS["aptitudes"]:
        x0, y0, x1, y1 = item["box"]
        d.rounded_rectangle((x0, y0, x1, y1), radius=8, fill=(255, 255, 255, 246), outline=CARD_BORDER, width=3)

    return img.convert("RGB")


def draw_preview(blank: Image.Image) -> Image.Image:
    img = blank.convert("RGBA")
    d = ImageDraw.Draw(img)
    rank = make_rank_badge("UG").resize((FIELDS["rank_badge"]["box"][2] - FIELDS["rank_badge"]["box"][0], FIELDS["rank_badge"]["box"][3] - FIELDS["rank_badge"]["box"][1]))
    img.alpha_composite(rank, tuple(FIELDS["rank_badge"]["box"][:2]))
    draw_text_fit(d, FIELDS["character_name"]["box"], "雾岛莲", 54, fill=BROWN, stroke_width=3)
    draw_text_fit(d, FIELDS["player_name"]["box"], "玩家：玩家A", 28, fill=BROWN, stroke_width=1)
    draw_text_fit(d, FIELDS["profession"]["box"], "私家侦探", 40, fill=WHITE, stroke_width=2, stroke_fill=(176, 92, 0))
    draw_text_fit(d, FIELDS["eval_points"]["box"], "23,940", 48, fill=BROWN, anchor="lm")

    sample_stats = {
        "speed": ("SS", 1080),
        "stamina": ("S", 960),
        "power": ("A", 820),
        "guts": ("SS", 1130),
        "wisdom": ("S", 990),
    }
    for stat in FIELDS["stats"]:
        grade, value = sample_stats[stat["key"]]
        badge = make_stat_badge(grade).resize((stat["badge_box"][2] - stat["badge_box"][0], stat["badge_box"][3] - stat["badge_box"][1]))
        img.alpha_composite(badge, tuple(stat["badge_box"][:2]))
        draw_text_fit(d, stat["value_box"], str(value), 43, fill=BROWN)

    sample_aptitudes = {
        "melee": "A", "ranged": "C", "city": "A", "wild": "B", "library": "A",
        "data": "B", "endurance": "C", "emergency": "B", "mental": "A", "luck": "C",
    }
    draw_aptitude_values(d, sample_aptitudes)
    return img.convert("RGB")


def draw_aptitude_values(draw: ImageDraw.ImageDraw, aptitudes: dict[str, str]) -> None:
    for item in FIELDS["aptitudes"]:
        grade = aptitudes[item["key"]]
        box = item["box"]
        label_box = [box[0] + 18, box[1] + 14, item["grade_box"][0] - 8, box[3] - 14]
        draw_text_fit(draw, label_box, item["label"], 27, fill=BROWN, anchor="lm")
        draw_text_fit(
            draw,
            item["grade_box"],
            grade,
            42 if grade != "SS" else 34,
            fill=GRADE_COLORS.get(grade, BROWN),
            stroke_width=2,
            stroke_fill=(255, 239, 224),
        )


def draw_guide(blank: Image.Image) -> Image.Image:
    img = blank.convert("RGBA")
    d = ImageDraw.Draw(img)
    fnt = font(16)
    simple_boxes = {k: v["box"] for k, v in FIELDS.items() if isinstance(v, dict) and "box" in v}
    idx = 1
    for key, box in simple_boxes.items():
        d.rectangle(tuple(box), outline=(232, 30, 30), width=3)
        d.text((box[0], max(0, box[1] - 20)), f"{idx} {key}", font=fnt, fill=(232, 30, 30))
        idx += 1
    for stat in FIELDS["stats"]:
        for suffix in ("badge_box", "value_box"):
            box = stat[suffix]
            d.rectangle(tuple(box), outline=(232, 30, 30), width=3)
            d.text((box[0], max(0, box[1] - 20)), f"{idx} {stat['key']}_{suffix}", font=fnt, fill=(232, 30, 30))
            idx += 1
    for item in FIELDS["aptitudes"]:
        d.rectangle(tuple(item["box"]), outline=(232, 30, 30), width=3)
        d.text((item["box"][0], max(0, item["box"][1] - 20)), f"{idx} {item['key']}", font=fnt, fill=(232, 30, 30))
        idx += 1
    return img.convert("RGB")


def main() -> None:
    ASSET_DIR.mkdir(exist_ok=True)
    RANK_DIR.mkdir(exist_ok=True)
    STAT_DIR.mkdir(exist_ok=True)

    for rank in ["G", "F", "E", "D", "C", "B", "A", "S", "SS", "UG"]:
        make_rank_badge(rank).save(RANK_DIR / f"rank_{rank}.png")
    for rank in ["E", "D", "C", "B", "A", "S", "SS", "UG"]:
        make_stat_badge(rank).save(STAT_DIR / f"stat_{rank}.png")

    blank = draw_static_template()
    blank.save(BLANK)
    draw_preview(blank).save(PREVIEW)
    draw_guide(blank).save(GUIDE)
    MAP.write_text(json.dumps(FIELDS, ensure_ascii=False, indent=2), encoding="utf-8")

    print(BLANK)
    print(PREVIEW)
    print(GUIDE)
    print(MAP)


if __name__ == "__main__":
    main()
