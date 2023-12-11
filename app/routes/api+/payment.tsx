import { ProjectStatus, type PaymentMethod, PostStatus } from "@prisma/client"
import { json } from "@remix-run/node"
import type { SerializeFrom, DataFunctionArgs } from "@remix-run/node"
import { prisma } from "~/lib/db.server"

export type PaymentActionData = SerializeFrom<typeof action>
export async function action({ request }: DataFunctionArgs) {
  const formData = await request.formData()

  const projectId = formData.get("projectId")
  const editorId = formData.get("editorId")
  const customerId = formData.get("customerId")
  const amount = formData.get("amount")
  const paymentMethod = formData.get("paymentMethod")

  await prisma.project.update({
    where: {
      id: projectId as string,
    },
    data: {
      payment: {
        create: {
          amount: Number(amount),
          paymentMethod: paymentMethod as PaymentMethod,
          editorId: editorId as string,
          customerId: customerId as string,
        },
      },
      status: ProjectStatus.completed,
      post: {
        update: {
          status: PostStatus.completed,
        },
      },
    },
  })

  return json({
    success: true,
  })
}
