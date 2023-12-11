import { Button, Divider, Popover, Text } from "@mantine/core"
import type { DataFunctionArgs, MetaFunction } from "@remix-run/node"
import { json, redirect } from "@remix-run/node"
import { useFetcher, useLoaderData } from "@remix-run/react"
import { EyeIcon } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"
import { prisma } from "~/lib/db.server"
import { requireUserId } from "~/session.server"
import { formatDate } from "~/utils/misc"
import { badRequest } from "~/utils/misc.server"
import type { inferErrors } from "~/utils/validation"
import { validateAction } from "~/utils/validation"

const createProjectSchema = z.object({
  postId: z.string().optional(),
  customerId: z.string().optional(),
  editorId: z.string().optional(),
  bidId: z.string().optional(),
  payment: z.string().optional(),
  intent: z.string().optional(),
})

export async function loader({ params }: DataFunctionArgs) {
  const post = await prisma.post.findUnique({
    where: {
      id: params.postId,
    },
    include: {
      customer: true,
      category: true,
      bids: {
        include: {
          editor: true,
        },
      },
    },
  })

  if (!post) {
    return redirect("/customer/posts")
  }

  const bids = await prisma.bid.findMany({
    where: {
      postId: post.id,
    },
    include: {
      editor: true,
    },
  })

  return json({
    post: post,
    bids: bids,
  })
}

interface ActionData {
  success: boolean
  fieldErrors?: inferErrors<typeof createProjectSchema>
}

export const action = async ({ request }: DataFunctionArgs) => {
  const userId = await requireUserId(request)

  if (!userId) {
    return redirect("/login")
  }

  const { fields, fieldErrors } = await validateAction(
    request,
    createProjectSchema
  )

  if (fieldErrors) {
    return badRequest<ActionData>({ success: false, fieldErrors })
  }

  const { postId, editorId, bidId, intent } = fields

  if (intent === "approve") {
    await prisma.project.create({
      data: {
        postId: postId as string,
        editorId: editorId as string,
        customerId: userId as string,
        status: "in_progress",
      },
    })

    await prisma.post.update({
      where: {
        id: postId as string,
      },
      data: {
        status: "in_progress",
      },
    })

    await prisma.bid
      .update({
        where: {
          id: bidId as string,
        },
        data: {
          approved: true,
          declined: false,
        },
      })
      .then(() => {
        toast.success("Project created successfully")
      })

    return redirect("/customer/projects")
  }

  if (intent === "decline") {
    await prisma.bid
      .update({
        where: {
          id: bidId as string,
        },
        data: {
          approved: false,
          declined: true,
        },
      })
      .then(() => {
        toast.success("Bid declined successfully")
      })

    return json({
      success: true,
    })
  }

  return json({})
}

export const meta: MetaFunction = () => {
  return [
    {
      title: "Artify | View Bids",
    },
  ]
}

export default function ViewBids() {
  const { post, bids } = useLoaderData<typeof loader>()

  const fetcher = useFetcher<ActionData>()

  const isSubmitting = fetcher.state !== "idle"

  const approvedBid = bids.find((bid) => bid.approved)
  const declinedBid = bids.find((bid) => bid.declined)

  return (
    <div className="bg-black">
      <div className="bg-black p-10">
        <div className="px-4 sm:px-0">
          <h3 className="text-xl font-semibold leading-7 text-white">
            Post Information
          </h3>
        </div>
        <div className="mt-6 border-t border-white/10">
          <dl className="divide-y divide-white/10">
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-white">
                Title
              </dt>
              <dd className="mt-1 text-sm leading-6 text-gray-400 sm:col-span-2 sm:mt-0">
                {post.title}
              </dd>
            </div>
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-white">
                Category
              </dt>
              <dd className="mt-1 text-sm leading-6 text-gray-400 sm:col-span-2 sm:mt-0">
                {post.category.name}
              </dd>
            </div>
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-white">
                Description
              </dt>
              <dd className="mt-1 text-sm leading-6 text-gray-400 sm:col-span-2 sm:mt-0">
                {post.description}
              </dd>
            </div>
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-white">
                Posted By
              </dt>
              <dd className="mt-1 text-sm leading-6 text-gray-400 sm:col-span-2 sm:mt-0">
                {post.customer.name}
              </dd>
            </div>
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-white">
                Budget
              </dt>
              <dd className="mt-1 text-sm leading-6 text-gray-400 sm:col-span-2 sm:mt-0">
                ${post.budget}
              </dd>
            </div>
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-white">
                Deadline
              </dt>
              <dd className="mt-1 text-sm leading-6 text-gray-400 sm:col-span-2 sm:mt-0">
                {formatDate(post.deadline)}
              </dd>
            </div>
          </dl>
        </div>
      </div>
      <div className="bg-black p-10">
        <p className="text-xl text-white">View All Bids</p>
        <Divider className="my-4" />
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {bids.map((bid) => {
            const isApprovedBid = approvedBid && bid.id === approvedBid.id
            const isDeclinedBid = declinedBid && bid.id === declinedBid.id
            return (
              <li
                key={bid.id}
                className="col-span-1 divide-y divide-gray-200 rounded-lg bg-gray-900 shadow"
              >
                <div>
                  <div className="flex w-full flex-grow items-center justify-between space-x-6 p-6">
                    <div className="flex-1">
                      {bid.approved ? (
                        <div className="text-center font-bold text-green-500">
                          Approved
                        </div>
                      ) : (
                        ""
                      )}
                      {bid.declined ? (
                        <div className="text-center font-bold text-red-500">
                          Declined
                        </div>
                      ) : (
                        ""
                      )}
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-bold text-white">
                          {bid.editor.name} (${bid.price})
                        </h3>
                        <Popover
                          width={400}
                          position="bottom"
                          withArrow
                          shadow="md"
                        >
                          <Popover.Target>
                            <button className="truncate text-lg font-bold text-white">
                              <EyeIcon size={18} />
                            </button>
                          </Popover.Target>
                          <Popover.Dropdown>
                            <div className="flex flex-col gap-1">
                              <Text size="xs">
                                <b>Skills: </b> <span>{bid.editor.skills}</span>
                              </Text>
                              <Text size="xs">
                                <b>Experience: </b>{" "}
                                <span>{bid.editor.experience}</span>
                              </Text>
                              <Text size="xs">
                                <b>Portfolio: </b>{" "}
                                <span>{bid.editor.portfolio}</span>
                              </Text>
                              <Text size="xs">
                                <b>Awards: </b> <span>{bid.editor.awards}</span>
                              </Text>
                            </div>
                          </Popover.Dropdown>
                        </Popover>
                      </div>
                      <p className="mt-1 overflow-auto text-sm text-gray-200">
                        {bid.comment}
                      </p>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-evenly">
                      <div className="w-full">
                        <div>
                          <fieldset disabled={isSubmitting}>
                            <div className="flex justify-evenly">
                              <Button
                                color="green"
                                fullWidth
                                disabled={
                                  !!isApprovedBid ||
                                  isApprovedBid ||
                                  isDeclinedBid
                                }
                                onClick={() =>
                                  fetcher.submit(
                                    {
                                      intent: "approve",
                                      bidId: bid.id,
                                      postId: post.id,
                                      editorId: bid.editorId,
                                    },
                                    {
                                      method: "post",
                                    }
                                  )
                                }
                                loading={isSubmitting}
                              >
                                Accept
                              </Button>
                              <Button
                                color="red"
                                className="w-full"
                                fullWidth
                                disabled={
                                  !!isApprovedBid ||
                                  isApprovedBid ||
                                  isDeclinedBid
                                }
                                onClick={() =>
                                  fetcher.submit(
                                    {
                                      intent: "decline",
                                      bidId: bid.id,
                                      postId: post.id,
                                      editorId: bid.editorId,
                                    },
                                    {
                                      method: "post",
                                    }
                                  )
                                }
                                loading={isSubmitting}
                              >
                                Decline
                              </Button>
                            </div>
                          </fieldset>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
