import { ColorSchemeScript, MantineProvider } from "@mantine/core"

import "@mantine/core/styles.css"
import "@mantine/dates/styles.css"

import { ModalsProvider } from "@mantine/modals"
import { cssBundleHref } from "@remix-run/css-bundle"
import type {
  DataFunctionArgs,
  LinksFunction,
  MetaFunction,
  SerializeFrom,
} from "@remix-run/node"
import { json } from "@remix-run/node"
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useLoaderData,
  useRouteError,
} from "@remix-run/react"
import { Toaster } from "sonner"
import { getAdmin } from "~/models/admin.server"
import { getCustomer } from "~/models/customer.server"
import { getEditor } from "~/models/editor.server"
import { UserRole } from "~/roles"
import { getUserId, getUserRole } from "~/session.server"
import tailwindStyles from "~/styles/tailwind.css"

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: tailwindStyles },
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
]

export type RootLoaderData = SerializeFrom<typeof loader>
export const loader = async ({ request }: DataFunctionArgs) => {
  const userId = await getUserId(request)
  const userRole = await getUserRole(request)

  let response: {
    admin: Awaited<ReturnType<typeof getAdmin>>
    customer: Awaited<ReturnType<typeof getCustomer>>
    editor: Awaited<ReturnType<typeof getEditor>>
    ENV: {
      AWS_REGION?: string
      AWS_BUCKET?: string
    }
  } = {
    admin: null,
    customer: null,
    editor: null,
    ENV: {
      AWS_REGION: process.env.AWS_REGION,
      AWS_BUCKET: process.env.AWS_BUCKET,
    },
  }

  if (!userId || !userRole) {
    return response
  }

  if (userRole === UserRole.ADMIN) {
    response.admin = await getAdmin(request)
  } else if (userRole === UserRole.CUSTOMER) {
    response.customer = await getCustomer(request)
  } else if (userRole === UserRole.EDITOR) {
    response.editor = await getEditor(request)
  }

  return json(response)
}

export const meta: MetaFunction = () => {
  return [
    { title: "Artify" },
    {
      name: "description",
      content: "This app is the best",
    },
  ]
}

export default function App() {
  const data = useLoaderData<typeof loader>()
  return (
    <html lang="en" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />

        <Meta />
        <Links />
        <ColorSchemeScript />
      </head>
      <body className="h-full">
        <MantineProvider>
          <ModalsProvider>
            <Outlet />
          </ModalsProvider>
          <Toaster richColors />

          <ScrollRestoration />
          <Scripts />
          <LiveReload />

          <script
            dangerouslySetInnerHTML={{
              __html: `window.ENV = ${JSON.stringify(data.ENV)}`,
            }}
          />
        </MantineProvider>
      </body>
    </html>
  )
}

export function ErrorBoundary() {
  const error = useRouteError()

  if (isRouteErrorResponse(error)) {
    return (
      <div>
        <h1>
          {error.status} {error.statusText}
        </h1>
        <p>{error.data}</p>
      </div>
    )
  } else if (error instanceof Error) {
    return (
      <div>
        <h1>Error</h1>
        <p>{error.message}</p>
        <p>The stack trace is:</p>
        <pre>{error.stack}</pre>
      </div>
    )
  } else {
    return <h1>Unknown Error</h1>
  }
}
