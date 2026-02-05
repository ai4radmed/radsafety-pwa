import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const MANUSCRIPTS_DIR = 'manuscripts';
const PDF_TARGET_DIR = 'public/resources';
const HTML_TARGET_DIR = 'src/content/smart_resources';

function getManuscriptProjects(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            if (fs.existsSync(path.join(filePath, '_quarto.yml'))) {
                results.push(filePath);
            } else {
                results = results.concat(getManuscriptProjects(filePath));
            }
        }
    });
    return results;
}

const projects = getManuscriptProjects(MANUSCRIPTS_DIR);

// Ensure target directories exist
[PDF_TARGET_DIR, HTML_TARGET_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

projects.forEach(projectDir => {
    const baseName = path.basename(projectDir);
    console.log(`Processing Manuscript Project: ${baseName}...`);

    try {
        // 1. Quarto Render & Move HTML
        console.log(`- Rendering HTML...`);
        execSync(`quarto render index.qmd --to html -P embed-resources:true`, { cwd: projectDir });
        const htmlPossiblePaths = [
            path.join(projectDir, 'index.html'),
            path.join(projectDir, '_manuscript', 'index.html'),
            path.join(projectDir, `${baseName}.html`)
        ];
        let htmlMoved = false;
        for (const p of htmlPossiblePaths) {
            if (fs.existsSync(p)) {
                fs.copyFileSync(p, path.join(PDF_TARGET_DIR, `${baseName}.html`));
                console.log(`- Copied Standalone HTML: ${baseName}.html`);
                htmlMoved = true;
                break;
            }
        }
        if (!htmlMoved) console.warn(`- Warning: Could not find HTML output for ${baseName}`);

        // 2. Quarto Render & Move PDF
        console.log(`- Rendering PDF...`);
        execSync(`quarto render index.qmd --to pdf`, { cwd: projectDir });
        const pdfPossiblePaths = [
            path.join(projectDir, 'index.pdf'),
            path.join(projectDir, '_manuscript', 'index.pdf'),
            path.join(projectDir, `${baseName}.pdf`)
        ];
        let pdfMoved = false;
        for (const p of pdfPossiblePaths) {
            if (fs.existsSync(p)) {
                fs.copyFileSync(p, path.join(PDF_TARGET_DIR, `${baseName}.pdf`));
                console.log(`- Copied PDF: ${baseName}.pdf`);
                pdfMoved = true;
                break;
            }
        }
        if (!pdfMoved) console.warn(`- Warning: Could not find PDF output for ${baseName}`);

        // 4. Generate MD Fragment for Astro
        // We use pandoc on the main index.qmd
        const indexQmd = path.join(projectDir, 'index.qmd');
        const tempMd = path.join(projectDir, `${baseName}.md`); // Use projectDir for temp file

        if (fs.existsSync(indexQmd)) {
            execSync(`pandoc ${indexQmd} -t commonmark -s -o ${tempMd}`);

            if (fs.existsSync(tempMd)) {
                let content = fs.readFileSync(tempMd, 'utf8');
                // Add frontmatter if not present
                if (!content.startsWith('---')) {
                    content = `---\ntitle: "${baseName}"\n---\n\n${content}`;
                }
                fs.writeFileSync(path.join(HTML_TARGET_DIR, `${baseName}.md`), content);
                fs.unlinkSync(tempMd); // Clean up temp markdown file
                console.log(`- Updated Astro Content: ${baseName}.md`);
            } else {
                console.error(`- Error: Pandoc failed to create temporary markdown for ${baseName}`);
            }
        } else {
            console.warn(`- Warning: No index.qmd found in ${projectDir}, skipping MD fragment generation.`);
        }

    } catch (err) {
        console.error(`Failed to process ${baseName}:`, err.message);
    }
});
