const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const full = path.join(dir, file);
        if (fs.statSync(full).isDirectory()) {
            processDir(full);
        } else if (full.endsWith('.tsx') || full.endsWith('.ts')) {
            let content = fs.readFileSync(full, 'utf8');

            const modified = content.replace(/className="([^"]*)"/g, (match, classes) => {
                let clsList = classes.trim().split(/\s+/).filter(Boolean);

                let hasBgWhite = clsList.includes('bg-white');
                let hasDarkBg = clsList.some(c => c.startsWith('dark:bg-'));
                if (hasBgWhite && !hasDarkBg) {
                    clsList.push('dark:bg-[#111111]');
                }

                let hasBgSlate50 = clsList.includes('bg-slate-50') || clsList.includes('bg-gray-50');
                if (hasBgSlate50 && !hasDarkBg) {
                    clsList.push('dark:bg-[#1a1a1a]');
                }

                let hasTextSlate900 = clsList.includes('text-slate-900') || clsList.includes('text-gray-900');
                let hasDarkText = clsList.some(c => c.startsWith('dark:text-'));
                if (hasTextSlate900 && !hasDarkText) {
                    clsList.push('dark:text-white');
                }

                return `className="${clsList.join(' ')}"`;
            });

            if (content !== modified) {
                fs.writeFileSync(full, modified);
            }
        }
    }
}
processDir(path.join(__dirname, 'components/admin'));
processDir(path.join(__dirname, 'app/admin'));
console.log('Script completed');
