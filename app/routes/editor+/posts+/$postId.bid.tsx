import { Divider, NumberInput, Textarea } from "@mantine/core"
import type { DataFunctionArgs, MetaFunction } from "@remix-run/node"
import { json, redirect } from "@remix-run/node"
import { useFetcher, useLoaderData } from "@remix-run/react"
import { z } from "zod"
import { prisma } from "~/lib/db.server"
import { requireUserId } from "~/session.server"
import { formatDate } from "~/utils/misc"
import { badRequest } from "~/utils/misc.server"
import { validateAction, type inferErrors } from "~/utils/validation"

const CreateBidSchema = z.object({
  postId: z.string(),
  price: z.string().min(1, "Price must be a positive number"),
  comment: z.string().min(1, "Comment is required"),
})

export async function loader({ params }: DataFunctionArgs) {
  const post = await prisma.post.findUnique({
    where: {
      id: params.postId,
    },
    include: {
      customer: true,
      category: true,
    },
  })

  if (!post) {
    return redirect("/editor/posts")
  }

  return json({
    post: post,
  })
}

interface ActionData {
  success: boolean
  fieldErrors?: inferErrors<typeof CreateBidSchema>
}

export const action = async ({ request }: DataFunctionArgs) => {
  const userId = await requireUserId(request)

  if (!userId) {
    return redirect("/login")
  }

  const { fields, fieldErrors } = await validateAction(request, CreateBidSchema)

  if (fieldErrors) {
    return badRequest<ActionData>({ success: false, fieldErrors })
  }

  const { price, comment, postId } = fields

  await prisma.bid.create({
    data: {
      price: Number(price),
      comment: comment,
      postId: postId,
      editorId: userId,
    },
  })

  return redirect(`/editor/posts`)
}

export const meta: MetaFunction = () => {
  return [
    {
      title: "Artify | Bid",
    },
  ]
}

export default function BidPage() {
  const { post } = useLoaderData<typeof loader>()
  const fetcher = useFetcher<ActionData>()

  const isSubmitting = fetcher.state !== "idle"

  return (
    <div className="grid grid-cols-2 gap-4 bg-black">
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
        <p className="text-xl text-white">Enter your Bid Details</p>
        <Divider className="my-4" />
        <div className="p-2">
          <fetcher.Form
            id="form"
            method="post"
            onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              fetcher.submit(formData, {
                method: "post",
              })
            }}
          >
            <fieldset disabled={isSubmitting} className="flex flex-col gap-4">
              <input hidden name="postId" defaultValue={post?.id} />
              <NumberInput
                name="price"
                label="Price"
                type="text"
                leftSection="$"
                placeholder="Enter your bid price"
                error={fetcher.data?.fieldErrors?.price}
                className="text-white"
              />
              <Textarea
                name="comment"
                label="Comment"
                autosize
                minRows={6}
                placeholder="Enter your comment"
                error={fetcher.data?.fieldErrors?.comment}
                className="text-white"
              />
              <button
                type="submit"
                form="form"
                className="rounded-md bg-red-600 p-2 text-white"
              >
                Submit
              </button>
            </fieldset>
          </fetcher.Form>
        </div>
      </div>
    </div>
  )
}
