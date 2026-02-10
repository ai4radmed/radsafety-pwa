const fs = require('fs');
const path = require('path');

const contentDir = '/home/ben/projects/radsafety-pwa/src/content/findings_recommendations';
const files = fs.readdirSync(contentDir).filter(f => f.startsWith('migrated-') && f.endsWith('.md'));

const TAG_MAPPING = {
    '시설/보안': ['선량오염측정', '시설검사'],
    '인허가/서류': ['변경신고', '기록비치', '변경허가'],
    '인력/조직': ['교육훈련', '장비인력', '건강진단'],
    '장비/선원': ['기술기준', '장비인력', '피폭관리']
};

files.forEach(file => {
    const filePath = path.join(contentDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');

    // Simple Frontmatter Regex
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) return;

    let fm = fmMatch[1];
    let body = content.substring(fmMatch[0].length);

    // Parse Category
    const catMatch = fm.match(/category:\s*['"]?(.*?)['"]?$/m);
    const category = catMatch ? catMatch[1] : '기타';

    // Determine Tag
    let newTag = '기타미분류';
    if (TAG_MAPPING[category]) {
        const candidates = TAG_MAPPING[category];
        newTag = candidates[Math.floor(Math.random() * candidates.length)];
    }

    // Determine Year (2020 - 2024)
    const year = Math.floor(Math.random() * (2024 - 2020 + 1)) + 2020;

    // Check if tags/year already exist to avoid duplication
    if (!fm.includes('tags:')) {
        fm += `\ntags: ['${newTag}']`;
    }
    // Update or Append Year (Force String)
    if (fm.includes('inspectionYear:')) {
        fm = fm.replace(/inspectionYear: \d+/, `inspectionYear: '${year}'`);
        fm = fm.replace(/inspectionYear: '\d+'/, `inspectionYear: '${year}'`); // Safety if already string
    } else {
        fm += `\ninspectionYear: '${year}'`;
    }

    // Reconstruct
    const newContent = `---\n${fm}\n---${body}`;
    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log(`Updated ${file}: Tag=[${newTag}], Year=${year}`);
});
