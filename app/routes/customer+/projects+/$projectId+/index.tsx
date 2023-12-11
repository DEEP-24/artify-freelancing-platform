import {
  Button,
  Divider,
  LoadingOverlay,
  Modal,
  Select,
  TextInput,
} from "@mantine/core"
import { DateInput } from "@mantine/dates"
import { PaymentMethod, ProjectStatus } from "@prisma/client"
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
import type { CompleteProjectActionData } from "~/routes/api+/completeProject"
import type { PaymentActionData } from "~/routes/api+/payment"
import { requireUserId } from "~/session.server"
import { formatDate, titleCase } from "~/utils/misc"
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
      payment: true,
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

export const meta: MetaFunction = () => {
  return [
    {
      title: "Artify | View Project",
    },
  ]
}

interface ActionData {
  success: boolean
  fieldErrors?: inferErrors<typeof createFileEntrySchema>
}

export const action = async ({ request, params }: DataFunctionArgs) => {
  const customerId = await requireUserId(request)
  const { projectId } = params

  if (!projectId) {
    return redirect("/customer/projects")
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
      customerId,
      customerProjectId: projectId,
      type: "SOURCE",
    },
  })

  return json<ActionData>({
    success: true,
  })
}

export default function ProjectPage() {
  const { project } = useLoaderData<typeof loader>()
  const fetcher = useFetcher<ActionData>()
  const [file, setFile] = React.useState<File | null>(null)
  const [isFileUploading, setIsFileUploading] = React.useState(false)

  const isProjectCompleted = project.status === ProjectStatus.completed

  const completeProjectFetcher = useFetcher<CompleteProjectActionData>()
  const paymentFetcher = useFetcher<PaymentActionData>()

  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>(
    PaymentMethod.CREDIT_CARD
  )
  const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false)
  const closePaymentModal = () => setIsPaymentModalOpen(false)
  const showPaymentModal = () => setIsPaymentModalOpen(true)

  const [cardHolderName, setCardHolderName] = React.useState<string>("")
  const [cardNumber, setCardNumber] = React.useState<string>("1234567891234567")
  const [cardExpiry, setCardExpiry] = React.useState<Date | null>(
    new Date("2026-12-31")
  )
  const [cardCvv, setCardCvv] = React.useState<string>("123")
  const [errors, setErrors] = React.useState<{
    cardHolderName?: string
    cardNumber?: string
    cardExpiry?: string
    cardCvv?: string
  }>({
    cardHolderName: "",
    cardNumber: "",
    cardExpiry: "",
    cardCvv: "",
  })

  const completeProject = () => {
    const formData = new FormData()

    formData.append("projectId", project.id)

    completeProjectFetcher.submit(formData, {
      method: "POST",
      action: "/api/completeProject",
    })
  }
  const makePayment = () => {
    const formData = new FormData()

    let errors = {
      cardHolderName: "",
      cardNumber: "",
      cardExpiry: "",
      cardCvv: "",
    }
    setErrors(errors)
    if (!cardHolderName) {
      errors.cardHolderName = "Card holder name is required"
    }

    if (cardNumber.replace(/[_ ]/g, "").length !== 16) {
      errors.cardNumber = "Card number must be 16 digits"
    }

    if (!cardExpiry) {
      errors.cardExpiry = "Card expiry date is required"
    }

    if (cardCvv.replace(/[_ ]/g, "").length !== 3) {
      errors.cardCvv = "Card CVV must be 3 digits"
    }

    if (Object.values(errors).some((error) => error !== "")) {
      setErrors(errors)
      return
    }

    formData.append("paymentMethod", paymentMethod)
    formData.append("amount", project.post.bids[0].price.toString())
    formData.append("projectId", project.id)
    formData.append("customerId", project.customerId)
    formData.append("editorId", project.editorId)

    paymentFetcher.submit(formData, {
      method: "POST",
      action: "/api/payment",
    })
  }

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

    setFile(null)
  }, [fetcher.data, fetcher.state, handleFileUpload])

  const isCompletingProject = completeProjectFetcher.state !== "idle"
  React.useEffect(() => {
    if (isCompletingProject) return
    if (!completeProjectFetcher.data) return

    if (completeProjectFetcher.data.success) {
      toast.success("Project completed, Payment is pending!")
    } else {
      toast.error("Something went wrong")
    }
  }, [completeProjectFetcher.data, completeProjectFetcher, isCompletingProject])

  const isPaymentSubmitting = paymentFetcher.state !== "idle"
  React.useEffect(() => {
    if (isPaymentSubmitting) return
    if (!paymentFetcher.data) return

    if (paymentFetcher.data.success) {
      closePaymentModal()
      toast.success("Payment completed!")
    } else {
      toast.error("Something went wrong")
    }
  }, [isPaymentSubmitting, paymentFetcher, paymentFetcher.data])

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
                {project.customer.name}
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
          {project.status === ProjectStatus.in_progress ? (
            <div>
              <Button
                type="submit"
                color="green"
                size="xs"
                onClick={() => {
                  completeProject()
                }}
              >
                Done
              </Button>
            </div>
          ) : project.status === ProjectStatus.payment_pending &&
            !project.payment ? (
            <div>
              <Button
                color="red"
                className="w-full"
                onClick={() => showPaymentModal()}
              >
                Make Payment
              </Button>
            </div>
          ) : (
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
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 p-6">
        <div className="p-2">
          <p className="text-xl text-white">Your Files</p>
          <Divider className="my-4" color="red" variant="dashed" />
          <div className="space-y-3">
            {project.customerDocuments &&
            project.customerDocuments.length > 0 ? (
              project.customerDocuments.map((document) => (
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
          <p className="text-xl text-white">Editor Files</p>
          <Divider className="my-4" />
          <div className="space-y-3">
            {project.editorDocuments && project.editorDocuments.length > 0 ? (
              project.editorDocuments.map((document) => (
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
      <Modal
        opened={!!project && isPaymentModalOpen}
        onClose={closePaymentModal}
        title="Payment"
        size="xl"
        padding="md"
        overlayProps={{
          blur: 1,
          opacity: 0.7,
        }}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-sm text-gray-600">
              <span className="font-semibold">Amount: </span>
              <span>${project.post.bids[0].price}</span>
            </h2>
          </div>

          <TextInput
            name="cardHolderName"
            label="Card holder name"
            value={cardHolderName}
            onChange={(e) => setCardHolderName(e.target.value)}
            required
          />

          <Select
            label="Payment method"
            value={paymentMethod}
            clearable={false}
            onChange={(e) => setPaymentMethod(e as PaymentMethod)}
            data={Object.values(PaymentMethod).map((method) => ({
              value: method,
              label: titleCase(method),
            }))}
            required
          />

          <TextInput
            name="cardNumber"
            label="Card number"
            placeholder="XXXX XXXX XXXX XXXX"
            onChange={(e) => setCardNumber(e.target.value)}
            value={cardNumber}
            required
          />

          <div className="flex items-center gap-4">
            <TextInput
              name="cvv"
              label="CVV"
              placeholder="XXX"
              value={cardCvv}
              onChange={(e) => setCardCvv(e.target.value)}
              required
            />

            <DateInput
              label="Expiry"
              clearable={false}
              placeholder="MM/YYYY"
              required
              valueFormat="MM/YYYY"
              value={cardExpiry}
              minDate={new Date()}
              onChange={(e) => setCardExpiry(e)}
              error={errors.cardExpiry}
              hideOutsideDates
            />
          </div>

          {Object.values(errors).some((error) => error !== "") ? (
            <div className="flex flex-col gap-2">
              {Object.entries(errors).map(([key, value]) => (
                <p key={key} className="text-red-500">
                  {value}
                </p>
              ))}
            </div>
          ) : null}

          <div className="mt-6 flex items-center gap-4 sm:justify-end">
            <Button
              variant="subtle"
              color="red"
              onClick={() => closePaymentModal()}
            >
              Cancel
            </Button>

            <Button variant="filled" onClick={() => makePayment()}>
              Make Payment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
