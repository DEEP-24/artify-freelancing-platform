import { ProjectStatus } from "@prisma/client"
import { json } from "@remix-run/node"
import type { SerializeFrom, DataFunctionArgs } from "@remix-run/node"
import { prisma } from "~/lib/db.server"

export type CompleteProjectActionData = SerializeFrom<typeof action>
export async function action({ request }: DataFunctionArgs) {
  const formData = await request.formData()

  const projectId = formData.get("projectId")

  if (!projectId) {
    return json({
      success: false,
      error: "Project ID is required",
    })
  }

  await prisma.project.update({
    where: {
      id: projectId as string,
    },
    data: {
      status: ProjectStatus.payment_pending,
    },
  })

  return json({
    success: true,
  })
}
