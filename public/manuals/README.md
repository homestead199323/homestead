# Manual Images

Drop the 8 PNG/JPG project manual images here with these EXACT filenames.
Until they exist, the manual detail pages will show a broken-image icon.

| Filename                  | Manual key in code | Image # in source set |
|---------------------------|--------------------|-----------------------|
| `1-raised-bed.png`        | `raised_bed`       | 1                     |
| `2-chicken-coop.png`      | `chicken_coop`     | 2                     |
| `3-compost-bin.png`       | `compost_bin`      | 3                     |
| `4-rain-barrel.png`       | `rain_barrel`      | 4                     |
| `5-perimeter-fencing.png` | `fencing`          | 5                     |
| `6-tool-shed.png`         | `tool_shed`        | 6                     |
| `7-cold-frame.png`        | `cold_frame`       | 7                     |
| `8-drip-irrigation.png`   | `drip_irrigation`  | 8                     |

Notes:
- `.png` extension is hard-coded in `src/App.jsx` (Blueprint component). If you
  need `.jpg`/`.webp`, change the extension there too.
- Files are served at `/manuals/<filename>` because `public/` is the Vite static
  root.
