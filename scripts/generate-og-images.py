#!/usr/bin/env python3
"""
generate-og-images.py — Generate 1200x630 Open Graph social card images
for northlakelabs.com/max blog posts.

Warm Tactical aesthetic: amber #E8A826, dark slate #141C24, IBM Plex Mono.

Usage:
  python3 scripts/generate-og-images.py               # All posts missing OG images
  python3 scripts/generate-og-images.py --all          # Regenerate all (including existing)
  python3 scripts/generate-og-images.py --slug my-post # Single post by slug
  python3 scripts/generate-og-images.py --method imagemagick  # Force ImageMagick (no AI)
  python3 scripts/generate-og-images.py --method gemini       # Force Gemini image gen (default)

Output: public/assets/og/<slug>.png
Frontmatter: Automatically updates blog post to add/update 'image' field.
"""

import os
import sys
import re
import subprocess
import argparse
import shutil
from pathlib import Path

# ─── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).parent
SITE_ROOT = SCRIPT_DIR.parent
CONTENT_DIR = SITE_ROOT / "src/content/max-blog"
OG_OUTPUT_DIR = SITE_ROOT / "public/assets/og"
GEMINI_SCRIPT = Path.home() / ".openclaw/workspace/scripts/gemini-image.sh"

# ─── Colors ──────────────────────────────────────────────────────────────────
AMBER = "#E8A826"
COPPER = "#D4813F"
CHARCOAL = "#141C24"
SLATE = "#222F3E"
WARM_GRAY = "#9CA3A8"

# ─── Font ─────────────────────────────────────────────────────────────────────
# Preference order: IBM Plex Mono → JetBrainsMono Nerd Font → Liberation Mono → Monospace
MONO_FONTS = [
    "IBM Plex Mono",
    "JetBrainsMono Nerd Font",
    "JetBrainsMonoNL Nerd Font",
    "Cascadia Code",
    "Liberation Mono",
    "DejaVu Sans Mono",
    "Noto Sans Mono",
    "Monospace",
]


def get_available_font():
    """Find first available monospace font via fc-list."""
    try:
        result = subprocess.run(
            ["fc-list", "--format=%{family[0]}\n"],
            capture_output=True, text=True, timeout=5
        )
        available = set(result.stdout.splitlines())
        for font in MONO_FONTS:
            if font in available:
                return font
    except Exception:
        pass
    return "Monospace"  # universal fallback


def parse_frontmatter(md_path: Path) -> dict:
    """Extract YAML frontmatter from a markdown file."""
    content = md_path.read_text()
    match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
    if not match:
        return {}
    
    fm = {}
    for line in match.group(1).splitlines():
        if ': ' in line:
            key, _, val = line.partition(': ')
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            fm[key] = val
    return fm


def update_image_frontmatter(md_path: Path, image_path: str):
    """Add or update the 'image' field in frontmatter."""
    content = md_path.read_text()
    
    if re.search(r'^image:', content, re.MULTILINE):
        # Update existing
        content = re.sub(
            r'^image:.*$',
            f'image: "{image_path}"',
            content,
            flags=re.MULTILINE
        )
    else:
        # Insert after tags or excerpt line
        for insert_after in ['tags:', 'excerpt:', 'date:']:
            pattern = re.compile(
                rf'(^{insert_after}.*(?:\n  -.+)*)',
                re.MULTILINE
            )
            if pattern.search(content):
                content = pattern.sub(
                    rf'\1\nimage: "{image_path}"',
                    content,
                    count=1
                )
                break
    
    md_path.write_text(content)
    print(f"  → Updated frontmatter: {md_path.name}")


def wrap_text(text: str, max_chars: int) -> list[str]:
    """Wrap text to multiple lines, respecting word boundaries."""
    words = text.split()
    lines = []
    current = ""
    
    for word in words:
        if len(current) + len(word) + 1 <= max_chars:
            current = (current + " " + word).strip()
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    
    return lines


def generate_imagemagick(slug: str, title: str, excerpt: str, output_path: Path):
    """Generate OG card using ImageMagick — text-based Warm Tactical design."""
    
    font = get_available_font()
    print(f"  Font: {font}")
    
    W, H = 1200, 630
    
    # Wrap title and excerpt
    title_lines = wrap_text(title, 38)
    excerpt_lines = wrap_text(excerpt[:120] + ("..." if len(excerpt) > 120 else ""), 58)
    
    # Build title text block
    title_text = "\n".join(title_lines[:3])  # max 3 lines
    excerpt_text = "\n".join(excerpt_lines[:2])  # max 2 lines
    
    # Compute title Y position (centered vertically with excerpt)
    title_y = 180
    
    cmd = [
        "magick",
        # Canvas
        "-size", f"{W}x{H}",
        f"xc:{CHARCOAL}",
        # Amber left border stripe
        "-fill", AMBER,
        "-draw", f"rectangle 0,0 6,{H}",
        # Subtle amber top line
        "-fill", AMBER,
        "-draw", f"rectangle 0,0 {W},2",
        # Subtle bottom gradient line
        "-fill", COPPER,
        "-draw", f"rectangle 0,{H-2} {W},{H}",
        # Decorative corner geometry (top-right)
        "-fill", "none",
        "-stroke", COPPER,
        "-strokewidth", "1",
        "-draw", f"rectangle 40,40 {W-40},{H-40}",
        # Inner amber corner accents
        "-stroke", AMBER,
        "-strokewidth", "2",
        "-draw", f"line 40,40 140,40",      # TL horizontal
        "-draw", f"line 40,40 40,120",       # TL vertical
        "-draw", f"line {W-140},40 {W-40},40",  # TR horizontal
        "-draw", f"line {W-40},40 {W-40},120",  # TR vertical
        "-draw", f"line 40,{H-120} 40,{H-40}",  # BL vertical
        "-draw", f"line 40,{H-40} 140,{H-40}",  # BL horizontal
        "-draw", f"line {W-40},{H-120} {W-40},{H-40}",  # BR vertical
        "-draw", f"line {W-140},{H-40} {W-40},{H-40}",  # BR horizontal
        # MAXIMUS brand label (top-right)
        "-font", font,
        "-pointsize", "18",
        "-fill", COPPER,
        "-annotate", f"+{W-180}+75", "MAXIMUS",
        # Tagline
        "-pointsize", "14",
        "-fill", WARM_GRAY,
        "-annotate", f"+{W-180}+100", "northlakelabs.com/max",
        # Title text (amber, large)
        "-pointsize", "52",
        "-fill", AMBER,
        "-font", font,
        "-annotate", f"+80+{title_y}", title_text,
        # Excerpt (warm gray, smaller)
        "-pointsize", "24",
        "-fill", WARM_GRAY,
        "-annotate", f"+80+{title_y + 60 + len(title_lines) * 58}", excerpt_text,
        # Blog label bottom-left
        "-pointsize", "16",
        "-fill", COPPER,
        "-annotate", f"+80+{H-65}", "MAXIMUS BLOG",
        # Slug bottom-center  
        "-pointsize", "14",
        "-fill", WARM_GRAY,
        "-annotate", f"+80+{H-45}", f"/{slug}",
        # Output
        str(output_path)
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  ✗ ImageMagick error: {result.stderr[:200]}")
        return False
    
    print(f"  ✓ Generated (ImageMagick): {output_path.name}")
    return True


def generate_gemini(slug: str, title: str, excerpt: str, output_path: Path):
    """Generate OG card using Gemini AI image generation."""
    if not GEMINI_SCRIPT.exists():
        print(f"  ✗ Gemini script not found at {GEMINI_SCRIPT}")
        return False
    
    # Extract key themes from tags/title for the prompt
    prompt = (
        f"Art deco aperture iris social card for a tech blog post titled '{title}'. "
        f"Dark slate background #141C24, warm amber #E8A826 glow from center, "
        f"copper mechanical iris with 8 blades, glowing amber circuit traces, "
        f"IBM Plex Mono terminal typography, bokeh light particles, "
        f"steampunk-digital fusion aesthetic, 1200x630 wide OG card format, "
        f"MAXIMUS AI agent blog, warm tactical amber color palette."
    )
    
    result = subprocess.run(
        ["bash", str(GEMINI_SCRIPT), prompt, str(output_path), "creative"],
        capture_output=True, text=True, timeout=120
    )
    
    if result.returncode == 0 and output_path.exists():
        print(f"  ✓ Generated (Gemini): {output_path.name}")
        return True
    else:
        print(f"  ✗ Gemini failed: {result.stderr[:200]}")
        print(f"  → Falling back to ImageMagick...")
        return False


def generate_og_image(slug: str, title: str, excerpt: str, method: str = "gemini") -> bool:
    """Generate OG image using specified method, with fallback."""
    OG_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OG_OUTPUT_DIR / f"{slug}.png"
    
    if method == "gemini":
        success = generate_gemini(slug, title, excerpt, output_path)
        if not success:
            success = generate_imagemagick(slug, title, excerpt, output_path)
    else:
        success = generate_imagemagick(slug, title, excerpt, output_path)
    
    return success


def main():
    parser = argparse.ArgumentParser(description="Generate OG social card images")
    parser.add_argument("--all", action="store_true", help="Regenerate all posts (including existing)")
    parser.add_argument("--slug", help="Generate for a single post slug")
    parser.add_argument("--method", choices=["gemini", "imagemagick"], default="gemini",
                        help="Generation method (default: gemini)")
    parser.add_argument("--no-frontmatter", action="store_true",
                        help="Skip updating frontmatter")
    args = parser.parse_args()
    
    posts = list(CONTENT_DIR.glob("*.md"))
    print(f"Found {len(posts)} blog posts")
    
    generated = []
    skipped = []
    failed = []
    
    for md_path in sorted(posts):
        slug = md_path.stem
        
        # Filter by slug if specified
        if args.slug and slug != args.slug:
            continue
        
        fm = parse_frontmatter(md_path)
        title = fm.get("title", slug.replace("-", " ").title())
        excerpt = fm.get("excerpt", "")
        
        output_path = OG_OUTPUT_DIR / f"{slug}.png"
        
        # Skip if already exists and not --all
        if output_path.exists() and not args.all and not args.slug:
            skipped.append(slug)
            continue
        
        print(f"\n[{slug}]")
        print(f"  Title: {title[:60]}")
        
        success = generate_og_image(slug, title, excerpt, args.method)
        
        if success:
            generated.append(slug)
            # Update frontmatter
            if not args.no_frontmatter:
                update_image_frontmatter(md_path, f"/assets/og/{slug}.png")
        else:
            failed.append(slug)
    
    print(f"\n{'='*50}")
    print(f"Generated: {len(generated)} | Skipped: {len(skipped)} | Failed: {len(failed)}")
    if generated:
        print(f"New images: {', '.join(generated)}")
    if failed:
        print(f"Failed: {', '.join(failed)}")


if __name__ == "__main__":
    main()
