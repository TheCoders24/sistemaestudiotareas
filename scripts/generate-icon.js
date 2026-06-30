const {default: pngToIco} = require('png-to-ico')
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

async function generateIcon() {
  const svgPath = path.join(__dirname, '..', 'build', 'icon.svg')
  const icoPath = path.join(__dirname, '..', 'build', 'icon.ico')

  const sizes = [16, 24, 32, 48, 64, 96, 128, 256]
  const pngs = await Promise.all(
    sizes.map(s => sharp(svgPath).resize(s, s).png().toBuffer())
  )

  for (let i = 0; i < sizes.length; i++) {
    console.log(`  \u2713 ${sizes[i]}x${sizes[i]}`)
  }

  const icoBuffer = await pngToIco(pngs)
  fs.writeFileSync(icoPath, icoBuffer)
  console.log(`\n\u2713 Icon generated: ${icoPath} (${(icoBuffer.length / 1024).toFixed(1)} KB)`)
}

generateIcon().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
