import { Badge, Button } from "@mantine/core"
import { PostStatus } from "@prisma/client"
import type { DataFunctionArgs } from "@remix-run/node"
import { json } from "@remix-run/node"
import { Link, useLoaderData } from "@remix-run/react"
import { prisma } from "~/lib/db.server"
import { requireUserId } from "~/session.server"
import {
  formatDate,
  postStatusColorLookup,
  postStatusLabelLookup,
} from "~/utils/misc"

export async function loader({ request }: DataFunctionArgs) {
  const userId = await requireUserId(request)

  const posts = await prisma.post.findMany({
    where: {
      customerId: userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      project: true,
      customer: true,
      category: true,
      bids: true,
    },
  })

  return json({
    posts: posts,
  })
}

export default function CustomerPosts() {
  const { posts } = useLoaderData<typeof loader>()

  return (
    <div className="flex-1 divide-y divide-gray-100 bg-black p-10">
      {posts.length > 0 ? (
        <>
          {posts.map((post) => {
            const isProjectOpen = post.status === PostStatus.open
            const isProjectAllotedToEditor =
              !isProjectOpen && post.bids.length > 0
            return (
              <li
                key={post.id}
                className="flex items-center justify-between gap-x-6 py-5"
              >
                <div className="min-w-0">
                  <div className="flex items-start gap-x-3">
                    <p className="text-xl font-semibold leading-6 text-white">
                      {post.title}
                    </p>
                    <p className="whitespace-nowrap text-lg text-white">
                      (${post.budget})
                    </p>
                    <Badge
                      radius="xs"
                      variant="filled"
                      size="sm"
                      color={postStatusColorLookup[post.status]}
                    >
                      {postStatusLabelLookup[post.status]}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-x-2 text-base leading-5 text-gray-400">
                    <p className="whitespace-nowrap font-semibold">
                      {post.category.name}
                    </p>
                    <svg viewBox="0 0 2 2" className="h-0.5 w-0.5 fill-current">
                      <circle cx={1} cy={1} r={1} />
                    </svg>
                    <p className="whitespace-nowrap">
                      Due on{" "}
                      <time dateTime={post.deadline}>
                        {formatDate(post.deadline)}
                      </time>
                    </p>
                  </div>
                </div>
                <div className="flex flex-none items-center gap-x-4">
                  {isProjectAllotedToEditor ? (
                    <Button
                      color="red"
                      size="sm"
                      component={Link}
                      to={`/customer/projects/${post.project?.[0].id}`}
                    >
                      View Project
                    </Button>
                  ) : (
                    <Button
                      component={Link}
                      to={`/customer/posts/${post.id}`}
                      color="red"
                    >
                      View bids
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </>
      ) : (
        <div className="flex h-full items-center justify-center">
          <p className="text-white">No posts are present</p>
        </div>
      )}
    </div>
  )
}
