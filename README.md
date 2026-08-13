# remove-ai-watermark

[![npm version](https://img.shields.io/npm/v/remove-ai-watermark.svg)](https://www.npmjs.com/package/remove-ai-watermark)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Sanitize images, text files, and codebases by stripping C2PA content credentials, EXIF metadata, invisible zero-width unicode watermarks, Bidi control characters, LLM prompt tokens, and steganography signals (SynthID disruption).

Built for fast batch codebase processing via CLI or Node library.

---

## Features

- **Invisible Unicode & Zero-Width Stripping:** Removes hidden zero-width spaces (`\u200B`, `\u200C`, `\u200D`, `\uFEFF`, `\u00AD`, `\u2060`, `\u2061`-`\u2064`, `\u200E`, `\u200F`).
- **Bidi Security Protection:** Cleans Right-to-Left Override (`\u202E`) and invisible unicode control formatting characters.
- **LLM Prompt Token Cleaning:** Strips leftover system tokens (``, ``, ``, ``, ``, etc.).
- **Language-Aware Comment Sanitization:** Cleans AI attribution comment headers in JavaScript, TypeScript, Python, HTML, CSS, JSON, YAML, SQL, and Markdown.
- **Image Metadata & C2PA Stripping:** Removes EXIF metadata, IPTC, XMP, C2PA manifest chunks, and PNG text chunks across PNG, JPEG, WebP, AVIF, TIFF, and GIF formats.
- **Pixel Buffer Re-Encoding:** Re-encodes canvas pixel data through `sharp` to disrupt invisible steganographic pixel signals (SynthID).
- **Visual Corner Crop:** Optional `--crop-corner` parameter to trim off visual corner logos.
- **Batch Codebase Sweeping:** Recursively scans folders, respects `.gitignore` and `.watermarkignore` files, skips `node_modules`, and supports parallel concurrent file workers.
- **CI / Pre-Commit Integration:** Includes `--check` (CI audit exit code mode), `--dry-run` (preview mode), and `init` wizard for pre-commit hooks and GitHub Actions.

---

## Installation

```bash
# Global installation for CLI
npm install -g remove-ai-watermark

# Local installation as dependency
npm install remove-ai-watermark
```

---

## CLI Usage

### Basic Batch Directory Cleaning

Overwrites cleaned files in place across an entire project directory:

```bash
npx remove-ai-watermark -i .
```

Cleans target directory and outputs to a destination folder preserving relative directory structure:

```bash
npx remove-ai-watermark ./src -o ./dist_clean
```

### Preview and CI Verification

Preview changes without modifying files:

```bash
npx remove-ai-watermark --dry-run .
```

CI Audit mode (exits with code `1` if any AI watermarks or zero-width spaces are found):

```bash
npx remove-ai-watermark --check .
```

### One-Click Project & CI Setup

Initialize `.watermarkrc` configuration and install Git pre-commit hook:

```bash
npx remove-ai-watermark init
```

Generate GitHub Actions workflow file (`.github/workflows/verify-watermarks.yml`):

```bash
npx remove-ai-watermark init --ci
```

---

## CLI Options

| Flag | Description |
|---|---|
| `-i, --in-place` | Overwrite files in place |
| `-o, --out-dir <dir>` | Output cleaned files to destination directory |
| `--dry-run` | Preview changes without writing to disk |
| `--check` | Audit mode (exits with code 1 if watermarks are detected) |
| `--crop-corner <corner>` | Crop corner stamp (`bottom-right`, `bottom-left`, `top-right`, `top-left`) |
| `--text-only` | Clean text and source code files only |
| `--image-only` | Clean image files only |
| `--concurrency <N>` | Set concurrent worker limit (default: 16) |
| `-v, --verbose` | Print detailed file-by-file log |
| `-h, --help` | Display help information |

---

## Programmatic Library Usage

```javascript
const { cleanText, cleanImage, cleanPath } = require('remove-ai-watermark');

// Clean string content
const { text, stats } = cleanText('Hello\u200BWorld');
console.log(text); // "HelloWorld"
console.log(stats.zeroWidthCount); // 1

// Clean image buffer
const { buffer, stats: imgStats } = await cleanImage(inputBuffer, {
  cropCorner: 'bottom-right'
});
console.log(imgStats.bytesSaved);

// Clean directory recursively
const summary = await cleanPath('./src', { inPlace: true });
console.log(`Cleaned ${summary.changedFiles} files`);
```

---

## Configuration (`.watermarkrc`)

Create a `.watermarkrc` or `.watermarkrc.json` file in your repository root:

```json
{
  "ignore": ["node_modules", ".git", "dist", "build", ".next", "vendor"],
  "textOnly": false,
  "imageOnly": false,
  "stripZeroWidth": true,
  "stripBidi": true,
  "stripTokens": true,
  "stripComments": true,
  "concurrency": 16
}
```

---

## License

MIT © Aman Ghuman
