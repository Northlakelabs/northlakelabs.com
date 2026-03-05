#!/usr/bin/env python3
"""
OG Image Generator for northlakelabs.com/max/blog
Generates 1200x630 images with Warm Tactical aesthetic (amber/slate theme)

Usage:
  python3 scripts/generate-og-images.py
  python3 scripts/generate-og-images.py --slug hello-world  # Single post
"""

import os
import sys
import re
import textwrap
import argparse
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

# ── Warm Tactical Palette ──────────────────────────────────────────────────
AMBER       = (232, 168, 38)    # #E8A826
COPPER      = (212, 129, 63)    # #D4813F
SLATE       = (34, 47, 62)      # #222F3E
CHARCOAL    = (20, 28, 36)      # #141C24
WARM_GRAY   = (156, 163, 168)   # #9CA3A8
STEEL_BLUE  = (107, 143, 173)   # #6B8FAD

# ── Layout ─────────────────────────────────────────────────────────────────
W, H = 1200, 630

# ── Fonts ──────────────────────────────────────────────────────────────────
FONT_BOLD   = "/usr/share/fonts/TTF/JetBrainsMonoNerdFont-Bold.ttf"
FONT_REG    = "/usr/share/fonts/TTF/JetBrainsMonoNerdFont-Regular.ttf"
FONT_FALLBACK = "/usr/share/fonts/noto/NotoSansMono-Bold.ttf"

def load_font(path, size, fallback=None):
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        if fallback:
            try:
                return ImageFont.truetype(fallback, size)
            except Exception:
                pass
    return ImageFont.load_default()


def parse_frontmatter(md_path):
    """Extract title and excerpt from markdown frontmatter."""
    content = Path(md_path).read_text(encoding="utf-8")
    fm_match = re.match(r"^---\s*\n(.*?)\n---", content, re.DOTALL)
    if not fm_match:
        return None, None
    fm = fm_match.group(1)
    
    title_m = re.search(r'^title:\s*["\']?(.+?)["\']?\s*$', fm, re.MULTILINE)
    excerpt_m = re.search(r'^excerpt:\s*["\']?(.+?)["\']?\s*$', fm, re.MULTILINE)
    
    title = title_m.group(1).strip().strip('"\'') if title_m else None
    excerpt = excerpt_m.group(1).strip().strip('"\'') if excerpt_m else None
    return title, excerpt


def draw_scanlines(draw, alpha=8):
    """Subtle amber scanline overlay."""
    for y in range(0, H, 3):
        draw.line([(0, y), (W, y)], fill=(*AMBER, alpha), width=1)


def draw_grid(draw, alpha=12):
    """Subtle background grid."""
    spacing = 40
    for x in range(0, W, spacing):
        draw.line([(x, 0), (x, H)], fill=(*SLATE, alpha), width=1)
    for y in range(0, H, spacing):
        draw.line([(0, y), (W, y)], fill=(*SLATE, alpha), width=1)


def wrap_title(title, font, max_width, draw):
    """Word-wrap title to fit within max_width."""
    words = title.split()
    lines = []
    current = []
    for word in words:
        test = " ".join(current + [word])
        bbox = draw.textbbox((0, 0), test, font=font)
        if bbox[2] > max_width and current:
            lines.append(" ".join(current))
            current = [word]
        else:
            current.append(word)
    if current:
        lines.append(" ".join(current))
    return lines


def generate_og_image(title, excerpt, out_path):
    # Base: deep charcoal
    img = Image.new("RGB", (W, H), CHARCOAL)
    draw = ImageDraw.Draw(img, "RGBA")

    # Background grid
    draw_grid(draw, alpha=18)

    # Left accent bar (amber)
    draw.rectangle([(0, 0), (6, H)], fill=AMBER)

    # Top accent line
    draw.rectangle([(0, 0), (W, 3)], fill=AMBER)

    # Bottom accent line
    draw.rectangle([(0, H-3), (W, H)], fill=COPPER)

    # Slate header panel (top area)
    draw.rectangle([(0, 0), (W, 180)], fill=(*SLATE, 200))

    # Corner decorations — art deco brackets
    bracket_color = (*COPPER, 160)
    bw = 30
    # Top-right
    draw.rectangle([(W-bw, 0), (W, 4)], fill=bracket_color)
    draw.rectangle([(W-4, 0), (W, bw)], fill=bracket_color)
    # Bottom-right  
    draw.rectangle([(W-bw, H-4), (W, H)], fill=bracket_color)
    draw.rectangle([(W-4, H-bw), (W, H)], fill=bracket_color)

    # ── Fonts
    font_tag  = load_font(FONT_BOLD, 20, FONT_FALLBACK)
    font_name = load_font(FONT_BOLD, 28, FONT_FALLBACK)
    font_title_lg = load_font(FONT_BOLD, 68, FONT_FALLBACK)
    font_title_md = load_font(FONT_BOLD, 52, FONT_FALLBACK)
    font_title_sm = load_font(FONT_BOLD, 40, FONT_FALLBACK)
    font_excerpt  = load_font(FONT_REG if os.path.exists(FONT_REG) else FONT_BOLD, 26, FONT_FALLBACK)

    # ── Header area ──────────────────────────────────────────────────────
    # "MAXIMUS" branding top-left
    draw.text((30, 24), "MAXIMUS", font=font_name, fill=AMBER)
    # Tag line
    draw.text((30, 58), "northlakelabs.com/max", font=font_tag, fill=(*WARM_GRAY, 180))

    # Separator line under header
    draw.rectangle([(30, 96), (W-30, 98)], fill=(*AMBER, 80))

    # ── Title ──────────────────────────────────────────────────────────
    pad_x = 36
    max_title_w = W - pad_x * 2 - 20

    # Pick font size based on title length
    if len(title) <= 35:
        title_font = font_title_lg
    elif len(title) <= 55:
        title_font = font_title_md
    else:
        title_font = font_title_sm

    title_lines = wrap_title(title, title_font, max_title_w, draw)

    # Position: vertically center title in the lower 2/3
    line_h = draw.textbbox((0,0), "Ay", font=title_font)[3] + 10
    title_block_h = len(title_lines) * line_h
    title_y = 180 + (260 - title_block_h) // 2  # center in 180-440 zone

    for i, line in enumerate(title_lines):
        y = title_y + i * line_h
        # Subtle text shadow
        draw.text((pad_x + 2, y + 2), line, font=title_font, fill=(*CHARCOAL, 180))
        draw.text((pad_x, y), line, font=title_font, fill=AMBER)

    # ── Excerpt ────────────────────────────────────────────────────────
    if excerpt:
        excerpt_y = max(title_y + title_block_h + 24, 450)
        # Clamp to visible area
        if excerpt_y < H - 100:
            exc_lines = textwrap.wrap(excerpt, width=75)[:3]
            for i, line in enumerate(exc_lines):
                draw.text((pad_x, excerpt_y + i * 36), line, font=font_excerpt, fill=WARM_GRAY)

    # ── Bottom bar ─────────────────────────────────────────────────────
    draw.rectangle([(0, H-60), (W, H)], fill=(*CHARCOAL, 220))
    draw.text((pad_x, H-42), "⚔  maximus", font=font_tag, fill=(*COPPER, 200))
    draw.text((W-200, H-42), "blog.northlakelabs.com", font=font_tag, fill=(*WARM_GRAY, 140))

    # ── Scanlines overlay ─────────────────────────────────────────────
    draw_scanlines(draw, alpha=6)

    # Save
    img.save(out_path, "PNG", optimize=True)
    print(f"  ✓ {out_path.name}")


def main():
    parser = argparse.ArgumentParser(description="Generate OG images for blog posts")
    parser.add_argument("--slug", help="Generate for single slug only")
    parser.add_argument("--force", action="store_true", help="Overwrite existing images")
    args = parser.parse_args()

    site_root = Path(__file__).parent.parent
    blog_dir  = site_root / "src" / "content" / "max-blog"
    og_dir    = site_root / "public" / "assets" / "og"
    og_dir.mkdir(parents=True, exist_ok=True)

    posts = sorted(blog_dir.glob("*.md"))
    if args.slug:
        posts = [p for p in posts if p.stem == args.slug]
        if not posts:
            print(f"No post found with slug: {args.slug}")
            sys.exit(1)

    print(f"Generating OG images → {og_dir}")
    generated = 0
    skipped = 0

    for md_path in posts:
        slug = md_path.stem
        out_path = og_dir / f"{slug}.png"

        if out_path.exists() and not args.force:
            # Check if it's the right size
            try:
                img = Image.open(out_path)
                if img.size == (W, H):
                    skipped += 1
                    continue
            except Exception:
                pass

        title, excerpt = parse_frontmatter(md_path)
        if not title:
            print(f"  ⚠ No title found: {slug}")
            continue

        generate_og_image(title, excerpt or "", out_path)
        generated += 1

    print(f"\nDone: {generated} generated, {skipped} skipped (already 1200x630)")
    return generated, skipped


if __name__ == "__main__":
    main()
