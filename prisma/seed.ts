import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function seed() {
  await prisma.bid.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.document.deleteMany()
  await prisma.project.deleteMany()
  await prisma.post.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.editor.deleteMany()
  await prisma.categories.deleteMany()
  await prisma.admin.deleteMany()

  const hashedPassword = await bcrypt.hash("password", 10)

  await prisma.admin.create({
    data: {
      email: "admin@app.com",
      name: "Admin",
      password: hashedPassword,
    },
  })

  await prisma.customer.create({
    data: {
      email: "customer@app.com",
      name: "Customer",
      password: hashedPassword,
    },
  })

  await prisma.editor.create({
    data: {
      email: "editor@app.com",
      name: "Editor",
      password: hashedPassword,
      experience: "3 years",
      portfolio: "https://www.google.com",
      skills: "Photo Editing",
      awards: "Best Editor",
    },
  })

  await prisma.categories.createMany({
    data: [
      {
        name: "Thumbnail-Designing",
        description:
          "Enhance your content's visibility with custom thumbnail designs that capture attention and drive engagement.",
        image:
          "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNkYzI2MWMiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0ibHVjaWRlIGx1Y2lkZS1zY2lzc29ycy1zcXVhcmUiPjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgeD0iMiIgeT0iMiIgcng9IjIiLz48Y2lyY2xlIGN4PSI4IiBjeT0iOCIgcj0iMiIvPjxwYXRoIGQ9Ik05LjQxNCA5LjQxNCAxMiAxMiIvPjxwYXRoIGQ9Ik0xNC44IDE0LjggMTggMTgiLz48Y2lyY2xlIGN4PSI4IiBjeT0iMTYiIHI9IjIiLz48cGF0aCBkPSJtMTggNi04LjU4NiA4LjU4NiIvPjwvc3ZnPg==",
      },
      {
        name: "Poster-Designing",
        description:
          "Grab your audience's attention with striking poster designs that convey your message with impact.",
        image:
          "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNkYzI2MWMiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0ibHVjaWRlIGx1Y2lkZS1taW51cy1zcXVhcmUiPjxyZWN0IHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgeD0iMyIgeT0iMyIgcng9IjIiLz48cGF0aCBkPSJNOCAxMmg4Ii8+PC9zdmc+",
      },
      {
        name: "Photo-Editing",
        description:
          " Elevate your videos with expert editing that turns raw footage into captivating stories.",
        image:
          "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNkYzI2MWMiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0ibHVjaWRlIGx1Y2lkZS1pbWFnZSI+PHJlY3Qgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiB4PSIzIiB5PSIzIiByeD0iMiIgcnk9IjIiLz48Y2lyY2xlIGN4PSI5IiBjeT0iOSIgcj0iMiIvPjxwYXRoIGQ9Im0yMSAxNS0zLjA4Ni0zLjA4NmEyIDIgMCAwIDAtMi44MjggMEw2IDIxIi8+PC9zdmc+",
      },
      {
        name: "Logo-Designing",
        description:
          "Create a lasting impression with a unique logo that encapsulates your brand identity.",
        image:
          "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNkYzI2MWMiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0ibHVjaWRlIGx1Y2lkZS1iYWRnZSI+PHBhdGggZD0iTTMuODUgOC42MmE0IDQgMCAwIDEgNC43OC00Ljc3IDQgNCAwIDAgMSA2Ljc0IDAgNCA0IDAgMCAxIDQuNzggNC43OCA0IDQgMCAwIDEgMCA2Ljc0IDQgNCAwIDAgMS00Ljc3IDQuNzggNCA0IDAgMCAxLTYuNzUgMCA0IDQgMCAwIDEtNC43OC00Ljc3IDQgNCAwIDAgMSAwLTYuNzZaIi8+PC9zdmc+",
      },
      {
        name: "Video-Designing",
        description:
          " Elevate your imagery with our professional photo editing services.",
        image:
          "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNkYzI2MWMiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0ibHVjaWRlIGx1Y2lkZS1wbGF5Ij48cG9seWdvbiBwb2ludHM9IjUgMyAxOSAxMiA1IDIxIDUgMyIvPjwvc3ZnPg==",
      },
      {
        name: "Digital-Art",
        description:
          "Transform your ideas into digital masterpieces with our Digital Art services. ",
        image:
          "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNkYzI2MWMiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0ibHVjaWRlIGx1Y2lkZS1icnVzaCI+PHBhdGggZD0ibTkuMDYgMTEuOSA4LjA3LTguMDZhMi44NSAyLjg1IDAgMSAxIDQuMDMgNC4wM2wtOC4wNiA4LjA4Ii8+PHBhdGggZD0iTTcuMDcgMTQuOTRjLTEuNjYgMC0zIDEuMzUtMyAzLjAyIDAgMS4zMy0yLjUgMS41Mi0yIDIuMDIgMS4wOCAxLjEgMi40OSAyLjAyIDQgMi4wMiAyLjIgMCA0LTEuOCA0LTQuMDRhMy4wMSAzLjAxIDAgMCAwLTMtMy4wMnoiLz48L3N2Zz4=",
      },
    ],
  })

  console.log("Database has been seeded. 🌱")
}

seed()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
