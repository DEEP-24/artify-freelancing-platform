import { Button, Divider, LoadingOverlay, TextInput } from "@mantine/core"
import { ProjectStatus } from "@prisma/client"
import type { DataFunctionArgs, MetaFunction } from "@remix-run/node"
import { json, redirect } from "@remix-run/node"
import { useFetcher, useLoaderData } from "@remix-run/react"
import axios from "axios"
import { FileIcon } from "lucide-react"
import * as mime from "mime-types"
import * as React from "react"
import { toast } from "sonner"
import { z } from "zod"
import { prisma } from "~/lib/db.server"
import { getS3Url, getUniqueS3Key } from "~/models/s3-utils"
import { requireUserId } from "~/session.server"
import { formatDate } from "~/utils/misc"
import { badRequest } from "~/utils/misc.server"
import { validateAction, type inferErrors } from "~/utils/validation"

const createFileEntrySchema = z.object({
  name: z.string().min(3, "File name must be at least 3 characters long"),
  description: z.string().optional(),
  key: z.string().min(1, "File must be selected"),
  bucket: z.string().min(1, "File must be selected"),
  extension: z.string().min(1, "File must be selected"),
  region: z.string().min(1, "File must be selected"),
  postId: z.string().min(1, "postId is required"),
  type: z.string().optional(),
})

export async function loader({ params }: DataFunctionArgs) {
  const project = await prisma.project.findUnique({
    where: {
      id: params.projectId,
    },
    include: {
      post: {
        include: {
          bids: true,
          category: true,
        },
      },
      editor: true,
      customer: true,
      customerDocuments: true,
      editorDocuments: true,
    },
  })

  if (!project) {
    return redirect("/customer/projects")
  }

  return json({
    project: project,
  })
}

interface ActionData {
  success: boolean
  fieldErrors?: inferErrors<typeof createFileEntrySchema>
}

export const action = async ({ request, params }: DataFunctionArgs) => {
  const editorId = await requireUserId(request)
  const { projectId } = params

  if (!projectId) {
    return redirect("/editor/projects")
  }

  const { fields, fieldErrors } = await validateAction(
    request,
    createFileEntrySchema
  )

  if (fieldErrors) {
    return badRequest<ActionData>({ success: false, fieldErrors })
  }

  await prisma.document.create({
    data: {
      name: fields.name,
      description: fields.description,
      key: fields.key,
      bucket: fields.bucket,
      extension: fields.extension,
      region: fields.region,
      imageUrl: getS3Url(fields.key, {
        bucket: fields.bucket,
        region: fields.region,
      }),
      projectId,
      postId: fields.postId,
      editorId,
      editorProjectId: projectId,
      type: "EDITED",
    },
  })

  return json<ActionData>({
    success: true,
  })
}

export const meta: MetaFunction = () => {
  return [
    {
      title: "Artify | View Project",
    },
  ]
}

export default function ProjectPage() {
  const { project } = useLoaderData<typeof loader>()
  const fetcher = useFetcher<ActionData>()
  const [file, setFile] = React.useState<File | null>(null)
  const [isFileUploading, setIsFileUploading] = React.useState(false)

  const isProjectCompleted = project.status === ProjectStatus.completed

  const uploadedDocumentKey = React.useMemo(() => {
    if (!file) return null

    const extension = mime.extension(file.type)
    const key = getUniqueS3Key(
      file.name,
      extension ? `.${extension}` : undefined
    )

    return key
  }, [file])

  const handleFileUpload = React.useCallback(async () => {
    if (!file || !uploadedDocumentKey) return

    setIsFileUploading(true)
    const data = await axios.get<{
      signedUrl: string
    }>(`/api/upload-s3-object?key=${uploadedDocumentKey}`)

    const uploadUrl = data.data.signedUrl

    const response = await axios.put(uploadUrl, file)
    if (response.status === 200) {
      const url = getS3Url(uploadedDocumentKey)
      console.log(url)
      toast.success("Document uploaded successfully")
    } else {
      // TODO: Delete the created document from the database
      // Use `useSubmit()` to do this
      toast.error("Error uploading document")
    }

    setIsFileUploading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, uploadedDocumentKey])

  React.useEffect(() => {
    if (fetcher.state !== "idle") return

    if (!fetcher.data) return

    if (fetcher.data.success) {
      handleFileUpload()
    }
  }, [fetcher.data, fetcher.state, handleFileUpload])

  return (
    <div>
      <div className="bg-black p-10">
        <div className="px-4">
          <h3 className="text-xl font-semibold leading-7 text-white">
            Project Information
          </h3>
        </div>
        <div className="mt-6 border-t border-white/10">
          <dl className="divide-y divide-white/10">
            <div className="px-2 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-white">
                Title
              </dt>
              <dd className="mt-1 text-sm leading-6 text-gray-400 sm:col-span-2 sm:mt-0">
                {project.post.title}
              </dd>
            </div>
            <div className="px-2 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-white">
                Category
              </dt>
              <dd className="mt-1 text-sm leading-6 text-gray-400 sm:col-span-2 sm:mt-0">
                {project.post.category.name}
              </dd>
            </div>
            <div className="px-2 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-white">
                Description
              </dt>
              <dd className="mt-1 text-sm leading-6 text-gray-400 sm:col-span-2 sm:mt-0">
                {project.post.description}
              </dd>
            </div>
            <div className="px-2 py-3  sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-white">
                Posted By
              </dt>
              <dd className="mt-1 text-sm leading-6 text-gray-400 sm:col-span-2 sm:mt-0">
                {project.editor.name}
              </dd>
            </div>
            <div className="px-2 py-3  sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-white">
                Budget
              </dt>
              <dd className="mt-1 text-sm leading-6 text-gray-400 sm:col-span-2 sm:mt-0">
                ${project.post.bids[0].price}
              </dd>
            </div>
            <div className="px-2 py-3  sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-white">
                Deadline
              </dt>
              <dd className="mt-1 text-sm leading-6 text-gray-400 sm:col-span-2 sm:mt-0">
                {formatDate(project.post.deadline)}
              </dd>
            </div>
            <div className="px-2 py-3  sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-white">
                Editor
              </dt>
              <dd className="mt-1 text-sm leading-6 text-gray-400 sm:col-span-2 sm:mt-0">
                {project.editor.name}
              </dd>
            </div>
          </dl>
        </div>
      </div>
      <div className="ml-4 flex flex-col gap-2">
        <div>
          {project.status === ProjectStatus.completed ? (
            <div className="flex gap-2">
              <div className="flex w-52 items-center justify-center rounded-md border border-black bg-green-500 p-2">
                <span className="text-semibold text-white">Payment Done</span>
              </div>
              <div className="flex w-52 items-center justify-center rounded-md border border-black bg-green-500 p-2">
                <span className="text-semibold text-white">
                  Project Completed
                </span>
              </div>
            </div>
          ) : (
            ""
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 p-6">
        <div className="p-2">
          <p className="text-xl text-white">Your Files</p>
          <Divider className="my-4" color="red" variant="dashed" />
          <div className="space-y-3">
            {project.editorDocuments && project.editorDocuments.length > 0 ? (
              project.editorDocuments.map((document) => (
                <div
                  key={document.id}
                  className="flex w-56 flex-col rounded-md border p-2 text-white"
                >
                  <a
                    href={document.imageUrl}
                    className="flex items-center gap-3"
                    download
                  >
                    <FileIcon className="h-9 w-9" />
                    {document.name}.{document.extension}
                  </a>
                </div>
              ))
            ) : (
              <div className="p-2">
                <p className="text-white">No documents available</p>
              </div>
            )}
          </div>
        </div>
        <div className="p-2">
          <p className="text-xl text-white">Customer Files</p>
          <Divider className="my-4" />
          <div className="space-y-3">
            {project.customerDocuments &&
            project.customerDocuments.length > 0 ? (
              project.customerDocuments.map((document) => (
                <div
                  key={document.id}
                  className="flex w-56 flex-col rounded-md border p-2 text-white"
                >
                  <a
                    href={getS3Url(document.key)}
                    className="flex items-center gap-3"
                    download
                  >
                    <FileIcon className="h-9 w-9" />
                    {document.name}.{document.extension}
                  </a>
                </div>
              ))
            ) : (
              <div className="p-2">
                <p className="text-white">No documents available</p>
              </div>
            )}
          </div>
        </div>
        {!isProjectCompleted && (
          <div className="rounded-md border border-white bg-gray-950 p-4">
            <LoadingOverlay visible={isFileUploading} />
            <h1 className="text-xl text-white">Upload a file</h1>
            <Divider className="my-4" color="red" variant="dashed" />
            <div className="flex flex-col">
              <fetcher.Form
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (!file || !uploadedDocumentKey) return
                  const extension = mime.extension(file.type)
                  const formData = new FormData(e.currentTarget)
                  formData.append("bucket", window.ENV.AWS_BUCKET)
                  formData.append("key", uploadedDocumentKey)
                  formData.append("extension", extension || "")
                  formData.append("region", window.ENV.AWS_REGION)
                  console.log(
                    JSON.stringify(Object.fromEntries(formData.entries()))
                  )
                  fetcher.submit(formData, {
                    method: "POST",
                  })
                }}
                className="flex flex-col gap-4"
              >
                <input type="hidden" name="postId" value={project.postId} />
                <TextInput
                  name="name"
                  label="File Name"
                  placeholder="Enter the name of the file"
                  required
                  className="text-white"
                />
                <TextInput
                  name="description"
                  label="Description"
                  placeholder="Enter the description of the file"
                  required
                  className="text-white"
                />
                <div className="flex w-80 flex-col rounded-md border p-4 text-white">
                  <div>
                    <input
                      type="file"
                      onChange={(e) =>
                        setFile(e.currentTarget.files?.[0] ?? null)
                      }
                    />
                  </div>
                </div>
                <div>
                  <Button
                    disabled={!file || !uploadedDocumentKey}
                    type="submit"
                    variant="filled"
                    color="red"
                  >
                    Submit
                  </Button>
                </div>
              </fetcher.Form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
