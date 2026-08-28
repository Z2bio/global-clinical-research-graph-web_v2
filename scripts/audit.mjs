import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const required = [
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  '.nojekyll',
  'assets/css/styles.css',
  'assets/js/app.js',
  'assets/js/api.js',
  'assets/js/config.js',
  'assets/js/dictionary.js',
  'assets/js/normalizer.js',
  'assets/js/storage.js',
  'assets/js/federated.js',
  'assets/js/graph.js',
  'data/who-ictrp.json',
  'data/chictr.json',
  'data/nmrr.json',
  'data/nmpa.json',
  'assets/favicon.svg',
  'README.md'
]

const errors = []
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`Missing required file: ${file}`)
}

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
const checks = [
  ['language declaration', /<html lang="zh-CN">/],
  ['responsive viewport', /name="viewport"/],
  ['medical disclaimer', /不构成医疗建议/],
  ['ClinicalTrials source', /clinicaltrials\.gov/i],
  ['WHO ICTRP source', /WHO ICTRP/i],
  ['ChiCTR source', /ChiCTR/i],
  ['NMPA source', /NMPA/i],
  ['medical research filing source', /医学研究登记备案/i],
  ['module entry', /type="module" src="\.\/assets\/js\/app\.js"/],
  ['main landmark', /<main id="main-content">/],
  ['search label', /role="search"/]
]
for (const [name, pattern] of checks) {
  if (!pattern.test(html)) errors.push(`HTML audit failed: ${name}`)
}


const htmlIds = new Set([...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]))
const appSource = fs.readFileSync(path.join(root, 'assets/js/app.js'), 'utf8')
const idSelectors = [...appSource.matchAll(/\$\('#([^']+)'/g)].map((match) => match[1])
for (const selector of idSelectors) {
  if (!htmlIds.has(selector) && !selector.startsWith('m-')) errors.push(`JavaScript references missing HTML id: ${selector}`)
}

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'))
if (!manifest.start_url?.startsWith('./')) errors.push('Manifest start_url must be repository-relative for GitHub Pages')

const jsFiles = fs.readdirSync(path.join(root, 'assets/js')).filter((name) => name.endsWith('.js'))
for (const name of jsFiles) {
  const content = fs.readFileSync(path.join(root, 'assets/js', name), 'utf8')
  if (/eval\s*\(/.test(content)) errors.push(`Unsafe eval found in ${name}`)
  if (/innerHTML\s*=\s*[^`'"\n]/.test(content) && name !== 'app.js') errors.push(`Review dynamic innerHTML in ${name}`)
}

if (errors.length) {
  console.error(`Audit failed with ${errors.length} issue(s):`)
  errors.forEach((error) => console.error(`- ${error}`))
  process.exit(1)
}

console.log(`Audit passed: ${required.length} required files, ${checks.length} HTML checks, ${idSelectors.length} DOM id references, ${jsFiles.length} JavaScript modules.`)
