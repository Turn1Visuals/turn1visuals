import requests
import os
import re
import json
import shutil
from pathlib import Path
from fontTools.ttLib import TTFont

# Try to import brotli decompression libraries
try:
    import brotlicffi
except ImportError:
    try:
        import brotli
    except ImportError:
        print("Warning: Neither brotli nor brotlicffi found. OTF conversion may fail.")

def download_fonts_from_css():
    """Download all fonts referenced in F1's fonts.css file and create fonts.json"""

    css_url = "https://www.formula1.com/s/fonts.css"
    base_url = "https://www.formula1.com/s/"

    fonts_dir = Path("fonts")
    tmp_dir = Path("fonts_tmp")

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }

    print(f"Fetching CSS from {css_url}...")
    response = requests.get(css_url, headers=headers)
    response.raise_for_status()

    css_content = response.text

    # Parse @font-face rules
    font_face_pattern = r'@font-face\s*\{([^}]+)\}'
    font_faces = re.findall(font_face_pattern, css_content, re.DOTALL)

    fonts_data = []
    downloaded = []
    skipped = []
    failed = []

    # Download everything into a temp directory first
    if tmp_dir.exists():
        shutil.rmtree(tmp_dir)
    tmp_dir.mkdir()

    for font_face in font_faces:
        # Extract font-family
        family_match = re.search(r'font-family:\s*["\']([^"\']+)["\']', font_face)
        if not family_match:
            continue

        family = family_match.group(1)

        # Skip unwanted fonts
        if any(x in family.lower() for x in ['titillium', 'apax', 'northwellcleanalt']):
            continue

        # Only keep Formula1, KH Interference, and Northwell fonts
        if not any(x in family.lower() for x in ['formula1', 'kh interference', 'northwell']):
            continue

        # Extract font URL
        url_match = re.search(r'url\(["\']?(\.\/fonts\/[^"\']+\.woff2)["\']?\)', font_face)
        if not url_match:
            continue

        font_path = url_match.group(1)
        font_url = base_url + font_path.lstrip('./')

        # Extract weight
        weight_match = re.search(r'font-weight:\s*(\d+)', font_face)
        weight = int(weight_match.group(1)) if weight_match else 400

        # Extract style
        style_match = re.search(r'font-style:\s*(\w+)', font_face)
        style = style_match.group(1) if style_match else 'normal'

        # Get local file path (in tmp dir)
        rel_path = font_path.replace('./fonts/', '')
        tmp_path = tmp_dir / rel_path
        tmp_path.parent.mkdir(parents=True, exist_ok=True)

        # Check if identical file already exists in the real fonts dir
        real_path = fonts_dir / rel_path

        # Generate display name
        display_name = family
        if weight == 100:
            display_name += " Thin"
        elif weight == 300:
            display_name += " Light"
        elif weight == 400 and style == 'normal':
            display_name += " Regular"
        elif weight == 500:
            display_name += " Bold" if 'wide' not in family.lower() else ""
        elif weight == 700:
            display_name += " Bold"
        elif weight == 900:
            display_name += " Black"

        if style == 'italic':
            display_name += " Italic"

        display_name = display_name.strip()

        # Download font
        try:
            print(f"Downloading {font_url}...")
            dl_response = requests.get(font_url, headers=headers, timeout=10)
            dl_response.raise_for_status()
            new_bytes = dl_response.content

            # Compare with existing file if present
            if real_path.exists():
                existing_bytes = real_path.read_bytes()
                if existing_bytes == new_bytes:
                    print(f"  = Unchanged, copying")
                    skipped.append(str(rel_path))
                    # Copy existing file to tmp so swap still works
                    shutil.copy2(real_path, tmp_path)
                    otf_real = real_path.with_suffix('.otf')
                    if otf_real.exists():
                        shutil.copy2(otf_real, tmp_path.with_suffix('.otf'))
                        otf_path = tmp_path.with_suffix('.otf')
                    else:
                        # Convert even if unchanged
                        otf_path = _convert_otf(tmp_path)
                else:
                    print(f"  ! Changed — updating")
                    tmp_path.write_bytes(new_bytes)
                    downloaded.append(str(rel_path))
                    otf_path = _convert_otf(tmp_path)
            else:
                print(f"  + New font")
                tmp_path.write_bytes(new_bytes)
                downloaded.append(str(rel_path))
                otf_path = _convert_otf(tmp_path)

            # Add to fonts data
            font_entry = {
                "name": display_name,
                "family": family,
                "file": f"fonts/{rel_path}".replace('\\', '/'),
                "file_otf": f"fonts/{rel_path.replace('.woff2', '.otf')}".replace('\\', '/') if otf_path else None,
                "url": font_url,
                "weight": weight,
                "style": style
            }

            # Avoid duplicates
            if not any(f['family'] == family and f['weight'] == weight and f['style'] == style for f in fonts_data):
                fonts_data.append(font_entry)

        except Exception as e:
            print(f"  x Failed: {e}")
            failed.append(font_url)

    # Abort if any downloads failed — keep existing fonts intact
    if failed:
        shutil.rmtree(tmp_dir)
        print(f"\n{'='*60}")
        print(f"ABORTED — {len(failed)} download(s) failed. Existing fonts/ folder was NOT modified.")
        print(f"\nFailed:")
        for url in failed:
            print(f"  - {url}")
        return None

    # All succeeded — swap tmp into place
    if fonts_dir.exists():
        shutil.rmtree(fonts_dir)
    # Use copytree+rmtree instead of rename to avoid Windows PermissionError
    # when the OS hasn't released the handle on the just-deleted fonts/ dir
    shutil.copytree(str(tmp_dir), str(fonts_dir))
    shutil.rmtree(tmp_dir)
    print(f"\nSwapped fonts_tmp -> fonts/")

    # Sort and save JSON
    fonts_data.sort(key=lambda x: (x['family'], x['weight'], x['style']))
    with open('fonts.json', 'w', encoding='utf-8') as f:
        json.dump(fonts_data, f, indent=2, ensure_ascii=False)

    print(f"\n{'='*60}")
    print(f"New/updated: {len(downloaded)}  |  Unchanged: {len(skipped)}")
    print(f"Created fonts.json with {len(fonts_data)} font entries")

    return fonts_data


def _convert_otf(woff2_path):
    """Convert a woff2 file to OTF. Returns OTF path on success, None on failure."""
    otf_path = woff2_path.with_suffix('.otf')
    try:
        font = TTFont(str(woff2_path))
        # Remove WOFF2 wrapper/flavor
        font.flavor = None

        # Ensure proper save format for OTF
        # Save as TTF first (no wrapper), then save as OTF
        font['head'].created = font['head'].modified

        # Save with explicit no flavor to get clean TTF/OTF
        font.save(str(otf_path), reorderTables=False)

        print(f"  + Converted to {otf_path.name}")
        return otf_path
    except Exception as e:
        print(f"  x OTF conversion failed: {e}")
        return None


if __name__ == "__main__":
    download_fonts_from_css()
