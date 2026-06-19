/**
 * Local replacement for Azure Functions Timer Trigger.
 * Applies resource reveal_at / hide_at visibility scheduling.
 * Run manually: node scripts/tick.js
 * Or with auto-reload: npx nodemon scripts/tick.js
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function tick() {
  const now = new Date()

  const revealed = await prisma.resource.updateMany({
    where: { revealAt: { lte: now }, visible: false },
    data: { visible: true },
  })

  const hidden = await prisma.resource.updateMany({
    where: { hideAt: { lte: now }, visible: true },
    data: { visible: false },
  })

  if (revealed.count > 0 || hidden.count > 0) {
    console.log(`[${now.toISOString()}] tick: revealed=${revealed.count} hidden=${hidden.count}`)
  }
}

async function run() {
  console.log('⏱  Tick script running (60 s interval). Ctrl+C to stop.')
  await tick()
  setInterval(tick, 60_000)
}

run().catch((e) => { console.error(e); process.exit(1) })
