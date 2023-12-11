import { Button, NumberInput, TextInput, Textarea } from "@mantine/core"
import { DateInput } from "@mantine/dates"
import type {
  DataFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node"
import { json, redirect } from "@remix-run/node"
import { useFetcher, useLoaderData } from "@remix-run/react"
import { toast } from "sonner"
import { z } from "zod"
import { prisma } from "~/lib/db.server"
import { requireUserId } from "~/session.server"
import { badRequest } from "~/utils/misc.server"
import { validateAction, type inferErrors } from "~/utils/validation"
import * as React from "react"

const CreatePostSchema = z.object({
  categoryId: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  budget: z.string().min(1, "Budget must be a positive number"),
  duration: z.string().min(1, "Duration must be a positive number"),
  deadline: z.string(),
})

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = requireUserId(request)
  if (!userId) {
    return redirect("/login")
  }

  const category = await prisma.categories.findUnique({
    where: {
      id: params.categoryId,
    },
  })

  if (!category) {
    return redirect("/customer/services")
  }

  return json({
    category: category,
  })
}

interface ActionData {
  success: boolean
  fieldErrors?: inferErrors<typeof CreatePostSchema>
}

export const action = async ({ request }: DataFunctionArgs) => {
  const userId = await requireUserId(request)

  if (!userId) {
    return redirect("/login")
  }

  const { fields, fieldErrors } = await validateAction(
    request,
    CreatePostSchema
  )

  if (fieldErrors) {
    return badRequest<ActionData>({ success: false, fieldErrors })
  }

  const { categoryId, title, description, budget, duration, deadline } = fields

  await prisma.post.create({
    data: {
      title,
      description,
      budget: Number(budget),
      duration: Number(duration),
      deadline: deadline,
      status: "open",
      categoryId: categoryId as string,
      customerId: userId,
      bids: {},
      project: {},
    },
  })

  toast.success("Post created successfully")

  return redirect(`/customer/posts`)
}

export const meta: MetaFunction = () => {
  return [
    {
      title: "Artify | New-Post",
    },
  ]
}

export default function NewCategoryPost() {
  const { category } = useLoaderData<typeof loader>()
  const fetcher = useFetcher<ActionData>()

  const isSubmitting = fetcher.state !== "idle"

  const [duration, setDuration] = React.useState<number | null>(null)
  const [deadline, setDeadline] = React.useState<string>("")

  React.useEffect(() => {
    console.log("Duration: ", duration)
    if (duration !== null && !isNaN(duration) && duration > 0) {
      const today = new Date()
      const calculatedDeadline = new Date(today)
      calculatedDeadline.setDate(today.getDate() + duration)
      const newDeadline = calculatedDeadline.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      })
      setDeadline(newDeadline)
      console.log({
        today,
        calculatedDeadline,
        newDeadline,
      })
    } else {
      setDeadline("")
    }
  }, [duration])

  const handleDurationChange = (value: string) => {
    const numericValue = value ? Number(value) : null
    setDuration(numericValue)
  }

  return (
    <div className="flex flex-1 flex-col justify-center p-8">
      <div className="flex items-center justify-center text-2xl text-white">
        <p>Post for {category.name}</p>
      </div>
      <div className="p-10">
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
            <input hidden name="categoryId" defaultValue={category?.id} />
            <TextInput
              name="title"
              label="Title"
              placeholder="Enter the Title"
              error={fetcher.data?.fieldErrors?.title}
              className="text-white"
              required
            />
            <p className="text-sm text-gray-400">
              Example: "Need a thumbnail for my YouTube channel, Need a logo for
              my company, etc."
            </p>
            <Textarea
              name="description"
              label="Description"
              placeholder="Enter the Description"
              error={fetcher.data?.fieldErrors?.description}
              className="text-white"
              minRows={7}
              autosize
              required
            />
            <NumberInput
              name="budget"
              label="Budget"
              type="text"
              leftSection="$"
              min={0}
              placeholder="Enter the Budget"
              error={fetcher.data?.fieldErrors?.budget}
              className="text-white"
              required
            />
            <NumberInput
              name="duration"
              label="Estimated Duration (days)"
              type="text"
              placeholder="Enter the Duration"
              error={fetcher.data?.fieldErrors?.duration}
              className="text-white"
              value={duration ?? ""}
              onChange={(value) => handleDurationChange(value.toString())}
              required
            />
            <DateInput
              name="deadline"
              label="DeadLine"
              placeholder="Choose a deadline"
              error={fetcher.data?.fieldErrors?.deadline}
              className="text-white"
              value={deadline ? new Date(deadline) : null}
              required
              readOnly
            />
            <Button type="submit" form="form" color="red">
              Submit
            </Button>
          </fieldset>
        </fetcher.Form>
      </div>
    </div>
  )
}
