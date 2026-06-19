import { PrismaClient, EventPhase, Role } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Organizer user
  const organizer = await prisma.user.upsert({
    where: { email: 'organizer@example.com' },
    update: {},
    create: { email: 'organizer@example.com', name: 'Demo Organizer' },
  })

  // Sample event
  const event = await prisma.event.upsert({
    where: { slug: 'demo-hackathon-2026' },
    update: {},
    create: {
      slug: 'demo-hackathon-2026',
      name: 'Demo Hackathon 2026',
      description: 'A sample hackathon event for local development.',
      phase: EventPhase.SETUP,
      startsAt: new Date('2026-07-01T09:00:00Z'),
      endsAt: new Date('2026-07-01T18:00:00Z'),
      formSchema: [
        { key: 'name',     label: 'Full Name',   type: 'text',   required: true },
        { key: 'phone',    label: 'Phone',        type: 'text',   required: false },
        { key: 'teamName', label: 'Team Name',    type: 'text',   required: false },
        { key: 'teamCode', label: 'Team Code',    type: 'text',   required: false },
      ],
    },
  })

  // Organizer membership
  await prisma.eventMembership.upsert({
    where: { eventId_userId: { eventId: event.id, userId: organizer.id } },
    update: {},
    create: { eventId: event.id, userId: organizer.id, role: Role.ORGANIZER },
  })

  // Default expense categories
  const defaultCategories = [
    'Venue', 'Food & Beverage', 'A/V & Equipment',
    'Prizes', 'Printing', 'Marketing', 'Miscellaneous',
  ]
  for (const name of defaultCategories) {
    await prisma.expenseCategory.upsert({
      where: { id: `seed-cat-${name.toLowerCase().replace(/[^a-z]/g, '-')}-${event.id}` },
      update: {},
      create: {
        id: `seed-cat-${name.toLowerCase().replace(/[^a-z]/g, '-')}-${event.id}`,
        eventId: event.id,
        name,
      },
    })
  }

  // Default scoring round
  const round = await prisma.scoringRound.upsert({
    where: { id: `seed-round-${event.id}` },
    update: {},
    create: {
      id: `seed-round-${event.id}`,
      eventId: event.id,
      name: 'Main Round',
      sortOrder: 0,
    },
  })

  // Sample criteria
  const criteria = [
    { name: 'Creativity',       description: 'Originality and innovation of the idea', maxScore: 10, weight: 2, sortOrder: 0 },
    { name: 'Technical Depth',  description: 'Quality and complexity of implementation', maxScore: 10, weight: 3, sortOrder: 1 },
    { name: 'Presentation',     description: 'Clarity and quality of the demo/pitch', maxScore: 10, weight: 1, sortOrder: 2 },
  ]
  for (const c of criteria) {
    await prisma.criterion.upsert({
      where: { id: `seed-crit-${c.name.toLowerCase().replace(/\s/g, '-')}-${round.id}` },
      update: {},
      create: {
        id: `seed-crit-${c.name.toLowerCase().replace(/\s/g, '-')}-${round.id}`,
        roundId: round.id,
        ...c,
      },
    })
  }

  console.log(`✅ Seeded event: ${event.slug} (organizer: ${organizer.email})`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
