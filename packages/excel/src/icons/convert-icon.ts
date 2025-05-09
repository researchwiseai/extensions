// convert-icons.ts
import { readdir } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const sizes = [16, 32, 80];

function toKebabCase(name: string): string {
    // remove "24Regular" suffix, split on camelCase boundaries, lowercase and join with '-'
    return name
        .replace(/24Regular$/, '')
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .toLowerCase();
}

async function main() {
    const dir = process.cwd();
    const entries = await readdir(dir);
    const svgs = entries.filter(
        (f) => path.extname(f).toLowerCase() === '.svg',
    );

    for (const svg of svgs) {
        const base = path.basename(svg, '.svg');
        const kebab = toKebabCase(base);

        for (const size of sizes) {
            const out = `${kebab}-${size}.png`;
            await sharp(path.join(dir, svg))
                .resize(size, size)
                .png()
                .toFile(path.join(dir, out));
            console.log(`Wrote ${out}`);
        }
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
