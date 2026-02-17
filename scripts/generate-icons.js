
import sharp from 'sharp';
import fs from 'fs';

const svgPath = 'public/favicon.svg';
const sizes = [192, 512];

async function generate() {
    if (!fs.existsSync(svgPath)) {
        console.error('favicon.svg not found');
        return;
    }

    for (const size of sizes) {
        await sharp(svgPath)
            .resize(size, size)
            .png()
            .toFile(`public/icon-${size}.png`);
        console.log(`Generated public/icon-${size}.png`);
    }
}

generate();
